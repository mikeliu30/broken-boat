# 破船之家博客 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用 Hugo + Reimu 主题搭建"破船之家"个人博客，支持中/英/日/韩四语言，可切换背景图，含星空粒子、卡片3D倾斜等视觉特效，部署至 GitHub Pages。

**Architecture:** Hugo 静态站点 + Reimu 主题作为基础，通过自定义 layouts/partials 注入特效脚本（Particles.js、VanillaTilt.js、fireworks），i18n 目录管理四语言翻译，GitHub Actions 监听 main 分支自动构建并推送至 gh-pages 分支。

**Tech Stack:** Hugo, Reimu theme, GitHub Pages, GitHub Actions, Particles.js, VanillaTilt.js, Typed.js, AOS, custom fireworks JS

---

## 文件结构总览

| 文件路径 | 职责 |
|---------|------|
| `hugo.toml` | 站点主配置，多语言、主题、菜单设置 |
| `i18n/zh.toml` | 中文翻译字符串 |
| `i18n/en.toml` | 英文翻译字符串 |
| `i18n/ja.toml` | 日文翻译字符串 |
| `i18n/ko.toml` | 韩文翻译字符串 |
| `static/js/bg-switcher.js` | 背景图切换逻辑（循环切换 + localStorage） |
| `static/js/effects.js` | Particles.js、VanillaTilt.js、fireworks 初始化 |
| `static/css/custom.css` | 自定义样式覆盖（背景层、按钮、倾斜卡片） |
| `layouts/partials/custom-head.html` | 注入自定义 CSS 和 JS 到 `<head>` |
| `layouts/partials/custom-footer.html` | 注入背景切换按钮 HTML 到页脚前 |
| `content/zh/_index.md` | 中文首页 front matter |
| `content/en/_index.md` | 英文首页 front matter |
| `content/ja/_index.md` | 日文首页 front matter |
| `content/ko/_index.md` | 韩文首页 front matter |
| `content/zh/posts/hello-world.md` | 示例中文文章 |
| `content/zh/about/_index.md` | 关于页（中文） |
| `static/images/bg/.gitkeep` | 背景图占位（用户替换为实际图片） |
| `.github/workflows/deploy.yml` | GitHub Actions 自动部署配置 |

---

## Task 1: 初始化 Hugo 项目并安装 Reimu 主题

**Files:**
- Create: `hugo.toml`
- Create: `.gitignore`
- Create: `themes/reimu/` (via git submodule)

- [ ] **Step 1: 安装 Hugo**

在 Windows 上用 winget 安装 Hugo：
```bash
winget install Hugo.Hugo.Extended
```
验证安装：
```bash
hugo version
```
期望输出包含 `hugo v0.1xx` 和 `extended`。

- [ ] **Step 2: 初始化 Hugo 站点**

```bash
cd "D:/http web"
hugo new site . --force
```
期望：生成 `hugo.toml`、`content/`、`layouts/`、`static/` 等目录。

- [ ] **Step 3: 添加 Reimu 主题为 git submodule**

```bash
git init
git submodule add https://github.com/D-Sketon/hugo-theme-reimu.git themes/reimu
```
期望：`themes/reimu/` 目录存在，`.gitmodules` 文件被创建。

- [ ] **Step 4: 提交初始结构**

```bash
git add .
git commit -m "feat: init Hugo site with Reimu theme"
```

---

## Task 2: 配置 hugo.toml（基本信息 + 多语言）

**Files:**
- Modify: `hugo.toml`

- [ ] **Step 1: 写入 hugo.toml 完整配置**

将 `hugo.toml` 内容替换为：

