export interface Food {
  id: string
  name: string
  emoji: string
  price: number
  effect?: 'happy' | 'special_happy'
}

export const foods: Food[] = [
  { id: 'sunflower', name: '葵花籽', emoji: '🌻', price: 5 },
  { id: 'bread', name: '面包', emoji: '🍞', price: 10 },
  { id: 'strawberry', name: '草莓', emoji: '🍓', price: 12 },
  { id: 'apple', name: '苹果', emoji: '🍎', price: 15 },
  { id: 'cheese', name: '奶酪', emoji: '🧀', price: 20 },
  { id: 'cupcake', name: '小蛋糕', emoji: '🧁', price: 25, effect: 'happy' },
  { id: 'nuts', name: '坚果拼盘', emoji: '🥜', price: 30 },
  { id: 'deluxe_meal', name: '豪华大餐', emoji: '🍱', price: 50, effect: 'special_happy' },
]
