<template>
  <div class="wardrobe-panel" @click.stop>
    <h2 class="wardrobe-title">👗 衣柜</h2>

        <div v-if="ownedItems.length === 0" class="empty-msg">
          还没有装饰品，去商店买一些吧！
        </div>

        <div v-else class="items-grid">
          <div
            v-for="item in ownedItems"
            :key="item.id"
            class="item-card"
            :class="{ equipped: item.equipped }"
            @click="emit('toggleEquip', item.id)"
          >
            <img class="item-icon" :src="item.icon" :alt="item.name" />
            <span class="item-name">{{ item.name }}</span>
            <span class="item-slot">{{ slotLabels[item.slot] }}</span>
            <span v-if="item.equipped" class="equip-badge">穿戴中</span>
            <span v-else class="equip-hint">点击穿戴</span>
          </div>
        </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { decorations, type DecorationSlot } from '../data/decorations'

const props = defineProps<{
  ownedDecorations: string[]
  equippedDecorations: string[]
}>()

const emit = defineEmits<{
  close: []
  toggleEquip: [decoId: string]
}>()

const slotLabels: Record<DecorationSlot, string> = {
  head_top: '👆 头顶',
  face: '👓 面部',
  ear: '👂 耳朵',
  neck: '📿 脖子',
  back: '🎒 背部',
}

const ownedItems = computed(() => {
  return props.ownedDecorations.map(id => {
    const deco = decorations.find(d => d.id === id)
    return {
      id,
      name: deco?.name ?? id,
      emoji: deco?.emoji ?? '❓',
      icon: deco?.icon ?? '',
      slot: deco?.slot ?? ('head_top' as DecorationSlot),
      equipped: props.equippedDecorations.includes(id),
    }
  })
})
</script>

<style scoped>
.wardrobe-panel {
  background: #FFF8F0;
  border-radius: 0;
  padding: 16px;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 12px;
}



.wardrobe-title {
  text-align: center;
  margin: 0 0 16px;
  font-size: 20px;
}

.empty-msg {
  text-align: center;
  font-size: 13px;
  color: #999;
  padding: 20px 0;
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
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.item-card:hover {
  background: rgba(242, 166, 90, 0.08);
}

.item-card.equipped {
  border-color: #F2A65A;
  background: rgba(242, 166, 90, 0.08);
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

.item-slot {
  font-size: 10px;
  color: #999;
}

.equip-badge {
  font-size: 11px;
  color: #F2A65A;
  font-weight: 600;
}

.equip-hint {
  font-size: 10px;
  color: #ccc;
}
</style>
