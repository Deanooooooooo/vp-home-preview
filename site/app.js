(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const player = $('#player');
  const root = document.documentElement;
  const base = root.dataset.base || '';
  const DE = root.lang === 'de';
  const T = DE ? { play: 'Mit Ton abspielen', pause: 'Pause', conn: 'Verbinde…' } : { play: 'Play with sound', pause: 'Pause', conn: 'Connecting…' };
  const money = (n, d = 2) => DE ? n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' €' : '€' + n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  const num = n => n.toLocaleString(DE ? 'de-DE' : 'en-GB');

  /* menu */
  const burger = $('.burger');
  if (burger) {
    const closeMenu = () => { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); };
    burger.addEventListener('click', e => {
      e.stopPropagation();
      const open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('#mainNav a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', e => { if (!e.target.closest('.header-in')) closeMenu(); });
  }

  /* preview: sign-up not open yet */
  $$('[data-signup]').forEach(a => a.addEventListener('click', () => {
    $$('.signup-note').forEach(n => { n.hidden = false; });
  }));

  /* the call: with audio (data-audio) it replays in sync; without, it plays once silently when it comes into view */
  const call = $('#call');
  let stopCall = () => {};
  if (call) {
    const lines = $$('#talk li');
    const extras = $$('#done > [data-t]');
    const items = [...lines, ...extras].map(el => ({ el, t: parseFloat(el.dataset.t) }));
    const END = parseFloat(call.dataset.end || '27.4');
    const audio = call.dataset.audio;
    const timeEl = $('#callTime');
    const wave = $('#wave');
    const playBtns = $$('[data-play-call]');
    const label = $('[data-play-label]');
    let mode = null, raf = 0, t0 = 0;
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
    stopCall = () => {
      cancelAnimationFrame(raf);
      if (mode === 'audio') player.pause();
      mode = null;
      root.classList.remove('on-call');
      playBtns.forEach(b => b.classList.remove('is-playing'));
      if (label) label.textContent = T.play;
      drawWave(0, false);
      render(END);
    };
    const tick = () => {
      const t = mode === 'audio' ? player.currentTime : (performance.now() - t0) / 1000;
      render(t);
      if (t >= END || (mode === 'audio' && player.ended)) { stopCall(); return; }
      raf = requestAnimationFrame(tick);
    };
    const playAudio = () => {
      if (mode === 'audio') { stopCall(); return; }
      cancelAnimationFrame(raf);
      stopLang();
      player.src = base + audio;
      player.currentTime = 0;
      root.classList.add('on-call');
      if (label) label.textContent = T.conn;
      playBtns.forEach(x => x.classList.add('is-playing'));
      player.play().then(() => {
        mode = 'audio';
        root.classList.add('on-call');
        playBtns.forEach(b => b.classList.add('is-playing'));
        if (label) label.textContent = T.pause;
        render(0);
        raf = requestAnimationFrame(tick);
      }).catch(() => { mode = 'audio'; stopCall(); });
      if (window.scrollY < 200) call.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    };
    if (audio) playBtns.forEach(b => b.addEventListener('click', playAudio));
    render(END);
    if (!audio && !reduce && 'IntersectionObserver' in window) {
      const co = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        co.disconnect();
        mode = 'silent'; t0 = performance.now(); render(0);
        raf = requestAnimationFrame(tick);
      }), { threshold: 0.45 });
      co.observe(call);
    }
  }

  /* language greetings */
  const langBtns = $$('.langs button');
  function stopLang() { langBtns.forEach(b => b.classList.remove('is-playing')); }
  langBtns.forEach(b => b.addEventListener('click', () => {
    const was = b.classList.contains('is-playing');
    stopCall();
    player.pause(); stopLang();
    if (was) { root.classList.remove('on-call'); return; }
    player.src = `${base}audio/greet-${b.dataset.lang}.mp3`;
    player.play().then(() => { b.classList.add('is-playing'); root.classList.add('on-call'); }).catch(() => {});
  }));
  if (player) player.addEventListener('ended', () => { stopLang(); root.classList.remove('on-call'); });

  /* bill: one line */
  const range = $('#minRange');
  if (range) {
    const bill = () => {
      const m = +range.value, c = m * 0.15;
      $('#mins').textContent = num(m);
      $('#cost').textContent = money(c);
      $('#total').textContent = money(c);
    };
    range.addEventListener('input', bill); bill();
  }


  /* agency margin calculator */
  const aC = $('#aClientsR');
  if (aC) {
    const aM = $('#aMinsR'), aP = $('#aPriceR');
    const eur = n => money(Math.round(n), 0);
    const calc = () => {
      const c = +aC.value, m = +aM.value, p = +aP.value, min = c * m;
      $('#aClients').textContent = c; $('#aMins').textContent = num(m);
      $('#aPrice').textContent = money(p);
      $('#aBill').textContent = eur(min * p); $('#aCost').textContent = eur(min * 0.15); $('#aMargin').textContent = eur(min * (p - 0.15));
    };
    [aC, aM, aP].forEach(r => r.addEventListener('input', calc)); calc();
  }

  /* reveals + the drawn line */
  const rv = $$('.head, .job, .step, .door, .bill, .price-copy, .specs-in > div, .qs, .langs, .table-wrap, .check, .use, .msg, .code, .code-copy');
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

  /* active nav for in-page sections (homepage) */
  const navLinks = $$('#mainNav > a').filter(a => a.getAttribute('href').startsWith('#'));
  const secs = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if (secs.length) {
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => so.observe(s));
  }
})();
