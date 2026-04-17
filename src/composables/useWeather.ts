import { ref, computed } from 'vue'
import type { WeatherCondition } from '../data/weatherPhrases'

export interface WeatherData {
  temp: number
  condition: WeatherCondition
  description: string
  city: string
  lastUpdate: number
}

const CACHE_KEY = 'hamster-pet-weather'
const CACHE_DURATION = 30 * 60 * 1000  // 30 minutes

function classifyWeather(code: number, tempC: number): WeatherCondition {
  // wttr.in WWO weather codes
  // https://www.worldweatheronline.com/developer/api/docs/weather-icons.aspx
  if (code === 395 || code === 392 || code === 338 || code === 335 || code === 332 || code === 329 || code === 326 || code === 323 || code === 227 || code === 179) {
    return 'snowy'
  }
  if (code === 386 || code === 389 || code === 359 || code === 356 || code === 353 || code === 314 || code === 311 || code === 308 || code === 305 || code === 302 || code === 299 || code === 296 || code === 293 || code === 284 || code === 281 || code === 266 || code === 263 || code === 185 || code === 182 || code === 176) {
    return 'rainy'
  }
  if (code === 260 || code === 248 || code === 143) {
    return 'cloudy'
  }
  if (code === 200) return 'rainy'  // thundery

  // Temperature-based for clear/partly cloudy
  if (code === 113) {
    // Clear / sunny
    if (tempC >= 35) return 'hot'
    if (tempC <= 0) return 'cold'
    return 'sunny'
  }
  if (code === 116 || code === 119 || code === 122) {
    return 'cloudy'
  }

  // Wind check (fallback)
  if (tempC >= 35) return 'hot'
  if (tempC <= 0) return 'cold'
  return 'cloudy'
}

export function useWeather() {
  const weather = ref<WeatherData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const weatherEmoji = computed(() => {
    if (!weather.value) return ''
    const emojiMap: Record<WeatherCondition, string> = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      snowy: '❄️',
      hot: '🔥',
      cold: '🥶',
      windy: '💨',
    }
    return emojiMap[weather.value.condition] ?? '🌤️'
  })

  let fetchTimer: ReturnType<typeof setInterval> | null = null

  function loadCache(): WeatherData | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const data: WeatherData = JSON.parse(raw)
      if (Date.now() - data.lastUpdate < CACHE_DURATION) {
        return data
      }
    } catch { /* ignore */ }
    return null
  }

  function saveCache(data: WeatherData) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch { /* ignore */ }
  }

  async function fetchWeather(city: string): Promise<WeatherData | null> {
    if (!city.trim()) return null
    loading.value = true
    error.value = null
    try {
      const resp = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const json = await resp.json()
      const current = json.current_condition?.[0]
      if (!current) throw new Error('No data')

      const tempC = parseInt(current.temp_C, 10)
      const code = parseInt(current.weatherCode, 10)
      const desc = current.weatherDesc?.[0]?.value ?? ''
      const condition = classifyWeather(code, tempC)

      const data: WeatherData = {
        temp: tempC,
        condition,
        description: desc,
        city,
        lastUpdate: Date.now(),
      }

      saveCache(data)
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateWeather(city: string) {
    // Try cache first
    const cached = loadCache()
    if (cached && cached.city === city) {
      weather.value = cached
      return
    }

    const data = await fetchWeather(city)
    if (data) {
      weather.value = data
    }
  }

  function startAutoFetch(getCity: () => string) {
    // Initial fetch
    const city = getCity()
    if (city) updateWeather(city)

    // Periodic fetch every 30 minutes
    fetchTimer = setInterval(() => {
      const c = getCity()
      if (c) fetchWeather(c).then(d => { if (d) weather.value = d })
    }, CACHE_DURATION)
  }

  function stopAutoFetch() {
    if (fetchTimer) {
      clearInterval(fetchTimer)
      fetchTimer = null
    }
  }

  return {
    weather,
    weatherEmoji,
    loading,
    error,
    updateWeather,
    startAutoFetch,
    stopAutoFetch,
  }
}
