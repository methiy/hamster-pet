import { ref } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'reward' | 'info' | 'warning'
  icon: string
  title: string
  message?: string
  duration: number
}

let nextId = 0

const toasts = ref<Toast[]>([])

export function useToast() {
  function showToast(opts: {
    type: Toast['type']
    icon: string
    title: string
    message?: string
    duration?: number
  }) {
    const toast: Toast = {
      id: nextId++,
      type: opts.type,
      icon: opts.icon,
      title: opts.title,
      message: opts.message,
      duration: opts.duration ?? 3000,
    }
    // Max 3 visible, remove oldest if over limit
    if (toasts.value.length >= 3) {
      toasts.value.splice(0, 1)
    }
    toasts.value.push(toast)

    setTimeout(() => {
      removeToast(toast.id)
    }, toast.duration)
  }

  function removeToast(id: number) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      toasts.value.splice(idx, 1)
    }
  }

  return { toasts, showToast, removeToast }
}
