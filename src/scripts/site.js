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

  vp.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; decided = false; horizontal = false; dx = 0;
    startX = e.clientX; startY = e.clientY; pid = e.pointerId;
  });
  vp.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    const mx = e.clientX - startX, my = e.clientY - startY;
    if (!decided) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      decided = true; horizontal = Math.abs(mx) > Math.abs(my);
      if (!horizontal) { dragging = false; return; }
      vp.setPointerCapture(pid);
      vp.classList.add('dragging');
    }
    dx = mx;
    // rubber band at the ends
    if ((idx === 0 && dx > 0) || (idx === n - 1 && dx < 0)) dx *= 0.35;
    set(-idx * width() + dx, false);
    e.preventDefault();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    vp.classList.remove('dragging');
    if (!horizontal) return;
    const t = width() * 0.2;
    if (dx <= -t) go(idx + 1); else if (dx >= t) go(idx - 1); else go(idx);
  };
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);
  vp.addEventListener('lostpointercapture', end);
  vp.addEventListener('dragstart', (e) => e.preventDefault());
  dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); }
  });
  window.addEventListener('resize', () => go(idx, false));
  go(0, false);
});
