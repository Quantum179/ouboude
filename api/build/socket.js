"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initSocket = void 0;

var _socket = _interopRequireDefault(require("socket.io"));

var _uuid = require("uuid");

var _gameEngine = require("./gameEngine");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _readOnlyError(name) { throw new Error("\"" + name + "\" is read-only"); }

var rooms = [];

var initSocket = function initSocket(server) {
  var io = new _socket["default"](server);
  io.set('origins', 'http://localhost:8080');
  io.on('connection', function (socket) {
    console.log('a new socket client is connected');
    socket.on('connect_timeout', function (timeout) {
      console.log('connection timeout');
    });
    socket.on('reconnect_attempt', function (attemptNumber) {
      console.log('reconnection attempt');
    });
    socket.on('disconnect', function (data) {
      console.log('socket is disconnected'); // const { roomID, order } = data 
      // socket.broadcast.to(roomID).emit('onPlayerDisconnected', order)
    });
    socket.on('createNewGame', function (data) {
      console.log('game creation request');
      var nickname = data.nickname,
          mode = data.mode;
      var room = {
        created: true,
        players: [],
        mode: mode
      };
      var player = {
        id: (0, _uuid.v4)(),
        socket: socket,
        nickname: nickname,
        order: 1,
        victoryCount: 0,
        connected: true
      };
      var roomID = (0, _uuid.v4)();
      socket.join(roomID);
      room.players.push(player);
      rooms[roomID] = room;
      socket.emit('onGameCreated', {
        room: roomID,
        order: player.order,
        id: player.id
      });
    });
    socket.on('joinGame', function (data) {
      var roomID = data.roomID,
          nickname = data.nickname;
      var room = rooms[roomID];

      if (!room) {
        console.log('no room available');
        socket.emit('onGameNotFound');
      } else if (room.started || room.players.length === room.mode) {
        console.log('join request : game started');
        socket.emit('onGameAlreadyStarted');
      } else {
        console.log('new player joined'); // todo : vérifier salle pleine avec length des sockets

        socket.join(roomID);
        var player = {
          id: (0, _uuid.v4)(),
          socket: socket,
          nickname: nickname,
          victoryCount: 0,
          connected: true
        };
        room.players.sort(function (a, b) {
          return a.order - b.order;
        });

        for (var i = 0; i < room.mode; i++) {
          if (room.players[i]) {
            if (!room.players[i + 1]) {
              player.order = room.players[i].order + 1;
              break;
            } else if (room.players[i + 1].order !== room.players[i].order + 1) {
              player.order = room.players[i].order + 1;
              break;
            }
          } else {
            console.log('impossible');
          }
        }

        console.log('order : ' + player.order);
        socket.emit('onGameJoined', {
          players: room.players.map(function (x) {
            return {
              id: x.id,
              nickname: x.nickname,
              order: x.order,
              nbDominos: 7
            };
          }),
          order: player.order,
          id: player.id
        });
        room.players.push(player);
        socket.broadcast.to(roomID).emit('onNewPlayer', {
          id: player.id,
          nickname: player.nickname,
          order: player.order,
          nbDominos: 7
        });

        if (room.players.length === room.mode) {
          setTimeout(function () {
            console.log('game started');
            var hands = (0, _gameEngine.startGame)();
            room.started = true;
            room.board = [];
            room.currentOrder = 1; // todo : remplacer par aléatoire

            for (var _i = 0; _i < room.players.length; _i++) {
              room.players[_i].hand = hands[_i];

              room.players[_i].socket.emit('onGameStarted', {
                hand: hands[_i]
              });
            }
          }, 1000);
        }
      }
    });
    socket.on('leaveGame', function (data) {
      var roomID = data.roomID,
          playerID = data.playerID;
      var room = rooms[roomID];

      if (room) {
        var player = room.players.find(function (x) {
          return x.id === playerID;
        });

        if (player) {
          if (room.started) {
            player.connected = false;

            if (room.currentOrder === player.order) {// todo : activate bot and play immediately
            }
          } else {
            room.players.splice(room.players.indexOf(player), 1);
            socket.broadcast.to(roomID).emit('onPlayerLeft', playerID);
          }
        }
      }
    });
    socket.on('resumeGame', function (data) {
      var roomID = data.roomID,
          playerID = data.playerID;
      var room = rooms[roomID];
      console.log('game resumed : ' + playerID);

      if (room) {
        var player = room.players.find(function (x) {
          return x.id === playerID;
        });

        if (player) {
          player.connected = true;
          socket.join(roomID);
          socket.emit('onGameResumed', {
            board: room.board,
            players: room.players.map(function (x) {
              if (x.id !== playerID) {
                return {
                  id: x.id,
                  nickname: x.nickname,
                  order: x.order,
                  nbDominos: x.hand ? x.hand.length : 7
                };
              }
            }),
            hand: player.hand,
            order: player.order,
            currentOrder: room.currentOrder
          }); // vérifier si c'est son tour ?        
        } else {
          socket.emit('onGameAlreadyStarted');
        }
      } else {
        console.log('this room does not exist');
      }
    });
    socket.on('startGame', function (roomID) {
      console.log('game started');
      var hands = (0, _gameEngine.startGame)();
      var room = rooms[roomID];

      if (!room) {
        return;
      }

      room.started = true;
      room.board = [];
      room.currentOrder = 1; // todo : remplacer par aléatoire

      room.boudeCount = 0;

      for (var i = 0; i < room.players.length; i++) {
        var player = room.players[i];
        player.hand = hands[i];
        player.socket.emit('onGameStarted', {
          hand: hands[i]
        });
      } // // TODO : create logic in client game app to choose first player (for now, it's always the room's owner)

    });
    socket.on('playDomino', function (data) {
      console.log('domino played');
      var roomID = data.roomID,
          playerID = data.playerID,
          domino = data.domino,
          toLeft = data.toLeft;
      var room = rooms[roomID];
      var player = room.players.find(function (x) {
        return x.id === playerID;
      });
      var winner = null;

      if (!player) {
        return;
      }

      if (domino) {
        room.boudeCount = 0;
        toLeft ? room.board.unshift(domino) : room.board.push(domino);
        room.currentOrder === room.mode ? room.currentOrder = 1 : room.currentOrder += 1;
        player.hand.splice(player.hand.indexOf(domino), 1);

        if (player.hand.length === 0) {
          room.started = false;
          io.to(roomID).emit('onGameFinished', playerID);
        }
      } else {
        console.log('joueur boudé : ' + player.order);
        room.boudeCount += 1;

        if (room.boudeCount === room.mode) {
          var count = 200;
          room.players.map(function (p) {
            var playerCount = p.hand.reduce(function (acc, x) {
              return acc + x.left + x.right;
            });

            if (playerCount < count) {
              count = (_readOnlyError("count"), playerCount);
              winner = (_readOnlyError("winner"), p.id);
            }
          });
          room.started = false;
          io.to(roomID).emit('onGameFinished', winner); // TODO : proposer aux joueurs de refaire une partie
        }
      }

      if (!winner) {
        socket.broadcast.to(roomID).emit('onNewDomino', {
          domino: domino,
          toLeft: toLeft,
          id: playerID
        });
        var nextPlayer = room.players.find(function (x) {
          return x.order === room.currentOrder;
        });

        if (!nextPlayer.connected) {// todo : play again if next player is disconnected        
        }
      }
    });
  });
};

exports.initSocket = initSocket;
//# sourceMappingURL=socket.js.map