```toml
baseURL = "https://mikeliu30.github.io/"
theme = "reimu"
defaultContentLanguage = "zh"
defaultContentLanguageInSubdir = false

[languages]
  [languages.zh]
    languageName = "中文"
    languageCode = "zh-CN"
    weight = 1
    title = "破船之家"
    [languages.zh.params]
      subtitle = "破船不翻，代码相伴，生活不慌"
    [languages.zh.menu]
      [[languages.zh.menu.main]]
        name = "首页"
        url = "/"
        weight = 1
      [[languages.zh.menu.main]]
        name = "归档"
        url = "/archives/"
        weight = 2
      [[languages.zh.menu.main]]
        name = "分类"
        url = "/categories/"
        weight = 3
      [[languages.zh.menu.main]]
        name = "标签"
        url = "/tags/"
        weight = 4
      [[languages.zh.menu.main]]
        name = "关于"
        url = "/about/"
        weight = 5
      [[languages.zh.menu.main]]
        name = "友链"
        url = "/links/"
        weight = 6

  [languages.en]
    languageName = "English"
    languageCode = "en"
    weight = 2
    title = "Broken Ship Home"
    [languages.en.params]
      subtitle = "Code and life, side by side"
    [languages.en.menu]
      [[languages.en.menu.main]]
        name = "Home"
        url = "/en/"
        weight = 1
      [[languages.en.menu.main]]
        name = "Archives"
        url = "/en/archives/"
        weight = 2
      [[languages.en.menu.main]]
        name = "Categories"
        url = "/en/categories/"
        weight = 3
      [[languages.en.menu.main]]
        name = "Tags"
        url = "/en/tags/"
        weight = 4
      [[languages.en.menu.main]]
        name = "About"
        url = "/en/about/"
        weight = 5
      [[languages.en.menu.main]]
        name = "Links"
        url = "/en/links/"
        weight = 6

  [languages.ja]
    languageName = "日本語"
    languageCode = "ja"
    weight = 3
    title = "ブロークンシップホーム"
    [languages.ja.params]
      subtitle = "コードと生活、共に歩む"
    [languages.ja.menu]
      [[languages.ja.menu.main]]
        name = "ホーム"
        url = "/ja/"
        weight = 1
      [[languages.ja.menu.main]]
        name = "アーカイブ"
        url = "/ja/archives/"
        weight = 2
      [[languages.ja.menu.main]]
        name = "カテゴリー"
        url = "/ja/categories/"
        weight = 3
      [[languages.ja.menu.main]]
        name = "タグ"
        url = "/ja/tags/"
        weight = 4
      [[languages.ja.menu.main]]
        name = "について"
        url = "/ja/about/"
        weight = 5
      [[languages.ja.menu.main]]
        name = "リンク"
        url = "/ja/links/"
        weight = 6

  [languages.ko]
    languageName = "한국어"
    languageCode = "ko"
    weight = 4
    title = "부서진 배의 집"
    [languages.ko.params]
      subtitle = "코드와 생활, 함께"
    [languages.ko.menu]
      [[languages.ko.menu.main]]
        name = "홈"
        url = "/ko/"
        weight = 1
      [[languages.ko.menu.main]]
        name = "아카이브"
        url = "/ko/archives/"
        weight = 2
      [[languages.ko.menu.main]]
        name = "카테고리"
        url = "/ko/categories/"
        weight = 3
      [[languages.ko.menu.main]]
        name = "태그"
        url = "/ko/tags/"
        weight = 4
      [[languages.ko.menu.main]]
        name = "소개"
        url = "/ko/about/"
        weight = 5
      [[languages.ko.menu.main]]
        name = "링크"
        url = "/ko/links/"
        weight = 6

[params]
  author = "mikeliu30"
  github = "https://github.com/mikeliu30"
  since = 2026

[markup]
  [markup.highlight]
    style = "monokai"
    lineNos = true
```

- [ ] **Step 2: 验证配置语法**

```bash
cd "D:/http web"
hugo config
```
期望：输出配置内容，无报错。

- [ ] **Step 3: 提交配置**

```bash
git add hugo.toml
git commit -m "feat: configure multilingual site (zh/en/ja/ko)"
```

---

## Task 3: 创建 i18n 翻译文件

**Files:**
- Create: `i18n/zh.toml`
- Create: `i18n/en.toml`
- Create: `i18n/ja.toml`
- Create: `i18n/ko.toml`

- [ ] **Step 1: 创建中文翻译**

创建 `i18n/zh.toml`：
```toml
[readMore]
other = "阅读更多"

[wordCount]
other = "字数：{{ .Count }}"

[readingTime]
one = "阅读时长：1 分钟"
other = "阅读时长：{{ .Count }} 分钟"

[recentPosts]
other = "最新文章"

[categories]
other = "分类"

[tags]
other = "标签"

[search]
other = "搜索"

[backToTop]
other = "回到顶部"

[switchBg]
other = "切换背景"
```

- [ ] **Step 2: 创建英文翻译**

创建 `i18n/en.toml`：
```toml
[readMore]
other = "Read More"

[wordCount]
other = "Words: {{ .Count }}"

[readingTime]
one = "Reading time: 1 minute"
other = "Reading time: {{ .Count }} minutes"

[recentPosts]
other = "Recent Posts"

[categories]
other = "Categories"

[tags]
other = "Tags"

[search]
other = "Search"

[backToTop]
other = "Back to Top"

[switchBg]
other = "Switch Background"
```

- [ ] **Step 3: 创建日文翻译**

