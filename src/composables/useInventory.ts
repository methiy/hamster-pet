import { ref, computed } from 'vue'
import { foods, type Food } from '../data/foods'
import { decorations } from '../data/decorations'
import { furniture } from '../data/furniture'

export interface OwnedFood {
  id: string
  quantity: number
}

export function useInventory() {
  const coins = ref(50)
  const ownedFoods = ref<OwnedFood[]>([])
  const ownedDecorations = ref<string[]>([])
  const equippedDecorations = ref<string[]>([])
  const ownedFurniture = ref<string[]>([])
  const enabledFurniture = ref<string[]>([])

  function buyFood(foodId: string): boolean {
    const food = foods.find(f => f.id === foodId)
    if (!food) return false
    if (coins.value < food.price) return false

    coins.value -= food.price
    const existing = ownedFoods.value.find(f => f.id === foodId)
    if (existing) {
      existing.quantity++
    } else {
      ownedFoods.value.push({ id: foodId, quantity: 1 })
    }
    return true
  }

  function useFood(foodId: string): boolean {
    const existing = ownedFoods.value.find(f => f.id === foodId)
    if (!existing || existing.quantity <= 0) return false
    existing.quantity--
    if (existing.quantity === 0) {
      ownedFoods.value = ownedFoods.value.filter(f => f.id !== foodId)
    }
    return true
  }

  function getFoodDetails(foodId: string): Food | undefined {
    return foods.find(f => f.id === foodId)
  }

  const totalFoodCount = computed(() =>
    ownedFoods.value.reduce((sum, f) => sum + f.quantity, 0)
  )

  function buyDecoration(decoId: string): boolean {
    const deco = decorations.find(d => d.id === decoId)
    if (!deco) return false
    if (coins.value < deco.price) return false
    if (ownedDecorations.value.includes(decoId)) return false

    coins.value -= deco.price
    ownedDecorations.value.push(decoId)
    return true
  }

  function toggleEquipDecoration(decoId: string): boolean {
    if (!ownedDecorations.value.includes(decoId)) return false

    const idx = equippedDecorations.value.indexOf(decoId)
    if (idx !== -1) {
      equippedDecorations.value.splice(idx, 1)
      return true
    }

    const deco = decorations.find(d => d.id === decoId)
    if (!deco) return false

    equippedDecorations.value = equippedDecorations.value.filter(eId => {
      const equipped = decorations.find(d => d.id === eId)
      return equipped?.slot !== deco.slot
    })
    equippedDecorations.value.push(decoId)
    return true
  }

  function buyFurniture(furnId: string): boolean {
    const furn = furniture.find(f => f.id === furnId)
    if (!furn) return false
    if (coins.value < furn.price) return false
    if (ownedFurniture.value.includes(furnId)) return false

    coins.value -= furn.price
    ownedFurniture.value.push(furnId)
    enabledFurniture.value.push(furnId) // Auto-enable on purchase
    return true
  }

  function toggleEnableFurniture(furnId: string): boolean {
    if (!ownedFurniture.value.includes(furnId)) return false
    const idx = enabledFurniture.value.indexOf(furnId)
    if (idx !== -1) {
      enabledFurniture.value.splice(idx, 1)
    } else {
      enabledFurniture.value.push(furnId)
    }
    return true
  }

  let coinTimer: ReturnType<typeof setInterval> | null = null

  function startCoinTimer(getCoinMultiplier?: () => number) {
    coinTimer = setInterval(() => {
      const multiplier = getCoinMultiplier?.() ?? 1
      coins.value += Math.max(1, Math.floor(multiplier))
    }, 60000)
  }

  function stopCoinTimer() {
    if (coinTimer) {
      clearInterval(coinTimer)
      coinTimer = null
    }
  }

  return {
    coins,
    ownedFoods,
    ownedDecorations,
    equippedDecorations,
    ownedFurniture,
    enabledFurniture,
    totalFoodCount,
    buyFood,
    useFood,
    getFoodDetails,
    buyDecoration,
    toggleEquipDecoration,
    buyFurniture,
    toggleEnableFurniture,
    startCoinTimer,
    stopCoinTimer,
  }
}
