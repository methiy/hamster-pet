# 仓鼠宠物 美术资源生成提示词

> 生成完成后请通知我，我会将素材集成到项目中。

## 通用风格约束

所有素材统一风格：
- **风格**：可爱 Q 版像素风 / chibi pixel art
- **背景**：透明（PNG 格式，alpha 通道）
- **调色板**：暖色系为主，仓鼠主色 #F2A65A（橙棕），深色 #5C4033（暗棕），高光 #FFDEAD
- **目标尺寸**：仓鼠精灵 128×128px，明信片 480×300px，图标 64×64px

---

## 一、仓鼠帧动画（最优先）

每个状态需要 **sprite sheet**（横排一行），帧与帧之间等间距排列。

### 1. idle（待机）— 4 帧，循环

```
Pixel art sprite sheet, 4 frames in a horizontal row, transparent background.
A cute chibi hamster sitting upright, facing slightly to the right.
Round body, tiny paws resting on belly, small round ears, black bead eyes, pink nose, short stubby tail.
Color: warm orange-brown fur (#F2A65A), lighter belly (#FFDEAD), dark brown accents (#5C4033).
Animation: subtle breathing motion — body slightly expands and contracts.
Frame 1: normal pose. Frame 2: body slightly puffed up (inhale). Frame 3: normal. Frame 4: ears twitch slightly.
Style: cute kawaii pixel art, clean outlines, soft shading. 128x128 pixels per frame.
```

### 2. eating（吃东西）— 6 帧，循环

```
Pixel art sprite sheet, 6 frames in a horizontal row, transparent background.
A cute chibi hamster sitting and eating, holding a small seed/food item with both front paws near its mouth.
Round body, cheeks gradually puffing up as it eats.
Color: warm orange-brown fur (#F2A65A), lighter belly (#FFDEAD).
Animation: chewing cycle — paws bring food to mouth, jaw moves up and down, cheeks puff bigger.
Frame 1: holding food near mouth. Frame 2: mouth open, biting. Frame 3: chewing, cheeks slightly puffed.
Frame 4: still chewing. Frame 5: cheeks visibly puffed. Frame 6: swallow, cheeks deflate slightly.
Style: cute kawaii pixel art, clean outlines. 128x128 pixels per frame.
```

### 3. sleeping（睡觉）— 4 帧，循环

```
Pixel art sprite sheet, 4 frames in a horizontal row, transparent background.
A cute chibi hamster curled up sleeping in a ball. Eyes closed (happy curved lines), tiny paws tucked in, tail wrapped around body.
Color: warm orange-brown fur (#F2A65A), lighter belly (#FFDEAD).
Animation: slow breathing with floating "Z" letters.
Frame 1: curled up, small "z" above. Frame 2: body slightly rises (breathing in), "z" floats up.
Frame 3: body settles back, "Z" (bigger) appears. Frame 4: peaceful, "Z" fading, new small "z" starts.
Style: cute kawaii pixel art, peaceful mood, soft shading. 128x128 pixels per frame.
```

### 4. running（跑步）— 4 帧，循环

```
Pixel art sprite sheet, 4 frames in a horizontal row, transparent background.
A cute chibi hamster running in place, viewed from the side. Short legs in running motion, ears bouncing, happy expression.
Color: warm orange-brown fur (#F2A65A), lighter belly (#FFDEAD).
Animation: classic run cycle — legs alternate, body bounces up and down slightly.
Frame 1: left legs forward, right legs back, body up. Frame 2: legs passing center, body down.
Frame 3: right legs forward, left legs back, body up. Frame 4: legs passing, body down.
Small motion lines behind the hamster to show speed.
Style: cute kawaii pixel art, energetic, bouncy feel. 128x128 pixels per frame.
```

### 5. happy（开心）— 6 帧，播放一次

```
Pixel art sprite sheet, 6 frames in a horizontal row, transparent background.
A cute chibi hamster jumping with joy. Star-shaped eyes or big sparkly eyes, mouth open in a big smile, tiny arms raised.
Color: warm orange-brown fur (#F2A65A), lighter belly (#FFDEAD).
Animation: jump celebration — crouch, jump up, peak with sparkles, land, bounce, settle.
Frame 1: crouching down (preparing to jump). Frame 2: launching upward, arms spread.
Frame 3: peak of jump, sparkle effects (✨) around, biggest smile. Frame 4: starting to descend.
Frame 5: landing with small bounce. Frame 6: happy standing pose with residual sparkles.
Style: cute kawaii pixel art, joyful, celebratory. 128x128 pixels per frame.
```

### 6. hiding（害羞/躲藏）— 4 帧，播放一次