创建 `i18n/ja.toml`：
```toml
[readMore]
other = "続きを読む"

[wordCount]
other = "文字数：{{ .Count }}"

[readingTime]
one = "読了時間：1 分"
other = "読了時間：{{ .Count }} 分"

[recentPosts]
other = "最新記事"

[categories]
other = "カテゴリー"

[tags]
other = "タグ"

[search]
other = "検索"

[backToTop]
other = "トップへ戻る"

[switchBg]
other = "背景を切り替え"
```

- [ ] **Step 4: 创建韩文翻译**

创建 `i18n/ko.toml`：
```toml
[readMore]
other = "더 읽기"

[wordCount]
other = "단어 수：{{ .Count }}"

[readingTime]
one = "읽기 시간：1 분"
other = "읽기 시간：{{ .Count }} 분"

[recentPosts]
other = "최근 게시물"

[categories]
other = "카테고리"

[tags]
other = "태그"

[search]
other = "검색"

[backToTop]
other = "맨 위로"

[switchBg]
other = "배경 전환"
```

- [ ] **Step 5: 提交**

```bash
git add i18n/
git commit -m "feat: add i18n translations for zh/en/ja/ko"
```

---

## Task 4: 创建内容目录结构和示例文章

**Files:**
- Create: `content/zh/_index.md`
- Create: `content/en/_index.md`
- Create: `content/ja/_index.md`
- Create: `content/ko/_index.md`
- Create: `content/zh/posts/hello-world.md`
- Create: `content/zh/about/_index.md`
- Create: `content/en/about/_index.md`
- Create: `static/images/bg/.gitkeep`

- [ ] **Step 1: 创建各语言首页 front matter**

`content/zh/_index.md`：
```markdown
---
title: "破船之家"
---
```

`content/en/_index.md`：
```markdown
---
title: "Broken Ship Home"
---
```

`content/ja/_index.md`：
```markdown
---
title: "ブロークンシップホーム"
---
```

`content/ko/_index.md`：
```markdown
---
title: "부서진 배의 집"
---
```

- [ ] **Step 2: 创建示例中文文章**

`content/zh/posts/hello-world.md`：
```markdown
---
title: "破船启航！欢迎来到破船之家"
date: 2026-03-27
categories: ["生活"]
tags: ["介绍", "开始"]
draft: false
---

一艘载满代码、bug、生活趣事的小船正式启航！

在这里，你能看到接地气的代码教程、程序员的日常吐槽，也能发现生活里的小美好。没有高冷的技术说教，只有轻松的分享与交流。

代码是我们的伙伴，生活是我们的底色，一起在破船里，解锁技术与生活的双重快乐！
```

- [ ] **Step 3: 创建关于页**

`content/zh/about/_index.md`：
```markdown
---
title: "关于"
---

## 关于破船之家

一艘载满代码、bug、生活趣事的小船正式启航。在这里，你能看到接地气的代码教程、程序员的日常吐槽，也能发现生活里的小美好。没有高冷的技术说教，只有轻松的分享与交流。代码是我们的伙伴，生活是我们的底色，一起在破船里，解锁技术与生活的双重快乐！

## 关于博主

- GitHub: [mikeliu30](https://github.com/mikeliu30)
```

`content/en/about/_index.md`：
```markdown
---
title: "About"
---

## About Broken Ship Home

A little boat full of code, bugs, and life stories sets sail. Here you'll find down-to-earth coding tutorials, developer daily musings, and small moments of beauty in life.

- GitHub: [mikeliu30](https://github.com/mikeliu30)
```

- [ ] **Step 4: 创建背景图占位目录**

```bash
mkdir -p "D:/http web/static/images/bg"
touch "D:/http web/static/images/bg/.gitkeep"
```

- [ ] **Step 5: 提交**

```bash
git add content/ static/images/
git commit -m "feat: add content structure and sample article"
```

---

## Task 5: 实现背景切换功能

**Files:**
- Create: `static/js/bg-switcher.js`
- Create: `static/css/custom.css`
- Create: `layouts/partials/custom-head.html`
- Create: `layouts/partials/custom-footer.html`

- [ ] **Step 1: 编写背景切换 JS**

