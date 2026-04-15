# 仓鼠像素帧动画 AI 生成提示词

## 生成参数

- **每帧尺寸**: 48×48 像素
- **网格排列**: 10列 × 8行
- **总图尺寸**: 480×384 像素
- **状态数**: 8 个动画状态
- **每状态帧数**: 10 帧

## English Prompt

Pixel art sprite sheet of a cute hamster character, 48x48 pixels per frame, arranged in a grid of 10 columns × 8 rows (total image 480×384 pixels). Warm color palette: golden fur, light cream belly, pink blush cheeks, dark brown pixel outline, white eye highlights, pink inner ears. Clean pixel art, no anti-aliasing, transparent background, each frame clearly separated in grid.

Row 1 - IDLE (10 frames): hamster facing forward, gentle breathing animation, subtle belly expand/contract, eye blink on frames 7-8.
Row 2 - EATING (10 frames): hamster holding small yellow food, arms raised to mouth, cheeks puffing up then deflating, chewing cycle.
Row 3 - SLEEPING (10 frames): hamster curled up, eyes closed as lines, small blue "z" letters floating up above head, gentle body rise and fall.
Row 4 - RUNNING (10 frames): hamster running on a grey exercise wheel, legs alternating rapidly, wheel spokes rotating, body leaning forward.
Row 5 - HAPPY (10 frames): hamster bouncing up and down joyfully, happy curved eyes (upside-down U shape), arms raised in celebration.
Row 6 - HIDING (10 frames): hamster progressively shrinking smaller and smaller until nearly invisible, crouching then reducing in size each frame.
Row 7 - WALKING RIGHT/LEAVING (10 frames): side-view hamster with tiny backpack walking to the right, progressively moving off-screen, last frame empty.
Row 8 - WALKING LEFT/RETURNING (10 frames): side-view hamster entering from left carrying small yellow bundle, walking to center, last frame facing forward.

## 中文提示词

像素风精灵图表，一只可爱的仓鼠角色，每帧48x48像素，排列为10列×8行的网格（总图480×384像素）。暖色调：金色皮毛、浅奶油色肚子、粉色腮红、深棕色像素轮廓线、白色眼睛高光、粉色耳朵内部。干净的像素画风格，无抗锯齿，透明背景，每帧在网格中清晰分隔。

第1行 - 待机（10帧）：仓鼠正面朝前，轻柔呼吸动画，肚子微微鼓起/收缩，第7-8帧眨眼。
第2行 - 吃东西（10帧）：仓鼠双手捧着黄色小食物，手举到嘴边，腮帮子鼓起又消下，咀嚼循环。
第3行 - 睡觉（10帧）：仓鼠蜷缩，眼睛是闭合的横线，头顶飘浮蓝色小"z"字母，身体轻微起伏。
第4行 - 跑步（10帧）：仓鼠在灰色跑轮上奔跑，腿部快速交替，轮辐旋转，身体前倾。
第5行 - 开心（10帧）：仓鼠欢快地上下蹦跳，开心的弯弯眼（倒U形），双臂举起庆祝。
第6行 - 躲藏（10帧）：仓鼠逐渐缩小直到几乎看不见，先蹲下然后每帧缩小。
第7行 - 出发（10帧）：侧面仓鼠背着小书包向右走，逐渐走出画面，最后一帧为空。
第8行 - 归来（10帧）：侧面仓鼠从左边进入，拎着黄色小包袱，走到中央，最后一帧转为正面。

## 行与状态映射

| 行 | 状态 | 代码名称 | 帧数 | FPS | 循环 |
|----|------|----------|------|-----|------|
| 1 | 待机 | idle | 10 | 4 | 是 |
| 2 | 吃东西 | eating | 10 | 8 | 是 |
| 3 | 睡觉 | sleeping | 10 | 3 | 是 |
| 4 | 跑步 | running | 10 | 10 | 是 |
| 5 | 开心 | happy | 10 | 8 | 是 |
| 6 | 躲藏 | hiding | 10 | 6 | 否 |
| 7 | 出发 | adventure_out | 10 | 8 | 否 |
| 8 | 归来 | adventure_back | 10 | 8 | 否 |

## 生成后处理流程

1. 用上述提示词在 ai.woa.com 生成图片
2. 将生成的图片上传给 Claude
3. Claude 自动处理：
   - 按 48×48 网格切割为 80 帧
   - 量化颜色到调色板（~12色）
   - 转换为 RLE 编码帧数据
   - 替换 src/sprites/frames/ 下的所有帧文件

## 备用方案

如果平台有尺寸限制（不支持 480×384），可拆为两张图：
- 图A（行1-4）：480×192 — idle / eating / sleeping / running
- 图B（行5-8）：480×192 — happy / hiding / adventure_out / adventure_back
