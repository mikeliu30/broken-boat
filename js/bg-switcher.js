(function () {
  // 背景图列表 — 用户将图片放入 static/images/bg/ 后在此配置
  const backgrounds = [
    '/broken-boat/images/bg/bg1.jpg',
    '/broken-boat/images/bg/bg2.jpg',
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