创建 `static/js/bg-switcher.js`：
```javascript
(function () {
  // 背景图列表 — 用户将图片放入 static/images/bg/ 后在此配置
  const backgrounds = [
    '/images/bg/bg1.jpg',
    '/images/bg/bg2.jpg',
    '/images/bg/bg3.jpg',
  ];

  const STORAGE_KEY = 'broken-ship-bg-index';

  function getCurrentIndex() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? parseInt(stored, 10) : 0;
  }

  function applyBackground(index) {
    const safeIndex = ((index % backgrounds.length) + backgrounds.length) % backgrounds.length;
    document.body.style.backgroundImage = `url('${backgrounds[safeIndex]}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    localStorage.setItem(STORAGE_KEY, safeIndex);
  }

  function switchBackground() {
    const next = getCurrentIndex() + 1;
    applyBackground(next);
  }

  // 页面加载时应用上次选择
  document.addEventListener('DOMContentLoaded', function () {
    applyBackground(getCurrentIndex());

    const btn = document.getElementById('bg-switch-btn');
    if (btn) {
      btn.addEventListener('click', switchBackground);
    }
  });
})();
```

- [ ] **Step 2: 编写自定义 CSS**

创建 `static/css/custom.css`：
```css
/* 背景层 */
body {
  transition: background-image 0.5s ease-in-out;
}

/* 星空粒子层 */
#particles-js {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* 确保内容在粒子层上方 */
.wrapper, header, footer, main, nav {
  position: relative;
  z-index: 1;
}

/* 右下角固定按钮组 */
.fixed-buttons {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fixed-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(30, 30, 30, 0.75);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  transition: transform 0.2s, background 0.2s;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
}

.fixed-btn:hover {
  background: rgba(80, 80, 200, 0.85);
  transform: scale(1.1);
}

/* 文章卡片倾斜效果增强 */
.post-card {
  transform-style: preserve-3d;
  will-change: transform;
}
```

- [ ] **Step 3: 创建 custom-head partial（注入 CSS 和库）**

创建 `layouts/partials/custom-head.html`：
```html
<!-- 自定义样式 -->
<link rel="stylesheet" href="/css/custom.css">

<!-- AOS 滚动动画 -->
<link rel="stylesheet" href="https://unpkg.com/aos@2.3.1/dist/aos.css">

<!-- Particles.js 星空 -->
<div id="particles-js"></div>
```

- [ ] **Step 4: 创建 custom-footer partial（注入 JS 和按钮）**

创建 `layouts/partials/custom-footer.html`：
```html
<!-- 右下角固定按钮 -->
<div class="fixed-buttons">
  <button class="fixed-btn" id="bg-switch-btn" title="切换背景">🌄</button>
  <button class="fixed-btn" id="back-to-top" title="回到顶部" onclick="window.scrollTo({top:0,behavior:'smooth'})">↑</button>
</div>

<!-- Particles.js -->
<script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>

<!-- AOS -->
<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>

<!-- VanillaTilt -->
<script src="https://unpkg.com/vanilla-tilt@1.8.1/dist/vanilla-tilt.min.js"></script>

<!-- 自定义脚本 -->
<script src="/js/bg-switcher.js"></script>
<script src="/js/effects.js"></script>
```

- [ ] **Step 5: 提交**

```bash
git add static/ layouts/
git commit -m "feat: add background switcher and custom layout partials"
```

---

## Task 6: 实现视觉特效（星空粒子 + 卡片倾斜 + 烟花）

**Files:**
- Create: `static/js/effects.js`

- [ ] **Step 1: 编写 effects.js**

创建 `static/js/effects.js`：
```javascript
document.addEventListener('DOMContentLoaded', function () {

  // ── 1. 星空粒子层 (Particles.js) ──────────────────────────
  if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
      particles: {
        number: { value: 120, density: { enable: true, value_area: 800 } },
        color: { value: '#ffffff' },
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: true },
        size: { value: 2, random: true },
        line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.1, width: 1 },
        move: { enable: true, speed: 1.2, direction: 'none', random: true, out_mode: 'out' }
      },
      interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: false } }
      },
      retina_detect: true
    });
  }

  // ── 2. AOS 滚动动画 ───────────────────────────────────────
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 600, once: true, offset: 60 });
  }

  // ── 3. 文章卡片 3D 倾斜 (VanillaTilt) ────────────────────
  if (typeof VanillaTilt !== 'undefined') {
    VanillaTilt.init(document.querySelectorAll('.post-card, article.card'), {
      max: 8,
      speed: 400,
      glare: true,
      'max-glare': 0.2,
    });
  }

  // ── 4. 烟花点击特效 ───────────────────────────────────────
  (function () {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    const particles = [];

    function Particle(x, y) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.color = `hsl(${Math.random() * 360}, 100%, 70%)`;
      this.radius = Math.random() * 3 + 1;
    }

    Particle.prototype.update = function () {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.1; // gravity
      this.alpha -= 0.02;
    };

    Particle.prototype.draw = function () {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    document.addEventListener('click', function (e) {
      for (let i = 0; i < 30; i++) {
        particles.push(new Particle(e.clientX, e.clientY));
      }
    });

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
      }
      requestAnimationFrame(animate);
    }

    animate();
  })();

});
```

- [ ] **Step 2: 本地预览验证特效**

```bash
cd "D:/http web"
hugo server -D
```
打开 `http://localhost:1313`，验证：
- 页面背景显示第一张背景图
- 右下角有切换按钮，点击可切换背景
- 页面有粒子飘动效果
- 点击页面有烟花爆炸

