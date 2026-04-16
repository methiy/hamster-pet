import type { BuffEffect } from './decorations'

export type FurniturePosition = 'right' | 'left' | 'upper_right' | 'lower_left' | 'lower_right'

export interface Furniture {
  id: string
  name: string
  emoji: string
  price: number
  position: FurniturePosition
  buff?: BuffEffect
  offlineCoinCap?: number
}

export const furniture: Furniture[] = [
  {
    id: 'wheel',
    name: '仓鼠跑轮',
    emoji: '🎡',
    price: 120,
    position: 'right',
    buff: { coinMultiplier: 0.5 },
  },
  {
    id: 'nest',
    name: '温暖小窝',
    emoji: '🏠',
    price: 150,
    position: 'left',
    offlineCoinCap: 120,
  },
  {
    id: 'swing',
    name: '小秋千',
    emoji: '🪁',
    price: 80,
    position: 'upper_right',
  },
  {
    id: 'sunflower_pot',
    name: '向日葵盆栽',
    emoji: '🌻',
    price: 60,
    position: 'lower_left',
  },
  {
    id: 'treasure_chest',
    name: '宝藏箱',
    emoji: '📦',
    price: 200,
    position: 'lower_right',
    buff: { adventureCoinBonus: 0.5 },
  },
]
