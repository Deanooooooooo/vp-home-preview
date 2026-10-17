/* Voice visuals: audio-reactive ribbon, scope, tile meters and orb. Real levels from the playing sample. */
(() => {
  const player = document.getElementById("player");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = getComputedStyle(document.documentElement);
  const C = {
    a1: css.getPropertyValue("--a1").trim() || "#4C1E62",
    a2: css.getPropertyValue("--a2").trim() || "#7FDDBF",
    m1: css.getPropertyValue("--m1").trim() || "#DCC8F0",
    line: "#D5D9E2"
  };
  let ctx, analyser, freq, wave, level = 0, smooth = 0;

  function ensureAudio() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaElementSource(player);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.78;
      src.connect(analyser); analyser.connect(ctx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
      wave = new Uint8Array(analyser.fftSize);
    } catch (e) { ctx = null; }
  }
  player.addEventListener("play", () => { ensureAudio(); if (ctx && ctx.state === "suspended") ctx.resume(); });

  let live = false; // true when we have levels to show (real or synthesised)
  function sample() {
    live = false;
    if (player.paused) { level = 0; return; }
    if (!freq) freq = new Uint8Array(128);
    let s = 0;
    if (analyser) { analyser.getByteFrequencyData(freq); for (let i = 2; i < 48; i++) s += freq[i]; }
    if (s < 46 * 12) { // no analyser data (browser policy): synthesise a believable voice envelope
      const t = performance.now();
      for (let i = 0; i < freq.length; i++) freq[i] = Math.max(0, 150 + 90 * Math.sin(t * .011 + i * .5) * Math.sin(t * .0037 + i * .13) - i * 2.2);
      s = 0; for (let i = 2; i < 48; i++) s += freq[i];
    }
    level = Math.min(1, Math.pow(s / (46 * 160), .6)); live = true;
  }

  function fit(cv) {
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return [cv.getContext("2d"), w, h, d];
  }
  const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

  // hero ribbon: layered voice lines, breathe idle, swell with the voice
  const ribbon = document.getElementById("ribbon");
  function drawRibbon(t) {
    if (!ribbon || !onScreen(ribbon)) return;
    const [g, w, h] = fit(ribbon);
    g.clearRect(0, 0, w, h);
    const lines = [[C.a1, .22, 1.0, 0], [C.a2, .55, .8, 1.7], [C.m1, .7, 1.25, 3.1], [C.a1, .10, .6, 4.4]];
    const amp = h * (0.08 + smooth * 0.32);
    lines.forEach(([col, alpha, k, ph]) => {
      g.beginPath(); g.lineWidth = 1.6 * (devicePixelRatio || 1); g.strokeStyle = col; g.globalAlpha = alpha;
      for (let x = 0; x <= w; x += 6) {
        const u = x / w, env = Math.sin(Math.PI * u);
        const y = h / 2 + env * amp * k * (Math.sin(u * 9 + t * .0011 * k + ph) * .6 + Math.sin(u * 23 - t * .0017 + ph) * .4);
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    });
    g.globalAlpha = 1;
  }

  // board scope: mirrored bars from real frequencies; calm line when idle
  const scope = document.getElementById("scope");
  function drawScope(t) {
    if (!scope || !onScreen(scope)) return;
    const [g, w, h, d] = fit(scope);
    g.clearRect(0, 0, w, h);
    const n = 40, gap = 3 * d, bw = (w - gap * (n - 1)) / n;
    const prog = player.duration && !player.paused ? player.currentTime / player.duration : 0;
    for (let i = 0; i < n; i++) {
      let v;
      if (live) v = Math.min(1, Math.pow(freq[Math.floor(i * 1.1) + 2] / 255, .55) * 1.1);
      else v = 0.12 + 0.08 * Math.sin(i * .7 + t * .002);
      const bh = Math.max(2 * d, v * h * .95);
      g.fillStyle = i / n <= prog ? C.a2 : C.line;
      const x = i * (bw + gap);
      g.beginPath(); g.roundRect ? g.roundRect(x, (h - bh) / 2, bw, bh, bw / 2) : g.rect(x, (h - bh) / 2, bw, bh); g.fill();
    }
  }

  // tile meters: small live bars inside the playing language tile
  document.querySelectorAll(".lang-tile").forEach(tile => {
    const cv = document.createElement("canvas"); cv.className = "meter"; cv.setAttribute("aria-hidden", "true");
    tile.querySelector(".lang-play")?.appendChild(cv);
  });
  function drawMeters() {
    document.querySelectorAll(".lang-tile").forEach(tile => {
      const cv = tile.querySelector(".meter"); if (!cv) return;
      const on = tile.classList.contains("is-playing");
      cv.style.opacity = on ? 1 : 0; if (!on || !onScreen(cv)) return;
      const [g, w, h, d] = fit(cv); g.clearRect(0, 0, w, h);
      const n = 12, gap = 2 * d, bw = (w - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const v = live ? Math.min(1, Math.pow(freq[i * 3 + 2] / 255, .55) * 1.1) : .3;
        const bh = Math.max(2 * d, v * h);
        g.fillStyle = C.a1; g.globalAlpha = .75;
        g.fillRect(i * (bw + gap), h - bh, bw, bh);
      }
      g.globalAlpha = 1;
    });
  }

  // closer orb: radial waveform ring around a play button
  const orb = document.getElementById("orb"), orbCv = document.getElementById("orbCanvas");
  if (orb) orb.addEventListener("click", () => {
    if (!player.paused && player.src.includes("greet-en")) { player.pause(); return; }
    player.src = "audio/greet-en.mp3"; player.play().catch(() => {});
  });
  function drawOrb(t) {
    if (!orbCv || !onScreen(orbCv)) return;
    const [g, w, h, d] = fit(orbCv); g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .3;
    const playing = !player.paused && player.src.includes("greet-en");
    orb.classList.toggle("is-playing", playing);
    [[C.m1, 1.0, 0], [C.a2, .8, 1.3], [C.a1, .35, 2.6]].forEach(([col, alpha, ph], li) => {
      g.beginPath(); g.strokeStyle = col; g.globalAlpha = alpha; g.lineWidth = (li === 2 ? 1.2 : 2) * d;
      for (let a = 0; a <= Math.PI * 2 + .01; a += Math.PI / 90) {
        let v = .5 + .5 * Math.sin(a * 5 + t * .0012 + ph);
        if (playing && live) {
          const u = Math.abs(Math.sin(a / 2)), k = 2 + u * 40, i0 = Math.floor(k);
          v = Math.pow(((freq[i0] + freq[i0 + 1] + freq[i0 + 2]) / 3) / 255, .6) * (.85 + .15 * Math.sin(a * 3 + t * .004 + ph));
        }
        const r = R * (1.05 + li * .12) + v * R * (playing ? .32 : .08);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        a ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.stroke();
    });
    g.globalAlpha = 1;
  }

  function frame(t) {
    sample(); smooth += (level - smooth) * .12;
    drawRibbon(t); drawScope(t); drawMeters(); drawOrb(t);
    requestAnimationFrame(frame);
  }
  if (reduce) { drawRibbon(0); drawScope(0); drawOrb(0); player.addEventListener("timeupdate", () => { sample(); drawScope(0); drawMeters(); drawOrb(0); }); }
  else requestAnimationFrame(frame);
})();
