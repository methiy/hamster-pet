import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { ActivityType } from '../data/activityPhrases'

interface ActiveWindowInfo {
  title: string
  process_name: string
  rect: {
    left: number
    top: number
    right: number
    bottom: number
  }
}

interface IdleInfo {
  idle_seconds: number
}

/** Process name patterns for activity classification */
const CODING_PROCESSES = ['code.exe', 'cursor.exe', 'idea64.exe', 'idea.exe', 'devenv.exe', 'webstorm64.exe', 'pycharm64.exe', 'goland64.exe', 'rider64.exe', 'clion64.exe', 'sublime_text.exe', 'notepad++.exe', 'atom.exe']
const VIDEO_PROCESSES = ['potplayer.exe', 'potplayermini.exe', 'potplayermini64.exe', 'vlc.exe', 'mpc-hc.exe', 'mpc-hc64.exe', 'mpv.exe']
const GAMING_PROCESSES = ['steam.exe', 'steamwebhelper.exe', 'epicgameslauncher.exe', 'genshinimpact.exe', 'yuanshen.exe', 'league of legends.exe', 'valorant.exe', 'csgo.exe', 'cs2.exe', 'dota2.exe', 'minecraft.exe', 'javaw.exe']
const CHATTING_PROCESSES = ['wechat.exe', 'qq.exe', 'discord.exe', 'telegram.exe', 'slack.exe', 'teams.exe', 'dingtalk.exe', 'feishu.exe', 'tim.exe']
const BROWSER_PROCESSES = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe', 'opera.exe', 'vivaldi.exe', 'arc.exe']

/** Title keywords indicating video content in browsers */
const VIDEO_TITLE_KEYWORDS = ['youtube', 'bilibili', '哔哩哔哩', 'netflix', 'twitch', '优酷', '腾讯视频', '爱奇艺', 'iqiyi', 'disneyplus', 'disney+', '抖音', 'douyin']

/** Title keywords indicating gaming content in browsers */
const GAMING_TITLE_KEYWORDS = ['steam', 'epic games']

/** Self process to filter out */
const SELF_PROCESS = 'hamster-pet.exe'

/** Idle threshold in seconds */
const IDLE_THRESHOLD = 120

function classifyActivity(windowInfo: ActiveWindowInfo | null, idleSeconds: number): ActivityType {
  // Check idle first
  if (idleSeconds >= IDLE_THRESHOLD) {
    return 'idle'
  }

  if (!windowInfo) return 'unknown'

  const proc = windowInfo.process_name.toLowerCase()
  const title = windowInfo.title.toLowerCase()

  // Filter out self
  if (proc === SELF_PROCESS) return 'unknown'

  // Check dedicated apps first
  if (CODING_PROCESSES.includes(proc)) return 'coding'
  if (VIDEO_PROCESSES.includes(proc)) return 'video'
  if (GAMING_PROCESSES.includes(proc)) return 'gaming'
  if (CHATTING_PROCESSES.includes(proc)) return 'chatting'

  // Check browsers - classify by title content
  if (BROWSER_PROCESSES.includes(proc)) {
    // Check video sites
    if (VIDEO_TITLE_KEYWORDS.some(kw => title.includes(kw))) return 'video'
    // Check gaming sites
    if (GAMING_TITLE_KEYWORDS.some(kw => title.includes(kw))) return 'gaming'
    // Generic browsing
    return 'browsing'
  }

  return 'unknown'
}

export function useActivitySensor() {
  const currentActivity = ref<ActivityType>('unknown')
  const windowInfo = ref<ActiveWindowInfo | null>(null)
  const idleSeconds = ref(0)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function poll() {
    try {
      const [winInfo, idleInfo] = await Promise.all([
        invoke<ActiveWindowInfo | null>('get_active_window'),
        invoke<IdleInfo>('get_idle_time'),
      ])
      windowInfo.value = winInfo ?? null
      idleSeconds.value = idleInfo.idle_seconds
      currentActivity.value = classifyActivity(windowInfo.value, idleSeconds.value)
    } catch {
      // Not in Tauri environment or command failed
    }
  }

  onMounted(() => {
    poll() // Initial poll
    pollTimer = setInterval(poll, 10000) // Every 10 seconds
  })

  onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer)
  })

  return {
    currentActivity,
    windowInfo,
    idleSeconds,
  }
}
