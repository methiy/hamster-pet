<template>
  <div class="reminder-panel" @click.stop>
    <h2 class="panel-title">📝 备忘录</h2>

        <!-- Add reminder form -->
        <div class="add-form">
          <textarea
            v-model="newText"
            class="text-input"
            placeholder="写点什么要记住的..."
            rows="2"
            maxlength="200"
          />

          <!-- Mode toggle -->
          <div class="mode-toggle">
            <button
              class="mode-btn"
              :class="{ active: mode === 'once' }"
              @click="mode = 'once'"
            >⏰ 指定时间</button>
            <button
              class="mode-btn"
              :class="{ active: mode === 'interval' }"
              @click="mode = 'interval'"
            >🔄 间隔提醒</button>
          </div>

          <!-- Once mode -->
          <div v-if="mode === 'once'" class="form-row">
            <input
              v-model="newDatetime"
              type="datetime-local"
              class="datetime-input"
            />
            <button class="add-btn" :disabled="!canAdd" @click="onAdd">
              ➕ 添加
            </button>
          </div>

          <!-- Interval mode -->
          <div v-else class="interval-form">
            <div class="time-row">
              <label class="time-label">
                开始
                <input v-model="newStartTime" type="time" class="time-input" />
              </label>
              <label class="time-label">
                结束
                <input v-model="newEndTime" type="time" class="time-input" />
              </label>
            </div>

            <div class="interval-row">
              <span class="interval-label">间隔:</span>
              <div class="preset-btns">
                <button
                  v-for="p in INTERVAL_PRESETS"
                  :key="p.value"
                  class="preset-btn"
                  :class="{ active: selectedInterval === p.value }"
                  @click="selectPreset(p.value)"
                >{{ p.label }}</button>
              </div>
              <input
                v-model="customInterval"
                type="number"
                min="1"
                class="custom-interval"
                placeholder="自定义"
                @input="onCustomIntervalInput"
              />
              <span class="interval-unit">分钟</span>
            </div>

            <div class="repeat-row">
              <span class="repeat-label">重复:</span>
              <label class="checkbox-label">
                <input v-model="repeatWorkday" type="checkbox" />
                <span>工作日</span>
              </label>
              <label class="checkbox-label">
                <input v-model="repeatWeekend" type="checkbox" />
                <span>休息日</span>
              </label>
              <span class="repeat-hint">不勾选 = 仅今天</span>
            </div>

            <button class="add-btn full-width" :disabled="!canAdd" @click="onAdd">
              ➕ 添加
            </button>
          </div>
        </div>

        <!-- Reminder list -->
        <div class="reminder-list">
          <div v-if="reminders.length === 0" class="empty-state">
            还没有备忘~ 🐹
          </div>
          <div
            v-for="r in sortedReminders"
            :key="r.id"
            class="reminder-item"
            :class="{ notified: r.notified, overdue: isOverdue(r) }"
          >
            <div class="reminder-content">
              <div class="reminder-text">{{ r.text }}</div>
              <div class="reminder-meta">
                <!-- once mode display -->
                <template v-if="!r.type || r.type === 'once'">
                  <span v-if="r.datetime" class="reminder-time" :class="{ overdue: isOverdue(r) }">
                    ⏰ {{ formatDatetime(r.datetime) }}
                    <span v-if="r.notified" class="notified-badge">已提醒</span>
                  </span>
                  <span v-else class="reminder-time">📌 无时间限制</span>
                </template>
                <!-- interval mode display -->
                <template v-else>
                  <span class="reminder-time interval-info">
                    🔄 {{ r.startTime }}-{{ r.endTime }} 每{{ r.intervalMinutes }}分钟
                  </span>
                  <span class="repeat-tag">{{ formatRepeatDays(r) }}</span>
                </template>
              </div>
            </div>
            <button class="delete-btn" @click="emit('remove', r.id)">🗑️</button>
          </div>
        </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Reminder } from '../composables/useReminder'

const props = defineProps<{
  reminders: Reminder[]
}>()

const emit = defineEmits<{
  close: []
  add: [text: string, opts: {
    type: 'once'
    datetime: number | null
  } | {
    type: 'interval'
    startTime: string
    endTime: string
    intervalMinutes: number
    repeatDays: ('workday' | 'weekend')[]
  }]
  remove: [id: string]
}>()

const newText = ref('')

// once mode state
const newDatetime = ref('')

// interval mode state
const mode = ref<'once' | 'interval'>('once')
const newStartTime = ref('09:00')
const newEndTime = ref('18:00')
const selectedInterval = ref<number | null>(30)
const customInterval = ref('')
const repeatWorkday = ref(false)
const repeatWeekend = ref(false)

const INTERVAL_PRESETS = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '1小时', value: 60 },
  { label: '2小时', value: 120 },
]

const sortedReminders = computed(() => {
  return [...props.reminders].sort((a, b) => {
    if (a.notified !== b.notified) return a.notified ? 1 : -1
    if (a.type === 'interval' && b.type !== 'interval') return -1
    if (a.type !== 'interval' && b.type === 'interval') return 1
    if (a.datetime && b.datetime) return a.datetime - b.datetime
    if (a.datetime) return -1
    if (b.datetime) return 1
    return b.createdAt - a.createdAt
  })
})

function isOverdue(r: Reminder): boolean {
  if (r.type === 'interval') return false
  return !!r.datetime && !r.notified && r.datetime <= Date.now()
}

