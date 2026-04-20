# Reminder Interval Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "interval reminder" mode to the existing memo system — users set start time, end time, interval, and optionally repeat on workdays/weekends.

**Architecture:** Extend the existing `Reminder` interface with new fields for interval mode. Modify `checkDueReminders()` to handle interval logic (day matching, time window, interval elapsed). Update `ReminderPanel.vue` with a mode toggle and interval form. Wire new emit signature through `App.vue`.

**Tech Stack:** Vue 3, TypeScript, existing useSave localStorage persistence

---

### Task 1: Extend the Reminder data model

**Files:**
- Modify: `src/composables/useReminder.ts`

- [ ] **Step 1: Update the Reminder interface**

Replace the current `Reminder` interface with the extended version:

```ts
export interface Reminder {
  id: string
  text: string
  createdAt: number
  notified: boolean

  // Mode
  type: 'once' | 'interval'

  // once mode (existing)
  datetime: number | null  // timestamp, null = no scheduled time

  // interval mode
  startTime: string | null      // "09:00" HH:MM format
  endTime: string | null        // "18:00" HH:MM format
  intervalMinutes: number | null // 15, 30, 60, 120, or custom
  repeatDays: ('workday' | 'weekend')[]  // empty = today only
  lastTriggered: number | null  // timestamp of last trigger
}
```

- [ ] **Step 2: Update addReminder to accept interval params**

Replace the current `addReminder` function:

```ts
function addReminder(
  text: string,
  opts: {
    type: 'once'
    datetime: number | null
  } | {
    type: 'interval'
    startTime: string
    endTime: string
    intervalMinutes: number
    repeatDays: ('workday' | 'weekend')[]
  }
) {
  const base = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    createdAt: Date.now(),
    notified: false,
  }

  const reminder: Reminder = opts.type === 'once'
    ? {
        ...base,
        type: 'once',
        datetime: opts.datetime,
        startTime: null,
        endTime: null,
        intervalMinutes: null,
        repeatDays: [],
        lastTriggered: null,
      }
    : {
        ...base,
        type: 'interval',
        datetime: null,
        startTime: opts.startTime,
        endTime: opts.endTime,
        intervalMinutes: opts.intervalMinutes,
        repeatDays: opts.repeatDays,
        lastTriggered: null,
      }

  reminders.value.push(reminder)
  return reminder
}
```

- [ ] **Step 3: Add helper functions for interval checking**

Add these helpers above `checkDueReminders`:

```ts
function isTodayMatching(repeatDays: ('workday' | 'weekend')[]): boolean {
  if (repeatDays.length === 0) return true // empty = today only, always matches "today"
  const day = new Date().getDay() // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6
  if (isWeekend) return repeatDays.includes('weekend')
  return repeatDays.includes('workday')
}

function isInTimeWindow(startTime: string, endTime: string): boolean {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em
  return nowMinutes >= startMinutes && nowMinutes <= endMinutes
}

function isCreatedToday(createdAt: number): boolean {
  const created = new Date(createdAt)
  const now = new Date()
  return created.toDateString() === now.toDateString()
}
```

- [ ] **Step 4: Rewrite checkDueReminders to handle both modes**

Replace the current `checkDueReminders`:

```ts
function checkDueReminders(): Reminder[] {
  const now = Date.now()
  const due: Reminder[] = []
  const toRemove: string[] = []

  for (const r of reminders.value) {
    if (r.type === 'once' || !r.type) {
      // Existing once logic
      if (r.datetime && !r.notified && r.datetime <= now) {
        r.notified = true
        due.push(r)
      }
      continue
    }

    // interval mode
    if (!r.startTime || !r.endTime || !r.intervalMinutes) continue

    // Day matching
    if (r.repeatDays.length === 0) {
      // today-only: only match on the day it was created
      if (!isCreatedToday(r.createdAt)) {
        toRemove.push(r.id)
        continue
      }
    } else {
      if (!isTodayMatching(r.repeatDays)) continue
    }

    // Time window check
    if (!isInTimeWindow(r.startTime, r.endTime)) {
      // Past endTime on a today-only reminder? Delete it.
      if (r.repeatDays.length === 0) {
        const nowDate = new Date()
        const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes()
        const [eh, em] = r.endTime.split(':').map(Number)
        if (nowMinutes > eh * 60 + em) {
          toRemove.push(r.id)
        }
      }
      continue
    }

    // Daily reset: if lastTriggered is from a previous day, reset it
    if (r.lastTriggered) {
      const lastDate = new Date(r.lastTriggered)
      const today = new Date()
      if (lastDate.toDateString() !== today.toDateString()) {
        r.lastTriggered = null
      }
    }

    // Interval check
    if (r.lastTriggered === null) {
      // First trigger of the day
      r.lastTriggered = now
      due.push(r)
    } else if (now - r.lastTriggered >= r.intervalMinutes * 60000) {
      r.lastTriggered = now
      due.push(r)
    }
  }

  // Clean up expired today-only reminders
  for (const id of toRemove) {
    const idx = reminders.value.findIndex(r => r.id === id)
    if (idx !== -1) reminders.value.splice(idx, 1)
  }

  return due
}
```