- [ ] **Step 3: 提交**

```bash
git add static/js/effects.js
git commit -m "feat: add starfield particles, card tilt, and fireworks effects"
```

---

## Task 7: 验证多语言切换

**Files:**
- 无新文件，验证配置生效

- [ ] **Step 1: 启动本地服务器**

```bash
hugo server -D
```

- [ ] **Step 2: 逐一验证各语言路由**

| 语言 | URL | 期望标题 |
|------|-----|---------|
| 中文 | `http://localhost:1313/` | 破船之家 |
| 英文 | `http://localhost:1313/en/` | Broken Ship Home |
| 日文 | `http://localhost:1313/ja/` | ブロークンシップホーム |
| 韩文 | `http://localhost:1313/ko/` | 부서진 배의 집 |

- [ ] **Step 3: 检查导航菜单各语言文字正确**

在各语言首页，确认导航菜单显示对应语言文字（首页/Home/ホーム/홈 等）。

- [ ] **Step 4: 提交验证记录**

```bash
git commit --allow-empty -m "chore: verify multilingual routing works correctly"
```

---

## Task 8: 配置 GitHub Actions 自动部署

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: 创建 GitHub Actions 配置**

创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy Hugo to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: 'latest'
          extended: true

      - name: Build
        run: hugo --minify

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
          publish_branch: gh-pages
```

- [ ] **Step 2: 提交部署配置**

```bash
git add .github/
git commit -m "feat: add GitHub Actions deploy workflow"
```

---

## Task 9: 推送到 GitHub 并启用 GitHub Pages

**Files:**
- 无代码变更，操作 GitHub 仓库设置

- [ ] **Step 1: 在 GitHub 创建仓库**

访问 `https://github.com/new`，创建仓库：
- 名称：`mikeliu30.github.io`
- 可见性：Public
- 不初始化（不添加 README）

- [ ] **Step 2: 推送代码**

```bash
git remote add origin https://github.com/mikeliu30/mikeliu30.github.io.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: 等待 GitHub Actions 构建完成**

访问 `https://github.com/mikeliu30/mikeliu30.github.io/actions`，等待 workflow 变为绿色 ✅。

- [ ] **Step 4: 启用 GitHub Pages**

进入仓库 Settings → Pages：
- Source：Deploy from a branch
- Branch：`gh-pages` / `/ (root)`
- 点击 Save

- [ ] **Step 5: 验证上线**

等待约 1-2 分钟，访问 `https://mikeliu30.github.io`，确认博客正常显示。

---

## Task 10: 添加背景图（用户操作）

**Files:**
- Add: `static/images/bg/bg1.jpg`
- Add: `static/images/bg/bg2.jpg`
- Add: `static/images/bg/bg3.jpg`（可按需增减）
- Modify: `static/js/bg-switcher.js`（更新图片列表）

- [ ] **Step 1: 将背景图放入目录**

把你的背景图文件复制到 `static/images/bg/`，命名为 `bg1.jpg`、`bg2.jpg` 等。

- [ ] **Step 2: 更新 bg-switcher.js 中的列表**

编辑 `static/js/bg-switcher.js`，将 `backgrounds` 数组改为实际文件名：
```javascript
const backgrounds = [
  '/images/bg/bg1.jpg',
  '/images/bg/bg2.jpg',
  // 有几张加几张
];
```

- [ ] **Step 3: 本地预览验证切换正常**

```bash
hugo server
```
点击右下角🌄按钮，确认图片循环切换正常。

- [ ] **Step 4: 提交并推送**

```bash
git add static/images/bg/ static/js/bg-switcher.js
git commit -m "feat: add background images"
git push
```

---

## 完成检查清单

- [ ] Hugo 本地构建无报错（`hugo`）
- [ ] 四语言首页可访问（/, /en/, /ja/, /ko/）
- [ ] 背景切换按钮正常工作，localStorage 记住选择
- [ ] 星空粒子层显示
- [ ] 文章卡片悬停有 3D 倾斜效果
- [ ] 点击页面有烟花特效
- [ ] GitHub Actions 构建成功
- [ ] `https://mikeliu30.github.io` 可正常访问
