# 仓鼠桌面宠物设计

## 概述

Windows 桌面挂件风格的佛系放置宠物游戏。一只圆滚滚的小仓鼠直接站在桌面上（透明无边框窗口），自主决定吃东西、跑轮、睡觉、藏食物、出门探险。玩家通过右键菜单喂食、购买物品。仓鼠会外出旅行带回明信片和纪念品。

## 技术栈

- **Tauri 2.x** — Rust 后端，透明无边框窗口，系统托盘，always_on_top
- **Vue 3** — 前端 UI（Vite 构建）
- **SVG + CSS Animation** — 仓鼠精灵动画
- **localStorage** — 数据持久化

## 窗口配置

- `transparent: true` + `decorations: false`
- 窗口尺寸：250×250px
- `always_on_top: true`
- 左键拖动移动位置
- 系统托盘图标：右键菜单（商店/明信片/纪念品/退出）

## 仓鼠状态机

| 状态 | 动画描述 | 持续时间 | 权重 |
|------|---------|---------|------|
| idle | 坐着发呆，偶尔眨眼/挠头 | 30-60s | 30 |
| eating | 抱着食物啃，腮帮鼓起 | 15-25s | 20（需有食物） |
| running | 在转轮上跑 | 20-40s | 15 |
| sleeping | 缩成球，呼吸起伏，冒zzZ | 60-180s | 20 |
| hiding | 叼食物跑，左右看 | 10-15s | 5（需有食物） |
| adventure_out | 戴背包走出画面，留纸条 | 5-30min | 5 |
| adventure_back | 背着东西走回来 | 10s | 触发式 |
| happy | 双击时开心蹦跳 | 3s | 触发式 |

状态切换：每个状态结束后，根据权重随机选择下一个状态。adventure 是长周期事件。

## 互动

- **左键拖动**：移动仓鼠
- **双击**：触发 happy 动画
- **右键**：弹出上下文菜单
  - 喂食（从背包选食物）
  - 商店（弹出子窗口）
  - 明信片（弹出画廊窗口）
  - 纪念品（弹出陈列窗口）
  - 设置（置顶开关等）
  - 退出

## 经济系统

- **金币**：每分钟自动 +1，仓鼠跑轮时 +2/min
- **商店**：
  - 葵花籽 5金币，面包 10金币，苹果 15金币，奶酪 20金币，坚果拼盘 30金币
  - 小帐篷 50金币（增加探险地点），围巾 30金币（冬天纪念品概率↑）
- **食物**放到窝里，仓鼠自己决定何时吃

## 探险系统

仓鼠随机决定出门（约每2-4小时一次），探险持续5-30分钟。

### 地点（10个）
公园、海边、山顶、超市、图书馆、花园、游乐场、咖啡馆、森林、雪山

每个地点有：
- 对应的明信片（SVG 风景插画）
- 可能带回的纪念品列表（贝壳、松果、小花、邮票、树叶书签等）
- 触发条件（部分需要道具解锁）

### 收集
- **明信片画廊**：10张可收集，SVG 插画 + 文字描述
- **纪念品柜**：20种小物件，显示为图标网格

## 项目结构

```
hamster-pet/
  src-tauri/
    src/
      lib.rs          — Tauri 命令、系统托盘
    Cargo.toml
    tauri.conf.json   — 窗口透明/无边框/置顶配置
    icons/            — 应用图标
  src/
    main.ts           — Vue 入口
    App.vue           — 根组件（透明背景）
    components/
      HamsterSprite.vue    — SVG 仓鼠 + 状态动画
      ContextMenu.vue      — 右键菜单
      StatusNote.vue       — 仓鼠外出时的小纸条
      ShopWindow.vue       — 商店弹窗
      PostcardGallery.vue  — 明信片画廊弹窗
      SouvenirShelf.vue    — 纪念品柜弹窗
      FeedMenu.vue         — 喂食选择
    composables/
      useHamster.ts        — 状态机：状态切换、计时器、动画控制
      useInventory.ts      — 金币、食物背包、道具
      useAdventure.ts      — 探险：出发/回家、地点随机、奖励计算
      useSave.ts           — localStorage 读写存档
    data/
      foods.ts             — 食物列表和价格
      locations.ts         — 探险地点数据
      postcards.ts         — 明信片数据
      souvenirs.ts         — 纪念品数据
    styles/
      global.css           — 透明背景、基础变量
  index.html
  vite.config.ts
  package.json
```

## 不做的事

- 不联网
- 不做多宠物
- 不做复杂的养成数值（饥饿度/心情值等）
- 不做 macOS/Linux 版本（仅 Windows）
