"""KML download in the data catalog, tested with the real catalog-page.js, catalog-metadata.js, catalog-data.js and symbology.js and the real Leaflet."""
import os, sys, json, re, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *

R = []
def ok(name, cond, detail=''): R.append((name, bool(cond), str(detail)[:300]))
RAW = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/'
D = RAW + 'Data/EXD/'
def pt(x, y, **p): return {'type': 'Feature', 'properties': p, 'geometry': {'type': 'Point', 'coordinates': [x, y]}}
def fc(f): return json.dumps({'type': 'FeatureCollection', 'features': f})
BOUNDARY = fc([{'type': 'Feature', 'properties': {'MWS_ID': 'MWS_003', 'District': 'Kandy', 'MainDSD': 'Pathahewaheta'}, 'geometry': {'type': 'Polygon', 'coordinates': [[[80.5, 7.0], [80.7, 7.0], [80.7, 7.2], [80.5, 7.2], [80.5, 7.0]]]}}])
KML = lambda name: f'<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>{name}</name></Document></kml>'
GJ = fc([pt(80.6, 7.1, Name='a')])
rows = [
    ('Base', 'Land cover', 'Land cover', D + '04_LND/LND_LULC/LND_LULC_MWS_003.geojson', ''),
    ('Base', 'Hydrology', 'Stream network', D + '02/streams.geojson', ''),
    ('Base', 'Hydrology', 'Tanks (named kml)', D + '15/tanks.geojson', D + '15/kml/Tanks_special.kml'),
    ('Base', 'Hydrology', 'Canals (relative kml)', D + '15/canals.geojson', 'Canals_custom.kml'),
    ('Base', 'Hydrology', 'Command areas (kml missing)', D + '15/command.geojson', D + '15/kml/missing.kml'),
    ('Base', 'Demography', 'Population', D + '07/pop.csv', ''),
    ('Base', 'Hydrology', 'Blob link layer', 'https://github.com/MWS003-GIS/MWS003-GIS.github.io/blob/main/IWWRMP/Data/EXD/03/blob.geojson', ''),
    ('Base', 'Hydrology', 'Web page instead of kml', D + '04/webpage.geojson', ''),
    ('Base', 'Hydrology', 'Blocked convention', D + '05/blocked.geojson', ''),
    ('Base', 'Hydrology', 'Blocked named', D + '05/blocked2.geojson', D + '05/blocked2.kml'),
    ('Base', 'Hydrology', 'Slow answer', D + '06/slow.geojson', ''),
    ('Base', 'Hydrology', 'Quick answer', D + '06/quick.geojson', ''),
    ('Base', 'Hydrology', 'Upper case extension', D + '08/UPPER.GEOJSON', ''),
    ('Base', 'Hydrology', 'Query string', D + '09/query.geojson?v=2', ''),
    ('Base', 'Hydrology', 'Removed after check', D + '10/gone.geojson', ''),
]
REGISTRY = '\ufeffGroup,Database,Layer,geojson,Provider,KML\r\n' + ''.join(f'{g},{d},{l},{u},Survey Department,{k}\r\n' for g, d, l, u, k in rows)
REGISTRY_NO_KML_COLUMN = '\ufeffGroup,Database,Layer,geojson,Provider\r\n' + ''.join(f'{g},{d},{l},{u},Survey Department\r\n' for g, d, l, u, k in rows[:2])
EXISTS = {   # kml address -> (status, content-type, body, delay_seconds)
    D + '04_LND/LND_LULC/LND_LULC_MWS_003.kml': (200, 'text/plain; charset=utf-8', KML('Land cover'), 0),
    D + '15/kml/Tanks_special.kml': (200, 'text/plain; charset=utf-8', KML('Tanks'), 0),
    D + '15/Canals_custom.kml': (200, 'text/plain; charset=utf-8', KML('Canals'), 0),
    D + '03/blob.kml': (200, 'text/plain; charset=utf-8', KML('Blob'), 0),
    D + '04/webpage.kml': (200, 'text/html; charset=utf-8', '<html>Not a kml</html>', 0),
    D + '06/slow.kml': (200, 'text/plain', KML('Slow'), 0.9),
    D + '06/quick.kml': (200, 'text/plain', KML('Quick'), 0),
    D + '08/UPPER.kml': (200, 'text/plain', KML('Upper'), 0),
    D + '09/query.kml': (200, 'text/plain', KML('Query'), 0),
    D + '10/gone.kml': (200, 'text/plain', KML('Gone'), 0),
}
def fixtures(registry=REGISTRY):
    fx = {RAW + 'Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson': (200, 'application/json', BOUNDARY), RAW + 'Registry/DBMS_003.csv': (200, 'text/csv', registry),
          D + '07/pop.csv': (200, 'text/csv', 'a,b\r\n1,2\r\n')}
    for u in {r[3].split('?')[0] for r in rows if r[3].lower().endswith(('.geojson', '.geojson?v=2')) or '.geojson' in r[3].lower()}:
        fx[re.sub(r'\.geojson$', '.geojson', u, flags=re.I)] = (200, 'application/json', GJ)
    fx[D + '03/blob.geojson'] = (200, 'application/json', GJ)
    return fx

