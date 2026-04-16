<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="'toast-' + toast.type"
          @click="removeToast(toast.id)"
        >
          <span class="toast-icon">{{ toast.icon }}</span>
          <div class="toast-content">
            <div class="toast-title">{{ toast.title }}</div>
            <div v-if="toast.message" class="toast-message">{{ toast.message }}</div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: 280px;
}

.toast-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  pointer-events: auto;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  color: #333;
}

.toast-message {
  margin-top: 2px;
  color: #666;
  font-size: 11px;
}

.toast-success {
  background: rgba(232, 245, 233, 0.95);
  border-left: 3px solid #4caf50;
}

.toast-reward {
  background: rgba(255, 248, 225, 0.95);
  border-left: 3px solid #ff9800;
}

.toast-info {
  background: rgba(227, 242, 253, 0.95);
  border-left: 3px solid #2196f3;
}

.toast-warning {
  background: rgba(255, 243, 224, 0.95);
  border-left: 3px solid #ff9800;
}

.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.25s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

.toast-move {
  transition: transform 0.25s ease;
}
</style>
