<template>
  <div class="typing-game">
    <div class="typing-header">
      <span class="typing-title">⌨️ 打字练习</span>
      <div class="typing-controls">
        <select v-model="selectedDifficulty" class="difficulty-select" @change="onDifficultyChange">
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>
    </div>

    <div class="typing-divider"></div>

    <div class="word-display" ref="wordDisplayRef">
      <span
        v-for="(tc, i) in typedChars"
        :key="i"
        class="char"
        :class="{
          'char-correct': tc.status === 'correct',
          'char-incorrect': tc.status === 'incorrect',
          'char-cursor': i === cursorPos && tc.status === 'pending',
          'char-pending': tc.status === 'pending' && i !== cursorPos,
        }"
      >{{ tc.char === ' ' ? '\u00A0' : tc.char }}</span>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
    </div>

    <div class="stats-bar">
      <span class="stat">WPM: <strong>{{ stats.wpm }}</strong></span>
      <span class="stat">准确率: <strong>{{ stats.accuracy }}%</strong></span>
      <span class="stat">连击: <strong>{{ stats.streak }}</strong><span v-if="stats.streak >= 5">🔥</span></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTypingGame } from '../composables/useTypingGame'
import type { Difficulty } from '../data/typingWords'

const emit = defineEmits<{
  close: []
  correct: []
  mistake: []
  wordComplete: [coins: number]
  streak: [streak: number, coins: number]
  idle: []
  speech: [text: string]
}>()

const selectedDifficulty = ref<Difficulty>('easy')
const wordDisplayRef = ref<HTMLElement | null>(null)

const {
  currentWord,
  cursorPos,
  typedChars,
  stats,
  startGame,
  stopGame,
  handleKeyPress,
  setDifficulty,
} = useTypingGame({
  onCorrect: () => emit('correct'),
  onMistake: () => emit('mistake'),
  onWordComplete: (coins) => emit('wordComplete', coins),
  onStreak: (streak, coins) => emit('streak', streak, coins),
  onIdle: () => emit('idle'),
  onSpeech: (text) => emit('speech', text),
})

const progressPercent = computed(() => {
  if (currentWord.value.length === 0) return 0
  return Math.round((cursorPos.value / currentWord.value.length) * 100)
})

function onDifficultyChange() {
  setDifficulty(selectedDifficulty.value)
}

function onKeyDown(e: KeyboardEvent) {
  // Ignore modifier keys, function keys, etc.
  if (e.ctrlKey || e.altKey || e.metaKey) return
  if (e.key.length !== 1) return

  e.preventDefault()
  handleKeyPress(e.key)
}

onMounted(() => {
  startGame()
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  stopGame()
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.typing-game {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  height: 100%;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.typing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.typing-title {
  font-size: 14px;
  font-weight: 600;
  color: #5a4a3a;
}

.typing-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.difficulty-select {
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid #e0d5c8;
  border-radius: 6px;
  background: #fff9f0;
  color: #5a4a3a;
  cursor: pointer;
  outline: none;
}

.difficulty-select:focus {
  border-color: #d4a574;
}

.close-btn {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: #999;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
}

.close-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.typing-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #e0d5c8, transparent);
}

.word-display {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', 'SF Mono', monospace;
  font-size: 20px;
  letter-spacing: 2px;
  line-height: 1.6;
}

.char {
  display: inline-block;
  padding: 1px 2px;
  border-radius: 2px;
  transition: all 0.15s ease;
}

.char-correct {
  color: #34c759;
  font-weight: 600;
}

.char-incorrect {
  color: #ff3b30;
  font-weight: 600;
  background: rgba(255, 59, 48, 0.12);
  animation: char-shake 0.3s ease-in-out;
}

.char-cursor {
  color: #d4a574;
  border-bottom: 2px solid #d4a574;
  animation: cursor-blink 1s ease-in-out infinite;
}

.char-pending {
  color: #bbb;
}

@keyframes char-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

@keyframes cursor-blink {
  0%, 100% { border-bottom-color: #d4a574; }
  50% { border-bottom-color: transparent; }
}

.progress-bar {
  height: 4px;
  background: #f0e8dc;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(to right, #d4a574, #e8c49a);
  border-radius: 2px;
  transition: width 0.2s ease;
}

.stats-bar {
  display: flex;
  justify-content: space-around;
  font-size: 11px;
  color: #8a7a6a;
}

.stat strong {
  color: #5a4a3a;
}
</style>
