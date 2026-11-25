const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const loadPatch = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8")).patcher;
const logic = loadPatch("_logic.maxpat");
const midi = loadPatch("_stipple_midi.maxpat");
const midiEvent = loadPatch("_stipple_midi_event.gendsp");
const voice = loadPatch("_stipple_voice.gendsp");
const boxes = new Map(logic.boxes.map(({ box }) => [box.id, box]));
const controls = [...boxes.values()].filter((box) => box.parameter_enable);

function hasLine(sourceId, sourceOutlet, destinationId, destinationInlet) {
  return logic.lines.some(({ patchline }) => (
    patchline.source[0] === sourceId &&
    patchline.source[1] === sourceOutlet &&
    patchline.destination[0] === destinationId &&
    patchline.destination[1] === destinationInlet
  ));
}

function loadDevice() {
  const file = fs.readFileSync(path.join(root, "Stipple_dev.amxd"));
  assert.equal(file.toString("ascii", 0, 4), "ampf");
  assert.equal(file.toString("ascii", 24, 28), "ptch");
  assert.equal(file.readUInt32LE(28), file.length - 32);
  assert.equal(file.at(-1), 0);
  return JSON.parse(file.toString("utf8", 32, file.length - 1)).patcher;
}

test("patch cords refer to unique boxes and valid outlets and inlets", () => {
  assert.equal(boxes.size, logic.boxes.length);
  for (const { patchline } of logic.lines) {
    const [source, outlet] = patchline.source;
    const [destination, inlet] = patchline.destination;
    assert.ok(outlet < boxes.get(source).numoutlets, source);
    assert.ok(inlet < boxes.get(destination).numinlets, destination);
  }
});

test("the device exposes and recalls all 19 presentation controls", () => {
  const device = loadDevice();
  const bpatcher = device.boxes.find(({ box }) => box.maxclass === "bpatcher").box;
  const [,, width, height] = bpatcher.presentation_rect;
  const exposed = Object.keys(device.parameters).filter((key) => key.startsWith(bpatcher.id + "::"));
  const bankNames = Object.values(device.parameters.parameterbanks)
    .flatMap((bank) => bank.parameters.filter((name) => name !== "-"));

  assert.equal(bpatcher.name, "_logic.maxpat");
  assert.equal(controls.length, 19);
  assert.equal(exposed.length, controls.length);
  const midiControls = new Set(["ctrl-mode", "ctrl-prob", "ctrl-jitter"]);
  const expectedBankNames = controls
    .filter((control) => !midiControls.has(control.id))
    .map((control) => control.saved_attribute_attributes.valueof.parameter_longname);
  assert.deepEqual(new Set(bankNames), new Set(expectedBankNames));
  for (const control of controls) {
    const [x, y, w, h] = control.presentation_rect;
    const parameter = control.saved_attribute_attributes.valueof;
    assert.equal(control.presentation, 1);
    assert.ok(x >= 0 && y >= 0 && x + w <= width && y + h <= height, control.id);
    assert.deepEqual(
      device.parameters[bpatcher.id + "::" + control.id],
      [parameter.parameter_longname, parameter.parameter_shortname, 0]
    );
    assert.equal(boxes.get("obj-20").text, "live.thisdevice");
    assert.ok(hasLine("obj-20", 0, control.id, 0), control.id);
    assert.equal(parameter.parameter_initial_enable, 1);
  }

  assert.deepEqual(boxes.get("ctrl-mode").saved_attribute_attributes.valueof.parameter_enum, ["Trigger", "Gate"]);
  const detune = boxes.get("ctrl-detune").saved_attribute_attributes.valueof;
  assert.equal(detune.parameter_unitstyle, 9);
  assert.equal(detune.parameter_units, "%+.1f cents");
  assert.equal(detune.parameter_mmin, -50);
  assert.equal(detune.parameter_mmax, 50);
  assert.deepEqual(detune.parameter_initial, [0]);
});

test("MIDI Mode changes the SOUND envelope label to Decay or Release", () => {
  const label = boxes.get("obj-7");
  assert.equal(label.presentation, 1);
  assert.equal(label.text, "Decay");
  assert.equal(boxes.get("obj-197").text, "deferlow");
  assert.equal(boxes.get("obj-198").text, "sel 0 1");
  assert.ok(hasLine("ctrl-mode", 0, "obj-197", 0));
  assert.ok(hasLine("obj-197", 0, "obj-198", 0));
  for (const [mode, message, text] of [[0, "obj-199", "Decay"], [1, "obj-200", "Release"]]) {
    assert.equal(boxes.get(message).text, "set " + text);
    assert.ok(hasLine("obj-198", mode, message, 0));
    assert.ok(hasLine(message, 0, label.id, 0));
  }
});

