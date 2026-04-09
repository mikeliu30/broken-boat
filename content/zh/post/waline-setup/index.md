---
title: "为 Hugo 博客添加 Waline 评论系统（完整教程）"
date: 2026-04-09
categories: ["技术"]
tags: ["Hugo", "Waline", "评论系统", "Vercel"]
draft: false
description: "从零开始为 Hugo 静态博客配置 Waline 评论系统，支持 GitHub/Google 登录和 reaction 表情，包含 Vercel 部署、Neon 数据库、OAuth 配置的完整步骤。"
---

## 概述

本文记录为 Hugo 静态博客（使用 hugo-theme-reimu 主题）接入 **Waline 评论系统**的完整过程。

**最终效果：**
- 访客可用 GitHub 或 Google 账号登录后发表评论
- 支持对文章点 reaction 表情（👍❤️🎉😕🚀👀）
- 支持评论回复和嵌套显示
- 后台可管理所有评论

**管理后台地址（自己备用）：**
```
https://waline-server-six-sooty.vercel.app/ui
```

---

## 选型说明

静态博客没有后端，评论系统需要第三方服务。常见方案对比：

| 方案 | 登录方式 | Reaction | 部署复杂度 |
|---|---|---|---|
| Giscus | 仅 GitHub | ✅ | 简单 |
| Utterances | 仅 GitHub | ❌ | 简单 |
| **Waline** | **GitHub + Google 等** | **✅** | **中等** |

选择 **Waline** 的原因：支持多种登录方式 + reaction 表情 + 免费部署。

---

## 整体架构

```
访客浏览器
    ↓ 评论 / reaction
Waline 客户端 JS（加载在博客页面）
    ↓ API 请求
Waline 后端（部署在 Vercel，免费）
    ↓ 存储
Neon PostgreSQL（免费数据库）
```

---

## 第一步：部署 Waline 后端到 Vercel

### 1.1 一键部署

打开以下链接，用 GitHub 账号登录 Vercel：

```
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwalinejs%2Fwaline%2Ftree%2Fmain%2Fexample
```

页面显示 **New Project**，直接点击 **Create** 按钮（Vercel 会自动在你的 GitHub 下创建一个 `waline` 仓库）。

等待部署完成，记录你的服务地址，格式如：
```
https://你的项目名.vercel.app
```

> ⚠️ 此时访问这个地址会显示 500 错误，是正常的，因为还没有配置数据库。

### 1.2 创建 Neon 数据库

部署完成后点击 **Continue to Dashboard**，然后：

1. 点击顶部 **Storage** 标签
2. 在 **Marketplace Database Providers** 中选择 **Neon**，点击 **Create**
3. 数据库创建完成后，点击 **Connect Project**
4. 弹窗中选择你的 waline 项目（显示 Connected）
5. 将 **Custom Prefix** 改为 `PG`（Waline 识别的是 `PG_URL`）
6. 点击 **Connect**（如果已显示 Connected 则点 Cancel 即可）

### 1.3 手动建表

> ⚠️ Neon 不会自动为 Waline 建表，需要手动执行 SQL。

打开 Neon 控制台：`https://console.neon.tech`

点击左侧 **SQL Editor**，粘贴以下 SQL 并点击 **Run**：

```sql
CREATE TABLE IF NOT EXISTS wl_users (
  id SERIAL PRIMARY KEY,
  display_name VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  type VARCHAR(50),
  url VARCHAR(255),
  avatar VARCHAR(255),
  github VARCHAR(255),
  twitter VARCHAR(255),
  facebook VARCHAR(255),
  google VARCHAR(255),
  weibo VARCHAR(255),
  qq VARCHAR(255),
  "2fa" VARCHAR(255),
  label VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS wl_comment (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  comment TEXT,
  "insertedAt" TIMESTAMP,
  ip VARCHAR(100),
  link VARCHAR(200),
  mail VARCHAR(200),
  nick VARCHAR(100),
  pid INTEGER,
  rid INTEGER,
  sticky BOOLEAN,
  status VARCHAR(50),
  "like" INTEGER,
  url VARCHAR(200),
  referrer VARCHAR(200),
  browser VARCHAR(200),
  os VARCHAR(200),
  level INTEGER,
  avatar VARCHAR(200),
  orig TEXT,
  addr VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS wl_counter (
  id SERIAL PRIMARY KEY,
  reaction0 INTEGER,
  reaction1 INTEGER,
  reaction2 INTEGER,
  reaction3 INTEGER,
  reaction4 INTEGER,
  reaction5 INTEGER,
  reaction6 INTEGER,
  reaction7 INTEGER,
  reaction8 INTEGER,
  time INTEGER,
  url VARCHAR(200)
);
```

显示 `Statement executed successfully` 即成功。

> ⚠️ 注意：表名必须全部小写（`wl_users`、`wl_comment`、`wl_counter`），PostgreSQL 区分大小写，大写表名会导致 500 错误。

### 1.4 注册管理员账号（必须立即完成）

> ⚠️ 第一个注册的账号自动成为管理员，必须立即注册，否则任何人都可以注册成管理员。

访问：
```
https://你的项目名.vercel.app/ui/register
```

填写用户名、邮箱、个人网站（可选）、密码，点击**用户注册**。

### 1.5 关闭评论审核（推荐）

