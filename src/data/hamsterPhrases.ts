export type BodyRegion = 'ear' | 'head' | 'belly' | 'paw' | 'tail' | 'body'

export const CLICK_PHRASES: Record<BodyRegion, string[]> = {
  head:  ['别摸我头啦~', '头顶好暖...', '嗯？在摸我吗？', '头发要乱了！'],
  ear:   ['耳朵好敏感...', '啊...别碰耳朵', '耳朵痒痒的~', '哎呀~'],
  belly: ['好痒！', '肚肚不能摸！', '嘻嘻嘻~', '咕噜噜~'],
  paw:   ['爪爪给你~', '握握手！', '牵牵手~'],
  tail:  ['别碰尾巴！', '尾巴是禁区！', '呀！尾巴！'],
  body:  ['嗯？', '你好呀~', '戳我干嘛~', '嘿嘿~'],
}

export const HOVER_PHRASES: string[] = ['?', '...', '👀', '嗯？', '看什么看~']

/** 点击部位 → 反应状态 + 持续时长 */
export const REACTION_MAP: Record<BodyRegion, { state: 'happy' | 'hiding'; duration: number }> = {
  head:  { state: 'hiding', duration: 1500 },
  ear:   { state: 'hiding', duration: 1200 },
  belly: { state: 'happy',  duration: 1500 },
  paw:   { state: 'happy',  duration: 1000 },
  tail:  { state: 'hiding', duration: 1000 },
  body:  { state: 'happy',  duration: 1000 },
}
