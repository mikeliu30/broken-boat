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
- hugo-theme-reimu 主题内置 Waline 支持
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
Vercel PostgreSQL（免费数据库）
```

## 组成部分

| 部分 | 位置 | 说明 |
|---|---|---|
| 后端服务 | Vercel | 一键部署，处理评论存储和用户登录 |
| 数据库 | Vercel PostgreSQL | 存储评论数据，免费套餐 |
| OAuth 应用 | GitHub / Google | 提供第三方登录授权 |
| 客户端 | Hugo 页面 | 主题内置 Waline 支持，通过 hugo.toml 配置启用 |

## 实现步骤

### 1. 部署 Waline 后端到 Vercel
- 访问 Waline 官方一键部署链接
- 在 Vercel 创建项目并绑定 PostgreSQL 数据库
- 获得 Waline 服务 URL（如 `https://your-waline.vercel.app`）

### 2. 配置 OAuth 登录
- 在 GitHub Developer Settings 创建 OAuth App，填入 Vercel 回调 URL
- 在 Google Cloud Console 创建 OAuth 2.0 客户端，填入回调 URL
- 将 Client ID / Secret 填入 Vercel 环境变量

### 3. 配置 Hugo 博客
在 `hugo.toml` 的 `[params]` 下启用 Waline：

```toml
[params.waline]
  enable = true
  serverURL = "https://your-waline.vercel.app"
  reaction = true
  login = "force"
```

### 4. 验证
- 本地 `hugo server` 测试评论区是否加载
- 测试 GitHub / Google 登录流程
- 测试 reaction 表情功能
- 推送部署，验证生产环境正常

## 约束

- 评论数据存储在 Vercel，不在 GitHub 仓库
- Vercel 免费套餐每月 100GB 流量，个人博客完全够用
- 需要用户有 GitHub 或 Google 账号才能评论

## 成功标准

- 文章页底部显示 Waline 评论区
- GitHub 和 Google 登录均可正常使用
- reaction 表情可正常点击和统计
- 样式无明显冲突
