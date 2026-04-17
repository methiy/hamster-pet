import { ref } from 'vue'

export interface Reminder {
  id: string
  text: string
  datetime: number | null  // timestamp, null = no scheduled time
  createdAt: number
  notified: boolean
}

export function useReminder() {
  const reminders = ref<Reminder[]>([])

  function addReminder(text: string, datetime: number | null) {
    const reminder: Reminder = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text,
      datetime,
      createdAt: Date.now(),
      notified: false,
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

  /**
   * Check for due reminders. Returns list of newly due reminders.
   * Marks them as notified so they won't trigger again.
   */
  function checkDueReminders(): Reminder[] {
    const now = Date.now()
    const due: Reminder[] = []
    for (const r of reminders.value) {
      if (r.datetime && !r.notified && r.datetime <= now) {
        r.notified = true
        due.push(r)
      }
    }
    return due
  }

  function getReminders(): Reminder[] {
    return reminders.value
  }

  function loadReminders(data: Reminder[]) {
    reminders.value = data
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
