"""Data catalog on the REAL MWSDataCatalog.html (real CSS and scripts, real Leaflet): the KML download button and the unchanged catalog features."""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *
R = []
def ok(name, cond, detail=''): R.append((name, bool(cond), str(detail)[:300]))
import atexit
def _report():
    bad = [r for r in R if not r[1]]
    for n, o, d in R: print(('PASS ' if o else 'FAIL ') + n + ('' if o else '   -> ' + d))
    print(f'\n{len(R) - len(bad)} / {len(R)} passed')
atexit.register(_report)
D = EXD
BOUNDARY = fc([{'type': 'Feature', 'properties': {'MWS_ID': 'MWS_003', 'District': 'Kandy', 'MainDSD': 'Pathahewaheta'}, 'geometry': {'type': 'Polygon', 'coordinates': [[[80.5, 7.0], [80.7, 7.0], [80.7, 7.2], [80.5, 7.2], [80.5, 7.0]]]}}])
KML = lambda n: f'<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>{n}</name></Document></kml>'
GJ = fc([pt(80.6, 7.1, Name='a')])
rows = [('Base', 'Land cover', 'Land cover', D + '04/LND_LULC_MWS_003.geojson', '', '2019-05-01'), ('Base', 'Hydrology', 'Stream network', D + '02/streams.geojson', '', ''),
        ('Base', 'Hydrology', 'Tanks named', D + '15/tanks.geojson', D + '15/kml/Tanks_special.kml', ''), ('Base', 'Hydrology', 'Canals relative', D + '15/canals.geojson', 'Canals_custom.kml', ''),
        ('Base', 'Hydrology', 'Command missing', D + '15/command.geojson', D + '15/kml/missing.kml', ''), ('Base', 'Demography', 'Population table', D + '07/pop.csv', '', ''),
        ('Base', 'Hydrology', 'Blob link', 'https://github.com/MWS003-GIS/MWS003-GIS.github.io/blob/main/IWWRMP/Data/EXD/03/blob.geojson', '', ''), ('Base', 'Hydrology', 'Web page not kml', D + '04/webpage.geojson', '', ''),
        ('Base', 'Hydrology', 'Blocked convention', D + '05/blocked.geojson', '', ''), ('Base', 'Hydrology', 'Blocked named', D + '05/blocked2.geojson', D + '05/blocked2.kml', ''),
        ('Base', 'Hydrology', 'Slow answer', D + '06/slow.geojson', '', ''), ('Base', 'Hydrology', 'Quick answer', D + '06/quick.geojson', '', ''), ('Base', 'Hydrology', 'Vanishing', D + '10/gone.geojson', '', ''),
        ('Base', 'Hydrology', 'Upper case', D + '08/UPPER.GEOJSON', '', '')]
REG = '\ufeffGroup,Database,Layer,geojson,KML,Date,Provider,Contact.Name\r\n' + ''.join(f'{g},{d},{l},{u},{k},{dt},Survey Department,Mr Secret\r\n' for g, d, l, u, k, dt in rows)
REG_NO_COL = '\ufeffGroup,Database,Layer,geojson,Provider\r\n' + ''.join(f'{g},{d},{l},{u},Survey Department\r\n' for g, d, l, u, k, dt in rows[:2])
KMLS = {D + '04/LND_LULC_MWS_003.kml': 0, D + '15/kml/Tanks_special.kml': 0, D + '15/Canals_custom.kml': 0, D + '03/blob.kml': 0, D + '06/slow.kml': 0.9, D + '06/quick.kml': 0, D + '08/UPPER.kml': 0, D + '10/gone.kml': 0}
def fixtures(reg):
    fx = {RAW + 'IWWRMP/Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson': (200, 'application/json', BOUNDARY), RAW + 'IWWRMP/Registry/DBMS_003.csv': (200, 'text/csv', reg), D + '07/pop.csv': (200, 'text/csv', 'a,b\r\n1,2\r\n')}
    for g in ('04/LND_LULC_MWS_003', '02/streams', '15/tanks', '15/canals', '15/command', '03/blob', '04/webpage', '05/blocked', '05/blocked2', '06/slow', '06/quick', '10/gone', '08/UPPER'):
        fx[D + g + '.geojson'] = (200, 'application/json', fc([poly(80.6, 7.0, classLULC='Tea', Area_Ha=10.5, Note=None), poly(80.65, 7.02, classLULC='Paddy', Area_Ha=5.25, Note='x')]) if 'LND' in g else GJ)
    fx[D + '08/UPPER.GEOJSON'] = fx[D + '08/UPPER.geojson']
    return fx