def open_page(browser, base, kml=None, registry=REGISTRY, hooks=None):
    kml = EXISTS if kml is None else kml
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, accept_downloads=True)
    ctx.add_init_script("window.__alerts=[]; window.alert=function(m){window.__alerts.push(String(m));};")
    rec = {'errors': [], 'head': {}, 'get': {}, 'aborted': set()}
    fx = fixtures(registry)
    def handler(route):
        req = route.request; url = req.url; path = url.split('?')[0]
        if url.startswith(base):
            name = url[len(base) + 1:].split('?')[0]
            if name.endswith(('.js', '.css', '.png')) or '/' in name: return route.continue_()
            return route.continue_()
        if req.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS, body='')
        if cdn(route, url): return
        if 'tile.openstreetmap' in url or 'arcgisonline' in url: return route.fulfill(status=204, body='')
        if url.startswith(RAW):
            low = path.lower()
            if low.endswith('.kml'):
                kml_key = next((k for k in kml if k.lower() == path.lower()), None)
                bucket = rec['head'] if req.method == 'HEAD' else rec['get']; bucket[path] = bucket.get(path, 0) + 1
                if path in rec['aborted_urls']: return route.abort()
                if hooks and path in hooks and hooks[path](req.method, route): return
                if kml_key is None: return route.fulfill(status=404, headers=CORS, body='not found')
                st, ct, body, delay = kml[kml_key]
                if delay and req.method == 'HEAD': time.sleep(delay)
                return route.fulfill(status=st, headers={**CORS, 'Content-Type': ct}, body=('' if req.method == 'HEAD' else body))
            key = path
            if key in fx: st, ct, body = fx[key]; return route.fulfill(status=st, headers={**CORS, 'Content-Type': ct}, body=body)
            for k, (st, ct, body) in fx.items():
                if k.lower() == key.lower(): return route.fulfill(status=st, headers={**CORS, 'Content-Type': ct}, body=body)
            return route.fulfill(status=404, headers=CORS, body='nf')
        return route.fulfill(status=404, body='')
    rec['aborted_urls'] = {D + '05/blocked.kml', D + '05/blocked2.kml'}
    ctx.route('**/*', handler)
    page = ctx.new_page(); page.set_default_timeout(15000)
    page.on('pageerror', lambda e: rec['errors'].append(str(e).split('\n')[0]))
    page.goto(f'{base}/MWSDataCatalog.html', wait_until='load')
    page.wait_for_function("document.querySelectorAll('#catalogDistSelect option').length > 1")
    page.select_option('#catalogDistSelect', 'Kandy'); page.wait_for_timeout(100)
    page.select_option('#catalogDsdSelect', 'Pathahewaheta'); page.wait_for_timeout(100)
    page.select_option('#catalogMwsSelect', 'MWS_003'); page.wait_for_function("document.querySelectorAll('#tree-scroll .layer-button').length > 0")
    return page, rec, ctx

def pick(page, name, wait=500):
    page.evaluate("n=>{document.querySelectorAll('#tree-scroll .tree-head').forEach(h=>{h.setAttribute('aria-expanded','true'); const b=h.nextElementSibling; if(b) b.hidden=false;}); [...document.querySelectorAll('#tree-scroll .layer-button')].find(b=>b.querySelector('.lname').textContent===n).click();}", name)
    page.wait_for_timeout(wait)
def buttons(page): return page.evaluate("[...document.querySelectorAll('#right-panel-content .meta-actions button')].filter(b=>b.offsetParent!==null).map(b=>b.textContent.trim())")
def kml_visible(page): return page.evaluate("(()=>{const b=document.getElementById('download-kml-button'); return !!b && b.offsetParent!==null})()")
def kml_exists_in_dom(page): return page.evaluate("!!document.getElementById('download-kml-button')")

