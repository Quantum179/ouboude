
// Domino
const domino = {
  left: 0,
  right: 0,
  leftDomino: null, //pointer
  rightDomino: null // pointer
} // "boude" when player can't make a move

const domino2 = {
  left: 0,
  right: 1,
  leftDomino: null, //pointer
  rightDomino: null // pointer
}

// Move 
const move = {
  domino: domino || null,
  toLeft: false // add at start of pile (unshift) / end of pile (push),
}

const board = [
  domino,
  domino2
]

const hand = [
  domino
]