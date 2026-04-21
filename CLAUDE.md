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

## Release & Updater SOP

### 核心事实（必须知道）
- 自动更新依赖 Tauri updater plugin + GitHub Release 里的 `latest.json` + 每个 artifact 对应的 `.sig` 签名文件
- CI（`.github/workflows/build.yml`）用 `tauri-apps/tauri-action@v0` 构建；它在读取到 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 两个 secret 后才会生成 `latest.json` 和 `.sig`
- **`tauri-action` 在签名 key 缺失时会静默跳过 updater artifact，CI 依然 success，所以不能只看 CI 绿灯 — 必须 `gh release view` 验证 asset 清单**
- `tauri.conf.json > plugins.updater.pubkey` 里的 pubkey 必须和 GitHub Secret 里的 private key 成对，否则客户端验证签名会失败

### 发版前 Checklist
1. `npm run build` 通过
2. 版本号三处同步：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`
3. `src-tauri/src/lib.rs` 里每个 plugin 只注册一次（`tauri_plugin_updater`、`tauri_plugin_process` 等都不能重复 `.plugin(...)`；重复注册会运行时 panic）
4. `src-tauri/capabilities/default.json` 权限列表无重复项
5. `gh secret list` 能看到 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### 正常发版流程
```
# 1. 本地验证
npm run build

# 2. commit + push + tag
git add <files>
git commit -m "..."
git push
git tag v0.x.y
git push origin v0.x.y

# 3. 等 CI（约 8 分钟）
gh run watch <run-id> --exit-status

# 4. 验证 release asset 齐全（必须 5 个）
gh release view v0.x.y --json assets --jq '.assets[].name'
# 期望输出：
#   Hamster.Pet_0.x.y_x64-setup.exe
#   Hamster.Pet_0.x.y_x64-setup.exe.sig
#   Hamster.Pet_0.x.y_x64_en-US.msi
#   Hamster.Pet_0.x.y_x64_en-US.msi.sig
#   latest.json

# 5. 抽查 latest.json 内容
curl -sL https://github.com/methiy/hamster-pet/releases/latest/download/latest.json
```

### 签名 Key 管理
- Private key 文件：`~/.tauri/hamster-pet.key`（仅本地，**不进仓库，不进 CI 工件**）
- Password：存在密码管理器
- GitHub Secret 里那份 private key 只能写入不能读取；私钥文件+密码同时丢失就只能走"Key 轮换流程"

### Key 轮换流程（私钥丢失 / 泄露 / 迁移新机器）
1. `npx tauri signer generate --ci --password '<new-pass>' --write-keys ~/.tauri/hamster-pet.key --force`
2. 把 `~/.tauri/hamster-pet.key.pub` 的内容替换到 `tauri.conf.json` 的 `plugins.updater.pubkey`
3. `gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/hamster-pet.key`
4. `gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --body '<new-pass>'`
5. 正常发版
6. **注意**：轮换后，之前已装的老版本客户端继续找旧 pubkey 对应的 `latest.json`，但即使找到新的也会签名验证失败 → 存量用户必须手动下载新 exe/msi 安装一次

### 常见问题
- **"检查更新"报错 / 没有 latest.json**：99% 是 `TAURI_SIGNING_PRIVATE_KEY` secret 缺失或 password 错；`gh secret list` 确认，不对就轮换
- **安装新版后 app 启动崩溃**：先看 `lib.rs` 有没有重复 `.plugin(...)` 调用
- **pubkey 改过之后老用户更新失败**：这是预期的；老版本必须手动升级到含新 pubkey 的版本，之后才能恢复自动更新
