// src/composables/useTypingGame.ts
import { ref } from 'vue'
import { wordBank, typingReactions, type Difficulty } from '../data/typingWords'

export interface TypingStats {
  wpm: number
  accuracy: number
  streak: number
  bestStreak: number
  wordsCompleted: number
  totalChars: number
  correctChars: number
}

export interface TypedChar {
  char: string
  status: 'correct' | 'incorrect' | 'pending'
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function useTypingGame(callbacks: {
  onCorrect: () => void
  onMistake: () => void
  onWordComplete: (coins: number) => void
  onStreak: (streak: number, coins: number) => void
  onIdle: () => void
  onSpeech: (text: string) => void
}) {
  const difficulty = ref<Difficulty>('easy')
  const isActive = ref(false)
  const currentWord = ref('')
  const cursorPos = ref(0)
  const typedChars = ref<TypedChar[]>([])

  const stats = ref<TypingStats>({
    wpm: 0,
    accuracy: 100,
    streak: 0,
    bestStreak: 0,
    wordsCompleted: 0,
    totalChars: 0,
    correctChars: 0,
  })

  let startTime = 0
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      if (isActive.value) {
        callbacks.onIdle()
        callbacks.onSpeech(pickRandom(typingReactions.idle))
      }
    }, 8000)
  }

  function pickNewWord() {
    const words = wordBank[difficulty.value]
    const word = words[Math.floor(Math.random() * words.length)]
    currentWord.value = word
    cursorPos.value = 0
    typedChars.value = word.split('').map(char => ({
      char,
      status: 'pending' as const,
    }))
  }

  function startGame() {
    isActive.value = true
    startTime = Date.now()
    stats.value = {
      wpm: 0,
      accuracy: 100,
      streak: 0,
      bestStreak: 0,
      wordsCompleted: 0,
      totalChars: 0,
      correctChars: 0,
    }
    pickNewWord()
    resetIdleTimer()
  }

  function stopGame() {
    isActive.value = false
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  function updateWpm() {
    const elapsed = (Date.now() - startTime) / 60000 // minutes
    if (elapsed > 0 && stats.value.correctChars > 0) {
      // Standard WPM: characters / 5 / minutes
      stats.value.wpm = Math.round((stats.value.correctChars / 5) / elapsed)
    }
  }

  function updateAccuracy() {
    if (stats.value.totalChars > 0) {
      stats.value.accuracy = Math.round((stats.value.correctChars / stats.value.totalChars) * 100)
    }
  }

  function handleKeyPress(key: string) {
    if (!isActive.value || cursorPos.value >= currentWord.value.length) return

    resetIdleTimer()
    stats.value.totalChars++

    const expected = currentWord.value[cursorPos.value]

    if (key === expected) {
      // Correct
      typedChars.value[cursorPos.value].status = 'correct'
      cursorPos.value++
      stats.value.correctChars++
      stats.value.streak++

      if (stats.value.streak > stats.value.bestStreak) {
        stats.value.bestStreak = stats.value.streak
      }

      updateWpm()
      updateAccuracy()

      // 20% chance to trigger running reaction on correct
      if (Math.random() < 0.2) {
        callbacks.onCorrect()
        callbacks.onSpeech(pickRandom(typingReactions.correct))
      }

      // Streak milestone at 20
      if (stats.value.streak > 0 && stats.value.streak % 20 === 0) {
        const streakCoins = 5
        callbacks.onStreak(stats.value.streak, streakCoins)
        callbacks.onSpeech(pickRandom(typingReactions.streak))
      }

      // Word complete
      if (cursorPos.value >= currentWord.value.length) {
        stats.value.wordsCompleted++
        let wordCoins = 1
        if (stats.value.wpm > 60) wordCoins += 2

        callbacks.onWordComplete(wordCoins)
        callbacks.onSpeech(pickRandom(typingReactions.wordComplete))

        // Pick next word after a short delay
        setTimeout(() => {
          if (isActive.value) {
            pickNewWord()
          }
        }, 600)
      }
    } else {
      // Mistake
      typedChars.value[cursorPos.value].status = 'incorrect'
      stats.value.streak = 0

      updateAccuracy()

      callbacks.onMistake()
      callbacks.onSpeech(pickRandom(typingReactions.mistake))

      // Reset the incorrect character after a short delay
      setTimeout(() => {
        if (cursorPos.value < typedChars.value.length && typedChars.value[cursorPos.value].status === 'incorrect') {
          typedChars.value[cursorPos.value].status = 'pending'
        }
      }, 300)
    }
  }

  function setDifficulty(d: Difficulty) {
    difficulty.value = d
    if (isActive.value) {
      pickNewWord()
    }
  }

  return {
    difficulty,
    isActive,
    currentWord,
    cursorPos,
    typedChars,
    stats,
    startGame,
    stopGame,
    handleKeyPress,
    setDifficulty,
  }
}
