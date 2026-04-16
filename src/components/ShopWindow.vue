<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="shop-window" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
        <h2 class="shop-title">🏪 商店</h2>
        <div class="coins-display">🪙 {{ coins }} 金币</div>

        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.icon }} {{ tab.label }}
          </button>
        </div>

        <div v-if="activeTab === 'food'" class="items-grid">
          <div v-for="food in foods" :key="food.id" class="item-card">
            <img class="item-icon" :src="food.icon" :alt="food.name" />
            <span class="item-name">{{ food.name }}</span>
            <span class="item-price">🪙 {{ food.price }}</span>
            <div v-if="food.effect" class="item-effect">
              {{ food.effect === 'happy' ? '😊 开心' : '✨ 超开心' }}
            </div>
            <button
              class="buy-btn"
              :disabled="coins < food.price"
              @click="emit('buyFood', food.id)"
            >
              购买
            </button>
          </div>
        </div>

        <div v-if="activeTab === 'decoration'" class="items-grid">
          <div v-for="deco in decorations" :key="deco.id" class="item-card">
            <img class="item-icon" :src="deco.icon" :alt="deco.name" />
            <span class="item-name">{{ deco.name }}</span>
            <span class="item-price">🪙 {{ deco.price }}</span>
            <div v-if="deco.buff" class="item-effect">{{ getBuffText(deco.buff) }}</div>
            <button
              v-if="!ownedDecorations.includes(deco.id)"
              class="buy-btn"
              :disabled="coins < deco.price"
              @click="emit('buyDecoration', deco.id)"
            >
              购买
            </button>
            <span v-else class="owned-badge">已拥有 ✓</span>
          </div>
        </div>

        <div v-if="activeTab === 'furniture'" class="items-grid">
          <div v-for="furn in furnitureItems" :key="furn.id" class="item-card">
            <img class="item-icon" :src="furn.icon" :alt="furn.name" />
            <span class="item-name">{{ furn.name }}</span>
            <span class="item-price">🪙 {{ furn.price }}</span>
            <div v-if="furn.buff || furn.offlineCoinCap" class="item-effect">
              {{ getFurnitureBuffText(furn) }}
            </div>
            <button
              v-if="!ownedFurniture.includes(furn.id)"
              class="buy-btn"
              :disabled="coins < furn.price"
              @click="emit('buyFurniture', furn.id)"
            >
              购买
            </button>
            <span v-else class="owned-badge">已拥有 ✓</span>
          </div>
        </div>

        <div v-if="activeTab === 'gear'" class="items-grid">
          <div v-for="gear in gearItems" :key="gear.id" class="item-card">
            <img class="item-icon" :src="gear.icon" :alt="gear.name" />
            <span class="item-name">{{ gear.name }}</span>
            <span class="item-price">🪙 {{ gear.price }}</span>
            <div class="item-effect">🔓 {{ gear.unlocks }}</div>
            <button
              v-if="!gear.owned"
              class="buy-btn"
              :disabled="coins < gear.price"
              @click="emit('buyGear', gear.id)"
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
import { ref, computed } from 'vue'
import { foods } from '../data/foods'
import { decorations } from '../data/decorations'
import { furniture } from '../data/furniture'
import { gearIcons } from '../data/icons'
import type { BuffEffect } from '../data/decorations'
import type { Furniture } from '../data/furniture'

const props = defineProps<{
  coins: number
  hasTent: boolean
  hasScarf: boolean
  hasTreasureMap: boolean
  hasBoatTicket: boolean
  hasTelescope: boolean
  ownedDecorations: string[]
  ownedFurniture: string[]
}>()

const emit = defineEmits<{
  close: []
  buyFood: [foodId: string]
  buyDecoration: [decoId: string]
  buyFurniture: [furnId: string]
  buyGear: [gearId: string]
}>()

const activeTab = ref<'food' | 'decoration' | 'furniture' | 'gear'>('food')

const tabs = [
  { key: 'food' as const, icon: '🍽️', label: '食物' },
  { key: 'decoration' as const, icon: '👒', label: '装饰' },
  { key: 'furniture' as const, icon: '🏠', label: '家具' },
  { key: 'gear' as const, icon: '🎒', label: '装备' },
]

const furnitureItems = furniture

const gearItems = computed(() => [
  { id: 'tent', emoji: '⛺', icon: gearIcons.tent, name: '帐篷', price: 100, unlocks: '森林', owned: props.hasTent },
  { id: 'scarf', emoji: '🧣', icon: gearIcons.scarf, name: '围巾', price: 100, unlocks: '雪山', owned: props.hasScarf },
  { id: 'treasure_map', emoji: '🗺️', icon: gearIcons.treasure_map, name: '藏宝图', price: 150, unlocks: '废弃矿洞', owned: props.hasTreasureMap },
  { id: 'boat_ticket', emoji: '🎫', icon: gearIcons.boat_ticket, name: '船票', price: 180, unlocks: '神秘海岛', owned: props.hasBoatTicket },
  { id: 'telescope', emoji: '🔭', icon: gearIcons.telescope, name: '望远镜', price: 200, unlocks: '星空天文台', owned: props.hasTelescope },
])

function getBuffText(buff: BuffEffect): string {
  if (buff.coinMultiplier) return `💰 金币 +${buff.coinMultiplier * 100}%`
  if (buff.adventureTimeReduction) return `⏱️ 冒险时间 -${buff.adventureTimeReduction * 100}%`
  if (buff.souvenirChanceBonus) return `🎁 纪念品 +${buff.souvenirChanceBonus * 100}%`
  if (buff.adventureCoinBonus) return `💰 冒险金币 +${buff.adventureCoinBonus * 100}%`
  return ''
}

function getFurnitureBuffText(furn: Furniture): string {
  if (furn.buff?.coinMultiplier) return `💰 金币 +${furn.buff.coinMultiplier * 100}%`
  if (furn.buff?.adventureCoinBonus) return `💰 冒险金币 +${furn.buff.adventureCoinBonus * 100}%`
  if (furn.offlineCoinCap) return `💤 离线上限 ${furn.offlineCoinCap}`
  return ''
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 5000;
  padding: 10px;
  overflow-y: auto;
}

.shop-window {
  background: #FFF8F0;
  border-radius: 14px;
  padding: 16px;
  width: 100%;
  max-width: 380px;
  max-height: calc(100vh - 20px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(92, 64, 51, 0.25);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 12px;
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
  margin-bottom: 12px;
  padding: 6px 12px;
  background: rgba(242, 166, 90, 0.12);
  border-radius: 8px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.tab-btn {
  flex: 1;
  padding: 6px 4px;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 8px;
  background: white;
  color: #5C4033;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.tab-btn.active {
  background: #F2A65A;
  color: white;
  border-color: #F2A65A;
}

.tab-btn:hover:not(.active) {
  background: rgba(242, 166, 90, 0.1);
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

.item-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.item-name {
  font-size: 13px;
  font-weight: 600;
}

.item-price {
  font-size: 12px;
  color: #F2A65A;
}

.item-effect {
  font-size: 10px;
  color: #6ab04c;
  text-align: center;
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
