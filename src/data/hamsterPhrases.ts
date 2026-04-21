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

/** 鼠标追逐：开始时的台词 */
export const CHASE_START_PHRASES: string[] = [
  '你干嘛～追上你！',
  '哎呀！别动！',
  '站住！！',
  '欠揍的小主人～',
  '看我抓到你！',
]

/** 5 秒内追上时的台词 */
export const CHASE_CATCH_PHRASES: string[] = [
  '哈～追到啦！',
  '抓住你了！嘿嘿嘿～',
  '逃不掉了！',
  '就知道追得上！',
]

/** 5 秒内没追上时的台词 */
export const CHASE_FAIL_PHRASES: string[] = [
  '哼！再也不给主人玩了！',
  '累死了…没追上…',
  '气死我了！！',
  '主人坏坏！',
]

/** 没追上后触发的「骗你的」彩蛋台词 */
export const CHASE_PRANK_PHRASES: string[] = [
  '骗你的～追到咯！！！',
  '嘿嘿，装累的～',
  '其实我早就追上啦！',
  '哼哼，惊喜吧～',
]
