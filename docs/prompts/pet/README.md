# 柯基桌宠 — 帧动画美术需求总览

> 把 `src/assets/sprites/` 下的仓鼠帧替换成同风格的**柯基**帧，代码里 sprite 消费位置由 `src/components/HamsterSprite.vue` + `src/sprites/image-frames.ts` 驱动。
> **风格参考**：`art/icon1.png` 本身 —— Q 版、正面或正面略微 ¾、像素艺术感、奶白+橘黄双色柯基、单色深棕/近黑像素描边。**不要写实照片、不要卡通油画、不要 3D 渲染**。

---

## 技术硬约束（所有帧通用）

| 项 | 要求 |
|---|---|
| **单帧画布尺寸** | **128 × 128 像素** |
| **格式** | PNG，32 位 RGBA，**背景完全透明**（alpha=0） |
| **构图** | 柯基本体在画布中央，四周留至少 8 px 透明 padding |
| **视角** | 若无特别说明，一律 **正面或正面略微 ¾**；动作需要侧面的帧见各自文件 |
| **角色比例** | 大头、短腿、长身、Q 版；头占全身 40% 以上 |
| **毛色** | 奶白 + 橘黄/红棕双色；配色总数 ≤ 6 个 |
| **描边** | 外轮廓 1-2 px 深棕/近黑像素描边 |
| **一致性** | 所有动作里的柯基必须是**同一只**（耳朵形状、眼睛颜色、斑纹位置、尾巴样式不变） |
| **动画循环** | 同一动作里第 0 帧和最后一帧需能自然衔接（见各文件 `loop: true/false`） |

---

## ⚠️ 角色尺寸统一规范（必读！非常重要）

动画状态切换时（比如从 idle → running → eating）pet **看起来不能明显变大变小**，否则用户会感觉"一直在伸缩"，非常出戏。所有帧必须遵循以下**固定的角色主体尺寸**：

| 姿势 | 角色高度 | 角色宽度 | 备注 |
|---|---|---|---|
| 站姿（四脚着地） | ≈ 85 px（画布 66%） | ≈ 70 px（画布 55%） | idle / bark / happy 基准 / angry / shy / push 等 |
| 坐姿（下半身贴地） | ≈ 90 px（画布 70%） | ≈ 70 px（画布 55%） | eating / scratch |
| 卧姿（侧躺） | ≈ 55 px（画布 43%） | ≈ 90 px（画布 70%） | sleeping |
| 悬空（被拎起） | ≈ 95 px（画布 74%） | ≈ 55 px（画布 43%） | grabbed（身体被拉长是允许的，但水平投影不能变宽） |

**角色脚底基线**（站姿、坐姿）： y ≈ **画布 110**（从顶向下数）。角色整只画在 y=20..110 区间内，上下留 8-18 px 透明。

**角色水平中心线**：x ≈ **画布 64**（就是水平居中）。即使左右移动的动作（running、chase 等）也要保证角色**水平居中**，因为移动是靠 Tauri 窗口位置移动实现的，sprite 里角色不需要左右位移。

**允许的"尺寸变化"例外**：
- `happy` 第 2 帧（跳到最高点）——角色整体 y 偏移最多 10 px，但**大小不变**
- `adventure-out` / `adventure-back`——故意的远景缩小（这是视觉需要），但**只有这两个动作**可以整体缩放
- `landed` 第 0 帧（屁股砸地）——身体轮廓可以有轻微"扁"的变形，但高度压缩**不超过 15%**
- `hiding` 第 3 帧（缩成一团）——整体高度可以缩到 65 px（下压约 25%），但这是**同一动作内部**的缩小，不影响动作间的切换（hiding 只是临时状态，之后会回到 idle）
- `grabbed`——身体可以被拉长（最多 +10 px 高），但画布中心点和脚底基线在松开时要能平滑接回 landed

