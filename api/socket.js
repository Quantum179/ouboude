import SocketIO from 'socket.io'
import { v4 as uuid4} from 'uuid'
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

      const player = { id: socket.id, nickname, order: rooms[roomID].players.length + 1}
      rooms[roomID].players.push(player)

      socket.emit('onGameCreated', {room: roomID, player})
    })

    socket.on('joinGame', (data) => {
      const { roomID, nickname } = data
      console.log(data)

      if (rooms[roomID] && rooms[roomID].started) {
        console.log('join request : game already started')
        socket.emit('onGameAlreadyStarted')
      }
      socket.join(roomID)
      const player = { id: socket.id, nickname, order: rooms[roomID].players.length + 1}

      console.log('new player joined')
      socket.emit('onGameJoined', { players: rooms[roomID].players, success: true })
      socket.broadcast.to(roomID).emit('onNewPlayer', player)

      rooms[roomID].players.push(player)
    })

    socket.on('startGame', (roomID) => {
      const players = io.sockets.clients(roomID)
      const hands = startGame()

      rooms[roomID].started = true

      for (let i = 0; i < players.length; i++) {
        players[i].emit('onGameStarted', {hand: hands[i]})
      }
      // TODO : create logic in client game app to choose first player (for now, it's always the room's owner)
    })

    socket.on('playMove', (move, roomID) => {
      // TODO : check if playerID is valid for this room
      if (validateMove(move)) {
        io.to(roomID).emit('onNewMove', move)
      }
    })
  })
}