- [ ] **Step 5: Update loadReminders for backward compatibility**

Replace the current `loadReminders`:

```ts
function loadReminders(data: Reminder[]) {
  reminders.value = data.map(r => ({
    ...r,
    type: r.type ?? 'once',
    startTime: r.startTime ?? null,
    endTime: r.endTime ?? null,
    intervalMinutes: r.intervalMinutes ?? null,
    repeatDays: r.repeatDays ?? [],
    lastTriggered: r.lastTriggered ?? null,
  }))
}
```

- [ ] **Step 6: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds (no type errors from composable changes alone; the UI hasn't changed its emit call yet, that comes in Task 3)

Note: There will be a type error in App.vue because `onAddReminder` still calls `addReminder(text, datetime)` with the old signature. This is expected and will be fixed in Task 3. If build fails here, temporarily keep the old function signature as an overload or proceed to Task 2 + 3 before building.

- [ ] **Step 7: Commit**

```bash
git add src/composables/useReminder.ts
git commit -m "feat(reminder): extend data model with interval mode support"
```

---

### Task 2: Update ReminderPanel.vue UI

**Files:**
- Modify: `src/components/ReminderPanel.vue`

- [ ] **Step 1: Update the emit type and add new reactive state**

Replace the `<script setup>` section. Keep all existing imports and add new state:

```ts
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
```

- [ ] **Step 2: Update the computed sort and helper functions**

Replace `sortedReminders`, `isOverdue`, and `formatDatetime`, and add new helpers:

```ts
const sortedReminders = computed(() => {
  return [...props.reminders].sort((a, b) => {
    // Active interval reminders first, then once with time, then once without time, then notified
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
```

- [ ] **Step 3: Update the onAdd function**

Replace `onAdd`:

```ts
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
    // Reset interval form but keep presets for next use
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
```

- [ ] **Step 4: Replace the template**

Replace the entire `<template>` block:

```html
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
    </div>
  </Teleport>
</template>
```

- [ ] **Step 5: Add new styles**

Append these styles inside `<style scoped>` (after existing styles):

```css
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
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ReminderPanel.vue
git commit -m "feat(reminder): add interval mode UI with presets and repeat days"
```

---

### Task 3: Wire up App.vue with new emit signature

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Update onAddReminder handler**

Find the current `onAddReminder` function (around line 918):

```ts
function onAddReminder(text: string, datetime: number | null) {
  addReminder(text, datetime)
  showToast({ type: 'success', icon: '📝', title: '备忘已添加', message: text.slice(0, 30) })
}
```

Replace with:

```ts
function onAddReminder(text: string, opts: Parameters<typeof addReminder>[1]) {
  addReminder(text, opts)
  showToast({ type: 'success', icon: '📝', title: '备忘已添加', message: text.slice(0, 30) })
}
```

- [ ] **Step 2: Update the ReminderPanel template binding**

Find the `<ReminderPanel` usage (around line 161):

```html
<ReminderPanel
  v-if="showReminder"
  :reminders="reminders"
  @close="showReminder = false"
  @add="onAddReminder"
  @remove="onRemoveReminder"
/>
```

No changes needed here — the `@add` binding will pass through the new emit signature automatically.

- [ ] **Step 3: Update the reminderTimer interval callback**

Find the reminderTimer setInterval (around line 1145). No changes needed — `checkDueReminders()` returns `Reminder[]` as before, and the callback only reads `r.text`, which is unchanged.

- [ ] **Step 4: Verify full build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "feat(reminder): wire interval mode through App.vue"
```

---

### Task 4: Manual smoke test & final commit

- [ ] **Step 1: Run dev server and test**

Run: `cd /data/workspace/hamster-pet && npm run dev`

Test checklist:
1. Open reminder panel → verify mode toggle shows "指定时间" and "间隔提醒"
2. Add a once-type reminder with a time → verify it appears with ⏰ icon
3. Switch to interval mode → verify form shows start/end time, presets, checkboxes
4. Click preset buttons → verify active highlighting toggles correctly
5. Type in custom interval → verify preset deselects
6. Add an interval reminder with no repeat → verify it shows "仅今天" tag
7. Add an interval reminder with 工作日 checked → verify "工作日" tag
8. Delete a reminder → verify it disappears

- [ ] **Step 2: Test interval triggering**

Set start time to current time, end time to +5 minutes, interval to 1 minute, no repeat. Wait 1-2 minutes. Verify:
- Hamster shows speech bubble with memo text
- Toast notification appears
- Sound plays

- [ ] **Step 3: Test backward compatibility**

If there are existing reminders in localStorage from before this change, verify they still load and display correctly (type defaults to 'once').

- [ ] **Step 4: Build check**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Final commit and push**

```bash
git add -A
git commit -m "feat(reminder): complete interval reminder mode with repeat days"
git push
```
