<template>
<transition>
  <div id="home" key="1" v-if="display === 'home'">
    <div class="input-group">
      <label for="name">Entrez votre pseudo :</label>
      <input type="text" id="name" name="name" required maxlength="20">
      <div class="error" v-if="error !== ''" style="color:red">{{error}}</div>
    </div>
    <div class="btn" @click="createGame()">Nouvelle partie</div>
    <div class="btn" @click="wantJoin = true">Rejoindre une partie</div>
    <div v-if="wantJoin">
      <input type="text" id="room" name="room" minlength ="36" maxlength="36">
      <div class="btn" @click="joinGame()">Rejoindre la partie</div>
    </div>
  </div>
  <div id="game" key="2" v-if="display === 'game'">
    <div class="room">{{currentRoom}}</div>
    <div class="container" v-if="text !== ''">
      <div class="popup">{{text}}</div>
    </div>
    <div class="board">PLATEAU DE JEU</div>
    <div :class="`player-${index}`" v-for="index in 4" :key="index">
      <div class="domino">5 - 1</div>
      <div class="domino">6 - 2</div>
      <div class="domino">6 - 2</div>
      <div class="domino">6 - 2</div>
      <div class="domino">6 - 2</div>
      <div class="domino">6 - 2</div>
      <div class="domino">6 - 2</div>
    </div>
  </div>
</transition>
</template>
<script>
import io from 'socket.io-client'

export default {
  name: 'GameBoard',
  data() {
    return {
      players: [],
      currentPlayer: null,
      board: [],
      hand: null,
      selectedDomino: null,
      socket: io.connect('http://localhost:5000'),
      display: 'home',
      currentRoom: null,
      text: '',
      error: '',
      wantJoin: false
    }
  },
  mounted() {
    this.initSocket()
  },
  methods: {
    initSocket() {
      const that = this

      this.socket.on('onGameCreated', (data) => {
        this.currentRoom = data.room
        this.text = `Voici le lien de la partie : ${this.currentRoom}`
        this.closePopup()
        this.players.push(data.player)
        this.currentPlayer = player
        // TODO : display popup with custom link to join the room
      })
      this.socket.on('onGameJoined', (data) => {
        if (data.success) {
          this.display = 'game'
          // TODO : display others players
        }
      })
      this.socket.on('onNewPlayer', (data) => {
        this.text = `Le joueur ${data.nickname} a rejoint la partie`
        this.closePopup()
        this.players.push(data.player)

        if(this.players.length === 4 && this.currentPlayer.order === 1) {
          this.socket.emit('startGame', this.currentRoom)
        }
        // display hidden hand of new player on grid
      })


      this.socket.on('onGameStarted', (data) => {
        console.log(data)
        this.hand = data.hand
        // TODO : tell player 1 it's his turn
      })


      this.socket.on('onNewMove', (data) => {
        // TODO : add new domino to currentPlayer's board
        // TODO : check if it's currentPlayer's turn
      })
    },
    createGame() {
      if (document.getElementById('name').value === '') {
        this.error = 'Entrez un nom'
        return
      }

      this.socket.emit('createNewGame', document.getElementById('name').value)
      this.display = 'game'
    },
    joinGame() {
      if (document.getElementById('name').value === '') {
        this.error = 'Entrez un nom'
        return
      }

      this.socket.emit('joinGame', { roomID: document.getElementById('room').value, nickname: document.getElementById('name').value })
    },
    playMove() {
      this.socket.emit('playMove', {})
    },
    closePopup() {
      setTimeout(() => {
        this.text = ''
      }, 3500)
    }
  }
}
</script>
<style lang="stylus">
body
  margin 0
  background-color navajowhite

.flex-center
  display flex
  justify-content center
  align-items center

#game
  display grid
  width 100%
  height 100vh
  grid-template-areas:
  '. p3 .'\
  'p2 board p4'\
  '. p1 .'
  grid-template-rows 1fr 2fr 2fr
  grid-template-columns 1fr 4fr 1fr

.board
  grid-area board

[class^="player-"]
  display flex
  justify-content center
  align-items center

.player-1
  grid-area p1

.player-2
  grid-area p2
  flex-direction column
  & > .domino
    min-width 75px

.player-3
  grid-area p3
  & > .domino
    width 8% !important

.player-4
  grid-area p4
  flex-direction column
  & > .domino
    min-width 75px

.domino
  width 13%
  height 55%
  background-color white
  margin 10px

.container
  @extend .flex-center
  width 100%
  height 100%
  grid-area board

.popup
  @extend .flex-center
  background-color white
  width 40%
  height 15vh
  border-radius 50%

.room
  position fixed
  left 10px
  top 10px
</style>
