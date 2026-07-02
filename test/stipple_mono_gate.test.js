const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "_stipple_mono_gate.js");

function createMonoGateHarness() {
  const outlets = [];
  const context = {
    console,
    inlet: 0,
    outlet(index, value) {
      outlets.push([index, value]);
    }
  };
  const source = fs.readFileSync(sourcePath, "utf8");

  vm.createContext(context);
  vm.runInContext(`${source}
globalThis.__testApi = {
  msg_int,
  list,
  clear
};`, context, { filename: "_stipple_mono_gate.js" });

  return {
    api: context.__testApi,
    context,
    outlets,
    send(note, velocity) {
      context.__testApi.list(note, velocity);
    },
    clearOutlets() {
      outlets.length = 0;
    }
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("opens and closes the gate for a single note", () => {
  const { send, outlets } = createMonoGateHarness();

  send(60, 100);
  send(60, 0);

  assert.deepEqual(plain(outlets), [
    [0, [60, 100]],
    [0, [60, 0]]
  ]);
});

test("uses last-note priority while overlapping notes are held", () => {
  const { send, outlets } = createMonoGateHarness();

  send(60, 90);
  send(64, 80);
  send(67, 70);

  assert.deepEqual(plain(outlets), [
    [0, [60, 90]],
    [0, [64, 80]],
    [0, [67, 70]]
  ]);
});

test("returns to the previous held note without closing the gate", () => {
  const { send, outlets } = createMonoGateHarness();

  send(60, 90);
  send(64, 80);
  send(67, 70);
  send(67, 0);
  send(64, 0);
  send(60, 0);

  assert.deepEqual(plain(outlets), [
    [0, [60, 90]],
    [0, [64, 80]],
    [0, [67, 70]],
    [0, [64, 80]],
    [0, [60, 90]],
    [0, [60, 0]]
  ]);
});

test("ignores note-off events for notes that are not active", () => {
  const { send, outlets } = createMonoGateHarness();

  send(60, 90);
  send(64, 80);
  send(60, 0);
  send(64, 0);

  assert.deepEqual(plain(outlets), [
    [0, [60, 90]],
    [0, [64, 80]],
    [0, [64, 0]]
  ]);
});

test("repressing a held note moves it to the top of the note stack", () => {
  const { send, outlets } = createMonoGateHarness();

  send(60, 90);
  send(64, 80);
  send(60, 70);
  send(60, 0);

  assert.deepEqual(plain(outlets), [
    [0, [60, 90]],
    [0, [64, 80]],
    [0, [60, 70]],
    [0, [64, 80]]
  ]);
});

test("supports separate Max inlet updates as a fallback", () => {
  const { api, context, outlets } = createMonoGateHarness();

  context.inlet = 0;
  api.msg_int(72);
  context.inlet = 1;
  api.msg_int(110);

  assert.deepEqual(plain(outlets), [[0, [72, 110]]]);
});