test("both MIDI engines use timestamped notes and schedule playback before DSP", () => {
  assert.equal(boxes.get("obj-174").text, "notein");
  assert.equal(boxes.get("obj-41").text, "timer");
  assert.equal(boxes.get("obj-43").text, "_stipple_midi");
  for (const [source, outlet, destination, inlet] of [
    ["obj-174", 0, "obj-40", 0], ["obj-174", 1, "obj-42", 1], ["obj-174", 2, "obj-42", 2],
    ["obj-40", 1, "obj-41", 1], ["obj-40", 0, "obj-42", 0], ["obj-41", 0, "obj-42", 3],
    ["obj-42", 0, "obj-43", 0],
    ["ctrl-prob", 0, "obj-37", 0], ["obj-37", 0, "obj-43", 0],
    ["ctrl-jitter", 0, "obj-38", 0], ["obj-38", 0, "obj-43", 0]
  ]) {
    assert.ok(hasLine(source, outlet, destination, inlet), source + " → " + destination);
  }

  const engines = [
    ["obj-45", "obj-46", "obj-47", "obj-48", "obj-49", "obj-50", "obj-181", "obj-178", "obj-180", "obj-182"],
    ["obj-52", "obj-53", "obj-54", "obj-55", "obj-56", "obj-185", "obj-57", "obj-184", "obj-186", "obj-187"]
  ];
  for (const [outlet, ids] of engines.entries()) {
    const [stamp, unpack, delay, pipe, start, normalize, click, note, velocity, gen] = ids;
    assert.equal(boxes.get(stamp).text, "t l b");
    assert.equal(boxes.get(unpack).text, "unpack i i i f");
    assert.equal(boxes.get(pipe).text, "pipe 0 0 0 0.");
    assert.equal(boxes.get(click).text, "click~");
    for (const [source, sourceOutlet, destination, inlet] of [
      ["obj-43", outlet, stamp, 0], [stamp, 1, "obj-41", 1], [stamp, 0, unpack, 0],
      ["obj-41", 0, delay, 1], [unpack, 3, delay, 0], [delay, 0, pipe, 3],
      [unpack, 2, pipe, 2], [unpack, 1, pipe, 1], [unpack, 0, pipe, 0],
      [pipe, 2, normalize, 0], [normalize, 0, velocity, 0], [pipe, 1, note, 0],
      [pipe, 0, start, 0], [start, 0, click, 0], [click, 0, gen, 0],
      [note, 0, gen, 1], [velocity, 0, gen, 2], [gen, 0, "obj-58", outlet + 1]
    ]) {
      assert.ok(hasLine(source, sourceOutlet, destination, inlet), source + " → " + destination);
    }
  }

  assert.equal(boxes.get("obj-187").text, "gen~ @gen _stipple_voice @gateMode 1");
  assert.equal(boxes.get("obj-58").text, "selector~ 2 1");
  assert.ok(hasLine("ctrl-mode", 0, "obj-21", 0));
  assert.ok(hasLine("obj-21", 0, "obj-58", 0));
  assert.ok(hasLine("obj-58", 0, "obj-195", 0));
  assert.ok(hasLine("obj-195", 0, "obj-196", 0));
  assert.ok(hasLine("obj-195", 0, "obj-196", 1));
});

test("MIDI scheduling uses native event objects and defers the overflow log", () => {
  const objects = new Map(midi.boxes.map(({ box }) => [box.id, box]));
  assert.equal(objects.get("obj-5").text, "gen @gen _stipple_midi_event");
  assert.equal(objects.get("obj-4").text, "t b i");
  assert.equal(objects.get("obj-15").text, "deferlow");
  const genCode = midiEvent.boxes.find(({ box }) => box.maxclass === "codebox").box;
  assert.equal(genCode.numinlets, 4);
  assert.equal(genCode.numoutlets, 9);
  const outgoing = midi.lines.map(({ patchline }) => patchline)
    .filter(({ source }) => source[0] === "obj-15");
  assert.deepEqual(outgoing.map(({ destination }) => destination), [["obj-16", 0]]);
  const edges = new Set(midi.lines.map(({ patchline: { source, destination } }) =>
    JSON.stringify([source, destination])));
  for (const ports of [[["obj-4", 1], ["obj-5", 0]], [["obj-4", 0], ["obj-7", 0]],
    [["obj-4", 0], ["obj-11", 0]], [["obj-8", 1], ["obj-9", 0]],
    [["obj-12", 1], ["obj-13", 0]], [["obj-16", 0], ["obj-17", 0]]]) {
    assert.ok(edges.has(JSON.stringify(ports)));
  }
});

test("every SOUND control reaches the matching Gen parameter in both engines", () => {
  const code = voice.boxes.find(({ box }) => box.maxclass === "codebox").box.code;
  const outsideSound = ["ctrl-mode", "ctrl-prob", "ctrl-jitter", "ctrl-level"];
  const declarations = /^Param ([a-zA-Z]+)\((-?[\d.]+)\);$/gm;
  const defaults = new Map([...code.matchAll(declarations)].map(([, name, value]) => [name, Number(value)]));
  for (const control of controls.filter(({ id }) => !outsideSound.includes(id))) {
    const route = [...boxes.values()].find((box) => hasLine(control.id, 0, box.id, 0));
    assert.match(route.text, /^prepend /);
    const name = route.text.slice("prepend ".length);
    assert.equal(defaults.get(name), control.saved_attribute_attributes.valueof.parameter_initial[0], name);
    assert.ok(hasLine(route.id, 0, "obj-182", 0), name);
    assert.ok(hasLine(route.id, 0, "obj-187", 0), name);
  }
});
