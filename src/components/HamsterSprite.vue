<template>
  <div class="hamster-sprite" :class="state">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Running wheel (behind hamster) -->
      <g v-if="state === 'running'" class="wheel">
        <circle cx="100" cy="130" r="45" fill="none" stroke="#ccc" stroke-width="3" />
        <line x1="100" y1="85" x2="100" y2="175" stroke="#ddd" stroke-width="1.5" />
        <line x1="55" y1="130" x2="145" y2="130" stroke="#ddd" stroke-width="1.5" />
        <line x1="68" y1="98" x2="132" y2="162" stroke="#ddd" stroke-width="1.5" />
        <line x1="132" y1="98" x2="68" y2="162" stroke="#ddd" stroke-width="1.5" />
      </g>

      <!-- Sleeping zzZ -->
      <g v-if="state === 'sleeping'" class="zzz">
        <text x="150" y="50" font-size="18" fill="#7b9ec7" opacity="0.9" class="z1">z</text>
        <text x="162" y="35" font-size="14" fill="#7b9ec7" opacity="0.7" class="z2">z</text>
        <text x="172" y="22" font-size="10" fill="#7b9ec7" opacity="0.5" class="z3">Z</text>
      </g>

      <!-- Tail -->
      <ellipse class="tail" cx="45" cy="148" rx="10" ry="7" fill="#e8a862" transform="rotate(-20, 45, 148)" />

      <!-- Body -->
      <ellipse class="body" cx="100" cy="140" rx="50" ry="40" fill="#f0b866" />
      <!-- Belly -->
      <ellipse cx="100" cy="148" rx="32" ry="26" fill="#fce4b8" />

      <!-- Left paw -->
      <g class="left-paw">
        <ellipse cx="68" cy="170" rx="10" ry="6" fill="#e8a862" />
      </g>
      <!-- Right paw -->
      <g class="right-paw">
        <ellipse cx="132" cy="170" rx="10" ry="6" fill="#e8a862" />
      </g>

      <!-- Left arm -->
      <g class="left-arm">
        <ellipse cx="60" cy="138" rx="8" ry="12" fill="#e8a862" transform="rotate(15, 60, 138)" />
      </g>
      <!-- Right arm -->
      <g class="right-arm">
        <ellipse cx="140" cy="138" rx="8" ry="12" fill="#e8a862" transform="rotate(-15, 140, 138)" />
      </g>

      <!-- Food (eating state) -->
      <g v-if="state === 'eating'" class="food-item">
        <circle cx="100" cy="118" r="6" fill="#f5d76e" stroke="#d4a017" stroke-width="1" />
        <circle cx="97" cy="116" r="1" fill="#d4a017" />
        <circle cx="103" cy="120" r="1" fill="#d4a017" />
      </g>

      <!-- Head -->
      <circle class="head" cx="100" cy="95" r="38" fill="#f0b866" />

      <!-- Left ear -->
      <ellipse cx="72" cy="65" rx="14" ry="16" fill="#f0b866" />
      <ellipse cx="72" cy="65" rx="9" ry="11" fill="#f8b4b4" />

      <!-- Right ear -->
      <ellipse cx="128" cy="65" rx="14" ry="16" fill="#f0b866" />
      <ellipse cx="128" cy="65" rx="9" ry="11" fill="#f8b4b4" />

      <!-- Face -->
      <g class="face">
        <!-- Left blush -->
        <ellipse cx="74" cy="102" rx="10" ry="6" fill="#f8b4b4" opacity="0.6" />
        <!-- Right blush -->
        <ellipse cx="126" cy="102" rx="10" ry="6" fill="#f8b4b4" opacity="0.6" />

        <!-- Eyes -->
        <g class="eyes">
          <template v-if="state === 'sleeping'">
            <!-- Sleeping: line eyes -->
            <line x1="82" y1="92" x2="94" y2="92" stroke="#4a3520" stroke-width="2.5" stroke-linecap="round" />
            <line x1="106" y1="92" x2="118" y2="92" stroke="#4a3520" stroke-width="2.5" stroke-linecap="round" />
          </template>
          <template v-else-if="state === 'happy'">
            <!-- Happy: arc eyes -->
            <path d="M82,95 Q88,86 94,95" fill="none" stroke="#4a3520" stroke-width="2.5" stroke-linecap="round" />
            <path d="M106,95 Q112,86 118,95" fill="none" stroke="#4a3520" stroke-width="2.5" stroke-linecap="round" />
          </template>
          <template v-else>
            <!-- Normal bean eyes -->
            <g class="blink-group">
              <ellipse class="eye-left" cx="88" cy="92" rx="5" ry="6" fill="#4a3520" />
              <circle cx="86" cy="90" r="2" fill="white" />
              <ellipse class="eye-right" cx="112" cy="92" rx="5" ry="6" fill="#4a3520" />
              <circle cx="110" cy="90" r="2" fill="white" />
            </g>
          </template>
        </g>

        <!-- Nose -->
        <ellipse cx="100" cy="100" rx="3" ry="2.5" fill="#d4856a" />

        <!-- Mouth with front teeth -->
        <g class="mouth">
          <path d="M94,105 Q100,112 106,105" fill="none" stroke="#4a3520" stroke-width="1.5" stroke-linecap="round" />
          <!-- Two front teeth -->
          <rect x="96" y="105" width="3.5" height="5" rx="1" fill="white" stroke="#e0d5c0" stroke-width="0.5" />
          <rect x="100.5" y="105" width="3.5" height="5" rx="1" fill="white" stroke="#e0d5c0" stroke-width="0.5" />
        </g>
      </g>

      <!-- Eating: inflated cheeks overlay -->
      <g v-if="state === 'eating'" class="cheeks-puffed">
        <ellipse cx="70" cy="100" rx="16" ry="12" fill="#f0b866" opacity="0.85" />
        <ellipse cx="130" cy="100" rx="16" ry="12" fill="#f0b866" opacity="0.85" />
        <ellipse cx="70" cy="102" rx="10" ry="6" fill="#f8b4b4" opacity="0.5" />
        <ellipse cx="130" cy="102" rx="10" ry="6" fill="#f8b4b4" opacity="0.5" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
