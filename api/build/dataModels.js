"use strict";

// Domino
var domino = {
  left: 0,
  right: 0
}; // "boude" when player can't make a move

var domino2 = {
  left: 0,
  right: 1
}; // Move 

var move = {
  domino: domino || null,
  toLeft: false // add at start of pile (unshift) / end of pile (push),

};
var board = [domino, domino2];
var hand = [domino];
//# sourceMappingURL=dataModels.js.map