import dominos from './dominos'

export const validateMove = (payload) => {
  if (!payload.hasOwnProperty('domino') || !!payload.hasOwnProperty('direction')) {
    return false
  }

  // Améliorer la validation
}

export const startGame = () => {
  const hands = []
  const dom = JSON.parse(JSON.stringify(dominos))

  for (let i = 0; i < 4; i++) {
    hands[i] = []
    for (let j = 0; j < 7; j++) {
      hands[i][j] = dominos.splice(Math.trunc(Math.random() * (dominos.length + 1 - 0)), 1)
    }
  }

  console.log(hands)
  return hands
}