srv, base = serve()
with sync_playwright() as p:
    b = launch(p)
    page, rec, ctx = open_page(b, base)
    ok('the real catalog scripts load and the layer list shows 15 layers, no script error', not rec['errors'] and page.evaluate("document.querySelectorAll('#tree-scroll .layer-button').length") == 15, rec['errors'])

    # ---------- KML next to the GeoJSON (same name) ----------
    pick(page, 'Land cover')
    ok('a GeoJSON layer whose KML exists next to it (same name): buttons are "Download GeoJSON", "Download KML", "Copy link", in that order', buttons(page) == ['Download GeoJSON', 'Download KML', 'Copy link'], buttons(page))
    ok('the KML button has the same look as Download (btn--primary) and a tooltip', 'btn--primary' in page.evaluate("document.getElementById('download-kml-button').className") and 'Google Earth' in page.evaluate("document.getElementById('download-kml-button').title"))
    with page.expect_download() as dl: page.click('#download-kml-button')
    dld = dl.value; path = dld.path(); text = open(path, encoding='utf-8').read()
    ok('pressing it saves the KML file that was made separately: named LND_LULC_MWS_003.kml, content exactly as published', dld.suggested_filename == 'LND_LULC_MWS_003.kml' and text == KML('Land cover'), dld.suggested_filename)
    with page.expect_download() as dl2: page.click('#download-button')
    ok('"Download GeoJSON" is unchanged: it saves LND_LULC_MWS_003.geojson', dl2.value.suggested_filename == 'LND_LULC_MWS_003.geojson', dl2.value.suggested_filename)
    ok('the KML check was a single HEAD request (no data downloaded just to look); the map preview still loaded', rec['head'].get(D + '04_LND/LND_LULC/LND_LULC_MWS_003.kml') == 1 and page.evaluate("document.querySelector('#preview-bar').innerText").find('feature') != -1, rec['head'])
    ok('the KML address is not listed under "More details" (no "Kml" row) and the Source facts are unchanged', 'Kml' not in page.evaluate("document.getElementById('right-panel-content').innerText") and 'Survey Department' in page.evaluate("document.getElementById('right-panel-content').innerText"))
    pick(page, 'Land cover'); ok('choosing the same layer again does not ask again (answer remembered): still one HEAD request, button shown', rec['head'].get(D + '04_LND/LND_LULC/LND_LULC_MWS_003.kml') == 1 and kml_visible(page), rec['head'])

    # ---------- no KML yet ----------
    pick(page, 'Stream network')
    ok('a GeoJSON layer with no KML file yet (404): no KML button is shown, the rest unchanged', not kml_visible(page) and buttons(page) == ['Download GeoJSON', 'Copy link'], buttons(page))
    ok('...and no script error and no alert', not rec['errors'] and page.evaluate("window.__alerts.length") == 0)

    # ---------- the registry names the KML ----------
    pick(page, 'Tanks (named kml)'); ok('registry column "KML" with a full address: that file is used (a different folder and name)', kml_visible(page))
    with page.expect_download() as dl3: page.click('#download-kml-button')
    ok('...and it downloads as Tanks_special.kml', dl3.value.suggested_filename == 'Tanks_special.kml', dl3.value.suggested_filename)
    ok('...and the registry\'s KML column is not repeated under "More details"', 'Special' not in page.evaluate("document.getElementById('right-panel-content').innerText") and 'kml/Tanks' not in page.evaluate("[...document.querySelectorAll('#right-panel-content .meta-more')].map(e=>e.innerText).join(' ')"))
    pick(page, 'Canals (relative kml)')
    ok('registry column with just a file name (Canals_custom.kml): it is looked for in the same folder as the GeoJSON', kml_visible(page) and rec['head'].get(D + '15/Canals_custom.kml') == 1, rec['head'])
    pick(page, 'Command areas (kml missing)'); ok('registry names a KML file that is not there (404): the button stays hidden, no message', not kml_visible(page) and page.evaluate("window.__alerts.length") == 0)

    # ---------- other kinds of files and addresses ----------
    pick(page, 'Population'); ok('a CSV layer has no KML button in the page at all', not kml_exists_in_dom(page) and buttons(page) == ['Download CSV', 'Copy link'], buttons(page))
    pick(page, 'Blob link layer'); ok('a registry address that is a GitHub web link (/blob/): the KML is looked for at the matching raw address and found', kml_visible(page) and rec['head'].get(D + '03/blob.kml') == 1, rec['head'])
    pick(page, 'Web page instead of kml'); ok('an address that answers with a web page (text/html) instead of a file is not a KML: button hidden', not kml_visible(page))
    pick(page, 'Upper case extension'); ok('a GeoJSON written .GEOJSON in the registry: the KML (.kml) is found', kml_visible(page), rec['head'])
    pick(page, 'Query string'); ok('a registry address ending .geojson?v=2: the query string is ignored when looking for the KML', kml_visible(page), rec['head'])

    # ---------- the network blocks the check ----------
    pick(page, 'Blocked convention'); ok('the check cannot be made (blocked, no answer) and the registry did NOT name a KML: button hidden (nothing promised)', not kml_visible(page))
    pick(page, 'Blocked named'); ok('the check cannot be made but the registry DID name the KML: the button is shown (the registry is trusted)', kml_visible(page))
    pick(page, 'Blocked convention'); n1 = rec['head'].get(D + '05/blocked.kml', 0)
    ok('an unanswered check is not remembered: the layer is checked again when chosen again', n1 >= 2, rec['head'])

    # ---------- quick switching ----------
    pick(page, 'Slow answer', wait=100); pick(page, 'Quick answer', wait=1500)
    ok('choosing a layer whose check is slow and then another quickly: the slow answer does not change the new layer\'s button (shown for Quick answer, no error)', kml_visible(page) and page.evaluate("document.querySelector('#right-panel-content .meta-title').textContent") == 'Quick answer' and not rec['errors'])
    with page.expect_download() as dl4: page.click('#download-kml-button')
    ok('...and its button downloads Quick answer\'s own file (quick.kml), not the slow one', dl4.value.suggested_filename == 'quick.kml', dl4.value.suggested_filename)
    pick(page, 'Slow answer', wait=1500); ok('the slow layer shows its button once its answer arrives, while it is still the chosen layer', kml_visible(page))

    # ---------- the file disappears after the check ----------
    pick(page, 'Removed after check'); ok('(setup) button shown for a KML that exists', kml_visible(page))
    page.context.unroute('**/*')
    ctx.close()
    def gone_after_check(method, route):
        # the check (HEAD) still finds the file; by the time of the download (GET) it has been removed
        if method == 'GET':
            route.fulfill(status=404, headers=CORS, body='gone')
            return True
        return False
    page, rec, ctx = open_page(b, base, hooks={D + '10/gone.kml': gone_after_check})
    pick(page, 'Removed after check'); page.wait_for_timeout(200)
    if kml_visible(page):
        page.click('#download-kml-button'); page.wait_for_function("window.__alerts.length > 0", timeout=8000); msg = page.evaluate("window.__alerts.pop()")
        ok('the KML disappears between the check and the click (404 on download): the existing download message is shown ("Download failed ... 404"), no script error', 'Download failed' in msg and '404' in msg and not rec['errors'], msg)
    else:
        ok('the KML disappears between the check and the click', False, 'button not shown')
    ctx.close()

    # ---------- registry without a KML column ----------
    page, rec, ctx = open_page(b, base, registry=REGISTRY_NO_KML_COLUMN)
    pick(page, 'Land cover'); ok('a registry with no KML column at all (the normal case today): KML found next to the GeoJSON by name', kml_visible(page) and not rec['errors'])
    pick(page, 'Stream network'); ok('...and a layer without a KML shows no button', not kml_visible(page))
    ctx.close()

    # ---------- the helper on its own ----------
    page, rec, ctx = open_page(b, base)
    cases = page.evaluate("""(()=>{const f=(file,url)=>CatalogMeta.kmlSourceOf(file,url,fileFormat(url)); const g='https://x/y/Layer_001.geojson';
        return [f({}, g), f({kml:'a.kml'}, g), f({KML:'https://z/q.kml'}, g), f({kml_url:'./sub/b.kml'}, g), f({'Download KML':'c.kml'}, g), f({kml:'  '}, g), f({kml:'n/a'}, g), f({kml:'undefined'}, g), f({kml:'a.kml'}, 'https://x/y/file.csv'), f({}, ''), f({}, 'https://x/y/Layer.GeoJSON?x=1#t'), f({}, 'https://x/y/noext')]})()""")
    ok('kmlSourceOf: same name; column "kml" relative to the GeoJSON folder; "KML" full address; kml_url with ./ ; "Download KML"', cases[0] == {'url': 'https://x/y/Layer_001.kml', 'explicit': False} and cases[1] == {'url': 'https://x/y/a.kml', 'explicit': True} and cases[2] == {'url': 'https://z/q.kml', 'explicit': True} and cases[3] == {'url': 'https://x/y/sub/b.kml', 'explicit': True} and cases[4] == {'url': 'https://x/y/c.kml', 'explicit': True}, cases[:5])
    ok('kmlSourceOf: an empty, "n/a" or "undefined" KML cell falls back to the same-name rule; CSV, no file and no extension give none; query string and capital letters handled', cases[5] == cases[6] == cases[7] == {'url': 'https://x/y/Layer_001.kml', 'explicit': False} and cases[8] is None and cases[9] is None and cases[10] == {'url': 'https://x/y/Layer.kml', 'explicit': False} and cases[11] is None, cases[5:])
    ctx.close()
    b.close()
srv.shutdown()
bad = [r for r in R if not r[1]]
for n, o, d in R: print(('PASS ' if o else 'FAIL ') + n + ('' if o else '   -> ' + d))
print(f'\n{len(R) - len(bad)} / {len(R)} passed')
