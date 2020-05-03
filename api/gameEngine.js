import dominos from './dominos'

export const validateMove = (payload) => {
  if (!payload.hasOwnProperty('domino') || !!payload.hasOwnProperty('direction')) {
    return false
  }

  // Améliorer la validation
}

export const startGame = () => {
  const hands = []
  let dom = JSON.parse(JSON.stringify(dominos))

  for (let i = 0; i < 4; i++) {
    hands[i] = []

    for (let j = 0; j < 7; j++) {
      let index
      
      do {
        index = Math.floor(Math.random() * (dom.length + 1))
      } while(!dom[index])

      hands[i].push(dom[index])
      dom.splice(index, 1)
    }
  }

  return hands
}