const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const file = path.join(__dirname, "..", "_stipple_midi_event.gendsp");
const patch = JSON.parse(fs.readFileSync(file, "utf8")).patcher;
const { code } = patch.boxes.find(({ box }) => box.maxclass === "codebox").box;
const source = code.replaceAll("\r\n", "\n");
const declarations = [...source.matchAll(/^(Param|History|Data) (.*);$/gm)]
  .flatMap(([, kind, line]) => [...line.matchAll(/(\w+)\(([^)]+)\)/g)]
    .map(([, name, args]) => ({ kind, name, args })));
const stateNames = new Set(declarations.map(({ name }) => name));
const capacity = Number(declarations.find(({ name }) => name === "pending").args.split(",")[0]);
const body = source.replace(/^(Param|History|Data) .*;\n/gm, "");
const split = body.indexOf("\nnote =");
const functions = body.slice(0, split)
  .replace(/^pickDelay\(/, "function pickDelay(")
  .replace(/^    minimum =/m, "    const minimum =");
const eventCode = body.slice(split);
const locals = new Set([...eventCode.matchAll(/(?:^\s*|for \()(\w+) = /gm)]
  .map(([, name]) => name).filter((name) => !stateNames.has(name)));

// Execute the scalar GenExpr program against an in-memory model of Data and History.
const compile = new Function("draws", `
  const { min, max } = Math;
  const clamp = (value, low, high) => min(max(value, low), high);
  const mod = (value, divisor) => value % divisor;
  const noise = () => 2 * (draws.shift() ?? 0.5) - 1;
  const data = (length, channels = 1) => Array.from({ length: channels }, () => new Float64Array(length));
  const dim = (table) => table[0].length;
  const peek = (table, index, channel = 0) => table[channel][index] ?? 0;
  const poke = (table, value, index, channel = 0) => {
    if (index < 0 || index >= dim(table)) throw new Error("Gen Data write outside allocated state");
    table[channel][index] = value;
  };
  ${functions}
  ${declarations.map(({ kind, name, args }) => kind === "Data"
    ? `const ${name} = data(${args});`
    : `let ${name} = ${args};`).join("\n")}
  return {
    probability(value) { prob = value; },
    jitterLimit(value) { jitter = value; },
    event(in1, in2, in3, in4) {
      let ${[...locals].join(", ")};
      ${eventCode}
      return {
        trigger: [Number(out1), out2, out3, out4],
        gate: [Number(out5), out6, out7, out8],
        overflow: out9
      };
    }
  };
`);

function createHarness(draws = []) {
  const trigger = [];
  const gate = [];
  const overflows = [];
  const midi = compile(draws);
  return {
    trigger,
    gate,
    overflows,
    jitter: midi.jitterLimit,
    probability: midi.probability,
    send(time, note, velocity, channel = 1) {
      const event = midi.event(note, velocity, channel, time);
      if (event.trigger[0] >= 0) trigger.push(event.trigger);
      if (event.gate[0] >= 0) gate.push(event.gate);
      if (event.overflow) overflows.push(time);
    }
  };
}

test("trigger uses velocity and ignores the corresponding note-off", () => {
  const { send, trigger } = createHarness();

  send(0, 60, 115);
  send(3, 60, 0);
  send(4, 61, 90);

  assert.deepEqual(trigger, [[1, 60, 115, 0], [1, 61, 90, 4]]);
});

test("gate keeps last-note priority and starts pitch only when it opens", () => {
  const { send, gate } = createHarness();

  send(0, 60, 100);
  send(1, 64, 80);
  send(2, 67, 70);
  send(3, 64, 0);
  send(4, 67, 0);
  send(5, 60, 0);
  send(6, 67, 120);

  assert.deepEqual(gate, [
    [1, 60, 100, 0],
    [0, 64, 80, 1],
    [0, 67, 70, 2],
    [0, 60, 100, 4],
    [0, 60, 0, 5],
    [1, 67, 120, 6]
  ]);
});

test("same-pitch overlaps pair note-offs in FIFO order and close only after the last off", () => {
  const { send, gate } = createHarness();

  send(0, 60, 100);
  send(1, 60, 70);
  send(2, 60, 0);
  send(3, 60, 0);
  send(4, 60, 0);

  assert.deepEqual(gate, [[1, 60, 100, 0], [0, 60, 70, 1], [0, 60, 0, 3]]);
});

test("probability drops a matched pair even if a later same-pitch note is accepted", () => {
  const { send, probability, trigger, gate } = createHarness();

  probability(0);
  send(0, 60, 100);
  probability(100);
  send(1, 60, 60);
  send(2, 60, 0);
  probability(0);
  send(3, 60, 80);
  send(4, 60, 0);
  send(5, 60, 0);

  assert.deepEqual(trigger, [[1, 60, 60, 1]]);
  assert.deepEqual(gate, [[1, 60, 60, 1], [0, 60, 0, 4]]);
});

test("note-offs pair by channel when pitches match", () => {
  const { send, gate } = createHarness();

  send(0, 60, 80, 1);
  send(1, 60, 110, 2);
  send(2, 60, 0, 2);
  send(3, 60, 0, 1);

  assert.deepEqual(gate, [[1, 60, 80, 0], [0, 60, 110, 1], [0, 60, 80, 2], [0, 60, 0, 3]]);
});

test("trigger preserves input order at equal due times and after Jitter is reduced", () => {
  const { send, jitter, trigger } = createHarness([0, 0.1, 0.8, 0, 0, 0, 0, 0]);

  jitter(5);
  send(0, 60, 127);
  jitter(0);
  send(1, 61, 127);
  send(1, 62, 127);
  send(5, 63, 127);

  assert.deepEqual(trigger, [[1, 60, 127, 4], [1, 61, 127, 4], [1, 62, 127, 4], [1, 63, 127, 5]]);
});

test("gate preserves overlapping durations and retains the delay through automation", () => {
  const { send, jitter, gate } = createHarness([0, 0.6]);

  jitter(5);
  send(0, 60, 100);
  jitter(0);
  send(1, 64, 80);
  send(2, 64, 0);
  send(3, 60, 0);
  send(4, 67, 110);
  send(5, 67, 0);
  send(8, 68, 110);
  send(9, 68, 0);

  assert.deepEqual(gate, [
    [1, 60, 100, 3],
    [0, 64, 80, 4],
    [0, 60, 100, 5],
    [0, 60, 0, 6],
    [1, 67, 110, 6],
    [0, 67, 0, 7],
    [1, 68, 110, 8],
    [0, 68, 0, 9]
  ]);
});

test("both modes cap the Jitter setting at 5 ms even for an overlapping chord", () => {
  const { send, jitter, trigger, gate } = createHarness([0, 0.999, 0.999]);

  jitter(50);
  send(0, 60, 90);
  send(1, 64, 100);
  send(2, 60, 0);
  send(4, 64, 0);

  assert.ok(trigger[0][3] > 4.99 && trigger[0][3] <= 5);
  assert.ok(trigger[1][3] >= trigger[0][3] && trigger[1][3] <= 6);
  assert.equal(gate[1][3] - gate[0][3], 1);
  assert.ok(gate[2][3] <= 9);
});

test("Gate overflow keeps same-pitch note-offs paired and lets Trigger continue", () => {
  const { send, probability, gate, trigger, overflows } = createHarness();

  send(0, 60, 100);
  probability(0);
  for (let i = 1; i < capacity; i += 1) send(i, 61, 100);
  probability(100);

  send(capacity, 60, 70);
  send(capacity + 1, 61, 0);
  send(capacity + 2, 60, 80);
  send(capacity + 3, 60, 0);
  send(capacity + 4, 60, 0);
  send(capacity + 5, 60, 0);
  send(capacity + 6, 60, 90);
  send(capacity + 7, 60, 0);

  assert.deepEqual(overflows, [capacity]);
  assert.equal(trigger.length, 4);
  assert.deepEqual(gate, [
    [1, 60, 100, 0],
    [0, 60, 0, capacity + 3],
    [1, 60, 90, capacity + 6],
    [0, 60, 0, capacity + 7]
  ]);
});

test("sixteen instances retain independent Gate state during simultaneous note bursts", () => {
  const instances = Array.from({ length: 16 }, () => createHarness());
  for (const instance of instances) instance.jitter(4);
  for (let note = 0; note < capacity; note += 1) {
    for (const instance of instances) instance.send(0, note, 100);
  }
  for (let note = 0; note < capacity; note += 1) {
    for (const instance of instances) instance.send(20, note, 0);
  }
  for (const instance of instances) {
    assert.equal(instance.trigger.length, capacity);
    assert.equal(instance.gate.length, capacity + 1);
    assert.deepEqual(instance.gate[0], [1, 0, 100, 2]);
    assert.deepEqual(instance.gate.at(-1), [0, capacity - 1, 0, 22]);
    assert.deepEqual(instance.overflows, []);
  }
});
