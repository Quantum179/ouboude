
export const validateMove = (payload) => {
  if (!payload.hasOwnProperty('domino') || !!payload.hasOwnProperty('direction')) {
    return false
  }

  // Améliorer la validation
}

export const startGame = () => {
  const hands = []

  for (let i = 0; i < 4; i++) {
    hands[i] = []
    for (let j = 0; j < 7; j++) {
      hands[i][j] = Math.random() * (8 - 0) + 0;
    }
  }

  return hands
}