def open_catalog(browser, base, reg=REG, hooks=None):
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, accept_downloads=True); ctx.add_init_script("window.__alerts=[]; window.alert=function(m){window.__alerts.push(String(m));};")
    rec = {'errors': [], 'head': {}}; fx = fixtures(reg)
    def handler(route):
        req = route.request; url = req.url; path = url.split('?')[0]
        if url.startswith(base): return route.continue_()
        if req.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS, body='')
        if cdn(route, url): return
        if url.startswith(RAW.rstrip('/')) or url.startswith(RAW):
            if path.lower().endswith('.kml'):
                if req.method == 'HEAD': rec['head'][path] = rec['head'].get(path, 0) + 1
                if path in (D + '05/blocked.kml', D + '05/blocked2.kml'): return route.abort()
                if hooks and path in hooks and hooks[path](req.method, route): return
                key = next((k for k in KMLS if k.lower() == path.lower()), None)
                if key is None: return route.fulfill(status=404, headers=CORS, body='not found')
                if KMLS[key] and req.method == 'HEAD': time.sleep(KMLS[key])
                ct = 'text/html; charset=utf-8' if 'webpage' in path else 'text/plain; charset=utf-8'
                return route.fulfill(status=200, headers={**CORS, 'Content-Type': ct}, body='' if req.method == 'HEAD' else KML(key.split('/')[-1]))
            k = next((k for k in fx if k.lower() == path.lower()), None)
            if k: st, ct, body = fx[k]; return route.fulfill(status=st, headers={**CORS, 'Content-Type': ct}, body=body)
            if '04/webpage.kml' in path: return route.fulfill(status=200, headers={**CORS, 'Content-Type': 'text/html'}, body='<html>no</html>')
            return route.fulfill(status=404, headers=CORS, body='nf')
        return route.fulfill(status=404, body='')
    ctx.route('**/*', handler); page = ctx.new_page(); page.set_default_timeout(15000)
    page.on('pageerror', lambda e: rec['errors'].append(str(e).split('\n')[0]))
    page.goto(base + '/MWSDataCatalog.html', wait_until='load'); page.wait_for_function("document.querySelectorAll('#catalogDistSelect option').length > 1")
    page.select_option('#catalogDistSelect', 'Kandy'); page.wait_for_timeout(100); page.select_option('#catalogDsdSelect', 'Pathahewaheta'); page.wait_for_timeout(100); page.select_option('#catalogMwsSelect', 'MWS_003')
    page.wait_for_function("document.querySelectorAll('#tree-scroll .layer-button').length > 0", timeout=10000); return page, rec, ctx
def pick(page, name, wait=600):
    page.evaluate("n=>{document.querySelectorAll('#tree-scroll .tree-head').forEach(h=>{h.setAttribute('aria-expanded','true'); const b=h.nextElementSibling; if(b) b.hidden=false;}); [...document.querySelectorAll('#tree-scroll .layer-button')].find(b=>b.querySelector('.lname').textContent===n).click();}", name); page.wait_for_timeout(wait)
