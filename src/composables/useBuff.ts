import { computed } from 'vue'

export interface BuffValues {
  coinMultiplier: number
  adventureTimeReduction: number
  souvenirChanceBonus: number
  adventureCoinBonus: number
  offlineCoinCap: number
}

export function useBuff() {
  const buffValues = computed<BuffValues>(() => {
    return {
      coinMultiplier: 1.0,
      adventureTimeReduction: 0,
      souvenirChanceBonus: 0,
      adventureCoinBonus: 0,
      offlineCoinCap: 60,
    }
  })

  return { buffValues }
}
