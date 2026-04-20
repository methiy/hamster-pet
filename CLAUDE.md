# CLAUDE.md

## Project Overview
Tauri v2 桌面宠物应用（Vue 3 + TypeScript + Rust），仓鼠桌宠。

## Commands
- **Dev**: `npm run dev` (前端) / `cargo tauri dev` (完整应用)
- **Build frontend**: `npm run build` (vue-tsc + vite build)
- **Build app**: `cargo tauri build`

## Workflow Rules
1. 实现完并测试完成一整个完整功能后再提交 GitHub 并打 tag 触发构建供用户测试
2. 不要每个小改动都提交，要一个功能完整做完、`npm run build` 通过后再一次性 commit + push + tag
3. Tag 格式：`v0.x.y`，递增最后一位
4. **打 tag 触发 CI 构建前，必须先在本地执行 `npm run build` 确认前端构建通过**，避免浪费远程构建等待时间
