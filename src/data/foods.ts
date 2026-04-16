import { foodIcons } from './icons'

export interface Food {
  id: string
  name: string
  emoji: string
  icon: string
  price: number
  effect?: 'happy' | 'special_happy'
}

export const foods: Food[] = [
  { id: 'sunflower', name: '葵花籽', emoji: '🌻', icon: foodIcons.sunflower, price: 5 },
  { id: 'bread', name: '面包', emoji: '🍞', icon: foodIcons.bread, price: 10 },
  { id: 'strawberry', name: '草莓', emoji: '🍓', icon: foodIcons.strawberry, price: 12 },
  { id: 'apple', name: '苹果', emoji: '🍎', icon: foodIcons.apple, price: 15 },
  { id: 'cheese', name: '奶酪', emoji: '🧀', icon: foodIcons.cheese, price: 20 },
  { id: 'cupcake', name: '小蛋糕', emoji: '🧁', icon: foodIcons.cupcake, price: 25, effect: 'happy' },
  { id: 'nuts', name: '坚果拼盘', emoji: '🥜', icon: foodIcons.nuts, price: 30 },
  { id: 'deluxe_meal', name: '豪华大餐', emoji: '🍱', icon: foodIcons.deluxe_meal, price: 50, effect: 'special_happy' },
]
