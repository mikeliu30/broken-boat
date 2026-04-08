# 侧边栏及 Widgets 配置实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将博客的侧边栏移动到左侧，并开启分类、标签、最近文章等 Widget 卡片。

**Architecture:** 修改 `hugo.toml` 中与 Reimu 主题相关的 `[params]` 和 `[params.sidebar]` 配置项。

**Tech Stack:** Hugo, TOML

---

### Task 1: 配置文件修改

**Files:**
- Modify: `hugo.toml`

- [ ] **Step 1: 修改全局 sidebar 配置**

在 `hugo.toml` 的 `[params]` 区域下添加/修改 sidebar 的配置：

```toml
  [params.sidebar]
    position = "left"
```

- [ ] **Step 2: 开启 widgets 配置**

在 `hugo.toml` 的 `[params]` 区域下添加 widgets 数组：

```toml
  widgets = ["category", "tag", "recent_posts"]
```

- [ ] **Step 3: 检查与预览**

运行 `hugo server -D`（如果尚未运行）并检查本地效果，确保左侧边栏成功出现并且包含 Widgets。

- [ ] **Step 4: 提交**

```bash
git add hugo.toml
git commit -m "feat: move sidebar to left and enable widgets (category, tag, recent_posts)"
```