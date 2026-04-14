export interface Food {
  id: string
  name: string
  emoji: string
  price: number
}

export const foods: Food[] = [
  { id: 'sunflower', name: '葵花籽', emoji: '🌻', price: 5 },
  { id: 'bread', name: '面包', emoji: '🍞', price: 10 },
  { id: 'apple', name: '苹果', emoji: '🍎', price: 15 },
  { id: 'cheese', name: '奶酪', emoji: '🧀', price: 20 },
  { id: 'nuts', name: '坚果拼盘', emoji: '🥜', price: 30 },
]
