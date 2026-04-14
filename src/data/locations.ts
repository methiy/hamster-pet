export interface Location {
  id: string
  name: string
  emoji: string
  description: string
  postcardDescription: string
  possibleSouvenirs: string[]
  unlockCondition?: string
}

export const locations: Location[] = [
  {
    id: 'park',
    name: '公园',
    emoji: '🏞️',
    description: '阳光明媚的城市公园，有长椅和大树',
    postcardDescription: '绿树成荫的公园长椅，阳光透过树叶洒下',
    possibleSouvenirs: ['acorn', 'feather', 'pebble', 'flower'],
  },
  {
    id: 'beach',
    name: '海滩',
    emoji: '🏖️',
    description: '金色沙滩和蔚蓝海水',
    postcardDescription: '棕榈树下的金色沙滩与碧蓝海浪',
    possibleSouvenirs: ['seashell', 'pebble', 'starfish', 'sea_glass'],
  },
  {
    id: 'mountain',
    name: '山顶',
    emoji: '⛰️',
    description: '高耸入云的山峰，风景壮观',
    postcardDescription: '连绵起伏的山峰与飘动的白云',
    possibleSouvenirs: ['pinecone', 'feather', 'crystal', 'pebble'],
  },
  {
    id: 'supermarket',
    name: '超市',
    emoji: '🛒',
    description: '琳琅满目的商品货架',
    postcardDescription: '堆满商品的超市和可爱的购物车',
    possibleSouvenirs: ['stamp', 'sticker', 'candy_wrapper'],
  },
  {
    id: 'library',
    name: '图书馆',
    emoji: '📚',
    description: '安静温馨的阅读空间',
    postcardDescription: '高高的书架和温暖的台灯',
    possibleSouvenirs: ['leaf_bookmark', 'stamp', 'old_coin'],
  },
  {
    id: 'garden',
    name: '花园',
    emoji: '🌷',
    description: '五彩缤纷的花海和蝴蝶翩翩',
    postcardDescription: '篱笆围绕的花园里蝴蝶翩翩起舞',
    possibleSouvenirs: ['flower', 'butterfly_wing', 'feather', 'acorn'],
  },
  {
    id: 'playground',
    name: '游乐场',
    emoji: '🎠',
    description: '欢乐的秋千和滑梯',
    postcardDescription: '彩色的秋千和滑梯在阳光下闪闪发光',
    possibleSouvenirs: ['sticker', 'candy_wrapper', 'pebble', 'marble'],
  },
  {
    id: 'cafe',
    name: '咖啡馆',
    emoji: '☕',
    description: '香浓咖啡和可口甜点',
    postcardDescription: '窗边的咖啡桌上冒着热气的咖啡杯',
    possibleSouvenirs: ['stamp', 'sticker', 'old_coin'],
  },
  {
    id: 'forest',
    name: '森林',
    emoji: '🌲',
    description: '幽深神秘的古老森林',
    postcardDescription: '茂密的树林中长着可爱的蘑菇',
    possibleSouvenirs: ['pinecone', 'acorn', 'mushroom_cap', 'butterfly_wing', 'crystal'],
    unlockCondition: 'hasTent',
  },
  {
    id: 'snowmountain',
    name: '雪山',
    emoji: '🏔️',
    description: '白雪皑皑的壮丽雪山',
    postcardDescription: '银装素裹的雪峰和飘落的雪花',
    possibleSouvenirs: ['crystal', 'feather', 'snowflake_charm', 'pebble'],
    unlockCondition: 'hasScarf',
  },
]
