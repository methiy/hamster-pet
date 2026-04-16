import type { OwnedFood } from './useInventory'
import type { Ref } from 'vue'

export interface SettingsData {
  alwaysOnTop: boolean
  size: 'small' | 'medium' | 'large'
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
