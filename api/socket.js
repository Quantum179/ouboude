import SocketIO from 'socket.io'
import { v4 as uuid4} from 'uuid'
import { validateMove, startGame } from './gameEngine'

export const initSocket = (server) => {
  const io = new SocketIO(server)
  io.set('origins', 'http://localhost:8080')
  io.on('connection', (socket) => {
    console.log('a new socket client is connected')

    socket.on('createNewGame', () => {
      const roomID = uuid4()
      const playerID = uuid4()

      socket.nickname = playerID

      socket.join(roomID)
      socket.emit('onGameCreated', { roomID, playerID })
    })

    socket.on('joinGame', (roomID) => {
      const playerID = uuid4()

      socket.nickname = playerID

      socket.join(roomID)
      io.to(roomID).emit('onNewPlayer', {playerID, nbPlayers: io.sockets.clients(roomID).length})
    })

    socket.on('startGame', (roomID) => {
      const players = io.sockets.clients(roomID)
      const hands = startGame()

      for (let i = 0; i < players.length; i++) {
        players[i].emit('onGameStarted', {order: i+1, hand: hands[i]})
      }

      // TODO : create logic in client game app to choose first player (for now, it's always the room's owner)
    })

    socket.on('sendNewMove', (move, roomID) => {
      // TODO : check if playerID is valid for this room
      if (validateMove(move)) {
        io.to(roomID).emit('onNewMove', move)
      }
    })
  })
}