```
Pixel art sprite sheet, 4 frames in a horizontal row, transparent background.
A cute chibi hamster acting shy/startled, covering face with paws, ears folded back.
Color: warm orange-brown fur (#F2A65A), lighter belly (#FFDEAD).
Animation: startle then hide — flinch, cover face, peek, stay hidden.
Frame 1: startled expression, ears perked up, eyes wide. Frame 2: paws quickly raised to cover face.
Frame 3: peeking through paws with one eye, ears folded down, light blush marks.
Frame 4: fully covering face with both paws, small embarrassed blush on ears.
Style: cute kawaii pixel art, shy and adorable. 128x128 pixels per frame.
```

### 7. adventure_out（出发冒险）— 6 帧，播放一次

```
Pixel art sprite sheet, 6 frames in a horizontal row, transparent background.
A cute chibi hamster with a tiny backpack, walking determinedly to the right and eventually leaving the frame.
Color: warm orange-brown fur (#F2A65A), lighter belly (#FFDEAD), small green backpack.
Animation: determined walk off-screen — wave, turn, walk, walk, almost off-screen, gone.
Frame 1: hamster facing viewer, waving with one paw. Frame 2: turning to face right.
Frame 3: walking right with backpack visible, determined face. Frame 4: further right, mid-stride.
Frame 5: mostly off the right edge of frame. Frame 6: only tail tip visible / empty frame.
Style: cute kawaii pixel art, adventurous mood. 128x128 pixels per frame.
```

### 8. adventure_back（冒险归来）— 6 帧，播放一次

```
Pixel art sprite sheet, 6 frames in a horizontal row, transparent background.
A cute chibi hamster running back from the left side, excited, with a slightly overstuffed backpack.
Color: warm orange-brown fur (#F2A65A), lighter belly (#FFDEAD), green backpack bulging with items.
Animation: excited return — appear from left, run in, skid to stop, celebrate.
Frame 1: just paw and ear visible from left edge. Frame 2: hamster running in from left, big smile.
Frame 3: mid-run, backpack bouncing. Frame 4: skidding to a stop in center.
Frame 5: standing triumphantly, holding up a small treasure/item. Frame 6: happy pose with sparkle, backpack on ground.
Style: cute kawaii pixel art, triumphant return mood. 128x128 pixels per frame.
```

---

## 二、明信片场景（替换 SVG）

每张 **480×300px**，有背景色（不需要透明），卡通插画风格。

### 统一风格提示前缀

```
Cute illustrated postcard scene, soft watercolor cartoon style, warm pastel colors, gentle lighting, 480x300 pixels, no text, no characters.
```

### 1. park（公园）
```
[前缀] A peaceful city park in golden afternoon light. A wooden bench under a large oak tree, dappled sunlight through green leaves, a winding stone path, flower beds with colorful flowers, a small pond in the background with ducks. Warm green and golden tones.
```

### 2. beach（海滩）
```
[前缀] A tropical beach at sunset. Golden sand, gentle turquoise waves, a palm tree leaning over the water, scattered seashells on the shore, a beach umbrella in the distance, orange and pink sunset sky with wispy clouds.
```

### 3. mountain（山顶）
```
[前缀] A majestic mountain peak view. Multiple mountain ridges fading into distance with atmospheric perspective, white snow caps, fluffy clouds at mid-level, a small wildflower meadow in the foreground, blue and purple mountain tones.
```

### 4. supermarket（超市）
```
[前缀] A cheerful small-town supermarket interior. Colorful product shelves neatly organized, a cute shopping cart, hanging sale banners, warm fluorescent lighting, tiled floor, a checkout counter with candy display. Bright and inviting.
```

### 5. library（图书馆）
```
[前缀] A cozy old library interior. Tall wooden bookshelves filled with colorful books, a reading nook with a plush armchair and warm lamp, dust motes in golden light from an arched window, a rolling ladder against the shelf. Warm brown and golden tones.
```

### 6. garden（花园）
```
[前缀] A whimsical cottage garden in full bloom. White picket fence, winding stone path through beds of roses, tulips, and lavender, butterflies floating above, a small bird bath, ivy-covered archway, soft morning light. Pink, purple and green palette.
```

### 7. playground（游乐场）
```
[前缀] A colorful children's playground on a sunny day. A red and blue swing set, a curving yellow slide, a green seesaw, rubber mat ground, a sandbox, cotton candy clouds in a bright blue sky. Vibrant primary colors.
```

### 8. cafe（咖啡馆）
```
[前缀] A charming European-style café interior. A window table with a steaming coffee cup and a croissant on a plate, lace curtains, warm ambient light, vintage wallpaper, a small vase with a single flower, view of a cobblestone street outside.
```

### 9. forest（森林）
```
[前缀] A mystical deep forest. Towering ancient trees with thick trunks, dappled green light filtering through a dense canopy, mushrooms growing on logs, moss-covered rocks, a faint misty trail, small fireflies glowing. Emerald and dark green palette.
```

