# Waline 评论系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为破船之家博客添加 Waline 评论系统，支持 GitHub / Google 登录和 reaction 表情。

**Architecture:** Waline 后端部署在 Vercel（免费），评论数据存储在 Vercel 提供的数据库。博客端覆盖主题模板 `layouts/partials/post/comment.html`，在原有 Waline 初始化参数基础上注入 `reaction: true` 和 `login: 'force'`，其余逻辑保持与主题一致。

**Tech Stack:** Hugo（静态博客）、Waline（评论系统）、Vercel（后端托管）、GitHub OAuth App、Google OAuth 2.0

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | `hugo.toml` | 添加 `[params.waline]` 配置块 |
| 创建 | `layouts/partials/post/comment.html` | 覆盖主题评论模板，注入 reaction 和 login 参数 |

---

## Task 1：部署 Waline 后端到 Vercel（手动操作）

> 此任务需要你在浏览器中操作，不涉及代码改动。

- [ ] **Step 1: 一键部署 Waline 到 Vercel**

  打开浏览器访问：https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwalinejs%2Fwaline%2Ftree%2Fmain%2Fexample

  按页面指引完成部署（选择数据库时按当时文档建议，通常是 Vercel KV 或 LeanCloud）。

- [ ] **Step 2: 记录 Waline 服务 URL**

  部署完成后，记录你的服务地址，格式如：
  ```
  https://your-project-name.vercel.app
  ```

- [ ] **Step 3: 立即注册管理员账号（安全必做）**

  访问 `https://your-project-name.vercel.app/ui`，第一个注册的账号将成为管理员。**必须立即完成，否则任何人都可以注册成管理员。**

- [ ] **Step 4: 配置 CORS 白名单**

  在 Vercel 项目 → Settings → Environment Variables 中添加：
  ```
  ALLOWED_ORIGINS = https://mikeliu30.github.io
  ```
  添加后在 Vercel 重新部署一次让环境变量生效（Deployments → Redeploy）。

---

## Task 2：配置 GitHub OAuth App（手动操作）

- [ ] **Step 1: 创建 GitHub OAuth App**

  访问：https://github.com/settings/developers → OAuth Apps → New OAuth App

  填写：
  - Application name：`破船之家评论`
  - Homepage URL：`https://mikeliu30.github.io/broken-boat/`
  - Authorization callback URL：`https://your-project-name.vercel.app/oauth/github`

- [ ] **Step 2: 获取 Client ID 和 Client Secret**

  创建后点击 "Generate a new client secret"，记录：
  - `Client ID`
  - `Client Secret`

- [ ] **Step 3: 填入 Vercel 环境变量**

  在 Vercel 项目 → Settings → Environment Variables 中添加：
  ```
  GITHUB_CLIENT_ID = 你的 Client ID
  GITHUB_CLIENT_SECRET = 你的 Client Secret
  ```

---

## Task 3：配置 Google OAuth（手动操作）

- [ ] **Step 1: 创建 Google OAuth 2.0 客户端**

  访问：https://console.cloud.google.com/ → APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs

  - Application type：Web application
  - Authorized redirect URIs：`https://your-project-name.vercel.app/oauth/google`

- [ ] **Step 2: 获取 Client ID 和 Client Secret**

  创建后记录：
  - `Client ID`
  - `Client Secret`

- [ ] **Step 3: 填入 Vercel 环境变量**

  在 Vercel 项目 → Settings → Environment Variables 中添加：
  ```
  GOOGLE_CLIENT_ID = 你的 Client ID
  GOOGLE_CLIENT_SECRET = 你的 Client Secret
  ```

- [ ] **Step 4: 重新部署 Vercel**

  所有环境变量配置完后，在 Vercel Deployments 页面点击 Redeploy，让所有配置生效。

---

## Task 4：配置 Hugo 博客启用 Waline

**Files:**
- Modify: `hugo.toml`

- [ ] **Step 1: 在 hugo.toml 添加 Waline 配置**

  在 `[params]` 块内添加（将 URL 替换为你的实际地址）：

  ```toml
  [params.waline]
    enable = true
    serverURL = "https://your-project-name.vercel.app"
    pageview = true
    emoji = ["https://unpkg.com/@waline/emojis@1.1.0/weibo"]
    meta = ["nick", "mail", "link"]
    requiredMeta = ["nick"]
    wordLimit = 0
    pageSize = 10
  ```

- [ ] **Step 2: 本地验证配置生效**

  运行：
  ```bash
  hugo server -D
  ```
  访问 http://localhost:1313/broken-boat/zh/post/hello/

  预期：文章底部出现 Waline 评论区加载占位（可能因跨域报错，属正常，后续步骤解决）。

- [ ] **Step 3: 提交**

  ```bash
  git add hugo.toml
  git commit -m "feat: 启用 Waline 评论系统基础配置"
  ```

