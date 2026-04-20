<template>
  <div class="about-panel" @click.stop>
    <div class="about-header">
      <div class="about-icon">🐹</div>
      <h2 class="about-title">仓鼠宠物</h2>
      <div class="about-subtitle">Hamster Pet</div>
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
      <div class="shortcut-row">
        <span class="shortcut-label">📍 召唤宠物</span>
        <kbd class="shortcut-key">Ctrl+Shift+P</kbd>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-label">🍽️ 喂食</span>
        <kbd class="shortcut-key">Ctrl+Shift+F</kbd>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-label">📝 备忘</span>
        <kbd class="shortcut-key">Ctrl+Shift+N</kbd>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-label">🍅 番茄钟</span>
        <kbd class="shortcut-key">Ctrl+Shift+T</kbd>
      </div>
    </div>

    <div class="about-footer">
      Made with ❤️
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Update } from '@tauri-apps/plugin-updater'

declare const __APP_VERSION__: string
const appVersion = __APP_VERSION__

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
}

.shortcut-label {
  font-size: 12px;
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
}

.about-footer {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #B08060;
  padding-bottom: 8px;
}
</style>
