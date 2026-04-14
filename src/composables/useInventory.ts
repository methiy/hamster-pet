import { ref, computed } from 'vue'
import { foods, type Food } from '../data/foods'

export interface OwnedFood {
  id: string
  quantity: number
}

export function useInventory() {
  const coins = ref(50)
  const ownedFoods = ref<OwnedFood[]>([])

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

  // Auto-increment coins every minute
  let coinTimer: ReturnType<typeof setInterval> | null = null

  function startCoinTimer() {
    coinTimer = setInterval(() => {
      coins.value++
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
    totalFoodCount,
    buyFood,
    useFood,
    getFoodDetails,
    startCoinTimer,
    stopCoinTimer,
  }
}
