# 柯基桌宠 · 美术需求索引

这个目录放所有给 AI 画图工具用的提示词。按资产类型分子目录。

## 结构

```
docs/prompts/
├── README.md            ← 本文件，索引
├── pet/                 ← 柯基本体 20 个动作帧动画（128×128 × 80 张）
│   ├── README.md        ← 动作总览 + 角色尺寸统一规范（⚠️ 必读）
│   ├── 01-idle.md
│   ├── 02-running.md
│   ├── 03-eating.md
│   ├── 04-happy.md
│   ├── 05-sleeping.md
│   ├── 06-hiding.md
│   ├── 07-adventure-out.md
│   ├── 08-adventure-back.md
│   ├── 09-shy.md
│   ├── 10-chase.md
│   ├── 11-grabbed.md
│   ├── 12-landed.md
│   ├── 13-push-horizontal.md
│   ├── 14-push-vertical.md
│   ├── 15-angry.md
│   ├── 16-yawn.md
│   ├── 17-scratch.md
│   └── 18-bark.md
├── icons/               ← 应用图标 / 托盘图标（若未来要改）
│   └── （当前使用 art/icon.png + art/icon1.png，占位）
├── items/               ← 道具类图标
│   ├── 01-decor.md      装饰品
│   ├── 02-furniture.md  家具
│   ├── 03-equipment.md  装备
│   └── 04-food.md       食物
└── postcards/           ← 冒险明信片场景画
    └── 01-scenes.md
```

## 优先级（建议出图顺序）

1. **pet/ 基础 8 个动作**（01-08）—— 目前代码已在用的状态，换成柯基后即可生效
2. **pet/ 新 10 个动作**（09-18）—— 需要在代码侧新增 `SpriteState` 才能看到效果，**和代码接线一起批量上线**
3. **icons/** —— 如果决定换图标再出
4. **items/, postcards/** —— 之前已经有完整图，除非要重做风格否则不用动

## 出图流程

对每个 md 文件：
1. 读正文 + **pet/README.md 里的尺寸规范** + 技术硬约束
2. 在 AI 画图工具里生成帧（推荐 aseprite / PixelLab / 带像素艺术控制的 SD 模型）
3. 按文件名命名保存，尺寸严格 128×128 RGBA 透明
4. 放到 `src/assets/sprites/`，覆盖同名旧文件
5. 跑 `npm run build` 验证没有加载失败
