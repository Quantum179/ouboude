import SocketIO from 'socket.io'
import { v4 as uuid4 } from 'uuid'
import { startGame } from './gameEngine'

const rooms = []

export const initSocket = (server, origin) => {
  const io = new SocketIO(server)
  io.set('origins', origin)
  io.set('transports', ['polling'])

  io.on('connection', (socket) => {
    console.log('a new socket client is connected')

    socket.on('connect_timeout', (timeout) => {
      console.log('connection timeout')
    })
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('reconnection attempt')
    })
    socket.on('disconnect', (data) => {
      console.log('socket is disconnected')
      // const { roomID, order } = data 

      // socket.broadcast.to(roomID).emit('onPlayerDisconnected', order)
    })

    socket.on('createNewGame', (data) => {
      console.log('game creation request')

      const { nickname, mode } = data
      const room = {
        created: true,
        players: [],
        mode
      }
      const player = {
        id: uuid4(),
        socket,
        nickname,
        order: 1,
        victoryCount: 0,
        connected: true
      }
      const roomID = uuid4()

      socket.join(roomID)

      room.players.push(player)

      rooms[roomID] = room

      socket.emit('onGameCreated', {
        room: roomID,
        order: player.order,
        id: player.id
      })
    })

    socket.on('joinGame', (data) => {
      const { roomID, nickname } = data
      const room = rooms[roomID]

      if (!room) {
        console.log('no room available')
        socket.emit('onGameNotFound')
      } else if (room.started || room.players.length === room.mode) {
        console.log('join request : game started')
        socket.emit('onGameAlreadyStarted')
      } else {
        console.log('new player joined')
        // todo : vérifier salle pleine avec length des sockets
        socket.join(roomID)

        const player = {
          id: uuid4(),
          socket,
          nickname,
          victoryCount: 0,
          connected: true
        }

        room.players.sort((a, b) => a.order - b.order)

        for (let i = 0; i < room.mode; i++) {
          if (room.players[i]) {
            if (!room.players[i + 1]) {
              player.order = room.players[i].order + 1
              break
            } else if (room.players[i + 1].order !== room.players[i].order + 1) {
              player.order = room.players[i].order + 1
              break
            }
          } else {
            console.log('impossible')
          } 
        }

        console.log('order : ' + player.order)
        
        socket.emit('onGameJoined', {
          players: room.players.map(x => { return { id: x.id, nickname: x.nickname, order: x.order, nbDominos: 7 } }),
          order: player.order,
          id: player.id
        })

        room.players.push(player)

        socket.broadcast.to(roomID).emit('onNewPlayer', { id: player.id, nickname: player.nickname, order: player.order, nbDominos: 7 })

        if (room.players.length === room.mode) {
          setTimeout(() => {
            console.log('game started')
      
            const hands = startGame()
            
            room.started = true
            room.board = []
            room.currentOrder = 1 // todo : remplacer par aléatoire
      
            for (let i = 0; i < room.players.length; i++) {
              room.players[i].hand = hands[i]
              room.players[i].socket.emit('onGameStarted', { hand: hands[i]})
            }
          }, 1000);
        }
      }
    })

    socket.on('leaveGame', (data) => {
      const { roomID, playerID } = data
      const room = rooms[roomID]

      if (room) {
        const player = room.players.find(x => x.id === playerID)

        if (player) {
          if (room.started) {
            player.connected = false
            if (room.currentOrder === player.order) {
              // todo : activate bot and play immediately
            }
          } else {
            room.players.splice(room.players.indexOf(player), 1)
            socket.broadcast.to(roomID).emit('onPlayerLeft', playerID)
          }
        }
      }
    })

    socket.on('resumeGame', (data) => {
      const { roomID, playerID } = data
      const room = rooms[roomID]

      console.log('game resumed : ' + playerID)

      if (room) {
        const player = room.players.find(x => x.id === playerID)

        if (player) {
          player.connected = true
          socket.join(roomID)
        
          socket.emit('onGameResumed', {
            board: room.board,
            players: room.players.map(x => {
              if (x.id !== playerID) {
                return { id: x.id, nickname: x.nickname, order: x.order, nbDominos: x.hand ? x.hand.length : 7 }
              }
            }),
            hand: player.hand,
            order: player.order,
            currentOrder: room.currentOrder
          })
          // vérifier si c'est son tour ?        
        } else {
          socket.emit('onGameAlreadyStarted')
        }
      } else {
        console.log('this room does not exist')
      }
    })

    socket.on('startGame', (roomID) => {
      console.log('game started')
      
      const hands = startGame()
      const room = rooms[roomID]

      if (!room) { return }
      
      room.started = true
      room.board = []
      room.currentOrder = 1 // todo : remplacer par aléatoire
      room.boudeCount = 0

      for (let i = 0; i < room.players.length; i++) {
        const player = room.players[i]

        player.hand = hands[i]
        player.socket.emit('onGameStarted', { hand: hands[i]})
        
      }
      // // TODO : create logic in client game app to choose first player (for now, it's always the room's owner)
    })

    socket.on('playDomino', (data) => {
      console.log('domino played')
    
      const { roomID, playerID, domino, toLeft } = data
      const room = rooms[roomID]
      const player = room.players.find(x => x.id === playerID)
      const winner = null

      if(!player) { return }

      if (domino) {
        room.boudeCount = 0

        toLeft ?
          room.board.unshift(domino) :
          room.board.push(domino)

        room.currentOrder === room.mode ?
          room.currentOrder = 1 :
          room.currentOrder += 1

        player.hand.splice(player.hand.indexOf(domino), 1)

        if (player.hand.length === 0) {
          room.started = false
          io.to(roomID).emit('onGameFinished', playerID)
        }
      } else {
        console.log('joueur boudé : ' + player.order)
        room.boudeCount += 1

        if (room.boudeCount === room.mode) {
          const count = 200

          room.players.map((p) => {
            const playerCount = p.hand.reduce((acc, x) => acc + x.left + x.right)
            if (playerCount < count) {
              count = playerCount
              winner = p.id
            }
          })

          room.started = false
          io.to(roomID).emit('onGameFinished', winner)
          // TODO : proposer aux joueurs de refaire une partie
        }
      }

      if (!winner) {
        socket.broadcast.to(roomID).emit('onNewDomino', { domino, toLeft, id: playerID })

        const nextPlayer = room.players.find(x => x.order === room.currentOrder)
  
        if (!nextPlayer.connected) {
          // todo : play again if next player is disconnected        
        }
      }
    })
  })
}