<template>
  <div class="about-panel" @click.stop>
    <div class="about-header">
      <div class="about-icon">🐶</div>
      <h2 class="about-title">柯基桌宠</h2>
      <div class="about-subtitle">Corgi Pet</div>
      <div class="about-version">v{{ appVersion }}</div>
    </div>

    <div class="update-section">
      <button
        class="update-btn"
        :class="updateStatus"
        :disabled="updateStatus === 'checking' || updateStatus === 'downloading' || updateStatus === 'installing'"
        @click="handleUpdateClick"
      >
        <span v-if="updateStatus === 'idle'">🔍 检查更新</span>
        <span v-else-if="updateStatus === 'checking'">⏳ 检查中...</span>
        <span v-else-if="updateStatus === 'up-to-date'">✅ 已是最新版本</span>
        <span v-else-if="updateStatus === 'update-available'">🎉 发现新版本 v{{ latestVersion }}</span>
        <span v-else-if="updateStatus === 'downloading'">⬇️ 下载中 {{ downloadProgress }}%</span>
        <span v-else-if="updateStatus === 'installing'">📦 安装中...</span>
        <span v-else-if="updateStatus === 'error'">❌ {{ errorMsg }}，点击重试</span>
      </button>

      <div v-if="updateStatus === 'update-available'" class="update-info">
        <div v-if="releaseNotes" class="release-notes">{{ releaseNotes }}</div>
        <button class="download-btn" @click="startUpdate">
          {{ pendingUpdate ? '📥 立即更新' : '📥 前往下载' }}
        </button>
      </div>

      <div v-if="updateStatus === 'downloading'" class="progress-bar-container">
        <div class="progress-bar" :style="{ width: downloadProgress + '%' }"></div>
      </div>
    </div>

    <div class="link-section">
      <button class="link-btn" @click="openGitHub">
        🔗 GitHub 仓库
      </button>
    </div>

    <div class="shortcuts-section">
      <h3 class="shortcuts-title">⌨️ 快捷键</h3>
      <div class="shortcuts-hint">点击快捷键后按下新组合，点击别处即完成录入；按 Esc 取消</div>
      <div
        v-for="sc in shortcutRows"
        :key="sc.id"
        class="shortcut-row"
      >
        <span class="shortcut-label">{{ sc.label }}</span>
        <kbd
          class="shortcut-key"
          :class="{
            recording: listeningId === sc.id,
            conflict: listeningId === sc.id && recordingConflict,
          }"
          @click.stop="startRecording(sc.id)"
        >{{
          listeningId === sc.id
            ? (recordingPreview || '请按下新快捷键...')
            : sc.key
        }}</kbd>
        <button
          class="reset-btn"
          :title="`恢复默认：${defaultShortcuts[sc.id] ?? ''}`"
          :disabled="!isOverridden(sc.id)"
          @click.stop="emit('reset-shortcut', sc.id)"
        >↺</button>
      </div>
      <div v-if="errorMessage" class="shortcut-error">{{ errorMessage }}</div>
    </div>

    <div class="about-footer">
      Made with ❤️
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { listen } from '@tauri-apps/api/event'
import type { Update } from '@tauri-apps/plugin-updater'

declare const __APP_VERSION__: string
const appVersion = __APP_VERSION__

/**
 * Props fed from App.vue via syncState:
 *   - shortcuts: current effective map { id -> accel }
 *   - defaultShortcuts: the built-in defaults, used by the reset button
 *     and to determine whether an entry is "overridden"
 */
const props = defineProps<{
  shortcuts?: Record<string, string>
  defaultShortcuts?: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'rebind-shortcut', payload: { id: string; key: string }): void
  (e: 'reset-shortcut', id: string): void
}>()

/** Human-readable labels for each logical shortcut id. Kept here
 * because the id is what the Rust side and App.vue speak; the label
 * is a UI concern. */
const SHORTCUT_LABELS: Record<string, string> = {
  summon:   '📍 召唤宠物',
  feed:     '🍽️ 喂食',
  reminder: '📝 备忘',
  pomodoro: '🍅 番茄钟',
  snack:    '🍿 丢零食',
}

const effectiveShortcuts = computed<Record<string, string>>(
  () => props.shortcuts ?? {},
)
const defaultShortcuts = computed<Record<string, string>>(
  () => props.defaultShortcuts ?? {},
)

/** Ordered rows for the template, driven by whatever keys are in
 * defaultShortcuts (stable across rebinds). */
