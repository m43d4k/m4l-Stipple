const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "_stipple_midi_gate_probability.js");

function createMidiGateProbabilityHarness() {
  const outlets = [];
  const context = {
    console,
    outlet(index, value) {
      outlets.push([index, value]);
    }
  };
  const source = fs.readFileSync(sourcePath, "utf8");

  vm.createContext(context);
  vm.runInContext(`${source}
globalThis.__testApi = {
  list,
  clear,
  prob,
  seedmsg,
  get probability() { return probability; }
};`, context, { filename: "_stipple_midi_gate_probability.js" });

  return {
    api: context.__testApi,
    outlets,
    send(note, velocity) {
      context.__testApi.list(note, velocity);
    }
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("passes accepted gate note-on and matching note-off events", () => {
  const { send, outlets } = createMidiGateProbabilityHarness();

  send(60, 100);
  send(60, 0);

  assert.deepEqual(plain(outlets), [
    [0, [60, 100]],
    [0, [60, 0]]
  ]);
});

test("drops rejected gate note-on and matching note-off events", () => {
  const { api, send, outlets } = createMidiGateProbabilityHarness();

  api.prob(0);
  send(60, 100);
  send(60, 0);

  assert.equal(api.probability, 0);
  assert.deepEqual(plain(outlets), []);
});

test("dropped notes do not steal note-off from accepted notes of the same pitch", () => {
  const { api, send, outlets } = createMidiGateProbabilityHarness();

  send(60, 100);
  api.prob(0);
  send(60, 90);
  send(60, 0);
  send(60, 0);

  assert.deepEqual(plain(outlets), [
    [0, [60, 100]],
    [0, [60, 0]]
  ]);
});
