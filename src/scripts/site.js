document.documentElement.classList.add('js');

/* ---------- per-word reveal ---------- */
function splitWords(el, start) {
  let i = start;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          const s = document.createElement('span');
          s.className = 'w';
          s.style.setProperty('--i', i++);
          s.textContent = p;
          frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
  return i;
}

const groups = new Map();
document.querySelectorAll('[data-reveal]').forEach((el) => {
  const g = el.dataset.reveal || el;
  const start = groups.get(g) || 0;
  groups.set(g, splitWords(el, start));
});

const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' })
  : null;
document.querySelectorAll('[data-reveal]').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

/* ---------- drag / swipe carousels ---------- */
document.querySelectorAll('[data-carousel]').forEach((root) => {
  const vp = root.querySelector('.carousel__viewport');
  const track = root.querySelector('.carousel__track');
  const slides = [...track.children];
  const dots = [...root.querySelectorAll('.dots button')];
  const caps = [...root.querySelectorAll('.carousel__cap')];
  const n = slides.length;
  let idx = 0, startX = 0, startY = 0, dx = 0, dragging = false, decided = false, horizontal = false, pid = null;

  const width = () => vp.getBoundingClientRect().width;
  const set = (x, anim) => {
    track.classList.toggle('anim', !!anim);
    track.style.transform = `translate3d(${x}px,0,0)`;
  };
  const go = (i, anim = true) => {
    idx = Math.max(0, Math.min(n - 1, i));
    set(-idx * width(), anim);
    dots.forEach((d, k) => d.setAttribute('aria-current', k === idx ? 'true' : 'false'));
    caps.forEach((c, k) => c.classList.toggle('on', k === idx));
    slides.forEach((s, k) => s.setAttribute('aria-hidden', k === idx ? 'false' : 'true'));
  };

  const start = (x, y) => { dragging = true; decided = false; horizontal = false; dx = 0; startX = x; startY = y; };
  // returns true while the gesture is a horizontal drag (caller then blocks page scroll)
  const move = (x, y) => {
    if (!dragging) return false;
    const mx = x - startX, my = y - startY;
    if (!decided) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return false;
      decided = true; horizontal = Math.abs(mx) > Math.abs(my);
      if (!horizontal) { dragging = false; return false; }
      vp.classList.add('dragging');
    }
    dx = mx;
    if ((idx === 0 && dx > 0) || (idx === n - 1 && dx < 0)) dx *= 0.35; // rubber band at the ends
    set(-idx * width() + dx, false);
    return true;
  };
  const end = () => {
    if (!dragging) return;
    dragging = false;
    vp.classList.remove('dragging');
    if (!horizontal) return;
    const t = width() * 0.2;
    if (dx <= -t) go(idx + 1); else if (dx >= t) go(idx - 1); else go(idx);
  };

  // touch: native touch events (reliable on iOS/Android)
  vp.addEventListener('touchstart', (e) => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  vp.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    if (move(e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) e.preventDefault();
  }, { passive: false });
  vp.addEventListener('touchend', end);
  vp.addEventListener('touchcancel', end);

  // mouse / pen: pointer events
  vp.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    start(e.clientX, e.clientY); pid = e.pointerId;
  });
  vp.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || e.pointerId !== pid) return;
    const wasDecided = decided;
    if (move(e.clientX, e.clientY)) {
      if (!wasDecided) { try { vp.setPointerCapture(pid); } catch (_) {} }
      e.preventDefault();
    }
  });
  vp.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') { end(); pid = null; } });
  vp.addEventListener('pointercancel', (e) => { if (e.pointerType !== 'touch') { end(); pid = null; } });
  vp.addEventListener('dragstart', (e) => e.preventDefault());
  dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); }
  });
  window.addEventListener('resize', () => go(idx, false));
  go(0, false);
});
