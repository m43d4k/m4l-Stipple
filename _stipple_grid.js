autowatch = 1;
inlets = 1;
outlets = 2;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

const COLS = 32;
const ROWS = 8;
const cells = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

let currentStep = -1;
let direction = 0;
let pingpongDir = 1;
let tuneHz = 261.63;
let rangeOct = 2.0;
let probability = 1.0;
let seed = 0x12345678;
let lastEditRow = -1;
let lastEditCol = -1;

initializeDefaultPattern();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function initializeDefaultPattern() {
  for (let col = 0; col < COLS; col += 4) {
    cells[0][col] = 1;
  }
}

function rand() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}

function dims() {
  const rect = box.rect;
  return {
    width: Math.max(1, rect[2] - rect[0]),
    height: Math.max(1, rect[3] - rect[1])
  };
}

function rowToHz(row) {
  const rowRatio = row / (ROWS - 1);
  return tuneHz * Math.pow(2, rangeOct * rowRatio);
}

function wrapStep(value) {
  return ((value % COLS) + COLS) % COLS;
}

function pingpongStep(value) {
  const period = (COLS - 1) * 2;
  const phase = ((value % period) + period) % period;
  return phase <= COLS - 1 ? phase : period - phase;
}

function directedStepFromAbsolute(value) {
  const absoluteStep = Math.floor(Number(value) || 0);

  if (direction === 1) {
    return COLS - 1 - wrapStep(absoluteStep);
  }

  if (direction === 2) {
    return pingpongStep(absoluteStep);
  }

  if (direction === 3) {
    return Math.floor(rand() * COLS);
  }

  return wrapStep(absoluteStep);
}

function advanceStep() {
  if (direction === 1) {
    currentStep = currentStep <= 0 ? COLS - 1 : currentStep - 1;
  } else if (direction === 2) {
    if (currentStep < 0) {
      currentStep = 0;
      pingpongDir = 1;
    } else {
      currentStep += pingpongDir;
      if (currentStep >= COLS - 1) {
        currentStep = COLS - 1;
        pingpongDir = -1;
      } else if (currentStep <= 0) {
        currentStep = 0;
        pingpongDir = 1;
      }
    }
  } else if (direction === 3) {
    currentStep = Math.floor(rand() * COLS);
  } else {
    currentStep = (currentStep + 1) % COLS;
  }
}

function bang() {
  advanceStep();
  triggerCurrentStep();
}

function step_abs(value) {
  const nextStep = directedStepFromAbsolute(value);
  if (direction !== 3 && nextStep === currentStep) {
    return;
  }
  currentStep = nextStep;
  triggerCurrentStep();
}

function step(value) {
  step_abs(value);
}

function triggerCurrentStep() {
  for (let row = 0; row < ROWS; row += 1) {
    const velocity = cells[row][currentStep];
    if (velocity > 0 && rand() <= probability) {
      outlet(0, [row, rowToHz(row), velocity]);
    }
  }

  outlet(1, currentStep);
  mgraphics.redraw();
}

function reset() {
  currentStep = -1;
  pingpongDir = 1;
  outlet(1, currentStep);
  mgraphics.redraw();
}

function clear() {
  for (let row = 0; row < ROWS; row += 1) {
    cells[row].fill(0);
  }
  mgraphics.redraw();
}

function randomize() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const r = rand();
      cells[row][col] = r > 0.82 ? 0.35 + rand() * 0.65 : 0;
    }
  }
  mgraphics.redraw();
}

function tune(value) {
  tuneHz = clamp(Number(value), 20, 880);
  mgraphics.redraw();
}

function range(value) {
  rangeOct = clamp(Number(value), 0, 4);
  mgraphics.redraw();
}

function prob(value) {
  probability = clamp(Number(value), 0, 100) / 100;
}

function dir(value) {
  direction = clamp(Math.floor(Number(value)), 0, 3);
}

function seedmsg(value) {
  seed = Math.floor(Number(value)) >>> 0;
}

function list() {
  const args = Array.prototype.slice.call(arguments);
  if (args.length >= 3) {
    const row = clamp(Math.floor(args[0]), 0, ROWS - 1);
    const col = clamp(Math.floor(args[1]), 0, COLS - 1);
    cells[row][col] = clamp(Number(args[2]), 0, 1);
    mgraphics.redraw();
  }
}

function onclick(x, y) {
  const cell = cellAt(x, y);
  cycleCell(cell.row, cell.col);
  lastEditRow = cell.row;
  lastEditCol = cell.col;
  mgraphics.redraw();
}

function ondrag(x, y) {
  const cell = cellAt(x, y);
  if (cell.row === lastEditRow && cell.col === lastEditCol) {
    return;
  }
  cells[cell.row][cell.col] = 0.8;
  lastEditRow = cell.row;
  lastEditCol = cell.col;
  mgraphics.redraw();
}

function cellAt(x, y) {
  const { width, height } = dims();
  const cellW = width / COLS;
  const cellH = height / ROWS;
  const col = clamp(Math.floor(x / cellW), 0, COLS - 1);
  const displayRow = clamp(Math.floor(y / cellH), 0, ROWS - 1);
  const row = ROWS - 1 - displayRow;
  return { row, col };
}

function cycleCell(row, col) {
  const current = cells[row][col];
  cells[row][col] = current <= 0 ? 0.35 : current < 0.7 ? 0.7 : current < 1 ? 1 : 0;
}

function paint() {
  const { width, height } = dims();
  const cellW = width / COLS;
  const cellH = height / ROWS;

  with (mgraphics) {
    set_source_rgba(0.02, 0.025, 0.028, 1);
    rectangle(0, 0, width, height);
    fill();

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const displayRow = ROWS - 1 - row;
        const x = col * cellW;
        const y = displayRow * cellH;
        const value = cells[row][col];

        if (col === currentStep) {
          set_source_rgba(0.12, 0.18, 0.20, 1);
          rectangle(x, y, cellW, cellH);
          fill();
        }

        set_source_rgba(0.16, 0.17, 0.17, 1);
        rectangle(x + 0.5, y + 0.5, Math.max(1, cellW - 1), Math.max(1, cellH - 1));
        stroke();

        if (value > 0) {
          const a = 0.25 + value * 0.75;
          set_source_rgba(0.86, 0.95, 0.88, a);
          rectangle(x + 2, y + 2, Math.max(1, cellW - 4), Math.max(1, cellH - 4));
          fill();
        }
      }
    }

    for (let col = 4; col < COLS; col += 4) {
      const x = col * cellW;
      const isBar = col % 16 === 0;
      set_source_rgba(isBar ? 0.62 : 0.32, isBar ? 0.72 : 0.38, isBar ? 0.70 : 0.38, isBar ? 0.85 : 0.45);
      set_line_width(isBar ? 2.0 : 1.0);
      move_to(x + 0.5, 0);
      line_to(x + 0.5, height);
      stroke();
    }
  }
}
