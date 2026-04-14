import type { OwnedFood } from './useInventory'
import type { Ref } from 'vue'

interface SaveData {
  coins: number
  ownedFoods: OwnedFood[]
  lastSave: number
}

const SAVE_KEY = 'hamster-pet-save'

export function useSave(
  coins: Ref<number>,
  ownedFoods: Ref<OwnedFood[]>
) {
  let saveTimer: ReturnType<typeof setInterval> | null = null

  function save() {
    const data: SaveData = {
      coins: coins.value,
      ownedFoods: ownedFoods.value,
      lastSave: Date.now(),
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      // localStorage might not be available
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      const data: SaveData = JSON.parse(raw)

      coins.value = data.coins ?? 50
      ownedFoods.value = data.ownedFoods ?? []

      // Grant offline coins (1 per minute away)
      if (data.lastSave) {
        const minutesAway = Math.floor((Date.now() - data.lastSave) / 60000)
        coins.value += Math.min(minutesAway, 60) // cap at 60 bonus coins
      }
    } catch {
      // corrupted save, ignore
    }
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
