const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "_stipple_midi_trigger.js");

function createMidiTriggerHarness() {
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
  prob,
  seedmsg,
  get probability() { return probability; }
};`, context, { filename: "_stipple_midi_trigger.js" });

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

test("passes accepted MIDI trigger note-on events", () => {
  const { send, outlets } = createMidiTriggerHarness();

  send(60, 100);

  assert.deepEqual(plain(outlets), [[0, [60, 100]]]);
});

test("drops MIDI trigger note-on events when probability is zero", () => {
  const { api, send, outlets } = createMidiTriggerHarness();

  api.prob(0);
  send(60, 100);

  assert.equal(api.probability, 0);
  assert.deepEqual(plain(outlets), []);
});

test("ignores note-off style zero velocity events", () => {
  const { send, outlets } = createMidiTriggerHarness();

  send(60, 0);

  assert.deepEqual(plain(outlets), []);
});
