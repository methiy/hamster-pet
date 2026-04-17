<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="reminder-panel" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
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
          <div class="form-row">
            <input
              v-model="newDatetime"
              type="datetime-local"
              class="datetime-input"
            />
            <button class="add-btn" :disabled="!newText.trim()" @click="onAdd">
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
                <span v-if="r.datetime" class="reminder-time" :class="{ overdue: isOverdue(r) }">
                  ⏰ {{ formatDatetime(r.datetime) }}
                  <span v-if="r.notified" class="notified-badge">已提醒</span>
                </span>
                <span v-else class="reminder-time">📌 无时间限制</span>
              </div>
            </div>
            <button class="delete-btn" @click="emit('remove', r.id)">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Reminder } from '../composables/useReminder'

const props = defineProps<{
  reminders: Reminder[]
}>()

const emit = defineEmits<{
  close: []
  add: [text: string, datetime: number | null]
  remove: [id: string]
}>()

const newText = ref('')
const newDatetime = ref('')

const sortedReminders = computed(() => {
  return [...props.reminders].sort((a, b) => {
    // Unnotified with time first, then unnotified without time, then notified
    if (a.notified !== b.notified) return a.notified ? 1 : -1
    if (a.datetime && b.datetime) return a.datetime - b.datetime
    if (a.datetime) return -1
    if (b.datetime) return 1
    return b.createdAt - a.createdAt
  })
})

function isOverdue(r: Reminder): boolean {
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

function onAdd() {
  const text = newText.value.trim()
  if (!text) return
  const datetime = newDatetime.value ? new Date(newDatetime.value).getTime() : null
  emit('add', text, datetime)
  newText.value = ''
  newDatetime.value = ''
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 5000;
  padding: 10px;
  overflow-y: auto;
}

.reminder-panel {
  background: #FFF8F0;
  border-radius: 14px;
  padding: 16px;
  width: 100%;
  max-width: 360px;
  max-height: calc(100vh - 20px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(92, 64, 51, 0.25);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 13px;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #5C4033;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(92, 64, 51, 0.1);
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
</style>