---

## Task 5：覆盖主题模板注入 reaction 和 login 参数

**Files:**
- Create: `layouts/partials/post/comment.html`

> 主题（reimu v0.15.2）的 Waline 初始化代码在第 100-113 行，不包含 `reaction` 和 `login` 参数。需要完整复制主题模板并在 walineInit 调用中追加这两个参数。

- [ ] **Step 1: 复制主题模板到项目覆盖目录**

  ```bash
  cp "themes/reimu/layouts/partials/post/comment.html" "layouts/partials/post/comment.html"
  ```

- [ ] **Step 2: 在 walineInit 调用中追加 reaction 和 login 参数**

  打开 `layouts/partials/post/comment.html`，找到第 100-113 行的 `walineInit({...})` 调用：

  ```js
  window.walineInstance = walineInit({
    el: '.waline-comment',
    serverURL: '{{ $params.waline.serverURL }}',
    lang: document.documentElement.lang || 'en',
    locale: JSON.parse({{ $params.waline.locale | jsonify }}),
    emoji: JSON.parse({{ $params.waline.emoji | jsonify}}),
    meta: JSON.parse({{ $params.waline.meta | jsonify }}),
    requiredMeta: JSON.parse({{ $params.waline.requiredMeta | jsonify }}),
    wordLimit: {{ $params.waline.wordLimit }},
    comment: true,
    pageSize: {{ $params.waline.pageSize }},
    dark: 'html[data-theme="dark"]',
    pageview: {{ $params.waline.pageview }},
  });
  ```

  在 `pageview` 行后追加两行，改为：

  ```js
  window.walineInstance = walineInit({
    el: '.waline-comment',
    serverURL: '{{ $params.waline.serverURL }}',
    lang: document.documentElement.lang || 'en',
    locale: JSON.parse({{ $params.waline.locale | jsonify }}),
    emoji: JSON.parse({{ $params.waline.emoji | jsonify}}),
    meta: JSON.parse({{ $params.waline.meta | jsonify }}),
    requiredMeta: JSON.parse({{ $params.waline.requiredMeta | jsonify }}),
    wordLimit: {{ $params.waline.wordLimit }},
    comment: true,
    pageSize: {{ $params.waline.pageSize }},
    dark: 'html[data-theme="dark"]',
    pageview: {{ $params.waline.pageview }},
    reaction: true,
    login: 'force',
  });
  ```

- [ ] **Step 3: 本地构建验证无报错**

  ```bash
  hugo --minify 2>&1 | grep -E "ERROR|WARN"
  ```

  预期：无 ERROR，WARN 只有主题自身的 deprecated 警告（正常）。

- [ ] **Step 4: 提交**

  ```bash
  git add layouts/partials/post/comment.html
  git commit -m "feat: 覆盖评论模板，注入 reaction 和强制登录参数"
  ```

---

## Task 6：推送并验证生产环境

- [ ] **Step 1: 推送到 main 分支**

  ```bash
  git push origin main
  ```

- [ ] **Step 2: 等待 GitHub Actions 部署完成**

  访问 https://github.com/mikeliu30/broken-boat/actions 确认部署成功（绿色勾）。

- [ ] **Step 3: 验证评论区正常加载**

  访问 https://mikeliu30.github.io/broken-boat/zh/post/hello/

  打开浏览器开发者工具 → Console，确认：
  - 无 CORS 错误（`Access-Control-Allow-Origin` 相关报错）
  - Waline 评论区正常显示

- [ ] **Step 4: 验证登录功能**

  点击评论区登录按钮，分别测试：
  - GitHub 登录流程是否正常跳转和回调
  - Google 登录流程是否正常跳转和回调

- [ ] **Step 5: 验证 reaction 表情**

  登录后，确认文章顶部或评论区显示 reaction 表情栏（👍❤️🎉 等），点击后数字增加。

- [ ] **Step 6: 验证管理界面**

  访问 `https://your-project-name.vercel.app/ui`，用管理员账号登录，确认能看到评论数据。

---

## 常见问题排查

| 问题 | 原因 | 解决 |
|---|---|---|
| 评论区不出现 | `enable = true` 或 `serverURL` 未正确配置 | 检查 hugo.toml |
| Console 报 CORS 错误 | `ALLOWED_ORIGINS` 未配置或未重新部署 | 检查 Vercel 环境变量后重新部署 |
| GitHub 登录失败 | OAuth App 回调 URL 填错 | 确认为 `https://xxx.vercel.app/oauth/github` |
| Google 登录失败 | 重定向 URI 填错 | 确认为 `https://xxx.vercel.app/oauth/google` |
| reaction 不显示 | 模板覆盖未生效 | 确认 `layouts/partials/post/comment.html` 存在且包含 `reaction: true` |
