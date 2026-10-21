"""Internal link audit on dist/: contextual (main body) inbound/outbound per page. Exit 1 if targets fail."""
import re,glob,os,collections,sys,json
D=sys.argv[1] if len(sys.argv)>1 else 'site'
LEGAL=re.compile(r'^/(404|ai-instructions|privacy|terms|dpa|legal/imprint|de/(agb|avv|datenschutz|impressum)|nl/(algemene-voorwaarden|bedrijfsgegevens|privacyverklaring|verwerkersovereenkomst)|fr/(conditions-generales|confidentialite|mentions-legales|sous-traitance))/$')
PILLAR={'/','/ai-receptionist/','/pricing/','/de/','/de/preise/','/de/ki-telefonassistent/','/nl/','/nl/prijzen/','/nl/ai-telefoonassistent/','/fr/','/fr/tarifs/','/fr/agent-vocal-ia/'}
pages={}
for f in glob.glob(D+'/**/index.html',recursive=True):
    u='/'+os.path.relpath(os.path.dirname(f),D).replace('.','')+'/'; u=u.replace('//','/'); pages[u]=open(f).read()
inb=collections.Counter(); out={}; dup=[]; cross=[]
lang=lambda u:(re.match(r'^/(de|nl|fr)/',u) or [0,'en'])[1] if re.match(r'^/(de|nl|fr)/',u) else 'en'
for u,t in pages.items():
    m=re.search(r'</header>(.*)<footer',t,re.S); body=m.group(1) if m else ''
    body=re.sub(r'<nav class="crumbs".*?</nav>','',body,flags=re.S)
    tg=[]
    for l in re.findall(r'<a [^>]*href="([^"#?]+)',body):
        if re.match(r'(https?:|mailto:|tel:)',l): continue
        p=os.path.normpath(os.path.join(u,l)).rstrip('/')+'/'
        p='/' if p in('//','/./') else p
        if p in pages and p!=u: tg.append(p)
    c=collections.Counter(tg); dup+= [(u,k) for k,v in c.items() if v>1]
    out[u]=set(tg)
    for p in set(tg):
        if u in ('/ai-instructions/','/404/'): continue
        inb[p]+=1
        if lang(p)!=lang(u): cross.append((u,p))
fails=[]
rows=[]
for u in sorted(pages):
    if LEGAL.match(u): continue
    need=6 if u in PILLAR else 3
    ok=inb[u]>=need and len(out[u])>=2
    rows.append((u,inb[u],len(out[u]),need,ok))
    if not ok: fails.append(u)
for r in rows: print(f"{'OK ' if r[4] else 'LOW'} in {r[1]:2d}/{r[3]}  out {r[2]:2d}  {r[0]}")
print('content pages',len(rows),'fail',len(fails),'dup',len(dup),'cross-lang',len(cross))
sys.exit(1 if fails else 0)
