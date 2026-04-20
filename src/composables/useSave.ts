import type { OwnedFood } from './useInventory'
import type { Reminder } from './useReminder'
import type { Ref } from 'vue'

export interface SettingsData {
  alwaysOnTop: boolean
  size: 'small' | 'medium' | 'large'
  volume?: number
  muted?: boolean
  weatherCity?: string
  passThrough?: boolean
  autoStart?: boolean
}

interface SaveData {
  coins: number
  ownedFoods: OwnedFood[]
  lastSave: number
  settings?: SettingsData
  ownedDecorations?: string[]
  equippedDecorations?: string[]
  ownedFurniture?: string[]
  adventure?: {
    isOnAdventure: boolean
    locationId: string | null
    endTime: number | null
    collectedPostcards: string[]
    collectedSouvenirs: string[]
    hasTent: boolean
    hasScarf: boolean
    hasTreasureMap: boolean
    hasBoatTicket: boolean
    hasTelescope: boolean
  }
  typingStats?: {
    totalWordsTyped: number
    bestWpm: number
    lastDifficulty: string
  }
  reminders?: Reminder[]
  status?: {
    mood: number
    fullness: number
    clicksToday: number
    feedsToday: number
    totalCoinsEarned: number
    adventuresCompleted: number
    lastDayReset: string
  }
  pomodoro?: {
    totalPomodoros: number
    totalMinutes: number
    todayPomodoros: number
    lastDayReset: string
  }
}

const SAVE_KEY = 'hamster-pet-save'

export function useSave(
  coins: Ref<number>,
  ownedFoods: Ref<OwnedFood[]>,
  adventureFns?: {
    getAdventureData: () => any
    loadAdventureData: (data: any) => void
  },
  extras?: {
    ownedDecorations: Ref<string[]>
    equippedDecorations: Ref<string[]>
    ownedFurniture: Ref<string[]>
    settings: Ref<SettingsData>
    offlineCoinCap: Ref<number>
  },
  extraFns?: {
    getReminders?: () => Reminder[]
    loadReminders?: (data: Reminder[]) => void
    getStatusData?: () => any
    loadStatusData?: (data: any) => void
    getPomodoroData?: () => any
    loadPomodoroData?: (data: any) => void
  }
) {
  let saveTimer: ReturnType<typeof setInterval> | null = null

  function save() {
    const data: SaveData = {
      coins: coins.value,
      ownedFoods: ownedFoods.value,
      lastSave: Date.now(),
    }
    if (adventureFns) {
      data.adventure = adventureFns.getAdventureData()
    }
    if (extras) {
      data.settings = extras.settings.value
      data.ownedDecorations = extras.ownedDecorations.value
      data.equippedDecorations = extras.equippedDecorations.value
      data.ownedFurniture = extras.ownedFurniture.value
    }
    if (extraFns?.getReminders) {
      data.reminders = extraFns.getReminders()
    }
    if (extraFns?.getStatusData) {
      data.status = extraFns.getStatusData()
    }
    if (extraFns?.getPomodoroData) {
      data.pomodoro = extraFns.getPomodoroData()
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      // localStorage might not be available
    }
  }

  function load(): { offlineMinutes: number; offlineCoins: number } {
    let offlineMinutes = 0
    let offlineCoins = 0
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return { offlineMinutes, offlineCoins }
      const data: SaveData = JSON.parse(raw)

      coins.value = data.coins ?? 50
      ownedFoods.value = data.ownedFoods ?? []

      if (extras) {
        extras.ownedDecorations.value = data.ownedDecorations ?? []
        extras.equippedDecorations.value = data.equippedDecorations ?? []
        extras.ownedFurniture.value = data.ownedFurniture ?? []
        if (data.settings) {
          extras.settings.value = data.settings
        }
      }

      if (data.lastSave) {
        offlineMinutes = Math.floor((Date.now() - data.lastSave) / 60000)
        const cap = extras?.offlineCoinCap.value ?? 60
        offlineCoins = Math.min(offlineMinutes, cap)
        coins.value += offlineCoins
      }

      if (adventureFns && data.adventure) {
        adventureFns.loadAdventureData(data.adventure)
      }
      if (extraFns?.loadReminders && data.reminders) {
        extraFns.loadReminders(data.reminders)
      }
      if (extraFns?.loadStatusData && data.status) {
        extraFns.loadStatusData(data.status)
      }
      if (extraFns?.loadPomodoroData && data.pomodoro) {
        extraFns.loadPomodoroData(data.pomodoro)
      }
    } catch {
      // corrupted save, ignore
    }
    return { offlineMinutes, offlineCoins }
  }

  function startAutoSave() {
    saveTimer = setInterval(save, 30000)
  }

  function stopAutoSave() {
    if (saveTimer) {
      clearInterval(saveTimer)
      saveTimer = null
    }
  }

  return {
    save,
    load,
    startAutoSave,
    stopAutoSave,
  }
}
