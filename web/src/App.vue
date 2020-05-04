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
      <div class="selection" v-if="selection">
        <p>Où voulez-vous jouer ?</p>
        <div class="btn" @click="playDomino(true)">Gauche</div>
        <div class="btn" @click="playDomino(false)">Droite</div>
      </div>
    </div>
    <div class="board" v-if="currentOrder !== null">
      <div v-for="(domino, i) in board" :key="i" :class="{hightlighted : canBePlayOn(domino)}"></div>
    </div>
    <div :class="`player-${i+1}`" v-for="i in 3" :key="`player-${i}`">
      <div class="domino" v-for="j in otherHands[i+1]" :key="j"></div>
    </div>
    <div class="player-1" v-if="fetched">
      <div class="domino" v-for="(domino, i) in hand" :key="i"
      @click="selectDomino(domino)"
      :class="{selected: selectedDomino === domino, disabled: !canBePlay(domino) }">
        <div class="half-dom" :class="`dom-${domino.left}`">
          <div :class="`dot-${j}`" v-for="j in domino.left" :key="j"></div>
        </div>
        <div class="line"></div>
        <div class="half-dom" :class="`dom-${domino.right}`">
          <div :class="`dot-${j}`" v-for="j in domino.right" :key="j"></div>
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
      playerOrder: null,
      currentOrder: 1,
      board: [],
      hand: null,
      selectedDomino: null,
      socket: io.connect('http://localhost:5000'),
      display: 'home',
      currentRoom: null,
      text: '',
      error: '',
      wantJoin: false,
      fetched: false,
      selection: false,
      otherHands: {
        2: 7,
        3: 7,
        4: 7
      }
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
      this.socket.on('onNewDomino', that.onNewDomino)
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
    sendNewDomino(isLeft) {
      this.socket.emit('playDomino', { domino: this.selectedDomino, toLeft: isLeft })
      this.hand.splice(this.hand.indexOf(this.selectedDomino), 1)

      if (this.hand.length === 0) {
        this.finishGame(this.currentOrder)
      }

      this.changeOrder()
    },
    onGameCreated(payload) {
      this.currentRoom = payload.room
      this.openPopup(`Voici le lien de la partie : ${this.currentRoom}`)
      this.players.push(payload.player)
      this.playerOrder = payload.order
      // TODO : display popup with custom link to join the room
    },
    onGameJoined(payload) {
      if (payload.success) {
        this.currentRoom = payload.room
        this.players = payload.players
        this.playerOrder = payload.order
        this.display = 'game'
        // TODO : display others players
      }
    },
    onGameStarted(payload) {
      this.hand = payload.hand
      this.fetched = true

      if (this.playerOrder === 1) {
        this.openPopup('C\'est votre tour !')
      }
    },
    onNewPlayer(player) {
      this.openPopup(`Le joueur ${player.nickname} a rejoint la partie`)
      this.players.push(player)

      if (this.players.length === 4 && this.currentOrder === 1) {
        setTimeout(() => {
          this.socket.emit('startGame', this.currentRoom)
        }, 2000);
      }
      // display hidden hand of new player on grid
    },
    onNewDomino(payload) {
      // TODO : add new domino to currentPlayer's board
      // TODO : check if it's currentPlayer's turn
      if(payload.domino) {
        this.otherHands[this.currentOrder] -= 1

        if (this.otherHands[this.currentOrder] === 0) {
          this.finishGame(this.currentOrder)
        } else {
          if(payload.toLeft) {
            this.board.unshift(payload.domino)
          } else {
            this.board.push(payload.domino)
          }

          if (this.currentOrder === this.playerOrder) {
            this.openPopup('C\'est votre tour !')
          }              
        }
      }

      this.changeOrder()
    },
    selectDomino(domino) {
      let left = false
      let right = false

      if (this.board[0].left === domino.left || this.board[0].left === domino.right) {
        left = true
      }
      if (this.board[0].right === domino.left || this.board[0].right === domino.right) {
        right = true
      }

      this.selectedDomino = domino

      if (left && right) {
        this.selection = true
      } else if (left) {
        this.playDomino(true)
      } else if (right) {
        this.playDomino(false)
      }
    },
    playDomino(isLeft) {
      if (isLeft) {
        this.board.unshift(this.selectedDomino)
      } else {
        this.board.push(this.selectedDomino)
      }

      setTimeout(() => {
        this.sendNewDomino(isLeft)
      }, 250)
    },
    canBePlayOn(domino) {
      const left = this.board[0]
      const right = this.board[this.board.length - 1]

      if (!this.selectedDomino) { return false }

      if (left === domino && (this.selectionDomino.left === left.left || this.selectedDomino.right === left.right)) {
        return true
      }
      if (right === domino && (this.selectionDomino.left === left.left || this.selectedDomino.right === left.right)) {
        return true
      }

      return false
    },
    canBePlay(domino) {
      const left = this.board[0]
      const right = this.board[this.board.length - 1]

      if (domino.left === left.left || domino.right === left.right) {
        return true
      }
      if (domino.left === left.left || domino.right === left.right) {
        return true
      }

      return false
    },
    finishGame(winner) {
      // TODO : all visual events on finished game
      this.socket.emit('finishGame', winner)
    },
    openPopup(text) {
      this.text = text
      this.closePopup()
    },
    closePopup() {
      setTimeout(() => {
        this.text = ''
      }, 3500)
    },
    changeOrder() {
      if (this.currentOrder === 4) {
        this.currentOrder = 1
      } else {
        this.currentOrder += 1
      }
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
  display flex
  justify-content center
  align-item center
  & > div
    width 100px
    height 55px
    background-color white
    border 2px solid black
    margin .5px
    &.hightlighted
      background-color rgba(50, 205, 50, 0.6)
    &.disabled
      background-color rgba(0, 0, 0, 0.6)

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
  &:hover
    background-color rgba(0, 0, 0, 0.5)
  &.selected
    margin-bottom 10px

.half-dom
  width 80%
  height 42.5%
  display grid
  grid-template-rows repeat(3, 1fr)
  grid-template-columns repeat(3, 1fr)
  grid-gap 10%
  padding 5%

.line
  width 65%
  height 5%
  padding 0 10%
  background-color black

[class^='dot-']
  background-color black
  border-radius 50%
  padding 10px

.container
  @extend .flex-center
  width 100%
  height 100%
  grid-area board

.popup, .selection
  @extend .flex-center
  background-color white
  width 40%
  height 15vh
  border-radius 50%

.room
  position fixed
  left 10px
  top 10px

// TODO : mettre dans un fichier .styl
.dom-1
  grid-template-areas:
    '. . .'\
    '. dot1 .'\
    '. . .'

.dom-2
  grid-template-areas:
    '. . dot1'\
    '. . .'\
    'dot2 . .'

.dom-3
  grid-template-areas:
    '. . dot1'\
    '. dot2 .'\
    'dot3 . .'

.dom-4
  grid-template-areas:
    'dot1 . dot2'\
    '. . .'\
    'dot3 . dot4'

.dom-5
  grid-template-areas:
    'dot1 . dot2'\
    '. dot3 .'\
    'dot4 . dot5'

.dom-6
  grid-template-areas:
    'dot1 . dot2'\
    'dot3 . dot4'\
    'dot5 . dot6'

// TODO : search how to create classes in a loop
.dot-1
  grid-area dot1

.dot-2
  grid-area dot2

.dot-3
  grid-area dot3

.dot-4
  grid-area dot4

.dot-5
  grid-area dot5

.dot-6
  grid-area dot6


</style>
