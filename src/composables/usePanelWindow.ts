import { ref } from 'vue'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emitTo, listen } from '@tauri-apps/api/event'

type PanelActionHandler = (action: string, payload?: any) => void

let panelWindow: WebviewWindow | null = null
let panelCreating = false
let panelReady = false
let panelJsReady = false  // true after panel:ready is received
let unlistenAction: (() => void) | null = null
let unlistenClose: (() => void) | null = null
let unlistenReady: (() => void) | null = null
let actionHandler: PanelActionHandler | null = null

// Resolve function for waiting on panel:ready
let panelReadyResolve: (() => void) | null = null
let panelReadyPromise: Promise<void> | null = null

function resetReadyPromise() {
  panelJsReady = false
  panelReadyPromise = new Promise<void>((resolve) => {
    panelReadyResolve = resolve
  })
}

// Track current panel for sync purposes
const currentOpenPanel = ref<string | null>(null)

async function createPanelWindow(): Promise<WebviewWindow> {
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
  resetReadyPromise()

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
      focus: false,
      visible: false, // Start hidden — preload in background
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
    panelReady = true

    // Listen for panel:ready from the panel's JS
    if (unlistenReady) unlistenReady()
    unlistenReady = await listen('panel:ready', () => {
      panelJsReady = true
      if (panelReadyResolve) {
        panelReadyResolve()
        panelReadyResolve = null
      }
    })

    // Intercept close: hide instead of destroy so we can reuse instantly
    unlistenClose = await win.onCloseRequested(async (event) => {
      event.preventDefault()
      await win.hide()
      currentOpenPanel.value = null
    })

    return win
  } finally {
    panelCreating = false
  }
}

async function ensurePanelWindow(): Promise<WebviewWindow> {
  if (panelWindow && panelReady) {
    return panelWindow
  }
  return createPanelWindow()
}

/** Wait until the panel's JS has loaded and registered its listeners */
async function waitForPanelReady(timeoutMs = 5000): Promise<void> {
  if (panelJsReady) return
  if (!panelReadyPromise) return

  // Race against timeout
  await Promise.race([
    panelReadyPromise,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ])
}

export function usePanelWindow() {

  /** Preload the panel window in background (call on app mount) */
  async function preloadPanel() {
    try {
      await createPanelWindow()
    } catch {
      // Preload failed — will create on first open
    }
  }

  async function openPanel(panel: string, data: Record<string, any> = {}) {
    try {
      const win = await ensurePanelWindow()

      // Wait for panel JS to be ready before sending events
      await waitForPanelReady()

      currentOpenPanel.value = panel
      await emitTo('panel', 'panel:open', { panel, data })
      await win.center()
      await win.show()
      await win.setFocus()
    } catch (e) {
      console.error('Failed to open panel:', e)
    }
  }

  async function syncState(data: Record<string, any>) {
    if (!panelWindow || !panelReady || !panelJsReady) return
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
    if (unlistenClose) {
      unlistenClose()
      unlistenClose = null
    }
    if (unlistenReady) {
      unlistenReady()
      unlistenReady = null
    }
    actionHandler = null
  }

  return {
    preloadPanel,
    openPanel,
    syncState,
    setupActionListener,
    destroyActionListener,
    currentOpenPanel,
  }
}
