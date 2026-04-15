<template>
  <Teleport to="body">
    <div v-if="visible" class="context-overlay" @click="emit('close')" @contextmenu.prevent="emit('close')">
      <div class="context-menu" :style="{ left: x + 'px', top: y + 'px' }" @click.stop>
        <div class="menu-item" @click="emit('feed')">🍽️ 喂食</div>
        <div class="menu-item" @click="emit('shop')">🏪 商店</div>
        <div class="menu-item" @click="emit('postcard')">📮 明信片</div>
        <div class="menu-item" @click="emit('souvenir')">🎁 纪念品</div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="emit('settings')">⚙️ 设置</div>
        <div class="menu-item menu-item-danger" @click="emit('quit')">❌ 退出</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{
  feed: []
  shop: []
  postcard: []
  souvenir: []
  settings: []
  quit: []
  close: []
}>()
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
