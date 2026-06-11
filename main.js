// Coverflow-style infinite carousels: cards scale up as they approach the
// horizontal center and shrink/fade toward the edges. The track loops
// endlessly (a full set of cards is cloned on each side), drifts slowly on
// its own, and pauses when you hover or interact. Clicking a card opens its
// page. Supports scroll, drag, arrow buttons, dots, and keyboard.

function setupCarousel(track) {
  const originals = Array.from(track.children);
  if (originals.length === 0) return;

  // Clone a full set before and after the originals for seamless looping.
  const clone = (c) => { const n = c.cloneNode(true); n.classList.add('clone'); return n; };
  originals.map(clone).forEach((n) => track.insertBefore(n, originals[0]));
  originals.map(clone).forEach((n) => track.appendChild(n));
  const cards = Array.from(track.children);

  const firstReal = originals[0];          // first card of the middle (real) set
  const firstTail = cards[originals.length * 2]; // first card of the trailing clone set

  // Pagination dots — one per original card. Clicking centers that card.
  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'car-dots';
  const dots = originals.map((_, i) => {
    const d = document.createElement('button');
    d.className = 'car-dot';
    d.setAttribute('aria-label', 'Go to item ' + (i + 1));
    d.addEventListener('click', () => seekToCard(i));
    dotsWrap.appendChild(d);
    return d;
  });
  track.parentNode.appendChild(dotsWrap);

  // Geometry, recomputed on resize.
  let setWidth = 0, home = 0;
  function measure() {
    setWidth = firstTail.offsetLeft - firstReal.offsetLeft; // width of one full set
    home = firstReal.offsetLeft - (track.clientWidth - firstReal.offsetWidth) / 2;
  }

  // Keep scrollLeft within half a set-width of home. The wrap is invisible
  // because the cloned card at the new position is identical to the old one.
  function loop() {
    if (setWidth <= 0) return;
    if (track.scrollLeft < home - setWidth / 2) track.scrollLeft += setWidth;
    else if (track.scrollLeft > home + setWidth / 2) track.scrollLeft -= setWidth;
  }

  // Update each card's --t (0 = centered, 1 = at the edge) and the active dot.
  let raf = null;
  function update() {
    raf = null;
    const rect = track.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const reach = rect.width / 2; // distance at which a card is fully "far"
    let nearest = 0, nearestDist = Infinity;
    cards.forEach((card, idx) => {
      const cr = card.getBoundingClientRect();
      const cardCenter = cr.left + cr.width / 2;
      const dist = Math.abs(center - cardCenter);
      const t = Math.min(dist / reach, 1);
      card.style.setProperty('--t', t.toFixed(3));
      card.style.zIndex = String(Math.round((1 - t) * 100));
      if (dist < nearestDist) { nearestDist = dist; nearest = idx; }
    });
    // Map the centered card back to its original index and light its dot.
    const active = ((nearest % originals.length) + originals.length) % originals.length;
    dots.forEach((d, i) => d.classList.toggle('active', i === active));
  }
  function schedule() {
    if (raf === null) raf = requestAnimationFrame(update);
  }

  // Auto-advance: a slow, continuous drift. Snap is disabled while drifting.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // px per frame ≈ a gentle crawl; negative drifts the other way.
  const DRIFT = track.hasAttribute('data-reverse') ? -0.5 : 0.5;
  let apRaf = null, driftAccum = 0, seekRemaining = 0, seekAccum = 0;
  function autoTick() {
    if (Math.abs(seekRemaining) >= 0.5) {
      // Ease the REMAINING distance toward a dot/arrow target, in whole pixels.
      // Tracking a relative remaining distance (not an absolute scroll target)
      // keeps the loop-wrap from turning the chase into a runaway scroll.
      const move = Math.abs(seekRemaining) < 6 ? seekRemaining : seekRemaining * 0.22;
      seekRemaining -= move;
      seekAccum += move;
      const px = Math.trunc(seekAccum);
      if (px !== 0) { seekAccum -= px; track.scrollLeft += px; loop(); }
      update();
      apRaf = requestAnimationFrame(autoTick);
      return;
    }
    seekRemaining = 0; seekAccum = 0;
    // Accumulate fractional drift and apply only whole-pixel steps, since
    // scrollLeft is rounded to integers (sub-pixel writes get rounded away).
    driftAccum += DRIFT;
    const stepPx = Math.trunc(driftAccum);
    if (stepPx !== 0) {
      driftAccum -= stepPx;
      track.scrollLeft += stepPx;
      loop();
      update();
    }
    apRaf = requestAnimationFrame(autoTick);
  }
  function playAuto() {
    if (reduceMotion || apRaf !== null) return;
    track.classList.add('autoplaying');
    apRaf = requestAnimationFrame(autoTick);
  }
  function pauseAuto() {
    if (apRaf !== null) { cancelAnimationFrame(apRaf); apRaf = null; }
    track.classList.remove('autoplaying');
  }
  // Glide to a target WITHOUT stopping: the drift loop eases there and then
  // carries on, so dots/arrows keep the carousel moving and the dots in sync.
  function seekBy(delta) {
    if (setWidth > 0) {
      delta = ((delta % setWidth) + setWidth) % setWidth; // shortest equivalent
      if (delta > setWidth / 2) delta -= setWidth;        // given the looped clones
    }
    stopMomentum();
    if (reduceMotion) { track.scrollLeft += delta; loop(); update(); return; }
    seekRemaining = delta; // distance left to travel (immune to loop-wrap)
    seekAccum = 0;
    playAuto(); // make sure the loop is running so it can ease to the target
  }
  function seekToCard(idx) {
    const card = cards[originals.length + idx];
    seekBy(card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2 - track.scrollLeft);
  }

  track.addEventListener('scroll', () => { loop(); schedule(); }, { passive: true });
  window.addEventListener('resize', () => { measure(); loop(); schedule(); });

  // Open a card's page. Tapping navigates (handled on pointerup so it works
  // with pointer capture); Enter/Space works for keyboard focus.
  function go(card) {
    const href = card && card.dataset.href;
    if (href) window.location.href = href;
  }
  cards.forEach((card) => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(card); }
    });
  });

  // Arrow buttons scroll by one card width + gap.
  const name = track.dataset.carousel;
  const step = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 28;
    return firstReal.getBoundingClientRect().width + gap;
  };
  document.querySelectorAll('.car-prev[data-car="' + name + '"]').forEach((b) =>
    b.addEventListener('click', () => seekBy(-step()))
  );
  document.querySelectorAll('.car-next[data-car="' + name + '"]').forEach((b) =>
    b.addEventListener('click', () => seekBy(step()))
  );

  // Drag to scroll, with fling (momentum) on release. A plain click never
  // touches the autoplay — the drift only pauses once movement passes the
  // drag threshold, so clicking a card doesn't make the carousel hiccup.
  let dragging = false, activeDrag = false, lastX = 0, lastT = 0, moved = 0, vel = 0, momRaf = null, downCard = null;

  function stopMomentum() {
    if (momRaf !== null) { cancelAnimationFrame(momRaf); momRaf = null; }
  }
  // Coast after release: apply the drag velocity, decaying with friction.
  function momentum() {
    track.scrollLeft += vel;
    loop();
    update();
    vel *= 0.95; // friction
    if (Math.abs(vel) < 0.2) {
      momRaf = null;
      track.classList.remove('dragging');
      playAuto(); // resume drifting once the fling settles
      return;
    }
    momRaf = requestAnimationFrame(momentum);
  }

  track.addEventListener('pointerdown', (e) => {
    dragging = true; activeDrag = false; moved = 0; vel = 0;
    downCard = e.target.closest('.card');
    lastX = e.clientX; lastT = e.timeStamp;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dt = e.timeStamp - lastT;
    lastX = e.clientX; lastT = e.timeStamp;
    moved += Math.abs(dx);
    if (!activeDrag) {
      if (moved <= 4) return;     // still within click tolerance — leave autoplay alone
      activeDrag = true;          // it's a real drag now: take over from autoplay
      stopMomentum();
      pauseAuto();
      track.classList.add('dragging');
    }
    track.scrollLeft -= dx;
    loop();
    // Smoothed scroll velocity in px/frame (~16ms), clamped for sanity.
    if (dt > 0) {
      const inst = (-dx / dt) * 16;
      vel = Math.max(-60, Math.min(60, vel * 0.6 + inst * 0.4));
    }
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    if (e && e.pointerId != null && track.hasPointerCapture(e.pointerId)) {
      track.releasePointerCapture(e.pointerId);
    }
    // A tap (no real drag): open the card's page; autoplay was never paused.
    if (!activeDrag) {
      if (downCard && downCard.dataset.href) go(downCard);
      return;
    }
    if (Math.abs(vel) > 0.5) {
      momRaf = requestAnimationFrame(momentum); // fling
    } else {
      track.classList.remove('dragging');
      playAuto();
    }
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  // Prevent any synthetic click after a drag from doing anything unexpected.
  track.addEventListener('click', (e) => { if (moved > 4) { e.stopPropagation(); e.preventDefault(); } }, true);

  // Start centered on the first real card, then begin drifting.
  requestAnimationFrame(() => {
    measure();
    track.scrollLeft = home;
    update();
    playAuto();
  });
}

document.querySelectorAll('.carousel').forEach(setupCarousel);


// ---- Skills forest: each .mini-tree grows a trunk, tapered branches and
// foliage behind its icon nodes. Geometry is derived from the icon % positions
// (each tree's SVG shares its box aspect ratio, so nothing distorts).
(function buildSkillForest() {
  const W = 300, H = 460;
  const FAN_ANG = [202, 236, 270, 304, 338]; // degrees (270 = straight up)
  const FAN_R   = [104, 124, 92, 120, 108];  // base distance per slot

  // tiny deterministic PRNG so the foliage is stable across reloads
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  // a tapered, gently bowed filled limb from p0 (half-width w0) to p1 (w1)
  function limb(p0, p1, w0, w1, bow) {
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const mx = (p0.x + p1.x) / 2 + nx * bow, my = (p0.y + p1.y) / 2 + ny * bow;
    const wc = (w0 + w1) / 2;
    const f = (n) => n.toFixed(1);
    return `M${f(p0.x + nx * w0)} ${f(p0.y + ny * w0)}`
      + ` Q${f(mx + nx * wc)} ${f(my + ny * wc)} ${f(p1.x + nx * w1)} ${f(p1.y + ny * w1)}`
      + ` L${f(p1.x - nx * w1)} ${f(p1.y - ny * w1)}`
      + ` Q${f(mx - nx * wc)} ${f(my - ny * wc)} ${f(p0.x - nx * w0)} ${f(p0.y - ny * w0)} Z`;
  }

  const LEAFCOLORS = ['#3D5A2A', '#527A38', '#8BA876'];
  function oneLeaf(x, y, size, angle, ci) {
    const k = size * 0.62, f = (n) => n.toFixed(1);
    return `<path fill="${LEAFCOLORS[ci]}" transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})"`
      + ` d="M0 ${f(-size)} C ${f(k)} ${f(-size * 0.4)} ${f(k)} ${f(size * 0.4)} 0 ${f(size)}`
      + ` C ${f(-k)} ${f(size * 0.4)} ${f(-k)} ${f(-size * 0.4)} 0 ${f(-size)} Z"/>`;
  }
  // place n leaves around p, within the angle arc [aMin, aMax] degrees
  function cluster(p, n, size, spread, aMin = 0, aMax = 360) {
    let out = '';
    for (let i = 0; i < n; i++) {
      const a = aMin + ((i + rnd() * 0.6) / n) * (aMax - aMin);
      const r = spread + rnd() * size;
      const lx = p.x + Math.cos(a * Math.PI / 180) * r;
      const ly = p.y + Math.sin(a * Math.PI / 180) * r;
      out += oneLeaf(lx, ly, size * (0.7 + rnd() * 0.5), a + 90, i % 3);
    }
    return out;
  }

  function buildTree(tree, k) {
    const svg = tree.querySelector('.branches');
    const catEl = tree.querySelector('.hex-cat');
    if (!svg || !catEl) return;
    const center = (el) => ({ x: parseFloat(el.style.left) / 100 * W, y: parseFloat(el.style.top) / 100 * H });
    const cat = center(catEl);
    const leafEls = Array.from(tree.querySelectorAll('.hex[data-skill]'));

    // fan this tree's skills upward, at varying distances from the trunk top
    leafEls.forEach((el, j) => {
      const jitter = (((k * 5 + j) * 53) % 15) - 7; // deterministic ±7px
      const a = FAN_ANG[j % 5] * Math.PI / 180;
      const r = FAN_R[j % 5] + jitter;
      el.style.left = ((cat.x + Math.cos(a) * r) / W * 100).toFixed(2) + '%';
      el.style.top = ((cat.y + Math.sin(a) * r) / H * 100).toFixed(2) + '%';
    });
    const leaves = leafEls.map(center);

    // a floating hexagon island the tree roots into: flat hex grass top,
    // faceted dirt sides tapering to a point underneath.
    const cx = cat.x, topY = 388, rw = 84, rh = 23, tipY = 458;
    const A = `${cx - rw} ${topY}`, B = `${cx - rw / 2} ${topY - rh}`,
          C = `${cx + rw / 2} ${topY - rh}`, D = `${cx + rw} ${topY}`,
          E = `${cx + rw / 2} ${topY + rh}`, F = `${cx - rw / 2} ${topY + rh}`,
          P = `${cx} ${tipY}`;
    const island =
        `<path fill="#4a3a20" d="M${A} L${F} L${E} L${D} L${P} Z"/>`         // dirt body
      + `<path fill="#382b15" d="M${A} L${F} L${P} Z"/>`                      // left facet (shadow)
      + `<path fill="#5c4a2a" d="M${E} L${D} L${P} Z"/>`                      // right facet (light)
      + `<path fill="#557a35" d="M${A} L${B} L${C} L${D} L${E} L${F} Z"/>`    // grass top
      + `<path fill="#6b9544" opacity="0.5" d="M${A} L${B} L${C} L${D} Z"/>`; // grass back highlight

    // bark: trunk rooting into the island top, then a twig to each skill
    const gid = 'sk-bark-' + k;
    let wood = `<path fill="url(#${gid})" d="${limb({ x: cx, y: topY + 6 }, cat, 16, 8, 0)}"/>`;
    leaves.forEach((lf) => {
      wood += `<path fill="url(#${gid})" d="${limb(cat, lf, 6, 2.5, (rnd() - 0.5) * 8)}"/>`;
    });

    // grass tufts on top of the island
    let grass = '';
    for (let g = 0; g < 7; g++) {
      const gx = cx - 60 + g * 20 + (rnd() * 8 - 4);
      const h = 8 + rnd() * 8;
      const tip = gx + (rnd() * 10 - 5);
      grass += `<path stroke="#4d7233" stroke-width="2" fill="none" stroke-linecap="round"`
        + ` d="M${gx.toFixed(1)} ${topY + 4} Q${((gx + tip) / 2).toFixed(1)} ${(topY + 4 - h * 0.6).toFixed(1)} ${tip.toFixed(1)} ${(topY + 4 - h).toFixed(1)}"/>`;
    }

    // foliage (over the bark, behind the icons). Category leaves stay in the
    // upper arc so they never cover the label below the category node.
    let foliage = cluster(cat, 8, 12, 40, 150, 390);
    leaves.forEach((lf) => { foliage += cluster(lf, 4, 9, 22); });

    svg.innerHTML =
      `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="120" x2="0" y2="460">`
      + '<stop offset="0" stop-color="#6f5a33"/><stop offset="1" stop-color="#47371f"/>'
      + '</linearGradient></defs>' + island + wood + grass + foliage;
  }

  document.querySelectorAll('.mini-tree').forEach(buildTree);
})();