const shortcutRows = computed(() =>
  Object.keys(defaultShortcuts.value).map((id) => ({
    id,
    label: SHORTCUT_LABELS[id] ?? id,
    key: effectiveShortcuts.value[id] ?? defaultShortcuts.value[id] ?? '',
  })),
)

function isOverridden(id: string): boolean {
  return (
    effectiveShortcuts.value[id] !== undefined &&
    effectiveShortcuts.value[id] !== defaultShortcuts.value[id]
  )
}

// --- Recording state ---
const listeningId = ref<string | null>(null)
const recordingPreview = ref<string>('')
const recordingConflict = ref(false)
const errorMessage = ref<string>('')
let unlistenRebindError: (() => void) | null = null

function startRecording(id: string) {
  if (listeningId.value === id) return
  listeningId.value = id
  recordingPreview.value = ''
  recordingConflict.value = false
  errorMessage.value = ''
}

/** Turn a KeyboardEvent into a Tauri-style accelerator string. We
 * match the format Tauri's global_shortcut parses: modifiers joined
 * by `+` with "Ctrl", "Shift", "Alt", "Meta", then the main key.
 *
 * Returns null while the user hasn't pressed a non-modifier yet.
 */
function eventToAccel(e: KeyboardEvent): string | null {
  const mods: string[] = []
  if (e.ctrlKey) mods.push('Ctrl')
  if (e.shiftKey) mods.push('Shift')
  if (e.altKey) mods.push('Alt')
  if (e.metaKey) mods.push('Meta')
  // Ignore bare modifier presses — we only commit once the user hits
  // a real key like P or F3.
  const k = e.key
  if (!k || k === 'Control' || k === 'Shift' || k === 'Alt' || k === 'Meta') {
    return mods.length > 0 ? mods.join('+') + '+' : null
  }
  let main: string
  if (k.length === 1) {
    main = k.toUpperCase()
  } else if (/^F\d{1,2}$/.test(k)) {
    main = k
  } else if (k === 'Escape') {
    // Handled separately as "cancel"
    return null
  } else {
    // Other named keys (Enter, Tab, Home, ...). Use Tauri accepts most
    // of them verbatim; title-case for consistency.
    main = k.charAt(0).toUpperCase() + k.slice(1)
  }
  return [...mods, main].join('+')
}

function isValidAccel(accel: string): boolean {
  // Must have at least one modifier and one non-modifier, i.e. at
  // least 2 parts joined by "+".
  const parts = accel.split('+')
  if (parts.length < 2) return false
  const last = parts[parts.length - 1]!
  if (['Ctrl', 'Shift', 'Alt', 'Meta', ''].includes(last)) return false
  // Need at least one modifier. (parts.length >= 2 + last is not a mod
  // means parts[0..length-1] has at least one modifier already.)
  return true
}

function findConflict(accel: string, excludeId: string): string | null {
  for (const [otherId, otherAccel] of Object.entries(effectiveShortcuts.value)) {
    if (otherId === excludeId) continue
    if (otherAccel === accel) return otherId
  }
  return null
}

function onKeyDown(e: KeyboardEvent) {
  if (!listeningId.value) return
  // Always consume keys while recording so, e.g., Ctrl+Shift+T doesn't
  // simultaneously fire the existing pomodoro shortcut (web-layer only;
  // the OS-level global_shortcut is separate and will still fire).
  e.preventDefault()
  e.stopPropagation()

  if (e.key === 'Escape') {
    cancelRecording()
    return
  }

  const accel = eventToAccel(e)
  if (!accel) return
  recordingPreview.value = accel

  // Live-feedback conflict warning (no commit yet).
  if (isValidAccel(accel)) {
    recordingConflict.value = findConflict(accel, listeningId.value) !== null
  } else {
    recordingConflict.value = false
  }
}

function cancelRecording() {
  listeningId.value = null
  recordingPreview.value = ''
  recordingConflict.value = false
}

function commitRecording() {
  const id = listeningId.value
  if (!id) return
  const accel = recordingPreview.value
  if (!accel) {
    // Nothing captured yet — treat as cancel.
    cancelRecording()
    return
  }
  if (!isValidAccel(accel)) {
    errorMessage.value = `"${accel}" 不是有效快捷键（至少需要一个修饰键加一个主键）`
    cancelRecording()
    return
  }
  const conflict = findConflict(accel, id)
  if (conflict) {
    const conflictLabel = SHORTCUT_LABELS[conflict] ?? conflict
    errorMessage.value = `"${accel}" 已被 ${conflictLabel} 使用，请换一个`
    cancelRecording()
    return
  }
  if (effectiveShortcuts.value[id] === accel) {
    // No-op commit.
    cancelRecording()
    return
  }
  emit('rebind-shortcut', { id, key: accel })
  cancelRecording()
}

