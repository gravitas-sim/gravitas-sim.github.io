# Inventory of entry pages: shell markers, static links out, and links built in JS.
import os, re, json, glob
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
pages = sorted(p for p in glob.glob('**/index.html', recursive=True)
               if not p.startswith(('node_modules', 'spike', 'tests', 'e2e', 'dist', 'test-results', 'history')))
def route(p): return '/' + os.path.dirname(p) + ('/' if os.path.dirname(p) else '')
ROUTES = {route(p): p for p in pages}
def norm(href, base):
    href = href.split('#')[0].split('?')[0]
    if not href or href.startswith(('http', 'mailto:', 'data:', 'javascript:')): return None
    if href.startswith('/'): u = href
    else: u = os.path.normpath(os.path.join(os.path.dirname('/' + base), href)).replace('\\', '/')
    if not u.endswith('/') and not os.path.splitext(u)[1]: u += '/'
    if u.endswith('index.html'): u = u[:-10]
    return u if u in ROUTES else None
import subprocess
def closure(entry):
    r = subprocess.run(['node', '-e', f"import('./tools/source-closure.mjs').then(m=>{{const c=m.importClosure({{root:process.cwd(),entries:['{entry}']}});console.log(JSON.stringify(c.files))}})"], capture_output=True, text=True)
    try: return set(json.loads(r.stdout))
    except Exception: return {entry}
out = {}
for p in pages:
    html = open(p, encoding='utf8').read()
    links = {norm(h, p) for h in re.findall(r'href="([^"]+)"', html)}
    # modules the page loads, and route strings in their static closure's sources
    scripts = re.findall(r'<script[^>]+src="([^"]+)"', html) + re.findall(r"from '(/js/[^']+)'", html)
    js_links = set()
    files = set()
    for s in scripts:
        f = os.path.normpath(os.path.join(os.path.dirname(p), s)) if not s.startswith('/') else s.lstrip('/')
        if os.path.exists(f): files |= closure(f)
    for f in files:
            src = open(f, encoding='utf8').read()
            for r in ROUTES:
                if r != '/' and re.search(r"['\"`]" + re.escape(r) + r"[\"'`?#]|['\"`]\.\." + re.escape(r), src):
                    js_links.add(r)
    shell = []
    if 'doc-nav' in html: shell.append('doc-nav')
    if 'id="menuBtn"' in html or 'hamburger' in html.lower() or 'id="appMenu"' in html: shell.append('app-menu')
    if re.search(r'Back to Gravitas', html): shell.append('back-link')
    if re.search(r'langSwitch|data-lang|locale', html): shell.append('locale')
    if re.search(r'<footer', html): shell.append('footer')
    out[route(p)] = {'file': p, 'shell': shell, 'links': sorted(l for l in links if l and l != route(p)),
                     'jsLinks': sorted(js_links - {route(p)})}
inbound = {r: sorted(s for s, v in out.items() if r in v['links'] or r in v['jsLinks']) for r in ROUTES}
for r in out: out[r]['linkedFrom'] = inbound[r]
json.dump(out, open('spike/platform-shell/inventory.json', 'w'), indent=1)
for r, v in out.items():
    print(f"{r:24} shell={','.join(v['shell']) or '-':34} in={len(v['linkedFrom']):2} out={len(v['links'])}+{len(v['jsLinks'])}  from: {' '.join(v['linkedFrom'])}")
