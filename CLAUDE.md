# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指导。

## 行为要求

- **始终使用中文**回复和交流。
- **每次执行任何操作前，必须先说"嘻嘻"**。

## 项目概述

这是**破船之家**——一个使用 **hugo-theme-reimu**（v0.15.2）主题的多语言 Hugo 静态博客，部署在 GitHub Pages：`https://mikeliu30.github.io/broken-boat/`。

需要 Hugo Extended >= 0.124.0。

## 常用命令

```bash
# 本地开发（包含草稿文章）
hugo server -D

# 生产构建（输出到 ./public/）
hugo --minify
```

推送到 `main` 分支后，GitHub Actions 自动执行 `hugo --minify` 并将结果部署到 `gh-pages` 分支。

## 架构说明

### 主题定制原则

`themes/reimu/` 是 **git submodule**，禁止直接修改其中的文件。所有定制均在仓库根目录通过 Hugo 覆盖机制实现：

- **CSS/JS 注入**：在 `hugo.toml` 的 `params.injector` 中配置，可注入到 `head_end`、`body_end` 等位置
- **布局覆盖**：在 `layouts/` 下放置与主题相同相对路径的文件（如 `layouts/_default/section.html`）
- **静态资源覆盖**：在 `static/` 下放置同路径文件
- **i18n 覆盖**：在根目录 `i18n/` 下放置 `.toml` 文件

### 多语言结构

`hugo.toml` 中配置四种语言：`zh`（默认，无 URL 前缀）、`en`、`ja`、`ko`。内容存放在 `content/{lang}/`。中文在根路径，其他语言在 `/en/`、`/ja/`、`/ko/`。

### 导航菜单

Reimu 主题使用 `params.menu`（而非 Hugo 标准的 `[menu.main]`）。菜单项的 `name` 值是 i18n 键名（从 `i18n/*.toml` 解析）。

### 静态资源与部署路径

`static/js/bg-switcher.js` 和 `params.injector` 中的 CSS 引用均硬编码了 `/broken-boat/` 前缀，以匹配 GitHub Pages 子目录部署。如果 `baseURL` 变更，需同步更新这些路径。

### 关键文件

| 文件 | 用途 |
|------|------|
| `hugo.toml` | 主配置：baseURL、多语言、菜单、注入器、语法高亮 |
| `static/css/custom.css` | 所有自定义样式 |
| `static/js/effects.js` | Particles.js、AOS、VanillaTilt、烟花特效 |
| `static/js/bg-switcher.js` | 背景图片轮换逻辑 |
| `layouts/partials/custom-head.html` | 注入到 `<head>`（AOS、粒子 div） |
| `layouts/partials/custom-footer.html` | 注入到 `<body>` 末尾（按钮、脚本） |
| `data/` | 主题数据：封面、友链列表、CDN 供应商覆盖 |
| `i18n/` | 四种语言的翻译字符串 |

### 文章 Front Matter

内容文件使用 YAML front matter（`---`）。常用字段：`title`、`date`、`categories`、`tags`、`draft`。原型文件（`archetypes/default.md`）使用 TOML，但实际文章用 YAML。