function formatDatetime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()

  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

  if (isToday) return `今天 ${time}`
  if (isTomorrow) return `明天 ${time}`
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`
}

function formatRepeatDays(r: Reminder): string {
  if (r.repeatDays.length === 0) return '仅今天'
  const has = (s: string) => r.repeatDays.includes(s as any)
  if (has('workday') && has('weekend')) return '每天'
  if (has('workday')) return '工作日'
  return '休息日'
}

function selectPreset(value: number) {
  selectedInterval.value = value
  customInterval.value = ''
}

function onCustomIntervalInput() {
  selectedInterval.value = null
}

function getEffectiveInterval(): number | null {
  if (selectedInterval.value !== null) return selectedInterval.value
  const v = parseInt(customInterval.value)
  return isNaN(v) || v <= 0 ? null : v
}

function onAdd() {
  const text = newText.value.trim()
  if (!text) return

  if (mode.value === 'once') {
    const datetime = newDatetime.value ? new Date(newDatetime.value).getTime() : null
    emit('add', text, { type: 'once', datetime })
    newDatetime.value = ''
  } else {
    const interval = getEffectiveInterval()
    if (!interval) return
    const repeatDays: ('workday' | 'weekend')[] = []
    if (repeatWorkday.value) repeatDays.push('workday')
    if (repeatWeekend.value) repeatDays.push('weekend')
    emit('add', text, {
      type: 'interval',
      startTime: newStartTime.value,
      endTime: newEndTime.value,
      intervalMinutes: interval,
      repeatDays,
    })
    newStartTime.value = '09:00'
    newEndTime.value = '18:00'
    selectedInterval.value = 30
    customInterval.value = ''
    repeatWorkday.value = false
    repeatWeekend.value = false
  }

  newText.value = ''
}

const canAdd = computed(() => {
  if (!newText.value.trim()) return false
  if (mode.value === 'interval') {
    return getEffectiveInterval() !== null
  }
  return true
})
</script>

<style scoped>
.reminder-panel {
  background: #FFF8F0;
  border-radius: 0;
  padding: 16px;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 13px;
}



.panel-title {
  text-align: center;
  margin: 0 0 16px;
  font-size: 20px;
}

.add-form {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  border: 1px solid rgba(92, 64, 51, 0.1);
}

.text-input {
  width: 100%;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  color: #5C4033;
  background: white;
  resize: none;
  box-sizing: border-box;
}

.text-input:focus {
  outline: none;
  border-color: #F2A65A;
}

.form-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
}

.datetime-input {
  flex: 1;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  color: #5C4033;
  background: white;
}

.datetime-input:focus {
  outline: none;
  border-color: #F2A65A;
}

.add-btn {
  padding: 6px 14px;
  background: #F2A65A;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: #e8953f;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #A08060;
  font-size: 14px;
}

.reminder-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: white;
  border-radius: 10px;
  border: 1px solid rgba(92, 64, 51, 0.08);
  transition: all 0.2s;
}

.reminder-item.notified {
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.5);
}

.reminder-item.overdue {
  border-color: #FF6B6B;
  background: #FFF5F5;
}

.reminder-content {
  flex: 1;
  min-width: 0;
}

.reminder-text {
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}

.reminder-meta {
  margin-top: 4px;
}

.reminder-time {
  font-size: 11px;
  color: #A08060;
}

.reminder-time.overdue {
  color: #FF6B6B;
  font-weight: 600;
}

.notified-badge {
  background: #4CAF50;
  color: white;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 4px;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  opacity: 0.5;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.delete-btn:hover {
  opacity: 1;
}

.mode-toggle {
  display: flex;
  gap: 4px;
  margin: 8px 0;
}

.mode-btn {
  flex: 1;
  padding: 6px 0;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 8px;
  background: white;
  color: #5C4033;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  background: #F2A65A;
  color: white;
  border-color: #F2A65A;
}

.interval-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.time-row {
  display: flex;
  gap: 12px;
}

.time-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5C4033;
}

.time-input {
  flex: 1;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 12px;
  font-family: inherit;
  color: #5C4033;
  background: white;
}

.time-input:focus {
  outline: none;
  border-color: #F2A65A;
}

.interval-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.interval-label {
  font-size: 12px;
  color: #5C4033;
  white-space: nowrap;
}

.preset-btns {
  display: flex;
  gap: 4px;
}

.preset-btn {
  padding: 4px 8px;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 6px;
  background: white;
  color: #5C4033;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn.active {
  background: #F2A65A;
  color: white;
  border-color: #F2A65A;
}

.preset-btn:hover:not(.active) {
  border-color: #F2A65A;
}

.custom-interval {
  width: 50px;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 11px;
  font-family: inherit;
  color: #5C4033;
  background: white;
  text-align: center;
}

.custom-interval:focus {
  outline: none;
  border-color: #F2A65A;
}

.interval-unit {
  font-size: 11px;
  color: #A08060;
}

.repeat-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.repeat-label {
  font-size: 12px;
  color: #5C4033;
  white-space: nowrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: #5C4033;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  accent-color: #F2A65A;
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.repeat-hint {
  font-size: 10px;
  color: #A08060;
  margin-left: auto;
}

.add-btn.full-width {
  width: 100%;
  margin-top: 2px;
}

.interval-info {
  display: block;
}

.repeat-tag {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #F2A65A;
  color: white;
  margin-top: 3px;
}
</style>
