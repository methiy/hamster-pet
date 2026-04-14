import { ref, computed } from 'vue'
import { locations, type Location } from '../data/locations'
import { souvenirs, type Souvenir } from '../data/souvenirs'

export interface AdventureState {
  isOnAdventure: boolean
  locationId: string | null
  endTime: number | null // timestamp
}

export function useAdventure() {
  const isOnAdventure = ref(false)
  const adventureLocation = ref<Location | null>(null)
  const adventureEndTime = ref<number | null>(null)
  const collectedPostcards = ref<Set<string>>(new Set())
  const collectedSouvenirs = ref<string[]>([])

  // Special items (boolean flags)
  const hasTent = ref(false)
  const hasScarf = ref(false)

  const availableLocations = computed(() => {
    return locations.filter(loc => {
      if (!loc.unlockCondition) return true
      if (loc.unlockCondition === 'hasTent') return hasTent.value
      if (loc.unlockCondition === 'hasScarf') return hasScarf.value
      return false
    })
  })

  function startAdventure() {
    if (isOnAdventure.value) return null
    if (availableLocations.value.length === 0) return null

    const loc = availableLocations.value[Math.floor(Math.random() * availableLocations.value.length)]
    adventureLocation.value = loc
    // 30-120 seconds for testing
    const duration = Math.floor(Math.random() * 90 + 30) * 1000
    adventureEndTime.value = Date.now() + duration
    isOnAdventure.value = true
    return loc
  }

  function checkAdventureReturn(): { postcard: boolean; souvenir: Souvenir | null; coins: number } | null {
    if (!isOnAdventure.value || !adventureEndTime.value) return null
    if (Date.now() < adventureEndTime.value) return null

    const loc = adventureLocation.value!
    const rewards: { postcard: boolean; souvenir: Souvenir | null; coins: number } = {
      postcard: false,
      souvenir: null,
      coins: Math.floor(Math.random() * 15) + 5,
    }

    // 50% chance to get a new postcard (if not already collected)
    if (!collectedPostcards.value.has(loc.id) && Math.random() < 0.5) {
      collectedPostcards.value.add(loc.id)
      rewards.postcard = true
    }

    // Pick a souvenir from possible ones
    if (loc.possibleSouvenirs.length > 0 && Math.random() < 0.7) {
      const souvenirId = loc.possibleSouvenirs[Math.floor(Math.random() * loc.possibleSouvenirs.length)]
      const souvenirData = souvenirs.find(s => s.id === souvenirId)
      if (souvenirData) {
        // Rarity check
        let keep = true
        if (souvenirData.rarity === 'rare' && Math.random() > 0.4) keep = false
        if (souvenirData.rarity === 'legendary' && Math.random() > 0.15) keep = false
        if (keep) {
          collectedSouvenirs.value.push(souvenirId)
          rewards.souvenir = souvenirData
        }
      }
    }

    // Reset adventure state
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
    }
  }

  function loadAdventureData(data: any) {
    if (!data) return
    collectedPostcards.value = new Set(data.collectedPostcards ?? [])
    collectedSouvenirs.value = data.collectedSouvenirs ?? []
    hasTent.value = data.hasTent ?? false
    hasScarf.value = data.hasScarf ?? false

    // Restore ongoing adventure
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
    availableLocations,
    startAdventure,
    checkAdventureReturn,
    getAdventureData,
    loadAdventureData,
  }
}
