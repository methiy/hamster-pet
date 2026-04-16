import { ref, computed } from 'vue'
import { locations, type Location } from '../data/locations'
import { souvenirs, type Souvenir } from '../data/souvenirs'

export interface AdventureState {
  isOnAdventure: boolean
  locationId: string | null
  endTime: number | null
}

export interface AdventureBuffs {
  adventureTimeReduction: number
  souvenirChanceBonus: number
  adventureCoinBonus: number
}

export function useAdventure() {
  const isOnAdventure = ref(false)
  const adventureLocation = ref<Location | null>(null)
  const adventureEndTime = ref<number | null>(null)
  const collectedPostcards = ref<Set<string>>(new Set())
  const collectedSouvenirs = ref<string[]>([])

  const hasTent = ref(false)
  const hasScarf = ref(false)
  const hasTreasureMap = ref(false)
  const hasBoatTicket = ref(false)
  const hasTelescope = ref(false)

  const availableLocations = computed(() => {
    return locations.filter(loc => {
      if (!loc.unlockCondition) return true
      if (loc.unlockCondition === 'hasTent') return hasTent.value
      if (loc.unlockCondition === 'hasScarf') return hasScarf.value
      if (loc.unlockCondition === 'hasTreasureMap') return hasTreasureMap.value
      if (loc.unlockCondition === 'hasBoatTicket') return hasBoatTicket.value
      if (loc.unlockCondition === 'hasTelescope') return hasTelescope.value
      return false
    })
  })

  function startAdventure(buffs?: AdventureBuffs) {
    if (isOnAdventure.value) return null
    if (availableLocations.value.length === 0) return null

    const loc = availableLocations.value[Math.floor(Math.random() * availableLocations.value.length)]
    adventureLocation.value = loc
    let duration = Math.floor(Math.random() * 90 + 30) * 1000
    if (buffs?.adventureTimeReduction) {
      duration = Math.floor(duration * (1 - buffs.adventureTimeReduction))
    }
    adventureEndTime.value = Date.now() + duration
    isOnAdventure.value = true
    return loc
  }

  function checkAdventureReturn(buffs?: AdventureBuffs): { postcard: boolean; souvenir: Souvenir | null; coins: number } | null {
    if (!isOnAdventure.value || !adventureEndTime.value) return null
    if (Date.now() < adventureEndTime.value) return null

    const loc = adventureLocation.value!
    let coinReward = Math.floor(Math.random() * 15) + 5
    if (buffs?.adventureCoinBonus) {
      coinReward = Math.floor(coinReward * (1 + buffs.adventureCoinBonus))
    }

    const rewards: { postcard: boolean; souvenir: Souvenir | null; coins: number } = {
      postcard: false,
      souvenir: null,
      coins: coinReward,
    }

    if (!collectedPostcards.value.has(loc.id) && Math.random() < 0.5) {
      collectedPostcards.value.add(loc.id)
      rewards.postcard = true
    }

    const souvenirBaseChance = 0.7 + (buffs?.souvenirChanceBonus ?? 0)
    if (loc.possibleSouvenirs.length > 0 && Math.random() < souvenirBaseChance) {
      const souvenirId = loc.possibleSouvenirs[Math.floor(Math.random() * loc.possibleSouvenirs.length)]
      const souvenirData = souvenirs.find(s => s.id === souvenirId)
      if (souvenirData) {
        let keep = true
        if (souvenirData.rarity === 'rare' && Math.random() > 0.4) keep = false
        if (souvenirData.rarity === 'legendary' && Math.random() > 0.15) keep = false
        if (keep) {
          collectedSouvenirs.value.push(souvenirId)
          rewards.souvenir = souvenirData
        }
      }
    }

    isOnAdventure.value = false
    adventureLocation.value = null
    adventureEndTime.value = null

    return rewards
  }

  function getAdventureData() {
    return {
      isOnAdventure: isOnAdventure.value,
      locationId: adventureLocation.value?.id ?? null,
      endTime: adventureEndTime.value,
      collectedPostcards: Array.from(collectedPostcards.value),
      collectedSouvenirs: collectedSouvenirs.value,
      hasTent: hasTent.value,
      hasScarf: hasScarf.value,
      hasTreasureMap: hasTreasureMap.value,
      hasBoatTicket: hasBoatTicket.value,
      hasTelescope: hasTelescope.value,
    }
  }

  function loadAdventureData(data: any) {
    if (!data) return
    collectedPostcards.value = new Set(data.collectedPostcards ?? [])
    collectedSouvenirs.value = data.collectedSouvenirs ?? []
    hasTent.value = data.hasTent ?? false
    hasScarf.value = data.hasScarf ?? false
    hasTreasureMap.value = data.hasTreasureMap ?? false
    hasBoatTicket.value = data.hasBoatTicket ?? false
    hasTelescope.value = data.hasTelescope ?? false

    if (data.isOnAdventure && data.endTime) {
      isOnAdventure.value = true
      adventureEndTime.value = data.endTime
      adventureLocation.value = locations.find(l => l.id === data.locationId) ?? null
    }
  }

  return {
    isOnAdventure,
    adventureLocation,
    adventureEndTime,
    collectedPostcards,
    collectedSouvenirs,
    hasTent,
    hasScarf,
    hasTreasureMap,
    hasBoatTicket,
    hasTelescope,
    availableLocations,
    startAdventure,
    checkAdventureReturn,
    getAdventureData,
    loadAdventureData,
  }
}
