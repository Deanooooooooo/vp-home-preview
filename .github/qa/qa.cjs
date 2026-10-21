// Site QA on GitHub's runner (never on the Mac mini). Screenshots + interaction checks for every page in site/.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const base = 'http://127.0.0.1:8080/';
const pages = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'index.html') pages.push(path.relative('site', path.dirname(p)).replace(/\\/g, '/')); } })('site');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const out = []; let fails = 0;
  const ok = (n, v, d = '') => { out.push(`${v ? 'PASS' : 'FAIL'} ${n} ${d}`); if (!v) fails++; };
  fs.mkdirSync('shots', { recursive: true });
  for (const pg0 of pages.sort()) {
    const pg = pg0 === '' ? '' : pg0 + '/'; const tag = pg0.replace(/\//g, '_') || 'home';
    for (const [w, h, n] of [[1440, 900, 'd'], [390, 844, 'm']]) {
      const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce', isMobile: n === 'm', hasTouch: n === 'm' });
      const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/fonts/.test(m.text()) && errs.push(m.text()));
      p.on('requestfailed', r => !/fonts\.g/.test(r.url()) && errs.push('FAIL ' + r.url()));
      await p.goto(base + pg, { waitUntil: 'load' }); await p.waitForTimeout(700);
      await p.screenshot({ path: `shots/${tag}-${n}.png`, fullPage: true });
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(`/${pg} ${n} no overflow`, ov <= 0, ov); ok(`/${pg} ${n} no errors`, !errs.length, JSON.stringify(errs));
      ok(`/${pg} ${n} one h1`, (await p.$$('h1')).length === 1);
      if (n === 'm') {
        await p.tap('.burger'); await p.waitForTimeout(300);
        ok(`/${pg} menu opens`, await p.evaluate(() => document.body.classList.contains('menu-open')));
      } else {
        if (await p.$('#minRange')) { await p.$eval('#minRange', el => { el.value = 1000; el.dispatchEvent(new Event('input')); }); { const v = await p.textContent('#total'); ok(`/${pg} slider`, v === '€150.00' || v === '150,00 €' || v === '€ 150,00', v); } }
        if (await p.$('#aClientsR')) { { const v = await p.textContent('#aMargin'); ok(`/${pg} agency calc default`, v === '€1,200' || v === '1.200 €' || v === '€ 1.200' || v === '1\u202f200 €', v); } }
        if (await p.$('details')) { const was = await p.$eval('details', d => d.open); await p.click('details summary'); ok(`/${pg} faq toggles`, (await p.$eval('details', d => d.open)) !== was); }
        const links = await p.$$eval('a[href]', as => [...new Set(as.map(a => a.href).filter(h => h.startsWith('http://127.0.0.1') && !h.includes('#')))]);
        for (const l of links) { const r = await p.request.get(l); if (r.status() !== 200) ok(`/${pg} link ${l}`, false, r.status()); }
      }
      await p.close();
    }
  }
  // silent call animation on one page with normal motion
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(base + 'ai-receptionist/dental/', { waitUntil: 'load' }); await p.$eval('#call', el => el.scrollIntoView({ block: 'center' })); await p.waitForTimeout(1500);
  const mid = await p.$$eval('#talk li.shown', l => l.length); await p.waitForTimeout(24000); const end = await p.$$eval('#talk li.shown', l => l.length);
  ok('dental silent call plays and completes', mid < 7 && end === 7, `mid ${mid} end ${end}`);
  // German audio calls play on every page that has one
  for (const pg of pages.filter(x => x.startsWith('de') || x.startsWith('nl') || x.startsWith('fr'))) {
    const q = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await q.goto(base + pg + '/', { waitUntil: 'load' });
    if (await q.$('#call[data-audio]')) {
      await q.click('.hero [data-play-call]'); await q.waitForTimeout(5000);
      const st = await q.evaluate(() => { const a = document.querySelector('#player'); return [a.paused, a.currentTime, a.error && a.error.code]; });
      ok(`/${pg}/ audio plays`, !st[0] && st[1] > 1, JSON.stringify(st));
    }
    await q.close();
  }
  await b.close();
  fs.writeFileSync('qa.log', out.join('\n') + `\n\nfails: ${fails} of ${out.length}\n`); console.log(out.join('\n'), '\nfails', fails);
})();
