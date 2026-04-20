<template>
  <Teleport to="body">
    <div v-if="visible" class="context-overlay" @click="emit('close')" @contextmenu.prevent="emit('close')">
      <div ref="menuRef" class="context-menu" :style="menuStyle" @click.stop>
        <div class="menu-item" @click="emit('feed')">🍽️ 喂食</div>
        <div class="menu-item" @click="emit('shop')">🏪 商店</div>
        <div class="menu-item" @click="emit('postcard')">📮 明信片</div>
        <div class="menu-item" @click="emit('souvenir')">🎁 纪念品</div>
        <div class="menu-item" @click="emit('wardrobe')">👗 衣柜</div>
        <div class="menu-item" @click="emit('reminder')">📝 备忘</div>
        <div class="menu-item" @click="emit('status')">📊 状态</div>
        <div class="menu-divider"></div>
        <!-- <div class="menu-item" @click="emit('typing')">⌨️ 打字模式</div> -->
        <div class="menu-item" @click="emit('pomodoro')">🍅 番茄钟</div>
        <div class="menu-item" @click="emit('settings')">⚙️ 设置</div>
        <div class="menu-item menu-item-danger" @click="emit('quit')">❌ 退出</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{
  feed: []
  shop: []
  postcard: []
  souvenir: []
  wardrobe: []
  reminder: []
  status: []
  typing: []
  pomodoro: []
  settings: []
  quit: []
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)
const adjustedX = ref(0)
const adjustedY = ref(0)

watch(() => props.visible, async (vis) => {
  if (!vis) return
  // Start at requested position
  adjustedX.value = props.x
  adjustedY.value = props.y
  // Wait for DOM render then clamp within viewport
  await nextTick()
  const el = menuRef.value
  if (!el) return
  const menuW = el.offsetWidth
  const menuH = el.offsetHeight
  const winW = window.innerWidth
  const winH = window.innerHeight
  // Clamp horizontally: keep menu within viewport
  if (props.x + menuW > winW) {
    adjustedX.value = Math.max(0, winW - menuW)
  }
  // Clamp vertically: shift start position up so full menu stays visible, still expands downward
  if (props.y + menuH > winH) {
    adjustedY.value = Math.max(0, winH - menuH)
  }
})

const menuStyle = computed(() => ({
  left: adjustedX.value + 'px',
  top: adjustedY.value + 'px',
}))
</script>

<style scoped>
.context-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.context-menu {
  position: fixed;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 6px 0;
  min-width: 140px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s;
  color: #333;
}

.menu-item:hover {
  background: rgba(0, 120, 255, 0.1);
}

.menu-item-danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.menu-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
  margin: 4px 8px;
}
</style>
