autowatch = 1;
inlets = 1;
outlets = 1;

let probability = 1.0;
let seed = 0x12345678;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampVelocity(value) {
  return Math.max(0, Math.min(127, Math.floor(Number(value) || 0)));
}

function rand() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}

function list() {
  const args = Array.prototype.slice.call(arguments);
  if (args.length < 2) {
    return;
  }

  const noteNumber = Math.floor(Number(args[0]) || 0);
  const velocity = clampVelocity(args[1]);
  if (velocity > 0 && rand() <= probability) {
    outlet(0, [noteNumber, velocity]);
  }
}

function prob(value) {
  probability = clamp(Number(value), 0, 100) / 100;
}

function seedmsg(value) {
  seed = Math.floor(Number(value)) >>> 0;
}