默认情况下新评论需要管理员审核才会显示，刷新页面后评论会消失。个人博客建议关闭审核。

在 Vercel → **Settings** → **Environment Variables** 添加：

| Key | Value |
|---|---|
| `REVIEW` | `false` |

添加后 **Redeploy** 一次，之后评论提交即时显示。

### 1.6 配置 CORS 白名单

在 Vercel 项目 → **Settings** → **Environment Variables** 中添加：

| Key | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://你的博客域名.github.io` |

添加后去 **Deployments** 页面，点最新记录右边 **⋯** → **Redeploy**，让配置生效。

> ⚠️ 不配置此项，生产环境会因跨域错误导致评论区无法加载。

---

## 第二步：配置 GitHub OAuth 登录

### 2.1 创建 GitHub OAuth App

访问：`https://github.com/settings/developers` → **OAuth Apps** → **New OAuth App**

填写：
- **Application name**：任意名称，如 `我的博客评论`
- **Homepage URL**：你的博客地址
- **Authorization callback URL**：
  ```
  https://你的项目名.vercel.app/oauth/github
  ```

点击 **Register application**。

### 2.2 获取密钥

进入创建好的 App，点击 **Generate a new client secret**，记录：
- `Client ID`
- `Client Secret`

### 2.3 填入 Vercel 环境变量

在 Vercel → **Settings** → **Environment Variables** 添加：

| Key | Value |
|---|---|
| `GITHUB_CLIENT_ID` | 你的 Client ID |
| `GITHUB_CLIENT_SECRET` | 你的 Client Secret |

添加后 **Redeploy** 一次。

---

## 第三步：配置 Google OAuth 登录

### 3.1 创建 Google Cloud 项目

访问 `https://console.cloud.google.com/`，新建一个独立项目（建议与其他项目分开，避免互相影响）。

### 3.2 配置 OAuth 同意屏幕

在新项目中，进入 **Google 身份验证平台** → **大纲** → **打造品牌**：

- 用户类型选 **外部**
- 填写应用名称和邮箱
- 一路点下一步完成配置

### 3.3 创建 OAuth 2.0 客户端

进入 **认证中心** → **客户端** → **创建客户端**：

- 应用类型：**Web 应用**
- 名称：任意
- **已获授权的重定向 URI** 添加：
  ```
  https://你的项目名.vercel.app/oauth/google
  ```

点击创建，弹出窗口中记录 **客户端 ID** 和 **客户端安全密码**。

> ⚠️ 关闭弹窗后无法再查看客户端安全密码，务必立即复制保存。

### 3.4 填入 Vercel 环境变量

| Key | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | 你的客户端 ID |
| `GOOGLE_CLIENT_SECRET` | 你的客户端安全密码 |

添加后 **Redeploy** 一次。

---

## 第四步：配置 Hugo 博客

### 4.1 修改 hugo.toml

在 `[params]` 块内添加：

```toml
[params.waline]
  enable = true
  serverURL = "https://你的项目名.vercel.app"
  pageview = true
  emoji = ["https://unpkg.com/@waline/emojis@1.1.0/weibo"]
  meta = ["nick", "mail", "link"]
  requiredMeta = ["nick"]
  wordLimit = 0
  pageSize = 10
```

### 4.2 覆盖主题模板（注入 reaction 和强制登录）

> ⚠️ reimu 主题的 Waline 初始化代码默认不包含 `reaction` 和 `login` 参数，必须覆盖模板才能生效。

将主题评论模板复制到项目覆盖目录：

```bash
mkdir -p layouts/partials/post
cp themes/reimu/layouts/partials/post/comment.html layouts/partials/post/comment.html
```

打开 `layouts/partials/post/comment.html`，找到 `walineInit({...})` 调用，在 `pageview` 行后追加两行：

```js
window.walineInstance = walineInit({
  // ...其他参数不变...
  pageview: {{ $params.waline.pageview }},
  reaction: true,      // ← 新增
  login: 'force',      // ← 新增
});
```

### 4.3 提交推送

```bash
git add hugo.toml layouts/partials/post/comment.html
git commit -m "feat: 启用 Waline 评论系统"
git push origin main
```

---

## 常见问题

| 问题 | 原因 | 解决方法 |
|---|---|---|
| 500: relation "wl_users" does not exist | 表名大小写错误或未建表 | 在 Neon SQL Editor 执行建表 SQL，注意全小写 |
| Console 报 CORS 错误 | `ALLOWED_ORIGINS` 未配置 | 在 Vercel 添加环境变量后 Redeploy |
| GitHub 登录失败 | 回调 URL 填错 | 确认为 `https://xxx.vercel.app/oauth/github` |
| Google 登录失败 | 重定向 URI 填错 | 确认为 `https://xxx.vercel.app/oauth/google` |
| reaction 不显示 | 模板覆盖未生效 | 确认 `layouts/partials/post/comment.html` 存在且含 `reaction: true` |
| 评论提交后刷新消失 | 默认开启审核模式 | 在 Vercel 添加 `REVIEW=false` 后 Redeploy |

---

## 管理后台

评论管理地址：
```
https://你的项目名.vercel.app/ui
```

可在后台：
- 查看、审核、删除评论
- 管理用户
- 查看各页面的评论数统计