export type SpriteState = 'idle' | 'eating' | 'sleeping' | 'running' | 'hiding' | 'adventure_out' | 'adventure_back' | 'happy'

defineProps<{
  state: SpriteState
}>()
</script>

<style scoped>
.hamster-sprite {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hamster-sprite svg {
  width: 100%;
  height: 100%;
}

/* === IDLE: breathing + blink === */
.idle .body {
  animation: breathe 3s ease-in-out infinite;
}
.idle .blink-group {
  animation: blink 4s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.03); }
}

@keyframes blink {
  0%, 42%, 46%, 100% { opacity: 1; }
  44% { opacity: 0; }
}

/* === EATING: arms up + cheek puff === */
.eating .left-arm {
  animation: arm-up-left 0.6s ease-in-out infinite alternate;
}
.eating .right-arm {
  animation: arm-up-right 0.6s ease-in-out infinite alternate;
}
.eating .cheeks-puffed ellipse {
  animation: cheek-puff 1s ease-in-out infinite;
}

@keyframes arm-up-left {
  0% { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(8px, -15px) rotate(-20deg); }
}
@keyframes arm-up-right {
  0% { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(-8px, -15px) rotate(20deg); }
}
@keyframes cheek-puff {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

/* === SLEEPING: curl + zzz === */
.sleeping .body {
  animation: sleep-curl 4s ease-in-out infinite;
}
.sleeping .z1 {
  animation: float-z 2s ease-in-out infinite;
}
.sleeping .z2 {
  animation: float-z 2s ease-in-out 0.5s infinite;
}
.sleeping .z3 {
  animation: float-z 2s ease-in-out 1s infinite;
}

@keyframes sleep-curl {
  0%, 100% { transform: scaleX(1) scaleY(1); }
  50% { transform: scaleX(1.03) scaleY(0.97); }
}

@keyframes float-z {
  0% { transform: translateY(0); opacity: 0.9; }
  100% { transform: translateY(-15px); opacity: 0; }
}

/* === RUNNING: legs + wheel === */
.running .left-paw {
  animation: run-left 0.3s ease-in-out infinite alternate;
}
.running .right-paw {
  animation: run-right 0.3s ease-in-out infinite alternate;
}
.running .wheel {
  animation: spin-wheel 2s linear infinite;
  transform-origin: 100px 130px;
}

@keyframes run-left {
  0% { transform: translateX(-4px); }
  100% { transform: translateX(4px); }
}
@keyframes run-right {
  0% { transform: translateX(4px); }
  100% { transform: translateX(-4px); }
}
@keyframes spin-wheel {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* === HAPPY: bounce === */
.happy .body,
.happy .head,
.happy .face,
.happy .left-arm,
.happy .right-arm,
.happy .left-paw,
.happy .right-paw,
.happy .tail {
  animation: bounce 0.4s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

/* === HIDING: shrink away === */
.hiding {
  animation: hide-away 0.8s ease-in forwards;
}

@keyframes hide-away {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.3); opacity: 0.3; }
}

/* === ADVENTURE OUT: slide off screen === */
.adventure_out {
  animation: slide-out 1s ease-in forwards;
}

@keyframes slide-out {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(120px); opacity: 0; }
}

/* === ADVENTURE BACK: slide in === */
.adventure_back {
  animation: slide-in 1s ease-out forwards;
}

@keyframes slide-in {
  0% { transform: translateX(-120px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
</style>
