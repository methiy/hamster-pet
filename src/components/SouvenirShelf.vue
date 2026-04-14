<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="shelf" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
        <h2 class="shelf-title">🎁 纪念品架</h2>

        <div v-if="sortedItems.length === 0" class="empty-msg">
          还没有纪念品，让仓仓去冒险吧！
        </div>

        <template v-else>
          <div v-if="legendaryItems.length > 0" class="rarity-section">
            <div class="rarity-label legendary-label">✨ 传说</div>
            <div class="souvenir-grid">
              <div v-for="item in legendaryItems" :key="item.id" class="souvenir-item legendary">
                <span class="souvenir-emoji">{{ item.emoji }}</span>
                <span class="souvenir-name">{{ item.name }}</span>
                <span v-if="item.count > 1" class="souvenir-count">×{{ item.count }}</span>
              </div>
            </div>
          </div>

          <div v-if="rareItems.length > 0" class="rarity-section">
            <div class="rarity-label rare-label">💜 稀有</div>
            <div class="souvenir-grid">
              <div v-for="item in rareItems" :key="item.id" class="souvenir-item rare">
                <span class="souvenir-emoji">{{ item.emoji }}</span>
                <span class="souvenir-name">{{ item.name }}</span>
                <span v-if="item.count > 1" class="souvenir-count">×{{ item.count }}</span>
              </div>
            </div>
          </div>

          <div v-if="commonItems.length > 0" class="rarity-section">
            <div class="rarity-label common-label">🤍 普通</div>
            <div class="souvenir-grid">
              <div v-for="item in commonItems" :key="item.id" class="souvenir-item common">
                <span class="souvenir-emoji">{{ item.emoji }}</span>
                <span class="souvenir-name">{{ item.name }}</span>
                <span v-if="item.count > 1" class="souvenir-count">×{{ item.count }}</span>
              </div>
            </div>
          </div>
        </template>

        <div class="shelf-footer">
          共收集 {{ totalUnique }} 种纪念品
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { souvenirs } from '../data/souvenirs'

const props = defineProps<{
  collectedSouvenirs: string[]
}>()

const emit = defineEmits<{
  close: []
}>()

interface DisplayItem {
  id: string
  name: string
  emoji: string
  rarity: 'common' | 'rare' | 'legendary'
  count: number
}

const sortedItems = computed<DisplayItem[]>(() => {
  const countMap = new Map<string, number>()
  for (const id of props.collectedSouvenirs) {
    countMap.set(id, (countMap.get(id) ?? 0) + 1)
  }
  const items: DisplayItem[] = []
  for (const [id, count] of countMap) {
    const data = souvenirs.find(s => s.id === id)
    if (data) {
      items.push({
        id: data.id,
        name: data.name,
        emoji: data.emoji,
        rarity: data.rarity,
        count,
      })
    }
  }
  return items
})

const legendaryItems = computed(() => sortedItems.value.filter(i => i.rarity === 'legendary'))
const rareItems = computed(() => sortedItems.value.filter(i => i.rarity === 'rare'))
const commonItems = computed(() => sortedItems.value.filter(i => i.rarity === 'common'))
const totalUnique = computed(() => sortedItems.value.length)
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

.shelf {
  background: #FFF8F0;
  border-radius: 16px;
  padding: 24px;
  min-width: 300px;
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

.shelf-title {
  text-align: center;
  margin: 0 0 16px;
  font-size: 20px;
}

.empty-msg {
  text-align: center;
  font-size: 14px;
  color: #999;
  padding: 24px 0;
}

.rarity-section {
  margin-bottom: 12px;
}

.rarity-label {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.legendary-label {
  background: rgba(255, 215, 0, 0.2);
  color: #B8860B;
}

.rare-label {
  background: rgba(147, 112, 219, 0.15);
  color: #7B68EE;
}

.common-label {
  background: rgba(92, 64, 51, 0.08);
  color: #999;
}

.souvenir-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.souvenir-item {
  background: white;
  border-radius: 8px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  box-shadow: 0 1px 3px rgba(92, 64, 51, 0.1);
}

.souvenir-item.legendary {
  box-shadow: 0 1px 6px rgba(255, 215, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.souvenir-item.rare {
  border: 1px solid rgba(147, 112, 219, 0.2);
}

.souvenir-emoji {
  font-size: 24px;
}

.souvenir-name {
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.souvenir-count {
  font-size: 10px;
  color: #F2A65A;
  font-weight: 600;
}

.shelf-footer {
  text-align: center;
  margin-top: 12px;
  font-size: 13px;
  color: #999;
}
</style>
