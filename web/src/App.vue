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
      <div class="container">
        <div class="popup" v-if="text !== ''">{{text}}</div>
        <div class="selection" v-if="selection">
          <p>Où voulez-vous jouer ?</p>
          <div>
            <div class="btn" @click="playDomino(true)">Gauche</div>
            <div class="btn" @click="playDomino(false)">Droite</div>
          </div>
        </div>
      </div>
      <div class="board" v-if="currentOrder !== null">
        <div class="domino" :class="dominoBoardStyles(domino)" v-for="(domino, i) in board" :key="i">
          <div class="half-dom" :class="`dom-${domino.left}`">
            <div :class="`dot-${j}`" v-for="j in domino.left" :key="j"></div>
          </div>
          <div class="line"></div>
          <div class="half-dom" :class="`dom-${domino.right}`">
            <div :class="`dot-${j}`" v-for="j in domino.right" :key="j"></div>
          </div>
        </div>
      </div>
      <div :class="`player-${player.boardOrder}`" v-for="(player, i) in players" :key="`player-${i}`">
        <div class="domino" v-for="j in player.nbDominos" :key="j"></div>
      </div>
      <div class="player-1" v-if="fetched">
        <div class="avatar"></div>
        <div class="boude-container">
          <div class="btn" @click="playDomino()">Boudé</div>
        </div>
        <div class="turn">
          <span>Tour</span>
          <span>{{currentOrder}}</span>
        </div>
        <div class="domino-list">
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
      nickname: null,
      id: null,
      board: [],
      hand: null,
      selectedDomino: null,
      socket: null,
      display: 'home',
      currentRoom: null,
      text: '',
      error: '',
      wantJoin: false,
      fetched: false,
      selection: false,
      boudeCount: 0,
      isResuming: false,
      mq: {
        mobile: null,
        largeMobile: null,
        tablet: null,
        desktop: null
      }
    }
  },
  computed: {
    isMobile() {
      return this.mq.mobile.matches
    }
  },
  created() {
    debugger
    if (matchMedia) {
      this.mq.mobile = window.matchMedia('(max-width:480px)')
      this.mq.largeMobile = window.matchMedia('(min-width:481px) and (max-width:767px')
      this.mq.tablet = window.matchMedia('(min-width:768px) and (max-width:1024px)')
      this.mq.desktop = window.matchMedia('(min-width:1025px)')

      window.addEventListener('resize', this.changeMediaSize)
    }

    const connection = process.env.NODE_ENV === 'production'
      ? 'https://ouboude-api.herokuapp.com'
      : 'http://localhost:5000'

    this.socket = io.connect('ws://ouboude-api.herokuapp.com', { transports: ['websocket'], upgrade: false })
    console.log(connection)
    // window.addEventListener('scroll', this.changeSection);
  },
  mounted() {
    this.initSocket()
    // this.resumeGame()
  },
  methods: {
    initSocket() {
      const that = this

      this.socket.on('onGameCreated', that.onGameCreated)
      this.socket.on('onGameJoined', that.onGameJoined)
      this.socket.on('onGameResumed', that.onGameResumed)
      this.socket.on('onNewPlayer', that.onNewPlayer)
      this.socket.on('onPlayerLeft', that.onPlayerLeft)
      this.socket.on('onGameStarted', that.onGameStarted)
      this.socket.on('onGameAlreadyStarted', that.onGameAlreadyStarted)
      this.socket.on('onGameFinished', that.onGameFinished)
      this.socket.on('onNewDomino', that.onNewDomino)
      this.socket.on('onCountDominos', that.onCountDominos)

      window.addEventListener('beforeunload', this.closeSocket)
    },
    changeMediaSize() {
      this.$forceUpdate()
    },
    closeSocket() {
      // TODO : save socket in local storage and detect if player is back
      this.socket.emit('leaveGame', { roomID: this.currentRoom, playerID: localStorage.getItem('player') })
      this.socket.close()
    },
    createGame() {
      debugger
      if (document.getElementById('name').value === '') {
        this.error = 'Entrez un nom'
        return
      }

      this.nickname = document.getElementById('name').value
      this.socket.emit('createNewGame', { nickname: this.nickname, mode: 4 })
      this.display = 'game'
    },
    joinGame() {
      this.currentRoom = document.getElementById('room').value
      this.nickname = document.getElementById('name').value

      if (document.getElementById('name').value === '') {
        this.error = 'Entrez un nom'
        return
      }

      this.socket.emit('joinGame', { roomID: this.currentRoom, nickname: this.nickname })
    },
    resumeGame() {
      const roomID = localStorage.getItem('room')
      const playerID = localStorage.getItem('player')

      if (!roomID) { return }

      this.isResuming = true
      this.currentRoom = roomID
      this.id = playerID

      this.socket.emit('resumeGame', { roomID, playerID })
    },
    sendNewDomino(isLeft) {
      this.socket.emit('playDomino', {
        roomID: this.currentRoom,
        playerID: this.id,
        domino: this.selectedDomino,
        toLeft: isLeft
      })

      if (this.selectedDomino) {
        this.hand.splice(this.hand.indexOf(this.selectedDomino), 1)
        this.selectedDomino = null
      }

      this.$forceUpdate()

      this.changeOrder()
    },
    onGameCreated(payload) {
      const {
        room, id, order
      } = payload

      this.currentRoom = room
      this.id = id
      this.playerOrder = order
      this.openPopup(`Voici le lien de la partie : ${room}`)

      localStorage.setItem('room', room)
      localStorage.setItem('player', id)
    },
    onGameJoined(payload) {
      const {
        players, room, id, order
      } = payload

      this.playerOrder = order
      this.id = id
      this.players = players.map((x) => this.createPlayerModel(x))
      this.display = 'game'

      localStorage.setItem('room', room)
      localStorage.setItem('player', id)
    },
    onGameResumed(payload) {
      const {
        board, players, order, hand, currentOrder
      } = payload

      this.board = board
      this.playerOrder = order
      this.currentOrder = currentOrder
      const allPlayers = players.filter((x) => x)
      this.players = allPlayers.map((x) => this.createPlayerModel(x))
      this.hand = hand

      // todo: rajouter les dominos manqués
      this.isResuming = false
      this.display = 'game'
    },
    onGameStarted(payload) {
      this.hand = payload.hand
      this.fetched = true

      if (this.playerOrder === 1) {
        this.openPopup('C\'est votre tour !')
      }
    },
    onGameAlreadyStarted(payload) {
      localStorage.setItem('room', null)
      localStorage.setItem('player', null)

      this.display = 'home'
    },
    onGameFinished(payload) {
      const winner = payload === this.id ? this.nickname : this.players.find((x) => x.id === payload).nickname

      this.openPopup(`${winner} a gagné`)
    },
    onNewPlayer(player) {
      this.openPopup(`Le joueur ${player.nickname} a rejoint la partie`)
      if (player) {
        this.players.push(this.createPlayerModel(player))
      } else {
        console.log('error onNewPlayer')
      }

      this.$forceUpdate()
    },
    onPlayerLeft(id) {
      this.players = this.players.filter((x) => x.id !== id)
    },
    onNewDomino(payload) {
      const { domino, toLeft, id } = payload

      if (domino) {
        const currentPlayer = this.players.find((x) => x.id === id)

        currentPlayer.nbDominos -= 1

        // TODO : améliorer et déplacer côté serveur
        if (this.board.length !== 0 && (toLeft && domino.left === this.board[0].left || !toLeft && domino.right === this.board[this.board.length - 1].right)) {
          const temp = domino.left
          domino.left = domino.right
          domino.right = temp
        }

        // todo : mettre les dominos dans une mémoire tampon si isResuming
        if (toLeft) {
          this.board.unshift(domino)
        } else {
          this.board.push(domino)
        }

        this.$forceUpdate()

        // if (this.currentOrder + 1 === this.playerOrder) {
        //   this.openPopup('C\'est votre tour !')
        // }
      }

      this.changeOrder()
    },
    createPlayerModel(player) {
      return Object.assign(player, { boardOrder: this.getPlayerBoardOrder(player.order) })
    },
    getPlayerBoardOrder(order) {
      return order - this.playerOrder + (order > this.playerOrder ? 1 : 5)
    },
    selectDomino(domino) {
      let left = false
      let right = false

      if (this.currentOrder !== this.playerOrder || !this.canBePlay(domino)) { return }

      if (this.board.length === 0) {
        left = true
      } else {
        if (this.board[0].left === domino.left || this.board[0].left === domino.right) {
          left = true
        }
        if (this.board[this.board.length - 1].right === domino.left || this.board[this.board.length - 1].right === domino.right) {
          right = true
        }
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
      if (this.currentOrder !== this.playerOrder) { return }

      this.selection = false

      if (this.selectedDomino) {
        if (this.board.length !== 0 && (isLeft && this.selectedDomino.left === this.board[0].left || !isLeft && this.selectedDomino.right === this.board[this.board.length - 1].right)) {
          const temp = this.selectedDomino.left
          this.selectedDomino.left = this.selectedDomino.right
          this.selectedDomino.right = temp
        }

        if (isLeft) {
          this.board.unshift(this.selectedDomino)
        } else {
          this.board.push(this.selectedDomino)
        }
      }

      setTimeout(() => {
        this.sendNewDomino(isLeft)
      }, 250)
    },
    canBePlay(domino) {
      if (this.board.length === 0) {
        return true
      }

      const left = this.board[0]
      const right = this.board[this.board.length - 1]

      if (domino.left === left.left || domino.right === left.left) {
        return true
      }
      if (domino.left === right.right || domino.right === right.right) {
        return true
      }

      return false
    },
    isDouble(domino) {
      if (domino.left === domino.right) {
        return true
      }

      return false
    },
    dominoBoardStyles(domino) {
      const isDouble = this.isDouble(domino)
      const index = this.board.indexOf(domino)
      const breakpoint = this.defineShrinkBreapoint()

      return {
        simple: !isDouble,
        double: isDouble,
        mobile: this.isMobile,
        desktop: !this.isMobile,
        shrink: this.board.length > breakpoint && index !== 0 && index !== this.board.length - 1
      }
    },
    defineShrinkBreapoint() {
      const height = window.innerHeight
      const width = window.innerWidth

      if (this.isMobile && height < 500) { return 5 }
      if (this.isMobile && height < 1000) { return 12 }
      if (!this.mobile && width < 1400) { return 12 }
      if (!this.mobile && width < 2000) { return 15 }

      return 10
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

// ::-webkit-scrollbar
//   width 10px

// ::-webkit-scrollbar-track
//   background #f1f1f1

// ::-webkit-scrollbar-thumb
//   background #888

// ::-webkit-scrollbar-thumb:hover
//   background #555

.flex-center
  display flex
  justify-content center
  align-items center

#game
  display grid
  width 100%
  height 100vh
  grid-template-areas:
  '. p3 p3 p3 .'\
  'p2 board board board p4'\
  'p2 board board board p4'\
  'p2 board board board p4'\
  'p1 p1 p1 p1 p1'
  grid-template-rows .5fr .5fr 1fr .5fr .5fr
  grid-template-columns 1fr 1fr 1fr 1fr 1fr

.player-1
  grid-area p1
  display grid
  grid-template-areas:
  'avatar boude turn'\
  'list list list'
  grid-template-rows .2fr 2fr
  grid-template-columns 1fr 2fr 1fr
  justify-content center

.player-2, .player-3, .player-4
  display flex
  justify-content center
  align-items center

.player-2, .player-4
  flex-direction column
  & > .domino
    width 30px
    height 15px
    margin 4px

.player-2
  grid-area p2

.player-3
  grid-area p3
  & > .domino
    width 15px
    height 30px
    margin 4px

.player-4
  grid-area p4

.avatar
  grid-area avatar

.domino-list
  grid-area list
  @extend .flex-center
  & > .domino
    cursor pointer
    width 40px
    height 65px
    margin 4px
    & > .half-dom
      width 80%
      height 42.5%
    & > .line
      width 80%
      height 4px

 .half-dom
  width 80%
  height 40.5%
  display grid
  grid-template-rows repeat(3, 1fr)
  grid-template-columns repeat(3, 1fr)
  padding 5%
  grid-gap 5%

.line
  width 80%
  height 1.5px
  padding 0
  background-color black

[class^='dot-']
  background-color black
  border-radius 50%
  // padding 3px

.board
  @extend .flex-center
  flex-direction column
  min-width 100%
  height 100%

.container, .boude-container
  @extend .flex-center

.board, .container
  grid-area board

.boude-container
  grid-area boude
  & > .btn
    @extend .flex-center
    width 50px
    height 30px
    background-color white
    border-radius 15%
    &:hover
      border 2px solid black

.selection, .popup
  width 80%
  background-color white
  border-radius 50%
  text-align center
  z-index 2

.simple.mobile
  width 20px
  height 35px
  margin .5px
  &.shrink
    width 5px
    height 10px

.simple.desktop
  flex-direction row
  width 75px
  height 45px
  margin .5px
  & > .half-dom
    width 45%
    height 70%
    transform rotate(-90deg)
  & > .line
      width 5px
      height 70%
      padding 5px 0
  &.shrink
    width 32.5px
    height 17.5px

.double.mobile
  flex-direction row
  width 35px
  height 20px
  margin .5px
  & > .half-dom
    width 45%
    height 70%
    transform rotate(-90deg)
  & > .line
    width 4px
    height 70%
    padding 2px 0
  &.shrink
    width 10px
    height 5px

.double.desktop
  width 45px
  height 75px
  margin .5px
  &.shrink
    width 17.5px
    height 32.5px

.domino
  background-color white
  display flex
  flex-direction column
  align-items center
  border 2px solid black
  &.disabled
    background-color rgba(0, 0, 0, 0.45)

.shrink
  margin .25px

.turn
  grid-area turn
  top 20px
  left 20px
  width 75px
  border-radius 50%
  border 2px solid white
  display flex
  justify-content center
  align-items center
  font-size 1em
  flex-direction column
  background-color blue
  color white

// @media (min-width: 401px)

@media (min-width: 768px)
  .board
    flex-direction row

  .domino-list > .domino
    width 70px
    height 120px
    margin 10px

  .boude-container > .btn
    width 80px
    height 60px

@media (min-width: 1023px)
  .board.domino

  .domino-list > .domino
    width 110px
    height 180px
    margin 10px
    & > .half-dom
      width 80%
      height 42.5%
    & > .line
      width 80%
      height 5px

// #game
//   display grid
//   width 100%
//   height 100vh
//   grid-template-areas:
//   '. p3 .'\
//   'p2 board p4'\
//   '. p1 .'
//   grid-template-rows 1fr 2fr 2fr
//   grid-template-columns 1fr 12fr 1fr

// [class^="player-"]
//   display flex
//   justify-content center
//   align-items center

// .board
//   grid-area board
//   display flex
//   justify-content center
//   align-items center
//   min-width 100%
//   height 100%
//   & > .double
//     width 45px
//     height 75px
//     margin .5px
//   & > .simple
//     flex-direction row
//     width 75px
//     height 45px
//     margin .5px
//   & > .double > .half-dom
//     width 70%
//     height 45%
//   & > .simple > .half-dom
//     width 45%
//     height 70%
//     transform rotate(-90deg)
//   & > .simple > .line
//       width 10px
//       height 70%
//       padding 5px 0

// .container
//   @extend .flex-center
//   width 100%
//   height 100%
//   grid-area board
//   z-index 10

// .player-1 > .domino
//   width 110px
//   height 187px
//   margin 10px
//   &:hover
//     margin-bottom 50px

// .player-2, .player-4
//   flex-direction column
//   & > .domino
//     width 100px
//     height 55px
//     margin 4px

// .player-1
//   grid-area p1

// .player-2
//   grid-area p2

// .player-3
//   grid-area p3
//   & > .domino
//     width 55px
//     height 100px
//     margin 4px

// .player-4
//   grid-area p4

// .domino
//   background-color white
//   display flex
//   flex-direction column
//   align-items center
//   border 2px solid black
//   &.disabled
//     background-color rgba(0, 0, 0, 0.45)

// .half-dom
//   width 80%
//   height 42.5%
//   display grid
//   grid-template-rows repeat(3, 1fr)
//   grid-template-columns repeat(3, 1fr)
//   padding 5%
//   grid-gap 2%

// .line
//   width 70%
//   height 10px
//   padding 0 10%
//   background-color black

// [class^='dot-']
//   background-color black
//   border-radius 50%
//   padding 3px

// .container
//   @extend .flex-center
//   width 100%
//   height 100%
//   z-index 10

// .popup, .selection
//   @extend .flex-center
//   flex-direction column
//   background-color white
//   width 40%
//   height 15vh
//   border-radius 50%

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
