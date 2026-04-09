# Waline 评论系统设计文档

**日期**：2026-04-08
**项目**：破船之家（hugo-theme-reimu 博客）

## 背景

博客目前是纯静态站点，没有评论功能。用户希望添加评论系统，支持 GitHub / Google 登录，并支持对文章点 reaction 表情。

## 目标

- 访客可通过 GitHub 或 Google 账号登录后发表评论
- 每篇文章底部显示评论区
- 支持对文章点 reaction 表情（👍❤️🎉😕🚀👀）
- 支持评论回复和嵌套显示
- 样式与博客风格一致，无需深度定制

## 方案选择

选择 **Waline**，理由：
- 支持 GitHub 和 Google 双登录
- 支持 reaction 表情功能
- hugo-theme-reimu 主题内置 Waline 基础支持
- Vercel 免费部署，无需自购服务器

放弃 Giscus（仅支持 GitHub 登录）和 Utterances（不支持 reaction）。

## 架构

```
访客浏览器
    ↓ 评论 / reaction
Waline 客户端 JS（加载在博客页面）
    ↓ API 请求
Waline 后端（部署在 Vercel，免费套餐）
    ↓ 存储
Vercel KV / 第三方数据库（按 Waline 官方文档当时指引选择）
```

## 组成部分

| 部分 | 位置 | 说明 |
|---|---|---|
| 后端服务 | Vercel | 一键部署，处理评论存储和用户登录 |
| 数据库 | 按 Waline 官方文档指引选择 | 存储评论数据，免费套餐 |
| OAuth 应用 | GitHub / Google | 提供第三方登录授权 |
| 客户端模板覆盖 | `layouts/partials/post/comment.html` | 覆盖主题模板，注入 reaction 和 login 参数 |

## 关键技术约束

### 主题内置 Waline 支持的局限性

当前主题（reimu v0.15.2，使用 @waline/client@2.15.8）的评论模板只向 `walineInit()` 传递以下参数：`serverURL`、`locale`、`emoji`、`meta`、`requiredMeta`、`wordLimit`、`pageSize`、`pageview`。

**`reaction` 和 `login` 参数不在传递列表中**，因此直接在 `hugo.toml` 里配置这两个字段无效。需要在 `layouts/partials/post/comment.html` 覆盖主题模板，手动注入这两个参数。

## 实现步骤

### 1. 部署 Waline 后端到 Vercel

- 访问 Waline 官方文档的一键部署链接
- 按当时文档指引选择数据库存储（如 Vercel KV、LeanCloud 等）
- 获得 Waline 服务 URL（如 `https://your-waline.vercel.app`）
- **首次部署后立即访问** `https://your-waline.vercel.app/ui` 注册管理员账号（必须第一个注册，否则任何人都可成为管理员）

### 2. 配置 CORS

在 Vercel 项目的环境变量中添加：

```
ALLOWED_ORIGINS=https://mikeliu30.github.io
```

不配置此项会导致生产环境评论区因跨域错误无法加载。

### 3. 配置 OAuth 登录

**GitHub OAuth App：**
- 在 GitHub Developer Settings 创建 OAuth App
- Authorization callback URL：`https://your-waline.vercel.app/oauth/github`
- 在 Vercel 环境变量中填入：
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`

**Google OAuth：**
- 在 Google Cloud Console 创建 OAuth 2.0 客户端
- 授权重定向 URI：`https://your-waline.vercel.app/oauth/google`
- 在 Vercel 环境变量中填入：
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

### 4. 配置 Hugo 博客

在 `hugo.toml` 的 `[params]` 下启用 Waline：

```toml
[params.waline]
  enable = true
  serverURL = "https://your-waline.vercel.app"
```

### 5. 覆盖主题模板注入 reaction 和 login 参数

创建 `layouts/partials/post/comment.html`，在主题原有初始化代码基础上增加：

```js
walineInit({
  // ...原有参数...
  reaction: true,
  login: 'force',
})
```

### 6. 验证

- 本地 `hugo server` 测试评论区是否加载（浏览器控制台无报错）
- 测试 GitHub / Google 登录流程
- 测试 reaction 表情功能
- 推送部署，验证生产环境无 CORS 错误
- 确认评论数据出现在 Waline 管理界面（`/ui`）

## 多语言说明

该博客是四语言站点（zh/en/ja/ko）。Waline 默认以 `window.location.pathname` 作为评论存储的 key，不同语言版本的同一文章路径不同，**评论数据会分开存储**，互不干扰。这是预期行为，无需额外处理。

## 约束

- 评论数据存储在 Vercel，不在 GitHub 仓库
- Vercel 免费套餐每月 100GB 流量，个人博客完全够用
- 需要用户有 GitHub 或 Google 账号才能评论
- reaction 和强制登录需要覆盖主题模板实现

## 成功标准

- 文章页底部显示 Waline 评论区
- GitHub 和 Google 登录均可正常使用
- reaction 表情可正常点击和统计
- 生产环境无 CORS 错误
- 样式无明显冲突