/** Click anywhere outside the currently-recording <kbd> = commit. */
function onDocumentMouseDown(e: MouseEvent) {
  if (!listeningId.value) return
  const target = e.target as HTMLElement | null
  if (!target) return
  // If the click was on the same <kbd> (or its child), keep recording.
  const kbd = target.closest('.shortcut-key')
  if (kbd && kbd.classList.contains('recording')) return
  // Clicking the reset button or another shortcut row also commits the
  // current recording first, which is what the user expects.
  commitRecording()
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('mousedown', onDocumentMouseDown, true)
  try {
    unlistenRebindError = await listen<{ id: string; attempted: string; error: string }>(
      'shortcut-rebind-error',
      (event) => {
        const label = SHORTCUT_LABELS[event.payload.id] ?? event.payload.id
        errorMessage.value = `${label} 绑定到 "${event.payload.attempted}" 失败：${event.payload.error}`
      },
    )
  } catch { /* ignore */ }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown, true)
  window.removeEventListener('mousedown', onDocumentMouseDown, true)
  unlistenRebindError?.()
})

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'downloading' | 'installing' | 'error'
const updateStatus = ref<UpdateStatus>('idle')
const latestVersion = ref('')
const releaseNotes = ref('')
const downloadProgress = ref(0)
const errorMsg = ref('检查失败')

let pendingUpdate: Update | null = null
let releaseUrl = ''

async function handleUpdateClick() {
  if (updateStatus.value === 'error' || updateStatus.value === 'idle' || updateStatus.value === 'up-to-date') {
    await checkUpdate()
  }
}

async function checkUpdate() {
  if (updateStatus.value === 'checking') return
  updateStatus.value = 'checking'
  pendingUpdate = null

  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()

    if (update) {
      latestVersion.value = update.version
      releaseNotes.value = update.body ? (update.body.length > 200 ? update.body.slice(0, 200) + '...' : update.body) : ''
      pendingUpdate = update
      updateStatus.value = 'update-available'
    } else {
      updateStatus.value = 'up-to-date'
    }
  } catch (e: any) {
    // Fallback: check via GitHub API if updater plugin fails
    try {
      await checkUpdateViaGitHub()
    } catch {
      errorMsg.value = '检查失败'
      updateStatus.value = 'error'
      console.error('Update check failed:', e)
    }
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

async function checkUpdateViaGitHub() {
  const resp = await fetch('https://api.github.com/repos/methiy/hamster-pet/releases/latest')
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()

  const tag = data.tag_name as string
  latestVersion.value = tag.replace(/^v/, '')

  const body = (data.body as string) ?? ''
  releaseNotes.value = body.length > 200 ? body.slice(0, 200) + '...' : body
  releaseUrl = data.html_url as string

  if (compareSemver(tag, appVersion) > 0) {
    updateStatus.value = 'update-available'
  } else {
    updateStatus.value = 'up-to-date'
  }
}

async function startUpdate() {
  if (!pendingUpdate) {
    // Fallback: open download page in browser
    const url = releaseUrl || 'https://github.com/methiy/hamster-pet/releases/latest'
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
    } catch {
      window.open(url, '_blank')
    }
    return
  }

  updateStatus.value = 'downloading'
  downloadProgress.value = 0

  try {
    let contentLength = 0
    let downloaded = 0

    await pendingUpdate.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength ?? 0
          break
        case 'Progress':
          downloaded += event.data.chunkLength
          if (contentLength > 0) {
            downloadProgress.value = Math.round((downloaded / contentLength) * 100)
          }
          break
        case 'Finished':
          updateStatus.value = 'installing'
          break
      }
    })

    // Relaunch the app after install
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch (e: any) {
    errorMsg.value = '更新失败'
    updateStatus.value = 'error'
    console.error('Update failed:', e)
  }
}

async function openGitHub() {
  try {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open('https://github.com/methiy/hamster-pet')
  } catch {
    window.open('https://github.com/methiy/hamster-pet', '_blank')
  }
}
</script>

