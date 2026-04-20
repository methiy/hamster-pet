import { ref } from 'vue'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emitTo, listen } from '@tauri-apps/api/event'

type PanelActionHandler = (action: string, payload?: any) => void

let panelWindow: WebviewWindow | null = null
let panelCreating = false
let unlistenAction: (() => void) | null = null
let actionHandler: PanelActionHandler | null = null

// Track current panel for sync purposes
const currentOpenPanel = ref<string | null>(null)

async function ensurePanelWindow(): Promise<WebviewWindow> {
  // Check if existing window is still valid
  if (panelWindow) {
    try {
      // Try a simple operation to check if window still exists
      await panelWindow.isVisible()
      return panelWindow
    } catch {
      // Window was closed/destroyed
      panelWindow = null
    }
  }

  if (panelCreating) {
    // Wait for creation to complete
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!panelCreating) {
          clearInterval(check)
          resolve()
        }
      }, 50)
    })
    if (panelWindow) return panelWindow
  }

  panelCreating = true
  try {
    const win = new WebviewWindow('panel', {
      url: 'panel.html',
      title: '仓鼠宠物',
      width: 420,
      height: 520,
      center: true,
      resizable: true,
      decorations: true,
      transparent: false,
      alwaysOnTop: true,
      focus: true,
    })

    // Wait for the window to be created
    await new Promise<void>((resolve, reject) => {
      win.once('tauri://created', () => {
        resolve()
      })
      win.once('tauri://error', (e) => {
        reject(e)
      })
    })

    panelWindow = win

    // Listen for window close event to clean up
    win.once('tauri://destroyed', () => {
      panelWindow = null
      currentOpenPanel.value = null
    })

    return win
  } finally {
    panelCreating = false
  }
}

export function usePanelWindow() {

  async function openPanel(panel: string, data: Record<string, any> = {}) {
    try {
      const win = await ensurePanelWindow()
      currentOpenPanel.value = panel

      // Small delay to ensure the panel window's JS is loaded on first open
      await new Promise(resolve => setTimeout(resolve, 100))

      await emitTo('panel', 'panel:open', { panel, data })
      await win.show()
      await win.setFocus()
    } catch (e) {
      console.error('Failed to open panel:', e)
    }
  }

  async function syncState(data: Record<string, any>) {
    if (!panelWindow) return
    try {
      await emitTo('panel', 'panel:sync-state', data)
    } catch { /* Panel window may have been closed */ }
  }

  async function setupActionListener(handler: PanelActionHandler) {
    // Clean up previous listener
    if (unlistenAction) {
      unlistenAction()
      unlistenAction = null
    }
    actionHandler = handler
    try {
      unlistenAction = await listen<{ action: string; payload?: any }>('panel:action', (event) => {
        if (actionHandler) {
          actionHandler(event.payload.action, event.payload.payload)
        }
      })
    } catch { /* Not in Tauri */ }
  }

  function destroyActionListener() {
    if (unlistenAction) {
      unlistenAction()
      unlistenAction = null
    }
    actionHandler = null
  }

  return {
    openPanel,
    syncState,
    setupActionListener,
    destroyActionListener,
    currentOpenPanel,
  }
}