**不允许的尺寸变化**：
- ❌ idle 的 pet 画 60 px 高、running 的 pet 画 90 px 高 —— 状态切换会闪烁
- ❌ eating 坐姿时角色突然比 idle 站姿"矮一截" —— 注意坐姿时**头顶** y 和站姿相比只低 5-8 px
- ❌ 不同动作帧里角色水平偏移（running 的帧画在画布左半、idle 的帧画在画布右半）

**出图时的自查方法**：
- 把一组里的所有帧和 `idle-0.png` 在 PS/GIMP/aseprite 里重叠查看
- 确认角色主体的 **上沿 / 下沿 / 左沿 / 右沿** 差距都 ≤ 5 px（除上面列出的明确例外）
- 检查角色中心点（头部位置）差距 ≤ 5 px

---

## 动作清单

替换目标目录：`src/assets/sprites/`

### 基础状态（已存在，直接覆盖即可）

| 动作 id | 文件名 | 帧数 | 循环 | fps | 文件 |
|---|---|---|---|---|---|
| idle | `idle-0..3.png` | 4 | ✔ | 4 | `01-idle.md` |
| running | `running-0..3.png` | 4 | ✔ | 6 | `02-running.md` |
| eating | `eating-0..5.png` | 6 | ✔ | 8 | `03-eating.md` |
| happy | `happy-0..5.png` | 6 | ✔ | 8 | `04-happy.md` |
| sleeping | `sleeping-0..3.png` | 4 | ✔ | 3 | `05-sleeping.md` |
| hiding | `hiding-0..3.png` | 4 | ✘ | 6 | `06-hiding.md` |
| adventure-out | `adventure-out-0..5.png` | 6 | ✘ | 8 | `07-adventure-out.md` |
| adventure-back | `adventure-back-0..5.png` | 6 | ✘ | 8 | `08-adventure-back.md` |

### 新动作（新增，需要代码侧接线才会用上）

| 动作 id | 文件名 | 帧数 | 循环 | fps | 文件 |
|---|---|---|---|---|---|
| shy | `shy-0..3.png` | 4 | ✔ | 5 | `09-shy.md` |
| chase | `chase-0..3.png` | 4 | ✔ | 8 | `10-chase.md` |
| grabbed | `grabbed-0..3.png` | 4 | ✔ | 5 | `11-grabbed.md` |
| landed | `landed-0..3.png` | 4 | ✘ | 8 | `12-landed.md` |
| push-horizontal | `push-h-0..3.png` | 4 | ✔ | 6 | `13-push-horizontal.md` |
| push-vertical | `push-v-0..3.png` | 4 | ✔ | 6 | `14-push-vertical.md` |
| angry | `angry-0..3.png` | 4 | ✔ | 6 | `15-angry.md` |
| yawn | `yawn-0..3.png` | 4 | ✘ | 5 | `16-yawn.md` |
| scratch | `scratch-0..3.png` | 4 | ✔ | 6 | `17-scratch.md` |
| bark | `bark-0..3.png` | 4 | ✔ | 8 | `18-bark.md` |

**合计**：基础 40 + 新动作 40 = **80 张 PNG**。

---

## 出图后的接入

1. 基础动作（8 个）出好后直接覆盖到 `src/assets/sprites/`，**不用改代码**就能看到效果
2. 新动作（12 个）放到 `src/assets/sprites/` 后需要**一次性接线**到代码：
   - 在 `SpriteState` 里加对应 id
   - 在 `image-frames.ts` 里 import + 定义 animation
   - 在对应触发点（grab / drop / push 四方向 / chase / random-idle / 活动检测 / 召唤反应 等）调用 `setState` 或 `triggerReaction`
3. 每批图接好后 `npm run build` 验证、bump 版本、发 tag

---

## 美术风格统一性检查清单

出完一组图后，把它和 `idle-0.png` 并排摆，检查：
- [ ] 头大小一致
- [ ] 眼睛颜色/大小一致
- [ ] 耳朵形状一致
- [ ] 毛色分布（哪里白哪里橘）一致
- [ ] 描边粗细/颜色一致
- [ ] 整体像素网格密度一致（不能一张细一张粗）
