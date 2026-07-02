const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const patchPath = path.join(__dirname, "..", "_logic.maxpat");

function loadPatch() {
  return JSON.parse(fs.readFileSync(patchPath, "utf8")).patcher;
}

function boxesById(patcher) {
  return new Map(patcher.boxes.map((entry) => [entry.box.id, entry.box]));
}

function hasLine(patcher, sourceId, sourceOutlet, destinationId, destinationInlet) {
  return patcher.lines.some(({ patchline }) => (
    patchline.source[0] === sourceId &&
    patchline.source[1] === sourceOutlet &&
    patchline.destination[0] === destinationId &&
    patchline.destination[1] === destinationInlet
  ));
}

test("logic patch has unique object ids", () => {
  const patcher = loadPatch();
  const ids = patcher.boxes.map((entry) => entry.box.id);
  const uniqueIds = new Set(ids);

  assert.equal(uniqueIds.size, ids.length);
});

test("Live sync sends unwrapped absolute steps to the grid", () => {
  const patcher = loadPatch();
  const boxes = boxesById(patcher);

  assert.equal(boxes.get("obj-4").text, "expr int(floor($f1 * 4.))");
  assert.equal(boxes.get("obj-7").text, "i");
  assert.equal(hasLine(patcher, "obj-6", 0, "obj-7", 0), true);
  assert.equal(hasLine(patcher, "obj-7", 0, "obj-8", 0), true);
  assert.equal(boxes.get("obj-8").text, "prepend step_abs");
});

test("MIDI Trigger click is routed through the jitter delay chain", () => {
  const patcher = loadPatch();
  const boxes = boxesById(patcher);

  assert.equal(boxes.get("obj-213").text, "v8 _stipple_midi_trigger.js");
  assert.equal(boxes.get("obj-199").text, "t b b l");
  assert.equal(boxes.get("obj-204").text, "random 1000");
  assert.equal(boxes.get("obj-205").text, "/ 1000.");
  assert.equal(boxes.get("obj-206").text, "* 0.");
  assert.equal(boxes.get("obj-207").text, "delay 0.");

  assert.equal(hasLine(patcher, "obj-176", 0, "obj-213", 0), true);
  assert.equal(hasLine(patcher, "obj-213", 0, "obj-199", 0), true);
  assert.equal(hasLine(patcher, "obj-84", 0, "obj-213", 0), true);
  assert.equal(hasLine(patcher, "obj-199", 2, "obj-200", 0), true);
  assert.equal(hasLine(patcher, "obj-199", 1, "obj-204", 0), true);
  assert.equal(hasLine(patcher, "obj-204", 0, "obj-205", 0), true);
  assert.equal(hasLine(patcher, "obj-205", 0, "obj-206", 0), true);
  assert.equal(hasLine(patcher, "obj-206", 0, "obj-207", 1), true);
  assert.equal(hasLine(patcher, "obj-199", 0, "obj-207", 0), true);
  assert.equal(hasLine(patcher, "obj-207", 0, "obj-181", 0), true);
  assert.equal(hasLine(patcher, "obj-73", 0, "obj-206", 1), true);
});

test("MIDI Gate event list is routed through the jitter pipe chain", () => {
  const patcher = loadPatch();
  const boxes = boxesById(patcher);

  assert.equal(boxes.get("obj-214").text, "v8 _stipple_midi_gate_probability.js");
  assert.equal(boxes.get("obj-208").text, "t l b");
  assert.equal(boxes.get("obj-209").text, "pipe 0 0 0");
  assert.equal(boxes.get("obj-209").numinlets, 3);
  assert.equal(boxes.get("obj-209").numoutlets, 2);
  assert.equal(boxes.get("obj-210").text, "random 1000");
  assert.equal(boxes.get("obj-211").text, "/ 1000.");
  assert.equal(boxes.get("obj-212").text, "* 0.");

  assert.equal(hasLine(patcher, "obj-203", 0, "obj-214", 0), true);
  assert.equal(hasLine(patcher, "obj-214", 0, "obj-201", 0), true);
  assert.equal(hasLine(patcher, "obj-201", 0, "obj-208", 0), true);
  assert.equal(hasLine(patcher, "obj-208", 1, "obj-210", 0), true);
  assert.equal(hasLine(patcher, "obj-210", 0, "obj-211", 0), true);
  assert.equal(hasLine(patcher, "obj-211", 0, "obj-212", 0), true);
  assert.equal(hasLine(patcher, "obj-212", 0, "obj-209", 2), true);
  assert.equal(hasLine(patcher, "obj-208", 0, "obj-209", 0), true);
  assert.equal(hasLine(patcher, "obj-209", 0, "obj-183", 0), true);
  assert.equal(hasLine(patcher, "obj-209", 1, "obj-185", 0), true);
  assert.equal(hasLine(patcher, "obj-73", 0, "obj-212", 1), true);
  assert.equal(hasLine(patcher, "obj-84", 0, "obj-214", 0), true);
});
