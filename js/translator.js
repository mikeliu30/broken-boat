(function () {
  'use strict';

  // MyMemory 语言对映射
  const LANG_PAIR = {
    en: 'zh-CN|en-GB',
    ja: 'zh-CN|ja',
    ko: 'zh-CN|ko',
  };

  // 需要翻译的元素选择器（跳过代码块）
  const SELECTOR = [
    '#main p',
    '#main li',
    '#main h1',
    '#main h2',
    '#main h3',
    '#main h4',
    '#main blockquote',
    '#main td',
    '#main th',
  ].join(', ');

  let savedTexts = null; // 保存原始内容用于还原
  let isTranslating = false;
  let blockNavigation = false; // 拦截主题的 window.location 跳转

  // 拦截 window.location 赋值，阻止主题跳转
  const origDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
  let _locationOverridden = false;

  function patchLocation() {
    if (_locationOverridden) return;
    _locationOverridden = true;
    try {
      Object.defineProperty(window, 'location', {
        get: function () {
          return origDescriptor ? origDescriptor.get.call(window) : location;
        },
        set: function (url) {
          if (blockNavigation) return; // 翻译时忽略跳转
          if (origDescriptor && origDescriptor.set) {
            origDescriptor.set.call(window, url);
          } else {
            window.location.href = url;
          }
        },
        configurable: true,
      });
    } catch (e) {
      // 某些浏览器不允许重定义 window.location，降级到其他方案
      _locationOverridden = false;
    }
  }

  // 调用 MyMemory API 翻译单段文字
  async function callMyMemory(text, langpair) {
    if (!text.trim()) return text;
    try {
      const url = 'https://api.mymemory.translated.net/get'
        + '?q=' + encodeURIComponent(text.slice(0, 480))
        + '&langpair=' + langpair;
      const res = await fetch(url);
      const json = await res.json();
      return json.responseData?.translatedText || text;
    } catch {
      return text;
    }
  }

  // 将多段文字合并后批量翻译，减少 API 调用次数
  async function translateBatch(texts, langpair) {
    const SEP = ' ||| ';
    const combined = texts.join(SEP);
    // 超过 480 字则逐条翻译
    if (combined.length > 480) {
      const results = [];
      for (const t of texts) {
        results.push(await callMyMemory(t, langpair));
        await sleep(100);
      }
      return results;
    }
    const translated = await callMyMemory(combined, langpair);
    return translated.split(SEP);
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // 显示底部 loading 提示
  function showLoading() {
    let el = document.getElementById('translate-loading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'translate-loading';
      el.style.cssText = [
        'position:fixed', 'bottom:30px', 'right:30px',
        'background:rgba(0,0,0,0.75)', 'color:#fff',
        'padding:10px 20px', 'border-radius:20px',
        'z-index:9999', 'font-size:14px',
        'backdrop-filter:blur(6px)',
        'transition:opacity 0.3s',
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = '翻译中...';
    el.style.opacity = '1';
    return el;
  }

  function hideLoading(el) {
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }
  }

  // 翻译页面
  async function translatePage(lang) {
    if (isTranslating) return;
    isTranslating = true;

    const langpair = LANG_PAIR[lang];
    const elements = Array.from(document.querySelectorAll(SELECTOR))
      .filter(el => {
        // 跳过 code/pre 内的元素
        if (el.closest('code, pre')) return false;
        return el.textContent.trim().length > 0;
      });

    if (!elements.length) { isTranslating = false; return; }

    // 首次翻译：保存原始 HTML
    if (!savedTexts) {
      savedTexts = new Map();
      elements.forEach(el => savedTexts.set(el, el.innerHTML));
    } else {
      // 切换语言前先还原原文
      savedTexts.forEach((html, el) => { el.innerHTML = html; });
    }

    const loading = showLoading();

    try {
      // 每次批处理最多 5 个元素
      const BATCH = 5;
      for (let i = 0; i < elements.length; i += BATCH) {
        const batch = elements.slice(i, i + BATCH);
        const texts = batch.map(el => el.textContent);
        const translated = await translateBatch(texts, langpair);
        batch.forEach((el, j) => {
          if (translated[j] !== undefined) {
            el.textContent = translated[j];
          }
        });
        await sleep(150);
      }
    } finally {
      hideLoading(loading);
      isTranslating = false;
    }
  }

  // 还原中文原文
  function restorePage() {
    if (savedTexts) {
      savedTexts.forEach((html, el) => { el.innerHTML = html; });
      savedTexts = null;
    }
  }

  // 更新切换器 UI
  function updateSwitcherUI(item) {
    document.querySelectorAll('#select-items li').forEach(li => li.classList.remove('selected'));
    item.classList.add('selected');
    const selectedLang = document.getElementById('selected-lang');
    if (selectedLang) selectedLang.textContent = item.textContent.trim();
    const selectItems = document.getElementById('select-items');
    if (selectItems) selectItems.classList.remove('show');
    const selectSelected = document.getElementById('select-selected');
    if (selectSelected) selectSelected.setAttribute('aria-expanded', 'false');
  }

  // 在 DOM ready 后，给每个 li 注册监听器
  // 通过 blockNavigation 标志阻止主题的 window.location 跳转
  function attachListeners() {
    const items = document.querySelectorAll('#select-items li');
    if (!items.length) return;

    patchLocation();

    items.forEach(function (item) {
      item.addEventListener('click', function (e) {
        const lang = item.dataset.value;
        if (!lang) return;

        if (lang === 'zh') {
          // 允许导航（回到中文首页），同时还原译文
          restorePage();
        } else if (LANG_PAIR[lang]) {
          // 阻止主题跳转，执行原地翻译
          blockNavigation = true;
          setTimeout(function () { blockNavigation = false; }, 500);
          updateSwitcherUI(item);
          translatePage(lang);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachListeners);
  } else {
    attachListeners();
  }
})();
