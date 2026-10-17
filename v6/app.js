(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const player = $('#player');
  const root = document.documentElement;

  /* menu */
  const burger = $('.burger');
  const closeMenu = () => { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', e => {
    e.stopPropagation();
    const open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('#mainNav a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', e => { if (!e.target.closest('.header-in')) closeMenu(); });

  /* preview: sign-up not open yet */
  $$('[data-signup]').forEach(a => a.addEventListener('click', () => {
    $$('.signup-note').forEach(n => { n.hidden = false; });
  }));

  /* the call: timeline driven by audio, or a silent clock on first view */
  const lines = $$('#talk li');
  const extras = $$('#done > [data-t]');
  const items = [...lines, ...extras].map(el => ({ el, t: parseFloat(el.dataset.t) }));
  const END = 27.4;
  const timeEl = $('#callTime');
  const wave = $('#wave');
  const playBtns = $$('[data-play-call]');
  const label = $('[data-play-label]');
  let mode = null, raf = 0;

  const speaking = t => lines.findIndex((li, i) => {
    const s = parseFloat(li.dataset.t), n = lines[i + 1] ? parseFloat(lines[i + 1].dataset.t) - 0.45 : END - 0.6;
    return t >= s && t < n;
  });
  const drawWave = (t, on) => {
    if (!on) { wave.setAttribute('d', 'M0 30 L1000 30'); return; }
    let d = 'M0 30';
    for (let x = 0; x <= 1000; x += 10) {
      const env = Math.sin(Math.PI * x / 1000);
      const y = 30 + env * 18 * Math.sin(x / 23 + t * 9) * (0.55 + 0.45 * Math.sin(x / 71 - t * 4));
      d += ` L${x} ${y.toFixed(1)}`;
    }
    wave.setAttribute('d', d);
  };
  const render = t => {
    items.forEach(({ el, t: s }) => el.classList.toggle('shown', t >= s));
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    timeEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    drawWave(t, speaking(t) > -1 && mode);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    mode = null;
    root.classList.remove('on-call');
    playBtns.forEach(b => b.classList.remove('is-playing'));
    if (label) label.textContent = 'Play with sound';
    drawWave(0, false);
    render(END);
  };
  const tick = () => {
    const t = player.currentTime;
    render(t);
    if (t >= END || player.ended) { render(END); stop(); return; }
    raf = requestAnimationFrame(tick);
  };
  const playAudio = () => {
    if (mode === 'audio') { player.pause(); stop(); return; }
    cancelAnimationFrame(raf);
    stopLang();
    player.src = 'audio/call-table.mp3';
    player.currentTime = 0;
    player.play().then(() => {
      mode = 'audio';
      root.classList.add('on-call');
      playBtns.forEach(b => b.classList.add('is-playing'));
      if (label) label.textContent = 'Pause';
      render(0);
      raf = requestAnimationFrame(tick);
    }).catch(() => {});
    if (window.scrollY < 200) $('#call').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };
  playBtns.forEach(b => b.addEventListener('click', playAudio));

  /* the full call is visible from the start; Play replays it in sync with the sound */
  render(END);

  /* language greetings */
  const langBtns = $$('.langs button');
  function stopLang() { langBtns.forEach(b => b.classList.remove('is-playing')); }
  langBtns.forEach(b => b.addEventListener('click', () => {
    const was = b.classList.contains('is-playing');
    if (mode === 'audio') stop();
    player.pause(); stopLang();
    if (was) { root.classList.remove('on-call'); return; }
    player.src = `audio/greet-${b.dataset.lang}.mp3`;
    player.play().then(() => { b.classList.add('is-playing'); root.classList.add('on-call'); }).catch(() => {});
  }));
  player.addEventListener('ended', () => { if (mode !== 'audio') { stopLang(); root.classList.remove('on-call'); } });

  /* bill: one line */
  const range = $('#minRange');
  const fmt = n => '€' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const bill = () => {
    const m = +range.value, c = m * 0.15;
    $('#mins').textContent = m.toLocaleString('en-GB');
    $('#cost').textContent = fmt(c);
    $('#total').textContent = fmt(c);
  };
  range.addEventListener('input', bill); bill();

  /* reveals + the drawn line */
  const rv = $$('.head, .job, .step, .door, .bill, .price-copy, .specs-in > div, .qs, .langs');
  rv.forEach(el => el.classList.add('rv'));
  const lineEls = $$('.one-line');
  if (reduce || !('IntersectionObserver' in window)) {
    rv.forEach(el => el.classList.add('in')); lineEls.forEach(el => el.classList.add('drawn'));
  } else {
    const ro = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add(e.target.classList.contains('one-line') ? 'drawn' : 'in');
      ro.unobserve(e.target);
    }), { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    [...rv, ...lineEls].forEach(el => ro.observe(el));
  }

  /* active nav */
  const navLinks = $$('#mainNav > a');
  const secs = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => so.observe(s));
})();
