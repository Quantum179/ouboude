"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startGame = exports.validateDomino = void 0;

var _dominos = _interopRequireDefault(require("./dominos"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var validateDomino = function validateDomino(payload) {
  if (!payload.hasOwnProperty('domino') || !!payload.hasOwnProperty('direction')) {
    return false;
  }

  return true; // Améliorer la validation
};

exports.validateDomino = validateDomino;

var startGame = function startGame() {
  var hands = [];
  var dom = JSON.parse(JSON.stringify(_dominos["default"]));

  for (var i = 0; i < 4; i++) {
    hands[i] = [];

    for (var j = 0; j < 7; j++) {
      var index = void 0;

      do {
        index = Math.floor(Math.random() * (dom.length + 1));
      } while (!dom[index]);

      hands[i].push(dom[index]);
      dom.splice(index, 1);
    }
  }

  return hands;
};

exports.startGame = startGame;
//# sourceMappingURL=gameEngine.js.map