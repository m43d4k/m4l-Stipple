autowatch = 1;
inlets = 2;
outlets = 1;

const heldNotes = [];

function clampVelocity(value) {
  return Math.max(0, Math.min(127, Math.floor(Number(value) || 0)));
}

function removeNote(note) {
  for (let i = heldNotes.length - 1; i >= 0; i -= 1) {
    if (heldNotes[i].note === note) {
      heldNotes.splice(i, 1);
    }
  }
}

function activeNote() {
  return heldNotes.length > 0 ? heldNotes[heldNotes.length - 1] : null;
}

function emit(note, velocity) {
  outlet(0, [note, velocity]);
}

let activeNoteNumber = 60;
let activeVelocity = 0;

function msg_int(value) {
  if (inlet === 0) {
    activeNoteNumber = Math.floor(Number(value) || 0);
  } else {
    activeVelocity = clampVelocity(value);
    handleNote(activeNoteNumber, activeVelocity);
  }
}

function list() {
  const args = Array.prototype.slice.call(arguments);
  if (args.length >= 2) {
    handleNote(Math.floor(Number(args[0]) || 0), clampVelocity(args[1]));
  }
}

function handleNote(noteNumber, velocity) {
  activeNoteNumber = noteNumber;
  activeVelocity = velocity;

  if (velocity > 0) {
    removeNote(noteNumber);
    heldNotes.push({ note: noteNumber, velocity });
    emit(noteNumber, velocity);
    return;
  }

  const wasActive = activeNote() && activeNote().note === noteNumber;
  removeNote(noteNumber);

  if (!wasActive) {
    return;
  }

  const next = activeNote();
  if (next) {
    emit(next.note, next.velocity);
  } else {
    emit(noteNumber, 0);
  }
}

function clear() {
  heldNotes.length = 0;
  emit(activeNoteNumber, 0);
}
