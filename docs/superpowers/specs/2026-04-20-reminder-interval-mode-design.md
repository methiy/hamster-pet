# 备忘录间隔提醒模式设计

## 概述

为现有备忘录系统新增「间隔提醒」模式。用户可设定开始时间、结束时间、间隔时长，并可选择在工作日/休息日自动重复。

## 两种提醒模式

### 模式 1：指定时间（已有，不变）
- 选择一个具体时间点，到时提醒一次
- 提醒后标记 `notified = true`

### 模式 2：间隔提醒（新增）
- 设定 `startTime`（如 09:00）、`endTime`（如 18:00）、`intervalMinutes`（如 30）
- 在 startTime ~ endTime 时间段内，每隔 intervalMinutes 触发一次提醒
- 每次触发：气泡 + Toast + 音效（与单次提醒一致）
- 重复日选择：
  - 不勾选 → 仅今天执行，endTime 过后自动删除
  - 勾选「工作日」→ 周一至周五自动执行
  - 勾选「休息日」→ 周六日自动执行
  - 两个都勾 → 每天执行

## 数据模型

扩展现有 `Reminder` 接口：

```ts
interface Reminder {
  id: string
  text: string
  createdAt: number
  notified: boolean

  // 新增
  type: 'once' | 'interval'

  // once 模式
  datetime: number | null             // 指定时间点的时间戳

  // interval 模式
  startTime: string | null            // "09:00" (仅时分)
  endTime: string | null              // "18:00" (仅时分)
  intervalMinutes: number | null      // 15 / 30 / 60 / 120 / 自定义
  repeatDays: ('workday' | 'weekend')[]  // 空数组 = 仅今天
  lastTriggered: number | null        // 上次触发时间戳
}
```

### 旧数据兼容

已存在的 Reminder 缺少新字段时，`loadReminders` 中做默认值填充：`type` 默认 `'once'`，其余新字段默认 `null` 或 `[]`。

## 触发逻辑

`checkDueReminders()` 对 `interval` 类型的判断流程：

1. **日期匹配**：
   - `repeatDays` 为空 → 仅创建当天匹配
   - 含 `'workday'` → 周一~周五匹配
   - 含 `'weekend'` → 周六日匹配
   - 今天不匹配 → 跳过
2. **时间窗口**：当前时间（HH:MM）是否在 `startTime` ~ `endTime` 范围内
3. **间隔判断**：
   - `lastTriggered` 为 null → 当前时间 >= startTime 即触发（首次）
   - 否则 `now - lastTriggered >= intervalMinutes * 60000` 时触发
4. **触发动作**：更新 `lastTriggered = now`，弹气泡 + Toast + 音效
5. **生命周期**：
   - 仅今天模式（`repeatDays` 为空）：当天 endTime 过后自动删除
   - 有 repeatDays 的：永不自动删除，`notified` 保持 `false`

### 每日重置

对于有 `repeatDays` 的 interval 提醒，每天第一次进入 startTime 时间窗口时，需将 `lastTriggered` 重置为 `null`，使其从 startTime 开始重新触发。判断方式：`lastTriggered` 的日期 < 今天日期。

## UI 设计

### 添加表单

文本输入框下方加模式切换（radio 按钮）：

- `⏰ 指定时间` — 显示现有的 datetime-local 选择器
- `🔄 间隔提醒` — 显示间隔模式表单：
  - 开始时间：`<input type="time">` 默认 09:00
  - 结束时间：`<input type="time">` 默认 18:00
  - 间隔选择：4 个预设按钮（15分钟 / 30分钟 / 1小时 / 2小时）+ 自定义输入框（单位：分钟）
  - 重复日：两个 checkbox —「工作日」「休息日」
  - 预设按钮选中态：橙色高亮；选自定义时预设取消高亮

### 列表展示

- `once` 类型：不变，显示 `⏰ 今天 15:00`
- `interval` 类型：
  - 主行：`🔄 09:00-18:00 每30分钟`
  - 标签：`工作日` / `休息日` / `每天` / `仅今天`
  - 下方：`下次: 14:30`（计算下次触发时间）

### 样式

沿用现有棕色/橙色暖色系，预设按钮与 `.add-btn` 风格一致。checkbox 使用自定义样式匹配面板风格。

## 影响范围

1. `src/composables/useReminder.ts` — 接口扩展 + 触发逻辑
2. `src/components/ReminderPanel.vue` — UI 表单 + 列表展示
3. `src/App.vue` — 传递新的 emit 参数（addReminder 参数变化）
4. `src/composables/useSave.ts` — 存储兼容（如有自定义序列化）
