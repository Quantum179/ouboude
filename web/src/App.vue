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
    <div :class="`player-${i+1}`" v-for="i in 3" :key="`player-${i}`">
      <div class="domino" v-for="j in 7" :key="j"></div>
    </div>
    <div class="player-1" v-if="fetched">
      <div class="domino" v-for="(domino, i) in hand" :key="i">
        <div class="half-dom" :class="`dom-${domino.left}`">
          <div class="dot" v-for="j in domino.left" :key="j"></div>
        </div>
        <div class="line"></div>
        <div class="half-dom" :class="`dom-${domino.right}`">
          <div class="dot" v-for="j in domino.right" :key="j"></div>
        </div>
      </div>
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
      currentOrder: null,
      board: [],
      hand: null,
      selectedDomino: null,
      socket: io.connect('http://localhost:5000'),
      display: 'home',
      currentRoom: null,
      text: '',
      error: '',
      wantJoin: false,
      fetched: false
    }
  },
  mounted() {
    this.initSocket()
  },
  methods: {
    initSocket() {
      const that = this

      this.socket.on('onGameCreated', that.onGameCreated)
      this.socket.on('onGameJoined', that.onGameJoined)
      this.socket.on('onNewPlayer', that.onNewPlayer)
      this.socket.on('onGameStarted', that.onGameStarted)
      this.socket.on('onNewMove', that.onNewMove)
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
    onGameCreated(payload) {
      this.currentRoom = payload.room
      this.text = `Voici le lien de la partie : ${this.currentRoom}`
      this.closePopup()
      this.players.push(payload.player)
      this.currentOrder = payload.order
      // TODO : display popup with custom link to join the room
    },
    onGameJoined(payload) {
      if (payload.success) {
        this.players = payload.players
        this.currentOrder = payload.order
        this.display = 'game'
        // TODO : display others players
      }
    },
    onNewPlayer(player) {
      this.text = `Le joueur ${player.nickname} a rejoint la partie`
      this.closePopup()
      this.players.push(player)

      if (this.players.length === 4 && this.currentOrder === 1) {
        setTimeout(() => {
          this.socket.emit('startGame', this.currentRoom)
        }, 2000);
      }
      // display hidden hand of new player on grid
    },
    onGameStarted(payload) {
      this.hand = payload.hand
      this.fetched = true
      // TODO : tell player 1 it's his turn
    },
    onNewMove(payload) {
      // TODO : add new domino to currentPlayer's board
      // TODO : check if it's currentPlayer's turn
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
  display flex
  flex-direction column
  align-items center
  border 2px solid black

.half-dom
  width 100%
  height 50%
  display flex

.line
  width 65%
  height 5%
  padding 0 10%
  background-color black

.dot
  width 50px
  height 50px
  background-color black
  border-radius 50%

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
