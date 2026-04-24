import type { HamsterState } from '../composables/useHamster'

export type ActivityType = 'coding' | 'video' | 'gaming' | 'chatting' | 'browsing' | 'idle' | 'unknown'

export interface ActivityConfig {
  /** Complaint phrases for this activity */
  phrases: string[]
  /** Hamster reaction state when complaining */
  reactionState: HamsterState
  /** Reaction duration in ms */
  reactionDuration: number
  /** Cooldown before next complaint for this activity (ms) */
  cooldown: number
  /** Probability (0-1) of triggering a window push */
  pushChance: number
}

export const ACTIVITY_PHRASES: Record<ActivityType, ActivityConfig> = {
  coding: {
    phrases: [
      '主人又在写代码了...好无聊',
      'bug 写完了没？陪我玩嘛~',
      '代码有我可爱吗？',
      '写代码不如撸柯基！',
      '主人眼睛要瞎啦，休息一下嘛~',
      '又在加班...心疼主人',
    ],
    reactionState: 'angry',
    reactionDuration: 2500,
    cooldown: 60 * 1000,  // 1 minute
    pushChance: 0.30,
  },
  video: {
    phrases: [
      '主人陪陪我，不要看视频了！',
      '看什么看！看我！',
      '视频有我好看吗？！',
      '又在刷视频...我也想看！',
      '看了多久了！该陪我了！',
      '我要挡住屏幕！不许看！',
    ],
    reactionState: 'running',
    reactionDuration: 2000,
    cooldown: 45 * 1000,  // 45 seconds
    pushChance: 0.60,
  },
  gaming: {
    phrases: [
      '又在打游戏！我也要玩！',
      '游戏有我可爱吗？！',
      '打赢了没？让我看看！',
      '主人不要沉迷游戏！',
      '带我一起玩嘛~',
      '你这游戏不如柯基模拟器好玩！',
    ],
    reactionState: 'angry',
    reactionDuration: 2500,
    cooldown: 60 * 1000,  // 1 minute
    pushChance: 0.50,
  },
  chatting: {
    phrases: [
      '在跟谁聊天！是不是有别的柯基？',
      '不许跟别人聊天！要跟我聊！',
      '聊什么呢？说给我听听~',
      '是在说我坏话吗？！',
      '聊天不如摸柯基！',
    ],
    reactionState: 'hiding',
    reactionDuration: 2000,
    cooldown: 60 * 1000,  // 1 minute
    pushChance: 0.35,
  },
  browsing: {
    phrases: [
      '网上冲浪有什么好的~',
      '又在摸鱼！被我抓到了！',
      '看什么网页呢？给我也看看',
      '主人好闲啊，来陪我玩~',
    ],
    reactionState: 'idle',
    reactionDuration: 1500,
    cooldown: 60 * 1000,  // 1 minute
    pushChance: 0.30,
  },
  idle: {
    phrases: [
      '主人？你还在吗？',
      '人呢...好寂寞...',
      '主人不要我了吗...',
      '好无聊啊...戳戳...',
      '主人回来陪我~',
      '一个人好孤单...',
    ],
    reactionState: 'sleeping',
    reactionDuration: 3000,
    cooldown: 90 * 1000,  // 1.5 minutes
    pushChance: 0.0,  // Can't push when user is idle
  },
  unknown: {
    phrases: [
      '主人在干嘛呀？',
      '看不懂你在做什么~',
      '不管了，我来捣乱！',
      '嘿嘿，让我推推这个窗口~',
    ],
    reactionState: 'idle',
    reactionDuration: 1500,
    cooldown: 90 * 1000,  // 1.5 minutes
    pushChance: 0.25,
  },
}

/** Push animation specific phrases (said when arriving at the window) */
export const PUSH_PHRASES: Record<ActivityType, string[]> = {
  coding: [
    '让我帮你关掉这个！',
    '不许写了！休息！',
  ],
  video: [
    '我来帮你关掉！不许看了！',
    '哼！我推走它！',
    '视频拜拜~看我！',
  ],
  gaming: [
    '游戏给我关掉！',
    '不玩了不玩了！陪我！',
    '我推！我推推推！',
  ],
  chatting: [
    '不准跟别人聊！只能跟我聊！',
    '让开让开~',
  ],
  browsing: [
    '网页拜拜~',
    '够了够了，别看了~',
  ],
  idle: [],
  unknown: [
    '让我推推看~',
  ],
}

/** Phrases specifically for when the pet pauses a video */
export const VIDEO_PAUSE_PHRASES: string[] = [
  '不要看了主人陪陪我~',
  '视频暂停！看我看我！',
  '我帮你按了暂停哦~陪我玩嘛',
  '不许看了！我按暂停了！',
]

/** Phrases when the pet is summoned via shortcut or tray menu */
export const SUMMON_PHRASES: string[] = [
  '主人叫我啦~来了来了！',
  '我在这里！想我了吗？',
  '嗖~我飞过来啦！',
  '主人找我有什么事呀？',
]
