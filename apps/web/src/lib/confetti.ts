import confetti from 'canvas-confetti'

export function fireTaskComplete() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#6366f1', '#818cf8', '#a5b4fc', '#22c55e', '#86efac'],
  })
}

export function fireLevelUp() {
  const end = Date.now() + 2000

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#6366f1', '#a855f7', '#ec4899'],
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#6366f1', '#a855f7', '#ec4899'],
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

export function fireSubtaskComplete() {
  confetti({
    particleCount: 20,
    spread: 40,
    origin: { y: 0.5 },
    scalar: 0.6,
    colors: ['#6366f1', '#818cf8', '#a5b4fc'],
  })
}
