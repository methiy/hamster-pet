// src/data/typingWords.ts
// Word bank organized by difficulty level

export type Difficulty = 'easy' | 'medium' | 'hard'

export const wordBank: Record<Difficulty, string[]> = {
  easy: [
    'hamster', 'cheese', 'wheel', 'sleep', 'happy',
    'run', 'play', 'food', 'cute', 'soft',
    'warm', 'home', 'nest', 'seed', 'ball',
    'tiny', 'paws', 'ears', 'tail', 'nose',
    'fuzzy', 'snack', 'water', 'love', 'jump',
    'spin', 'hide', 'peek', 'roll', 'nap',
    'belly', 'fluff', 'treat', 'corn', 'cage',
  ],
  medium: [
    'sunflower seed', 'running wheel', 'cozy nest',
    'happy hamster', 'fluffy cheeks', 'little paws',
    'sleepy time', 'play ground', 'warm blanket',
    'cheese cake', 'hide and seek', 'belly rub',
    'adventure time', 'treasure map', 'golden coin',
    'best friend', 'soft pillow', 'starry night',
    'sweet dream', 'sunny day', 'rainy cloud',
    'magic wand', 'fairy tale', 'pine cone',
    'crystal ball', 'music box', 'photo album',
    'fruit salad', 'candy shop', 'flower pot',
    'garden path', 'river bank',
  ],
  hard: [
    'the quick brown hamster jumps over the lazy cat',
    'sunflower seeds are the best snack for hamsters',
    'my little hamster loves to run on the wheel all night',
    'a happy hamster makes a happy home for everyone',
    'hamsters store food in their cheeks for later',
    'the adventure begins when the hamster leaves the nest',
    'collecting golden coins to buy more treats and toys',
    'every hamster deserves a cozy warm nest to sleep in',
    'spinning the wheel is great exercise for tiny paws',
    'the brave hamster explored the mysterious dark tunnel',
    'gathering nuts and seeds before the winter comes',
    'a gentle pat on the head makes the hamster smile',
    'the fluffy hamster curled up in a ball and fell asleep',
    'treasure hunting through the garden is so much fun',
    'the telescope reveals stars that look like tiny seeds',
    'crossing the river on a tiny boat made of walnut shell',
    'the crown sparkles under the moonlight in the meadow',
    'building a fortress with sticks and leaves and acorns',
    'the bell rings when it is time for a midnight snack',
    'dancing under the sunflower on a warm summer evening',
  ],
}

// Hamster reaction phrases for typing events
export const typingReactions = {
  correct: [
    '嗯嗯，打对了！',
    '就是这样~',
    '继续继续！',
    '太棒了！✨',
    '没错没错~',
  ],
  mistake: [
    '哎呀，打错了！',
    '不对不对~',
    '呜呜，小心点嘛',
    '手滑了吧？',
    '再试试看~',
  ],
  wordComplete: [
    '一个词完成啦！🎉',
    '太厉害了！',
    '好快好快~',
    '完美！继续下一个！',
    '耶！完成！✨',
  ],
  streak: [
    '连击好厉害！🔥',
    '停不下来了！',
    '无敌连击模式！',
    '太强了吧！🌟',
  ],
  idle: [
    '在发呆吗？',
    '快敲键盘呀~',
    '该打字啦！',
    '💤 ...醒醒？',
    '手放到键盘上~',
  ],
}
