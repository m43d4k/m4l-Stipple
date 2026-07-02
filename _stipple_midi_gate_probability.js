autowatch = 1;
inlets = 1;
outlets = 1;

const acceptedNotes = [];
const rejectedNotes = [];

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

function removeFirst(notes, note) {
  for (let i = 0; i < notes.length; i += 1) {
    if (notes[i] === note) {
      notes.splice(i, 1);
      return true;
    }
  }
  return false;
}

function list() {
  const args = Array.prototype.slice.call(arguments);
  if (args.length < 2) {
    return;
  }

  const noteNumber = Math.floor(Number(args[0]) || 0);
  const velocity = clampVelocity(args[1]);

  if (velocity > 0) {
    if (rand() <= probability) {
      acceptedNotes.push(noteNumber);
      outlet(0, [noteNumber, velocity]);
    } else {
      rejectedNotes.push(noteNumber);
    }
    return;
  }

  if (removeFirst(acceptedNotes, noteNumber)) {
    outlet(0, [noteNumber, 0]);
  } else {
    removeFirst(rejectedNotes, noteNumber);
  }
}

function clear() {
  acceptedNotes.length = 0;
  rejectedNotes.length = 0;
}

function prob(value) {
  probability = clamp(Number(value), 0, 100) / 100;
}

function seedmsg(value) {
  seed = Math.floor(Number(value)) >>> 0;
}
