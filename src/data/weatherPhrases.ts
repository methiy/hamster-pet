/** 天气相关短语 */

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'hot' | 'cold' | 'windy'

export const WEATHER_EMOJIS: Record<WeatherCondition, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  hot: '🔥',
  cold: '🥶',
  windy: '💨',
}

export const WEATHER_PHRASES: Record<WeatherCondition, string[]> = {
  sunny: [
    '今天天气真好！阳光明媚~ ☀️',
    '晒太阳好舒服呀~',
    '适合出去散步的好天气！',
  ],
  cloudy: [
    '多云天气，还挺舒服的~',
    '云朵好多呀~',
    '不冷不热刚刚好！',
  ],
  rainy: [
    '下雨了！记得带伞哦~ 🌂',
    '淅淅沥沥的小雨~',
    '雨天适合在家待着！',
  ],
  snowy: [
    '下雪了！好漂亮！❄️',
    '外面白茫茫一片~',
    '注意保暖哦！',
  ],
  hot: [
    '好热呀！多喝水~ 💧',
    '热死了...空调开起来！',
    '天气这么热，注意防暑！',
  ],
  cold: [
    '好冷呀！多穿点~ 🧣',
    '冻死了...窝在家里不想动',
    '记得穿暖和哦！',
  ],
  windy: [
    '风好大呀！💨',
    '出门注意别被吹跑了~',
    '大风天气小心安全！',
  ],
}

export const WEATHER_CHANGE_PHRASES = [
  '天气变了呢！',
  '外面天气不一样了~',
  '看看外面的天气吧！',
]
