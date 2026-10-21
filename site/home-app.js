(() => {
  // hero headline: word-by-word reveal, keeps two-tone spans
  const h1 = document.querySelector(".hero h1");
  if (h1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const label = h1.textContent.replace(/\s+/g, " ").trim();
    let n = 0;
    const wrap = (txt, cls) => txt.split(/(\s+)/).map(t => /^\s+$/.test(t) || !t ? t : `<span class="w${cls ? " " + cls : ""}" aria-hidden="true"><span style="--i:${n++}">${t}</span></span>`).join("");
    let html = "";
    h1.childNodes.forEach(nd => { html += nd.nodeType === 3 ? wrap(nd.textContent, "") : wrap(nd.textContent, nd.className || ""); });
    h1.setAttribute("aria-label", label);
    h1.classList.add("js-split");
    h1.innerHTML = html;
  }
  const LANGS = [
    { c: "nl", name: "Dutch", native: "Nederlands", city: "Amsterdam", text: "Goedemiddag, tandartspraktijk De Vries, u spreekt met Mila. Waarmee kan ik u helpen?" },
    { c: "de", name: "German", native: "Deutsch", city: "Berlin", text: "Guten Tag, Zahnarztpraxis Dr. Becker, Sie sprechen mit Mila. Wie kann ich Ihnen helfen?" },
    { c: "fr", name: "French", native: "Français", city: "Paris", text: "Bonjour, cabinet dentaire Martin, Mila à l’appareil. Que puis-je faire pour vous ?" },
    { c: "bg", name: "Bulgarian", native: "Български", city: "Sofia", text: "Добър ден, дентален кабинет „Иванови“, на телефона е Мила. С какво мога да помогна?" },
    { c: "es", name: "Spanish", native: "Español", city: "Madrid", text: "Buenas tardes, clínica dental García, le atiende Mila. ¿En qué puedo ayudarle?" },
    { c: "it", name: "Italian", native: "Italiano", city: "Milano", text: "Buongiorno, studio dentistico Rossi, sono Mila. Come posso aiutarla?" },
    { c: "pl", name: "Polish", native: "Polski", city: "Warszawa", text: "Dzień dobry, gabinet stomatologiczny Nowak, przy telefonie Mila. W czym mogę pomóc?" },
    { c: "ro", name: "Romanian", native: "Română", city: "București", text: "Bună ziua, cabinetul stomatologic Popescu, sunt Mila. Cu ce vă pot ajuta?" },
    { c: "sv", name: "Swedish", native: "Svenska", city: "Stockholm", text: "Hej, Tandläkarna Lindberg, du pratar med Mila. Vad kan jag hjälpa dig med?" },
    { c: "en", name: "English", native: "English", city: "London", text: "Good afternoon, Harper Dental, this is Mila speaking. How can I help?" }
  ];
  const BOARD = LANGS.slice(0, 5);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const player = $("#player");
  const CITY_LEN = 9;
  const CHARS = "ABCDEFGHIJKLMNOPRSTUVWZ";
  let current = 0, cycle = null, playingCode = null;

  const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

  function buildCells(el, n) { el.innerHTML = ""; for (let i = 0; i < n; i++) { const d = document.createElement("span"); d.className = "cell"; el.appendChild(d); } return [...el.children]; }
  const cityCells = buildCells($("#flapCity"), CITY_LEN);
  const langCells = buildCells($("#flapLang"), 2);

  function flipTo(cells, word) {
    const target = word.padEnd(cells.length, " ").slice(0, cells.length).split("");
    cells.forEach((cell, i) => {
      const end = target[i];
      if (reduce) { cell.textContent = end; return; }
      let steps = 3 + Math.floor(Math.random() * 5) + i;
      const tick = () => {
        cell.classList.remove("flip"); void cell.offsetWidth; cell.classList.add("flip");
        if (steps-- <= 0) { cell.textContent = end; return; }
        cell.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
        setTimeout(tick, 55);
      };
      tick();
    });
  }

  // bars
  const bars = $("#bars");
  for (let i = 0; i < 34; i++) { const b = document.createElement("i"); b.style.setProperty("--h", (20 + Math.abs(Math.sin(i * 1.7) * 60) + (i % 3) * 8) + "%"); bars.appendChild(b); }
  const barEls = [...bars.children];

  // board list
  const list = $("#boardList");
  BOARD.forEach((l, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<button type="button" data-i="${i}"><b>${l.c.toUpperCase()}</b>${plain(l.city).slice(0, 9)}</button>`;
    list.appendChild(li);
  });
  list.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; stopCycle(); show(+b.dataset.i); play(BOARD[+b.dataset.i].c); });

  function show(i) {
    current = i; const l = BOARD[i];
    flipTo(cityCells, plain(l.city));
    flipTo(langCells, l.c.toUpperCase());
    const bl = $("#boardLine");
    bl.setAttribute("aria-label", l.text);
    bl.innerHTML = l.text.split(" ").map((w, i) => `<span class="cw" aria-hidden="true" style="--i:${i}">${i === 0 ? "“" : ""}${w}${i === l.text.split(" ").length - 1 ? "”" : ""}</span>`).join(" ");
    bl.classList.remove("typing"); void bl.offsetWidth; bl.classList.add("typing");
    $("#boardMeta").textContent = l.native;
    list.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-current", k === i ? "true" : "false"));
  }

  function startCycle() { if (reduce) return; stopCycle(); cycle = setInterval(() => { if (!player.paused) return; show((current + 1) % BOARD.length); }, 4200); }
  function stopCycle() { clearInterval(cycle); cycle = null; }

  function setPlayingUI(code, on) {
    document.querySelectorAll(`[data-lang="${code}"]`).forEach(t => t.classList.toggle("is-playing", on));
    if (BOARD[current] && BOARD[current].c === code) $("#boardPlay").classList.toggle("is-playing", on);
    const hero = document.querySelector("[data-play-current]");
    if (hero && BOARD[current] && BOARD[current].c === code) hero.classList.toggle("is-playing", on);
  }

  function play(code) {
    if (playingCode === code && !player.paused) { player.pause(); return; }
    if (playingCode) setPlayingUI(playingCode, false);
    playingCode = code;
    player.src = `audio/greet-${code}.mp3`;
    player.play().catch(() => {});
    setPlayingUI(code, true);
    document.querySelectorAll(".lang-tile").forEach(t => t.setAttribute("aria-pressed", t.dataset.lang === code ? "true" : "false"));
  }
  // live captions: words light up in step with the voice
  const board = $("#board");
  function captions() {
    const bl = $("#boardLine"), on = !player.paused && BOARD[current] && BOARD[current].c === playingCode;
    board.classList.toggle("speaking", on);
    if (!on) return;
    requestAnimationFrame(captions);
    if (!player.duration) return;
    const ws = bl.querySelectorAll(".cw"), p = Math.min(1, (player.currentTime / player.duration) * 1.12), upto = Math.floor(p * ws.length);
    ws.forEach((w, i) => { w.classList.toggle("on", i < upto); w.classList.toggle("now", i === upto - 1); });
  }
  player.addEventListener("play", () => requestAnimationFrame(captions));
  player.addEventListener("ended", () => { board.classList.remove("speaking"); document.querySelectorAll("#boardLine .cw").forEach(w => { w.classList.add("on"); w.classList.remove("now"); }); });
  player.addEventListener("timeupdate", () => {
    if (!player.duration) return;
    const p = player.currentTime / player.duration;
    const tile = document.querySelector(`.lang-tile[data-lang="${playingCode}"]`);
    if (tile) { const ks = tile.querySelectorAll(".k"); const upto = Math.floor(Math.min(1, p * 1.12) * ks.length); ks.forEach((k, i) => k.classList.toggle("on", i < upto)); }
    barEls.forEach((b, i) => b.classList.toggle("on", i / barEls.length <= p && BOARD[current] && BOARD[current].c === playingCode));
  });
  player.addEventListener("pause", () => { if (playingCode) setPlayingUI(playingCode, false); });
  player.addEventListener("ended", () => { document.querySelectorAll(".k.on").forEach(k => k.classList.add("on")); barEls.forEach(b => b.classList.remove("on")); if (playingCode) setPlayingUI(playingCode, false); });
  player.addEventListener("play", () => { if (playingCode) setPlayingUI(playingCode, true); });

  $("#boardPlay").addEventListener("click", () => { stopCycle(); play(BOARD[current].c); });
  document.querySelector("[data-play-current]").addEventListener("click", () => {
    stopCycle(); play(BOARD[current].c);
    $("#board").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  });

  show(0); startCycle();
  const boardEl = $("#board");
  ["mouseenter", "focusin"].forEach(ev => boardEl.addEventListener(ev, stopCycle));
  ["mouseleave", "focusout"].forEach(ev => boardEl.addEventListener(ev, () => { if (player.paused) startCycle(); }));

  // language bench
  const grid = $("#benchGrid");
  LANGS.forEach(l => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "lang-tile"; b.dataset.lang = l.c; b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", `Play the ${l.name} greeting`);
    b.innerHTML = `<span class="lang-code"><span>${l.c[0].toUpperCase()}</span><span>${l.c[1].toUpperCase()}</span></span>
      <span class="lang-name">${l.native}</span><span class="lang-city">${l.city}</span>
      <span class="lang-text" lang="${l.c}">${l.text.split(" ").map(w => `<span class="k">${w}</span>`).join(" ")}</span>
      <span class="lang-play"><span class="play-ico" aria-hidden="true"></span>Listen</span>`;
    b.addEventListener("click", () => { stopCycle(); play(l.c); const bi = BOARD.findIndex(x => x.c === l.c); if (bi > -1) show(bi); });
    grid.appendChild(b);
  });

  // white-label studio
  const COLORS = ["#4C1E62", "#2E46F0", "#0F8A6A", "#7A3FE4", "#D61F69", "#14161C"];
  const CNAMES = ["Aubergine", "Blue", "Green", "Purple", "Pink", "Black"];
  const sw = $("#swatches"), app = $("#appWindow");
  COLORS.forEach((c, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "swatch"; b.style.background = c;
    b.setAttribute("aria-label", CNAMES[i]); b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    b.addEventListener("click", () => { sw.querySelectorAll(".swatch").forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); app.style.setProperty("--accent", c); });
    sw.appendChild(b);
  });
  app.style.setProperty("--accent", COLORS[0]);
  const nameIn = $("#agencyName");
  const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "") || "youragency";
  function brand() {
    const n = nameIn.value.trim() || "Your Agency";
    $("#appBrand").textContent = n; $("#appMark").textContent = n[0].toUpperCase();
    $("#appUrl").textContent = "app." + slug(n) + ".eu";
  }
  nameIn.addEventListener("input", brand); brand();

  // margin calculator
  const OUR = 0.15;
  const fmt = n => "€" + Math.round(n).toLocaleString("en-GB");
  const rC = $("#rClients"), rM = $("#rMinutes"), rP = $("#rPrice");
  function calc() {
    const c = +rC.value, m = +rM.value, p = +rP.value;
    $("#oClients").textContent = c; $("#oMinutes").textContent = m.toLocaleString("en-GB"); $("#oPrice").textContent = "€" + p.toFixed(2);
    const rev = c * m * p, cost = c * m * OUR;
    paintCalls(c * m);
    $("#cRevenue").textContent = fmt(rev); $("#cCost").textContent = fmt(cost); $("#cMargin").textContent = fmt(rev - cost);
  }
  // calls visual: one dot per 100 minutes, up to 200
  const cg = $("#callsGrid"), ct = $("#callsTotal");
  for (let i = 0; i < 200; i++) cg.appendChild(document.createElement("i"));
  const dotsEls = [...cg.children];
  function paintCalls(total) {
    const n = Math.min(200, Math.round(total / 100));
    dotsEls.forEach((d, i) => { d.classList.toggle("on", i < n); d.classList.toggle("edge", i === n - 1); });
    ct.textContent = total.toLocaleString("en-GB") + (total / 100 > 200 ? "+" : "");
  }
  [rC, rM, rP].forEach(r => r.addEventListener("input", calc)); calc();

  // signup placeholder (preview)
  document.querySelectorAll("[data-signup]").forEach(a => a.addEventListener("click", () => { const n = $("#signupNote"); if (n) { n.hidden = false; } }));

  // call card: the call plays as you scroll; the 10:30 slot flips to booked
  const feed = [...document.querySelectorAll(".cc-feed li")], ccTime = $("#ccTime"), calT = $("#calTarget"), hint = $("#ccHint");
  const bookedAt = feed.findIndex(li => li.classList.contains("cc-ok"));
  function setCall(n) {
    feed.forEach((li, i) => li.classList.toggle("show", i < n));
    const secs = Math.round(41 * n / feed.length);
    ccTime.textContent = "00:" + String(secs).padStart(2, "0");
    if (calT) calT.classList.toggle("is-booked", n > bookedAt);
    if (hint) hint.textContent = n >= feed.length ? "Call ended · 00:41" : n ? "Call in progress" : "Scroll to play the call";
  }
  if (feed.length) {
    if (reduce) setCall(feed.length);
    else {
      const ul = $(".cc-feed"); setCall(feed.length); ul.style.minHeight = ul.offsetHeight + "px"; setCall(0);
      const grid = $(".how-grid"); let last = -1;
      const onScroll = () => {
        const r = $(".callcard").getBoundingClientRect(), start = innerHeight * 0.55, end = -r.height * 0.25;
        const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
        const n = Math.min(feed.length, Math.floor(p * (feed.length + 1)));
        if (n !== last) { last = n; setCall(n); }
      };
      addEventListener("scroll", onScroll, { passive: true }); onScroll();
    }
  }

  // nav scroll-spy
  // v5 header menu + scrollspy removed: the site header has its own script
  // closer flaps
  const cf = $("#closerFlaps"); const word = "HALLO ALLÔ АЛО";
  word.split("").forEach(ch => { const s = document.createElement("span"); s.className = "cell"; s.textContent = ch === " " ? "" : ch; if (ch === " ") s.style.opacity = ".25"; cf.appendChild(s); });
})();