def btns(page): return page.evaluate("[...document.querySelectorAll('#right-panel-content .meta-actions button')].filter(b=>b.offsetParent!==null).map(b=>b.textContent.trim())")
def kml_visible(page): return page.evaluate("(()=>{const b=document.getElementById('download-kml-button'); return !!b && b.offsetParent!==null})()")
def txt(page, sel): return page.evaluate("s=>document.querySelector(s)?document.querySelector(s).innerText.replace(/\\s+/g,' ').trim():null", sel)
srv, base = serve()
with sync_playwright() as p:
    b = launch(p); page, rec, ctx = open_catalog(b, base)
    ok('the real catalog page loads, lists the 14 layers, no script error', not rec['errors'] and page.evaluate("document.querySelectorAll('#tree-scroll .layer-button').length") == 14, rec['errors'])
    pick(page, 'Land cover')
    ok('a GeoJSON layer whose KML exists next to it (same name): buttons Download GeoJSON, Download KML, Copy link in that order; the KML button has the same look as Download', btns(page) == ['Download GeoJSON', 'Download KML', 'Copy link'] and 'btn--primary' in page.evaluate("document.getElementById('download-kml-button').className") and 'Google Earth' in page.evaluate("document.getElementById('download-kml-button').title"), btns(page))
    with page.expect_download() as dl: page.click('#download-kml-button')
    ok('it saves the separately made KML file, named LND_LULC_MWS_003.kml, content as published', dl.value.suggested_filename == 'LND_LULC_MWS_003.kml' and open(dl.value.path(), encoding='utf-8').read() == KML('LND_LULC_MWS_003.kml'), dl.value.suggested_filename)
    with page.expect_download() as dl2: page.click('#download-button')
    ok('Download GeoJSON is unchanged: it saves LND_LULC_MWS_003.geojson', dl2.value.suggested_filename == 'LND_LULC_MWS_003.geojson')
    ok('the KML check is one HEAD request, remembered when the layer is chosen again', rec['head'].get(D + '04/LND_LULC_MWS_003.kml') == 1 and (pick(page, 'Land cover') or True) and rec['head'].get(D + '04/LND_LULC_MWS_003.kml') == 1 and kml_visible(page), rec['head'])
    ok('the KML address is not listed under "More details"; Contact fields stay hidden (Mr Secret)', 'Kml' not in txt(page, '#right-panel-content') and 'Mr Secret' not in txt(page, '#right-panel-content'))
    pick(page, 'Stream network'); ok('no KML file yet (404): no KML button, the rest unchanged, no message', not kml_visible(page) and btns(page) == ['Download GeoJSON', 'Copy link'] and not page.evaluate("window.__alerts"))
    pick(page, 'Tanks named'); ok('registry column KML with a full address: that file is used', kml_visible(page))
    with page.expect_download() as dl3: page.click('#download-kml-button')
    ok('...downloads as Tanks_special.kml', dl3.value.suggested_filename == 'Tanks_special.kml')
    pick(page, 'Canals relative'); ok('registry column with just a file name: looked for in the same folder as the GeoJSON', kml_visible(page) and rec['head'].get(D + '15/Canals_custom.kml') == 1)
    pick(page, 'Command missing'); ok('registry names a KML file that is not there: button stays hidden', not kml_visible(page))
    pick(page, 'Population table'); ok('a CSV layer has no KML button at all', not page.evaluate("!!document.getElementById('download-kml-button')") and btns(page) == ['Download CSV', 'Copy link'], btns(page))
    pick(page, 'Blob link'); ok('a registry address that is a GitHub web link (/blob/): the KML is found at the matching raw address', kml_visible(page))
    pick(page, 'Web page not kml'); ok('an address that answers with a web page is not a KML: button hidden', not kml_visible(page))
    pick(page, 'Upper case'); ok('a .GEOJSON address: the .kml is found', kml_visible(page))
    pick(page, 'Blocked convention'); ok('check cannot be made and the registry did not name a KML: hidden', not kml_visible(page)); pick(page, 'Blocked named'); ok('check cannot be made but the registry named it: shown', kml_visible(page))
    pick(page, 'Slow answer', wait=100); pick(page, 'Quick answer', wait=1500)
    ok('slow check then another layer quickly: the slow answer does not change the new layer\'s button; it downloads quick.kml', kml_visible(page) and txt(page, '#right-panel-content .meta-title') == 'Quick answer')
    with page.expect_download() as dl4: page.click('#download-kml-button')
    ok('...its own file', dl4.value.suggested_filename == 'quick.kml', dl4.value.suggested_filename); ctx.close()
    def gone(method, route):
        if method == 'GET': route.fulfill(status=404, headers=CORS, body='gone'); return True
        return False
    page, rec, ctx = open_catalog(b, base, hooks={D + '10/gone.kml': gone}); pick(page, 'Vanishing'); page.click('#download-kml-button'); page.wait_for_function("window.__alerts.length > 0", timeout=8000); msg = page.evaluate("window.__alerts.pop()")
    ok('the KML disappears between the check and the click: the existing "Download failed ... 404" message, no script error', 'Download failed' in msg and '404' in msg and not rec['errors'], msg); ctx.close()
    page, rec, ctx = open_catalog(b, base, reg=REG_NO_COL); pick(page, 'Land cover'); ok('a registry with no KML column at all (today\'s registries): the KML next to the GeoJSON is found by name', kml_visible(page) and not rec['errors']); ctx.close()
    # unchanged catalog features
    page, rec, ctx = open_catalog(b, base); topics = page.evaluate("[...document.querySelectorAll('#tree-scroll > .tree-topic > .tree-head')].map(h=>[h.querySelector('.label').textContent, h.querySelector('.count').textContent])")
    ok('unchanged: the layer list groups the layers by topic with their counts', topics == [['Base', '14']], topics)
    page.fill('#layer-search', 'land'); page.wait_for_timeout(100)
    ok('unchanged: search "land" keeps only Land cover', page.evaluate("[...document.querySelectorAll('#tree-scroll .layer-button')].filter(b=>!b.hidden && !b.closest('[hidden]')).map(b=>b.querySelector('.lname').textContent)") == ['Land cover']); page.fill('#layer-search', '')
    pick(page, 'Land cover', wait=900); facts = page.evaluate("Object.fromEntries([...document.querySelectorAll('.fact')].map(f=>[f.querySelector('dt').textContent, f.querySelector('dd').textContent]))")
    ok('unchanged: the metadata card shows Provider, Date, File format and Coverage "Mini watershed MWS-003"', facts.get('Provider') == 'Survey Department' and facts.get('Date') == '2019-05-01' and facts.get('File format') == 'GeoJSON' and facts.get('Coverage') == 'Mini watershed MWS-003', facts)
    tiles = page.evaluate("Object.fromEntries([...document.querySelectorAll('#meta-profile .tile')].map(t=>[t.querySelector('.tile-l').textContent, t.querySelector('.tile-v').textContent]))")
    ok('unchanged: the map preview draws the 2 polygons with a legend, and the data summary reads Features 2, Total area 15.8 ha', page.evaluate("document.querySelectorAll('#map path.leaflet-interactive').length") == 2 and tiles.get('Features') == '2' and tiles.get('Total area') == '15.8 ha', tiles)
    ok('no script errors in the unchanged-features session', not rec['errors'], rec['errors']); ctx.close(); b.close()
srv.shutdown()
