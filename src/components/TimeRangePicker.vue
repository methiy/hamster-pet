<template>
  <div class="time-range">
    <!-- Quick presets: clicking one fills both startTime and endTime. -->
    <div class="preset-row">
      <button
        v-for="p in PRESETS"
        :key="p.label"
        type="button"
        class="preset-btn"
        :class="{ active: isPresetActive(p) }"
        @click="applyPreset(p)"
      >{{ p.label }}</button>
    </div>

    <!-- Manual pickers: two hour+minute dropdowns joined by an arrow. -->
    <div class="picker-row">
      <label class="time-field">
        开始
        <span class="dropdowns">
          <select :value="startHour" class="time-select" @change="onStartHour">
            <option v-for="h in HOURS" :key="h" :value="h">{{ pad(h) }}</option>
          </select>
          <span class="sep">:</span>
          <select :value="startMinute" class="time-select" @change="onStartMinute">
            <option v-for="m in MINUTES" :key="m" :value="m">{{ pad(m) }}</option>
          </select>
        </span>
      </label>
      <span class="arrow">→</span>
      <label class="time-field">
        结束
        <span class="dropdowns">
          <select :value="endHour" class="time-select" @change="onEndHour">
            <option v-for="h in HOURS" :key="h" :value="h">{{ pad(h) }}</option>
          </select>
          <span class="sep">:</span>
          <select :value="endMinute" class="time-select" @change="onEndMinute">
            <option v-for="m in MINUTES" :key="m" :value="m">{{ pad(m) }}</option>
          </select>
        </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * TimeRangePicker — two "HH:MM" strings (startTime / endTime) as
 * v-model-like inputs via props + update events, plus quick preset
 * buttons for common working windows.
 *
 * Minute granularity is fixed at 5 minutes (MINUTES array). Hour range
 * is 0..23. `endTime` === "00:00" is interpreted as end-of-day per the
 * existing reminder code's convention.
 */
const props = defineProps<{
  startTime: string
  endTime: string
}>()

const emit = defineEmits<{
  'update:startTime': [value: string]
  'update:endTime': [value: string]
}>()

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,...,55

interface Preset {
  label: string
  start: string
  end: string
}

const PRESETS: Preset[] = [
  { label: '工作时段', start: '09:00', end: '18:00' },
  { label: '上午',     start: '09:00', end: '12:00' },
  { label: '下午',     start: '14:00', end: '18:00' },
  { label: '晚上',     start: '19:00', end: '22:00' },
  { label: '全天',     start: '00:00', end: '23:55' },
]

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Split "HH:MM" into numbers, snapping minutes to the nearest 5. */
function parseTime(s: string): { h: number; m: number } {
  const [hRaw, mRaw] = (s || '').split(':')
  const h = Math.min(23, Math.max(0, parseInt(hRaw || '0', 10) || 0))
  const mParsed = Math.min(59, Math.max(0, parseInt(mRaw || '0', 10) || 0))
  // Snap to the nearest valid MINUTES entry so a stored '09:07' (from
  // before this picker existed) still shows up cleanly.
  const m = Math.round(mParsed / 5) * 5
  return { h, m: m >= 60 ? 55 : m }
}

const startHour = computed(() => parseTime(props.startTime).h)
const startMinute = computed(() => parseTime(props.startTime).m)
const endHour = computed(() => parseTime(props.endTime).h)
const endMinute = computed(() => parseTime(props.endTime).m)

function emitStart(h: number, m: number) {
  emit('update:startTime', `${pad(h)}:${pad(m)}`)
}
function emitEnd(h: number, m: number) {
  emit('update:endTime', `${pad(h)}:${pad(m)}`)
}

function onStartHour(e: Event) {
  const h = Number((e.target as HTMLSelectElement).value)
  emitStart(h, startMinute.value)
}
function onStartMinute(e: Event) {
  const m = Number((e.target as HTMLSelectElement).value)
  emitStart(startHour.value, m)
}
function onEndHour(e: Event) {
  const h = Number((e.target as HTMLSelectElement).value)
  emitEnd(h, endMinute.value)
}
function onEndMinute(e: Event) {
  const m = Number((e.target as HTMLSelectElement).value)
  emitEnd(endHour.value, m)
}

function applyPreset(p: Preset) {
  emit('update:startTime', p.start)
  emit('update:endTime', p.end)
}

function isPresetActive(p: Preset): boolean {
  return props.startTime === p.start && props.endTime === p.end
}
</script>

<style scoped>
.time-range {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-btn {
  padding: 4px 10px;
  font-size: 11px;
  border: 1px solid rgba(92, 64, 51, 0.15);
  background: white;
  border-radius: 6px;
  color: #5C4033;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.preset-btn:hover {
  background: rgba(242, 166, 90, 0.1);
}
.preset-btn.active {
  background: #F2A65A;
  border-color: #F2A65A;
  color: white;
  font-weight: 600;
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.time-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5C4033;
}

.dropdowns {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.time-select {
  padding: 4px 6px;
  font-size: 12px;
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  border: 1px solid rgba(92, 64, 51, 0.15);
  background: white;
  border-radius: 4px;
  color: #5C4033;
  cursor: pointer;
  min-width: 46px;
}
.time-select:focus {
  outline: 2px solid rgba(242, 166, 90, 0.4);
  outline-offset: -2px;
}

.sep {
  color: #5C4033;
  font-weight: 700;
}

.arrow {
  color: #A08060;
  font-size: 14px;
}
</style>
