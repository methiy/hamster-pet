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

/** 被掂起来时的台词 */
export const GRAB_PHRASES: string[] = [
  '哇啊啊啊！！',
  '放我下来！！',
  '好高好害怕！！',
  '呜呜呜不要拎我~',
  '救命啊——！',
  '要掉下去了！！',
  '晕...晕了...',
  '地球好远...',
]

/** 被掂起来一段时间后说的 */
export const GRAB_HOLDING_PHRASES: string[] = [
  '还...还没放我下来吗...',
  '其实...还挺高的...',
  '你手不酸吗？',
  '我好重的你知道吗！',
  '好晕好晕...',
  '我要飞了~',
]

/** 被放下时的台词 */
export const GRAB_RELEASE_PHRASES: string[] = [
  '呼...终于落地了',
  '屁屁好痛！',
  '还好还好...安全着陆',
  '腿好软...站不稳了',
  '下次轻点嘛！',
  '吓死我了...心脏砰砰跳',
  '再也不要了！！',
]