### 10. snowmountain（雪山）
```
[前缀] A serene snow-covered mountain landscape. Pristine white snow fields, a frozen lake reflecting the mountain, pine trees heavy with snow, gentle snowflakes falling, a pale winter sun low on the horizon, northern lights faintly visible. White, blue and silver palette.
```

### 11. mine（废弃矿洞）
```
[前缀] Inside a mysterious abandoned mine shaft. Dark rocky walls with embedded colorful gemstones (red rubies, blue sapphires, green emeralds) glinting in the light, old wooden support beams, rusty mine cart on rails, a warm lantern casting golden light, mysterious deeper tunnel in the background. Dark tones with colorful gem highlights.
```

### 12. island（神秘海岛）
```
[前缀] A small tropical paradise island from a slight aerial view. Crystal clear turquoise water surrounding white sand, two palm trees, a hammock between them, a small wooden dock, colorful fish visible in the shallow water, a treasure chest half-buried in sand, puffy white clouds. Vibrant tropical colors.
```

### 13. observatory（星空天文台）
```
[前缀] A hilltop astronomical observatory at night. A white domed building with an open slit revealing a telescope, a spectacular starry sky with visible Milky Way, a shooting star streaking across, a crescent moon, the ground has a stone pathway with small garden lights. Deep navy blue with starlight.
```

---

## 三、装饰品图标（64×64px，透明背景）

### 统一风格提示前缀

```
Cute pixel art icon, 64x64 pixels, transparent background, clean outlines, soft shading, single item centered.
```

### 装饰品（6 个）

| ID | 提示词 |
|----|--------|
| crown | `[前缀] A tiny adorable golden crown with small red gems, fit for a hamster. Shiny metallic gold with highlights.` |
| sunglasses | `[前缀] A pair of cool dark sunglasses, hamster-sized. Black frames with slight blue reflection on lenses.` |
| bow | `[前缀] A cute pink satin bow ribbon, slightly puffy with a center knot. Soft pink (#FF69B4) with lighter highlights.` |
| bell | `[前缀] A small golden jingle bell with a red ribbon loop at top. Shiny gold surface with a slit opening at bottom.` |
| backpack | `[前缀] A tiny green adventure backpack, slightly overstuffed, with a small buckle and visible strap. Forest green with brown leather accents.` |
| wreath | `[前缀] A small flower wreath/crown made of colorful tiny flowers (pink, yellow, purple) and green leaves woven together. Fresh and spring-like.` |

### 家具（5 个）

| ID | 提示词 |
|----|--------|
| wheel | `[前缀] A hamster running wheel, colorful plastic design. Orange/yellow wheel on a blue metal stand. Slightly tilted to show the running surface.` |
| nest | `[前缀] A cozy hamster house/nest made of warm brown wood, small arched doorway, tiny chimney, soft bedding visible inside. Warm and inviting cottage style.` |
| swing | `[前缀] A tiny rope swing with a wooden plank seat, hanging from a small frame. Natural wood and rope colors, playful.` |
| sunflower_pot | `[前缀] A small terracotta flower pot with a bright sunflower growing in it. Brown clay pot, green stem and leaves, bright yellow sunflower with brown center.` |
| treasure_chest | `[前缀] A small wooden treasure chest slightly open, golden coins and gems peeking out, golden metal hinges and lock. Rich brown wood with gold accents, magical sparkle.` |

---

## 四、装备图标（5 个，64×64px，透明背景）

| ID | 提示词 |
|----|--------|
| tent | `[前缀] A small orange camping tent with an open flap, pitched on green grass. A tiny flag on top. Bright orange fabric.` |
| scarf | `[前缀] A cozy knitted scarf in red and white stripes, loosely draped. Warm wool texture, fringed ends.` |
| treasure_map | `[前缀] An aged rolled treasure map with burned edges, partially unrolled showing a dotted path and an X mark. Yellowed parchment, red X, brown ink.` |
| boat_ticket | `[前缀] A vintage boat ticket/boarding pass, slightly worn. Cream colored with blue wave decorations, a small anchor stamp, perforated edge.` |
| telescope | `[前缀] A brass telescope/spyglass, extended, with golden and brown leather accents. Classic nautical explorer style, shiny metallic.` |

---

## 交付格式

| 类别 | 文件格式 | 尺寸 | 数量 |
|------|---------|------|------|
| 仓鼠帧动画 | PNG sprite sheet（横排） | 每帧 128×128 | 8 张（每状态一张） |
| 明信片场景 | PNG/JPG | 480×300 | 13 张 |
| 装饰品图标 | PNG（透明背景） | 64×64 | 6 张 |
| 家具图标 | PNG（透明背景） | 64×64 | 5 张 |
| 装备图标 | PNG（透明背景） | 64×64 | 5 张 |

**共 37 张素材**

请把生成好的素材放到项目 `assets/` 目录下（按类别建子文件夹），或者告诉我文件路径，我来集成到代码里。
