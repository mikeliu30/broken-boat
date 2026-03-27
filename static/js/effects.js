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
