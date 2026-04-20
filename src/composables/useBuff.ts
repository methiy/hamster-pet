import { computed, type Ref } from 'vue'
import { decorations } from '../data/decorations'
import { furniture } from '../data/furniture'

export interface BuffValues {
  coinMultiplier: number
  adventureTimeReduction: number
  souvenirChanceBonus: number
  adventureCoinBonus: number
  offlineCoinCap: number
}

export function useBuff(
  equippedDecorations: Ref<string[]>,
  enabledFurniture: Ref<string[]>
) {
  const buffValues = computed<BuffValues>(() => {
    let coinMultiplier = 1.0
    let adventureTimeReduction = 0
    let souvenirChanceBonus = 0
    let adventureCoinBonus = 0
    let offlineCoinCap = 60

    for (const decoId of equippedDecorations.value) {
      const deco = decorations.find(d => d.id === decoId)
      if (deco?.buff) {
        coinMultiplier += deco.buff.coinMultiplier ?? 0
        adventureTimeReduction += deco.buff.adventureTimeReduction ?? 0
        souvenirChanceBonus += deco.buff.souvenirChanceBonus ?? 0
        adventureCoinBonus += deco.buff.adventureCoinBonus ?? 0
      }
    }

    for (const furnId of enabledFurniture.value) {
      const furn = furniture.find(f => f.id === furnId)
      if (furn?.buff) {
        coinMultiplier += furn.buff.coinMultiplier ?? 0
        adventureTimeReduction += furn.buff.adventureTimeReduction ?? 0
        souvenirChanceBonus += furn.buff.souvenirChanceBonus ?? 0
        adventureCoinBonus += furn.buff.adventureCoinBonus ?? 0
      }
      if (furn?.offlineCoinCap && furn.offlineCoinCap > offlineCoinCap) {
        offlineCoinCap = furn.offlineCoinCap
      }
    }

    return {
      coinMultiplier,
      adventureTimeReduction,
      souvenirChanceBonus,
      adventureCoinBonus,
      offlineCoinCap,
    }
  })

  return { buffValues }
}
