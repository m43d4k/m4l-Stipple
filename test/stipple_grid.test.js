const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "_stipple_grid.js");

function createGridHarness(rect = [0, 0, 320, 80]) {
  const outlets = [];
  const redraws = [];
  const drawCalls = [];
  const source = fs.readFileSync(sourcePath, "utf8");
  const context = {
    console,
    box: { rect },
    mgraphics: {
      init() {},
      redraw() {
        redraws.push(true);
      },
      set_source_rgba(...args) {
        drawCalls.push(["set_source_rgba", ...args]);
      },
      rectangle(...args) {
        drawCalls.push(["rectangle", ...args]);
      },
      fill() {
        drawCalls.push(["fill"]);
      },
      stroke() {
        drawCalls.push(["stroke"]);
      },
      set_line_width(...args) {
        drawCalls.push(["set_line_width", ...args]);
      },
      move_to(...args) {
        drawCalls.push(["move_to", ...args]);
      },
      line_to(...args) {
        drawCalls.push(["line_to", ...args]);
      }
    },
    outlet(index, value) {
      outlets.push([index, value]);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${source}
globalThis.__testApi = {
  COLS,
  ROWS,
  cells,
  get currentStep() { return currentStep; },
  get pingpongDir() { return pingpongDir; },
  get tuneHz() { return tuneHz; },
  get rangeOct() { return rangeOct; },
  get probability() { return probability; },
  get seed() { return seed; },
  bang,
  step_abs,
  step,
  reset,
  clear,
  randomize,
  tune,
  range,
  prob,
  dir,
  seedmsg,
  list,
  cellAt,
  cycleCell,
  onclick,
  ondrag,
  rowToHz,
  paint
};`, context, { filename: "_stipple_grid.js" });

  return {
    api: context.__testApi,
    outlets,
    redraws,
    drawCalls,
    clearOutlets() {
      outlets.length = 0;
    }
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("initializes a 32 x 8 grid with the default four-step row-0 pattern", () => {
  const { api } = createGridHarness();

  assert.equal(api.COLS, 32);
  assert.equal(api.ROWS, 8);
  assert.equal(api.cells.length, 8);
  assert.equal(api.cells[0].length, 32);

  const activeCols = api.cells[0]
    .map((value, col) => (value > 0 ? col : null))
    .filter((col) => col !== null);

  assert.deepEqual(plain(activeCols), [0, 4, 8, 12, 16, 20, 24, 28]);
  assert.equal(api.cells.slice(1).flat().every((value) => value === 0), true);
});

test("bang advances forward, triggers active cells, and reports the current step", () => {
  const { api, outlets } = createGridHarness();

  api.bang();

  assert.deepEqual(plain(outlets), [
    [0, [0, 261.63, 1]],
    [1, 0]
  ]);
  assert.equal(api.currentStep, 0);
});

test("step_abs wraps absolute steps and avoids retriggering the same step", () => {
  const { api, outlets, clearOutlets } = createGridHarness();

  api.step_abs(-1);
  assert.equal(api.currentStep, 31);
  assert.deepEqual(plain(outlets), [[1, 31]]);

  clearOutlets();
  api.step_abs(31);
  assert.deepEqual(plain(outlets), []);

  api.step_abs(32);
  assert.equal(api.currentStep, 0);
  assert.deepEqual(plain(outlets), [
    [0, [0, 261.63, 1]],
    [1, 0]
  ]);
});

test("direction modes advance reverse and ping-pong as expected", () => {
  const { api } = createGridHarness();

  api.dir(1);
  api.bang();
  assert.equal(api.currentStep, 31);

  api.dir(2);
  api.reset();
  api.bang();
  assert.equal(api.currentStep, 0);
  assert.equal(api.pingpongDir, 1);

  api.step_abs(30);
  api.bang();
  assert.equal(api.currentStep, 31);
  assert.equal(api.pingpongDir, -1);

  api.bang();
  assert.equal(api.currentStep, 30);
});

test("list clamps cell coordinates and velocity", () => {
  const { api } = createGridHarness();

  api.clear();
  api.list(-10, 999, 2);

  assert.equal(api.cells[0][31], 1);
  assert.equal(api.cells.flat().filter((value) => value > 0).length, 1);
});

test("click and drag map screen coordinates to bottom-up grid rows", () => {
  const { api } = createGridHarness([0, 0, 320, 80]);

  api.clear();
  api.onclick(0, 0);
  assert.equal(api.cells[7][0], 0.35);

  api.onclick(319, 79);
  assert.equal(api.cells[0][31], 0.35);

  api.ondrag(160, 40);
  assert.equal(api.cells[3][16], 0.8);
});

test("tune, range, and probability inputs are clamped", () => {
  const { api } = createGridHarness();

  api.tune(5);
  assert.equal(api.tuneHz, 20);
  api.tune(1000);
  assert.equal(api.tuneHz, 880);

  api.range(-1);
  assert.equal(api.rangeOct, 0);
  api.range(99);
  assert.equal(api.rangeOct, 4);

  api.prob(-10);
  assert.equal(api.probability, 0);
  api.prob(250);
  assert.equal(api.probability, 1);
});

test("rowToHz maps the top row to tune times the octave range", () => {
  const { api } = createGridHarness();

  api.tune(110);
  api.range(3);

  assert.equal(api.rowToHz(0), 110);
  assert.equal(api.rowToHz(7), 880);
});

test("seeded randomize is deterministic", () => {
  const first = createGridHarness();
  const second = createGridHarness();

  first.api.seedmsg(1234);
  second.api.seedmsg(1234);
  first.api.randomize();
  second.api.randomize();

  assert.deepEqual(plain(first.api.cells), plain(second.api.cells));
  assert.equal(first.api.seed, second.api.seed);
});
