<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="shop-window" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
        <h2 class="shop-title">🏪 商店</h2>
        <div class="coins-display">🪙 {{ coins }} 金币</div>

        <h3 class="section-title">🍽️ 食物</h3>
        <div class="items-grid">
          <div v-for="food in foods" :key="food.id" class="item-card">
            <span class="item-emoji">{{ food.emoji }}</span>
            <span class="item-name">{{ food.name }}</span>
            <span class="item-price">🪙 {{ food.price }}</span>
            <button
              class="buy-btn"
              :disabled="coins < food.price"
              @click="onBuyFood(food.id)"
            >
              购买
            </button>
          </div>
        </div>

        <h3 class="section-title">🎒 特殊装备</h3>
        <div class="items-grid">
          <div class="item-card">
            <span class="item-emoji">⛺</span>
            <span class="item-name">帐篷</span>
            <span class="item-price">🪙 100</span>
            <button
              v-if="!hasTent"
              class="buy-btn"
              :disabled="coins < 100"
              @click="onBuyTent"
            >
              购买
            </button>
            <span v-else class="owned-badge">已拥有 ✓</span>
          </div>
          <div class="item-card">
            <span class="item-emoji">🧣</span>
            <span class="item-name">围巾</span>
            <span class="item-price">🪙 100</span>
            <button
              v-if="!hasScarf"
              class="buy-btn"
              :disabled="coins < 100"
              @click="onBuyScarf"
            >
              购买
            </button>
            <span v-else class="owned-badge">已拥有 ✓</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { foods } from '../data/foods'

defineProps<{
  coins: number
  hasTent: boolean
  hasScarf: boolean
}>()

const emit = defineEmits<{
  close: []
  buyFood: [foodId: string]
  buyTent: []
  buyScarf: []
}>()

function onBuyFood(foodId: string) {
  emit('buyFood', foodId)
}

function onBuyTent() {
  emit('buyTent')
}

function onBuyScarf() {
  emit('buyScarf')
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
}

.shop-window {
  background: #FFF8F0;
  border-radius: 16px;
  padding: 24px;
  min-width: 320px;
  max-width: 380px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(92, 64, 51, 0.25);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #5C4033;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(92, 64, 51, 0.1);
}

.shop-title {
  text-align: center;
  margin: 0 0 8px;
  font-size: 20px;
}

.coins-display {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #F2A65A;
  margin-bottom: 16px;
  padding: 6px 12px;
  background: rgba(242, 166, 90, 0.12);
  border-radius: 8px;
}

.section-title {
  font-size: 14px;
  margin: 16px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(92, 64, 51, 0.15);
}

.items-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.item-card {
  background: white;
  border-radius: 10px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 4px rgba(92, 64, 51, 0.1);
}

.item-emoji {
  font-size: 28px;
}

.item-name {
  font-size: 13px;
  font-weight: 600;
}

.item-price {
  font-size: 12px;
  color: #F2A65A;
}

.buy-btn {
  margin-top: 4px;
  padding: 4px 16px;
  border: none;
  border-radius: 6px;
  background: #F2A65A;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.buy-btn:hover:not(:disabled) {
  background: #e0943f;
}

.buy-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.owned-badge {
  margin-top: 4px;
  font-size: 12px;
  color: #6ab04c;
  font-weight: 600;
}
</style>
