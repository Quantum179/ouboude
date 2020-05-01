<template>
<transition>
  <div id="home" key="1">
    <div class="btn">Nouvelle partie</div>
  </div>
  <div id="game" key="2">
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
export default {
  name: 'GameBoard',
  data() {
    return {

    }
  },
  mounted() {
    this.initSocket()
  },
  methods: {
    initSocket() {
      const that = this
      const socket = io.connect('http://localhost:5000')

      socket.on('onGameCreated', (data) => {
        
      })

      
      socket.on('onNewPlayer', (data) => {
        // display hidden hand of new player on grid
      })

      
      socket.on('onGameStarted', (data) => {
        
      })

      
      socket.on('onNewMove', (data) => {
        
      })
    },
  }
}
</script>
<style lang="stylus">
body
  margin 0
  background-color navajowhite

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
</style>