<style scoped>
.about-panel {
  background: #FFF8F0;
  padding: 16px;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 13px;
}

.about-header {
  text-align: center;
  padding: 16px 0 12px;
}

.about-icon {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 8px;
}

.about-title {
  font-size: 20px;
  margin: 0;
  font-weight: 700;
}

.about-subtitle {
  font-size: 12px;
  color: #A08060;
  margin-top: 2px;
}

.about-version {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #F2A65A;
}

.update-section {
  margin-top: 16px;
  text-align: center;
}

.update-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 8px;
  background: white;
  color: #5C4033;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.update-btn:hover:not(:disabled) {
  background: rgba(242, 166, 90, 0.1);
}

.update-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.update-btn.up-to-date {
  border-color: #4CAF50;
  color: #4CAF50;
}

.update-btn.update-available {
  border-color: #F2A65A;
  color: #F2A65A;
  font-weight: 600;
}

.update-btn.downloading {
  border-color: #42A5F5;
  color: #42A5F5;
  font-weight: 600;
}

.update-btn.installing {
  border-color: #AB47BC;
  color: #AB47BC;
  font-weight: 600;
}

.update-btn.error {
  border-color: #E57373;
  color: #E57373;
}

.update-info {
  margin-top: 10px;
  padding: 10px;
  background: rgba(242, 166, 90, 0.08);
  border-radius: 8px;
  text-align: left;
}

.release-notes {
  font-size: 12px;
  color: #8B6E5A;
  line-height: 1.5;
  margin-bottom: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.download-btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: #F2A65A;
  color: white;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}

.download-btn:hover {
  background: #E09040;
}

.progress-bar-container {
  margin-top: 8px;
  height: 6px;
  background: rgba(66, 165, 245, 0.15);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #42A5F5;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.link-section {
  margin-top: 14px;
  text-align: center;
}

.link-btn {
  padding: 8px 16px;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 6px;
  background: white;
  color: #5C4033;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.link-btn:hover {
  background: rgba(242, 166, 90, 0.1);
}

.shortcuts-section {
  margin-top: 14px;
  padding: 12px;
  background: rgba(92, 64, 51, 0.05);
  border-radius: 8px;
}

.shortcuts-title {
  font-size: 14px;
  margin: 0 0 8px;
  font-weight: 600;
  text-align: center;
}

.shortcut-row {
  display: grid;
  /* Fixed label column + flexible key column + fixed reset button column.
     The label column is wide enough for the longest current label
     ("📍 召唤宠物") at the current font size, so every <kbd> starts at
     the same x coordinate regardless of label length. */
  grid-template-columns: 96px 1fr 24px;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}

.shortcut-label {
  font-size: 12px;
  white-space: nowrap;
}

.shortcut-key {
  background: white;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  color: #5C4033;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s, border-color 0.15s;
  min-width: 110px;
  text-align: center;
  justify-self: end;
}
.shortcut-key:hover {
  background: rgba(242, 166, 90, 0.1);
  border-color: rgba(242, 166, 90, 0.4);
}
.shortcut-key.recording {
  background: #FFF7E6;
  border-color: #F2A65A;
  box-shadow: 0 0 0 2px rgba(242, 166, 90, 0.25);
  animation: recording-pulse 1s ease-in-out infinite;
}
.shortcut-key.recording.conflict {
  background: #FFEFEF;
  border-color: #E57373;
  box-shadow: 0 0 0 2px rgba(229, 115, 115, 0.25);
}
@keyframes recording-pulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(242, 166, 90, 0.25); }
  50%      { box-shadow: 0 0 0 4px rgba(242, 166, 90, 0.4); }
}

.shortcuts-hint {
  font-size: 11px;
  color: #A08060;
  text-align: center;
  margin-bottom: 8px;
}

.reset-btn {
  border: 1px solid rgba(92, 64, 51, 0.15);
  background: white;
  color: #5C4033;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  transition: background 0.15s, opacity 0.15s;
}
.reset-btn:hover:not(:disabled) {
  background: rgba(242, 166, 90, 0.1);
}
.reset-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.shortcut-error {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(229, 115, 115, 0.1);
  border: 1px solid rgba(229, 115, 115, 0.3);
  border-radius: 6px;
  color: #C62828;
  font-size: 11px;
  line-height: 1.4;
}

.about-footer {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #B08060;
  padding-bottom: 8px;
}
</style>
