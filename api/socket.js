import SocketIO from 'socket.io'
import { v4 as uuid4 } from 'uuid'
import util from 'util'
import { validateMove, startGame } from './gameEngine'

const rooms = []

export const initSocket = (server) => {
  const io = new SocketIO(server)
  io.set('origins', 'http://localhost:8080')

  io.on('connection', (socket) => {
    console.log('a new socket client is connected')

    socket.on('createNewGame', (nickname) => {
      console.log('game creation request')

      const roomID = uuid4()

      socket.join(roomID)

      rooms[roomID] = {}
      rooms[roomID].created = true
      rooms[roomID].players = []

      const player = { socket, nickname, order: rooms[roomID].players.length + 1 }

      rooms[roomID].players.push(player)

      socket.emit('onGameCreated', { room: roomID, order: player.order })
    })

    socket.on('joinGame', (data) => {
      const { roomID, nickname } = data

      if (rooms[roomID] && rooms[roomID].started) {
        console.log('join request : game already started')
        socket.emit('onGameAlreadyStarted')
      }
      else if (!rooms[roomID]) {
        console.log('no room available')
        socket.emit('onGameNotFound')
      } else {
        console.log('new player joined')
        socket.join(roomID)

        const player = { socket, nickname, order: rooms[roomID].players.length + 1 }
  
        rooms[roomID].players.push(player)
        
        socket.emit('onGameJoined', {
          players: rooms[roomID].players.map(x => { return { nickname: x.nickname, order: x.order } }),
          order: player.order,
          success: true
        })
        socket.broadcast.to(roomID).emit('onNewPlayer', { nickname: player.nickname, order: player.order })
      }
    })

    socket.on('startGame', (roomID) => {
      const hands = startGame()
      const room = rooms[roomID]

      if (!room) { return }
      
      room.started = true

      for (let i = 0; i < room.players.length; i++) {
        room.players[i].socket.emit('onGameStarted', {hand: hands[i]});
      }
      // // TODO : create logic in client game app to choose first player (for now, it's always the room's owner)
    })

    socket.on('playDomino', (domino, roomID) => {
      // TODO : check if playerID is valid for this room
      if (validateDomino(domino)) {
        socket.broadcast.to(roomID).emit('onNewDomino', domino)
      }
    })

    socket.on('finishGame', (winner, roomID) => {
      // TODO : logic ?
      socket.broadcast.to(roomID).emit('onGameFinished', winner)
    })
  })
}