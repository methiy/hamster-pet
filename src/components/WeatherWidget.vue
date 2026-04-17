<template>
  <Teleport to="body">
    <div v-if="weather" class="weather-widget">
      <div class="weather-pill">
        <span class="weather-emoji">{{ emoji }}</span>
        <span class="weather-temp">{{ weather.temp }}°C</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { WeatherData } from '../composables/useWeather'

defineProps<{
  weather: WeatherData | null
  emoji: string
}>()
</script>

<style scoped>
.weather-widget {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 3500;
  pointer-events: none;
}

.weather-pill {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(92, 64, 51, 0.1);
  border-radius: 16px;
  padding: 3px 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 11px;
  color: #5C4033;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.weather-emoji {
  font-size: 13px;
}

.weather-temp {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
