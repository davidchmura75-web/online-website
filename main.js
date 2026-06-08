/* ============================================================
   main.js — Alex Chen Portfolio
   Sections:
     1. Background doodles
     2. Scroll fade-in
     3. Cursor trail
     4. Infinite auto-scroll project belt
   ============================================================ */

/* ── 1. BACKGROUND DOODLES ── */
(function initDoodles() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  function pawSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="38" rx="14" ry="11" fill="#D4A89A"/>
      <ellipse cx="14" cy="28" rx="7"  ry="9"  fill="#D4A89A"/>
      <ellipse cx="46" cy="28" rx="7"  ry="9"  fill="#D4A89A"/>
      <ellipse cx="22" cy="20" rx="6"  ry="8"  fill="#D4A89A"/>
      <ellipse cx="38" cy="20" rx="6"  ry="8"  fill="#D4A89A"/>
    </svg>`;
  }

  function yarnSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="22" fill="#F2D4C8" stroke="#D4A89A" stroke-width="1.5"/>
      <path d="M12 22 Q30 10 48 22" stroke="#C4857A" stroke-width="1.5" fill="none"/>
      <path d="M10 30 Q30 18 50 30" stroke="#C4857A" stroke-width="1.5" fill="none"/>
      <path d="M12 38 Q30 26 48 38" stroke="#C4857A" stroke-width="1.5" fill="none"/>
      <line x1="30" y1="8"  x2="30" y2="52" stroke="#D4A89A" stroke-width="1"/>
      <line x1="8"  y1="30" x2="52" y2="30" stroke="#D4A89A" stroke-width="1"/>
    </svg>`;
  }

  function fishSVG(size) {
    const h = size * 0.6;
    return `<svg width="${size}" height="${h}" viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 24 Q72 10 78 24 Q72 38 60 24Z" fill="#9AB89A"/>
      <ellipse cx="36" cy="24" rx="26" ry="16" fill="#9AB89A"/>
      <circle cx="20" cy="20" r="3" fill="#3D2C2C"/>
      <path d="M36 8 Q50 8 60 24 Q50 40 36 40" stroke="#7AA47A" stroke-width="1.5" fill="none"/>
    </svg>`;
  }

  function starSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4 L23 16 L36 16 L26 24 L29 36 L20 28 L11 36 L14 24 L4 16 L17 16 Z"
            fill="#E8D4C0" stroke="#D4A89A" stroke-width="1"/>
    </svg>`;
  }

  function zzzSVG(size) {
    const h = size * 0.6;
    return `<svg width="${size}" height="${h}" viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="2" y="28" font-family="serif" font-size="28" fill="#D4A89A" font-style="italic">zzz</text>
    </svg>`;
  }

  const generators = { paw: pawSVG, yarn: yarnSVG, fish: fishSVG, star: starSVG, zzz: zzzSVG };

  const doodleConfig = [
    { type: 'paw',  count: 18 },
    { type: 'yarn', count: 8  },
    { type: 'fish', count: 6  },
    { type: 'star', count: 14 },
    { type: 'zzz',  count: 6  },
  ];

  const pageH = Math.max(window.innerHeight * 4, 3000);

  doodleConfig.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      const size = 40 + Math.random() * 60;
      const x    = Math.random() * (window.innerWidth - size);
      const y    = Math.random() * pageH;
      const rot  = Math.random() * 360;

      const el = document.createElement('div');
      el.className = 'bg-doodle';
      el.style.cssText = `left:${x}px; top:${y}px; transform:rotate(${rot}deg);`;
      el.innerHTML = generators[type](size);
      canvas.appendChild(el);
    }
  });
})();


/* ── 2. SCROLL FADE-IN ── */
(function initFadeIn() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
})();


/* ── 3. CURSOR TRAIL ── */
(function initCursorTrail() {
  const TRAIL_LENGTH = 7;
  const dots = Array.from({ length: TRAIL_LENGTH }, () => {
    const d = document.createElement('div');
    d.className = 'paw-dot';
    document.body.appendChild(d);
    return d;
  });

  let mouse = { x: 0, y: 0 };
  let trail = Array(TRAIL_LENGTH).fill({ x: 0, y: 0 });

  document.addEventListener('mousemove', e => {
    mouse = { x: e.clientX, y: e.clientY };
  });

  function animateTrail() {
    trail = [{ ...mouse }, ...trail.slice(0, TRAIL_LENGTH - 1)];
    dots.forEach((dot, i) => {
      dot.style.left      = (trail[i].x - 6) + 'px';
      dot.style.top       = (trail[i].y - 6) + 'px';
      dot.style.opacity   = (1 - i / TRAIL_LENGTH) * 0.3;
      dot.style.transform = `scale(${1 - i * 0.12})`;
    });
    requestAnimationFrame(animateTrail);
  }

  animateTrail();
})();


/* ── 4. INFINITE AUTO-SCROLL PROJECT BELT ── */
(function initProjectBelt() {
  const wrap = document.querySelector('.projects-track-wrap');
  const belt = document.getElementById('projBelt');
  if (!wrap || !belt) return;

  // Triple-clone cards so the belt never runs out
  const origCards = Array.from(belt.children);
  origCards.forEach(c => belt.appendChild(c.cloneNode(true)));
  origCards.forEach(c => belt.appendChild(c.cloneNode(true)));

  const GAP        = 24;        // matches CSS gap: 1.5rem = 24px
  const BASE_SPEED = 0.6;       // px per frame, auto-scroll rate
  let   offset     = 0;
  let   speed      = BASE_SPEED;
  let   paused     = false;

  // Drag state
  let isDragging     = false;
  let dragStartX     = 0;
  let dragStartOffset = 0;
  let dragVel        = 0;
  let lastDragX      = 0;
  let lastDragT      = 0;

  /** Total pixel width of one full set of original cards */
  function setWidth() {
    return origCards.reduce((sum, c) => sum + c.offsetWidth + GAP, 0);
  }

  function tick() {
    if (!isDragging) {
      if (!paused) {
        // Smoothly decay fling velocity back to base auto-scroll speed
        speed += (BASE_SPEED - speed) * 0.05;
        offset -= speed;
      }
    }

    const sw = setWidth();
    if (sw > 0) {
      if (offset <= -sw) offset += sw;  // loop forward
      if (offset > 0)    offset -= sw;  // loop backward
    }

    belt.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  /* Pause on hover */
  wrap.addEventListener('mouseenter', () => { paused = true; });
  wrap.addEventListener('mouseleave', () => { if (!isDragging) paused = false; });

  /* Drag helpers */
  function onDragStart(x) {
    isDragging      = true;
    paused          = true;
    dragStartX      = x;
    dragStartOffset = offset;
    lastDragX       = x;
    lastDragT       = performance.now();
    wrap.classList.add('grabbing');
  }

  function onDragMove(x) {
    if (!isDragging) return;
    const now = performance.now();
    const dt  = now - lastDragT || 16;
    dragVel   = (x - lastDragX) / dt * 16; // normalise to px-per-frame
    lastDragX = x;
    lastDragT = now;
    offset    = dragStartOffset + (x - dragStartX);
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    wrap.classList.remove('grabbing');
    // Hand fling velocity to the auto-scroller (invert: dragging right = scrolling left)
    speed = Math.max(-12, Math.min(12, -dragVel));
    paused = false;
  }

  /* Mouse events */
  wrap.addEventListener('mousedown', e => { e.preventDefault(); onDragStart(e.clientX); });
  window.addEventListener('mousemove', e => onDragMove(e.clientX));
  window.addEventListener('mouseup', onDragEnd);

  /* Touch events */
  wrap.addEventListener('touchstart', e => onDragStart(e.touches[0].clientX), { passive: true });
  wrap.addEventListener('touchmove',  e => onDragMove(e.touches[0].clientX),  { passive: true });
  wrap.addEventListener('touchend',   onDragEnd);
})();