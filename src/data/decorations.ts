import { decoIcons } from './icons'

export type DecorationSlot = 'head_top' | 'face' | 'ear' | 'neck' | 'back'

export interface BuffEffect {
  coinMultiplier?: number
  adventureTimeReduction?: number
  souvenirChanceBonus?: number
  adventureCoinBonus?: number
}

export interface Decoration {
  id: string
  name: string
  emoji: string
  icon: string
  price: number
  slot: DecorationSlot
  buff?: BuffEffect
}

export const decorations: Decoration[] = [
  {
    id: 'crown',
    name: '小皇冠',
    emoji: '👑',
    icon: decoIcons.crown,
    price: 80,
    slot: 'head_top',
    buff: { coinMultiplier: 0.2 },
  },
  {
    id: 'sunglasses',
    name: '墨镜',
    emoji: '🕶️',
    icon: decoIcons.sunglasses,
    price: 60,
    slot: 'face',
    buff: { adventureTimeReduction: 0.1 },
  },
  {
    id: 'bow',
    name: '蝴蝶结',
    emoji: '🎀',
    icon: decoIcons.bow,
    price: 40,
    slot: 'ear',
  },
  {
    id: 'bell',
    name: '小铃铛',
    emoji: '🔔',
    icon: decoIcons.bell,
    price: 50,
    slot: 'neck',
    buff: { souvenirChanceBonus: 0.1 },
  },
  {
    id: 'backpack',
    name: '小背包',
    emoji: '🎒',
    icon: decoIcons.backpack,
    price: 70,
    slot: 'back',
    buff: { adventureCoinBonus: 0.3 },
  },
  {
    id: 'wreath',
    name: '花环',
    emoji: '💐',
    icon: decoIcons.wreath,
    price: 45,
    slot: 'head_top',
  },
]
