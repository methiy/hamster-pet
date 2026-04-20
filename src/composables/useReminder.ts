import { ref } from 'vue'

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

export function useReminder() {
  const reminders = ref<Reminder[]>([])

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

  function removeReminder(id: string) {
    const idx = reminders.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      reminders.value.splice(idx, 1)
    }
  }

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

  /**
   * Check for due reminders. Returns list of newly due reminders.
   * Marks them as notified so they won't trigger again.
   */
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

  function getReminders(): Reminder[] {
    return reminders.value
  }

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

  return {
    reminders,
    addReminder,
    removeReminder,
    checkDueReminders,
    getReminders,
    loadReminders,
  }
}
