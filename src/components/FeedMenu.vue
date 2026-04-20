<template>
  <div class="feed-menu" @click.stop>
    <div class="feed-title">🍽️ 喂食</div>
    <div v-if="foodItems.length === 0" class="empty-msg">
      没有食物，去商店买一些吧！
    </div>
    <div v-else class="food-list">
      <div
        v-for="item in foodItems"
        :key="item.id"
        class="food-item"
        @click="emit('feed', item.id)"
      >
        <img class="food-icon" :src="item.icon" :alt="item.name" />
        <span class="food-name">{{ item.name }}</span>
        <span class="food-count">×{{ item.quantity }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { foods } from '../data/foods'
import type { OwnedFood } from '../composables/useInventory'

const props = defineProps<{
  ownedFoods: OwnedFood[]
}>()

const emit = defineEmits<{
  feed: [foodId: string]
  close: []
}>()

const foodItems = computed(() => {
  return props.ownedFoods
    .filter(f => f.quantity > 0)
    .map(f => {
      const details = foods.find(fd => fd.id === f.id)
      return {
        id: f.id,
        name: details?.name ?? f.id,
        emoji: details?.emoji ?? '🍽️',
        icon: details?.icon ?? '',
        quantity: f.quantity,
      }
    })
})
</script>

<style scoped>
.feed-menu {
  background: #FFF8F0;
  border-radius: 0;
  padding: 14px;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 12px;
}

.feed-title {
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
}

.empty-msg {
  text-align: center;
  font-size: 13px;
  color: #999;
  padding: 12px 0;
}

.food-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.food-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.food-item:hover {
  background: rgba(242, 166, 90, 0.15);
}

.food-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.food-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.food-count {
  font-size: 13px;
  color: #F2A65A;
  font-weight: 600;
}
</style>
