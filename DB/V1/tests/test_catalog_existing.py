"""Regression: the catalog features that were NOT changed (tree, search, overviews, metadata card, previews, deep link), with the real scripts."""
import os, sys, json, re, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *

R = []
def ok(name, cond, detail=''): R.append((name, bool(cond), str(detail)[:300]))
RAW = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/'
D = RAW + 'Data/EXD/'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
def poly(x, y, **p): return {'type': 'Feature', 'properties': p, 'geometry': {'type': 'Polygon', 'coordinates': [[[x, y], [x + .1, y], [x + .1, y + .1], [x, y + .1], [x, y]]]}}
def fc(f): return json.dumps({'type': 'FeatureCollection', 'features': f})
BOUNDARY = fc([{'type': 'Feature', 'properties': {'MWS_ID': 'MWS_003', 'District': 'Kandy', 'MainDSD': 'Pathahewaheta'}, 'geometry': {'type': 'Polygon', 'coordinates': [[[80.5, 7.0], [80.7, 7.0], [80.7, 7.2], [80.5, 7.2], [80.5, 7.0]]]}}])
LC = fc([poly(80.6, 7.1, classLULC='Tea', Area_Ha=10.5, Note=None), poly(80.65, 7.12, classLULC='Paddy', Area_Ha=5.25, Note='x')])
HEAD = 'Group,Database,Layer,layer,geojson,Provider,Date,Description,Keywords,Contact.Name,Resolution,Scale\r\n'
ROWS = [
    f'Base,Land cover,Land cover,,{D}04/lc.geojson,Land Use Policy Planning Department,2019-05-01,"Land use, land cover; mapped yearly","land;cover, tea",Mr Secret,30 m,1:50000',
    f'Base,Administration,Missing data layer,,{D}02/nothere.geojson,Survey Department,,,,,,',
    f'Base,Demography,Population table,,{D}07/pop.csv,Census,,,,,,',
    f'Proposal,Water,Domestic water supply,,{D}09/dws.geojson,MASL,,,,,,',
    f'Raster,Topography,Slope image,,{D}10/slope.png,NBRO,,,,,,',
    'Base,Hydrology,No file layer,,,,,,,,,',
]
REGISTRY = '\ufeff' + HEAD + '\r\n'.join(ROWS) + '\r\n'
REGISTRY_NO_PROPOSAL = '\ufeff' + HEAD + ROWS[0] + '\r\n' + ROWS[2] + '\r\n'
def fixtures(registry=REGISTRY):
    return {RAW + 'Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson': (200, 'application/json', BOUNDARY), RAW + 'Registry/DBMS_003.csv': (200, 'text/csv', registry),
            D + '04/lc.geojson': (200, 'application/json', LC), D + '09/dws.geojson': (200, 'application/json', fc([poly(80.6, 7.1, No=1)])), D + '07/pop.csv': (200, 'text/csv', 'a,b\r\n1,2\r\n'), D + '10/slope.png': (200, 'image/png', PNG)}

def open_page(browser, base, registry=REGISTRY, query='', select=True):
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, accept_downloads=True)
    ctx.add_init_script("window.__alerts=[]; window.alert=function(m){window.__alerts.push(String(m));}; window.__prompts=[]; window.prompt=function(m,v){window.__prompts.push(v); return null;};")
    rec = {'errors': [], 'requests': []}; fx = fixtures(registry)
    def handler(route):
        url = route.request.url; path = url.split('?')[0]; rec['requests'].append(url)
        if url.startswith(base): return route.continue_()
        if route.request.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS, body='')
        if cdn(route, url): return
        if 'tile.openstreetmap' in url or 'arcgisonline' in url: return route.fulfill(status=204, body='')
        if url.startswith(RAW):
            if path in fx: st, ct, body = fx[path]; return route.fulfill(status=st, headers={**CORS, 'Content-Type': ct}, body=body)
            return route.fulfill(status=404, headers=CORS, body='nf')
        return route.fulfill(status=404, body='')
    ctx.route('**/*', handler)
    page = ctx.new_page(); page.set_default_timeout(15000)
    page.on('pageerror', lambda e: rec['errors'].append(str(e).split('\n')[0]))
    page.goto(f'{base}/MWSDataCatalog.html{query}', wait_until='load')
    page.wait_for_function("document.querySelectorAll('#catalogDistSelect option').length > 1")
    if select:
        page.select_option('#catalogDistSelect', 'Kandy'); page.wait_for_timeout(100); page.select_option('#catalogDsdSelect', 'Pathahewaheta'); page.wait_for_timeout(100)
        page.select_option('#catalogMwsSelect', 'MWS_003'); page.wait_for_function("document.querySelectorAll('#tree-scroll .layer-button').length > 0")
    return page, rec, ctx
def pick(page, name, wait=600):
    page.evaluate("n=>{document.querySelectorAll('#tree-scroll .tree-head').forEach(h=>{h.setAttribute('aria-expanded','true'); const b=h.nextElementSibling; if(b) b.hidden=false;}); [...document.querySelectorAll('#tree-scroll .layer-button')].find(b=>b.querySelector('.lname').textContent===n).click();}", name)
    page.wait_for_timeout(wait)
def txt(page, sel): return page.evaluate("s=>document.querySelector(s) ? document.querySelector(s).innerText.replace(/\\s+/g,' ').trim() : null", sel)

srv, base = serve()
with sync_playwright() as p:
    b = launch(p)
    page, rec, ctx = open_page(b, base)
    topics = page.evaluate("[...document.querySelectorAll('#tree-scroll > .tree-topic > .tree-head')].map(h=>[h.querySelector('.label').textContent, h.querySelector('.count').textContent])")
    ok('the layer list is grouped by topic in the catalog\'s own order (Base, Raster, Proposal) with the number of layers in each', topics == [['Base', '4'], ['Raster', '1'], ['Proposal', '1']], topics)
    cats = page.evaluate("[...document.querySelectorAll('#tree-scroll > .tree-topic:first-child .tree-head--cat')].map(h=>h.querySelector('.label').textContent)")
    ok('categories inside Base follow the catalog order (Administration, Land cover, Demography, Hydrology), Proposal layers are filed under their approved category', cats == ['Administration', 'Land cover', 'Demography', 'Hydrology'] and 'Water Resource Management' in page.evaluate("[...document.querySelectorAll('#tree-scroll .tree-head--cat .label')].map(e=>e.textContent)"), cats)
    fm = page.evaluate("Object.fromEntries([...document.querySelectorAll('#tree-scroll .layer-button')].map(b=>[b.querySelector('.lname').textContent, b.querySelector('.fmt').textContent]))")
    ok('...checked by name', fm == {'Missing data layer': 'GeoJSON', 'Land cover': 'GeoJSON', 'Population table': 'CSV', 'No file layer': 'No file', 'Domestic water supply': 'GeoJSON', 'Slope image': 'PNG'}, fm)
    page.click('#expand-all'); ok('Expand all opens every section; Collapse all closes them', page.evaluate("[...document.querySelectorAll('#tree-scroll .tree-head')].every(h=>h.getAttribute('aria-expanded')==='true')")); page.click('#collapse-all'); ok('...collapse', page.evaluate("[...document.querySelectorAll('#tree-scroll .tree-head')].every(h=>h.getAttribute('aria-expanded')==='false')"))
    page.fill('#layer-search', 'land'); page.wait_for_timeout(100)
    vis = page.evaluate("[...document.querySelectorAll('#tree-scroll .layer-button')].filter(b=>!b.hidden && b.closest('.tree-topic') && !b.closest('.tree-topic').hidden && !b.closest('.tree-cat').hidden).map(b=>b.querySelector('.lname').textContent)")
    ok('search "land" keeps only Land cover, opens its sections and updates the counts', vis == ['Land cover'] and txt(page, '#tree-scroll > .tree-topic:not([hidden]) > .tree-head .count') == '1', vis)
    page.fill('#layer-search', 'zzzz'); page.wait_for_timeout(100); ok('a search with no match says so', 'No layers match "zzzz".' in txt(page, '#tree-scroll'))
    page.fill('#layer-search', ''); page.wait_for_timeout(100)
    # topic overview
    page.evaluate("document.querySelector('#tree-scroll > .tree-topic:first-child > .tree-head').click()"); page.wait_for_timeout(100)
    ok('clicking a topic shows its overview: title, number of layers and categories, a list of layers', txt(page, '#right-panel-title').lower() == 'topic' and '4 layers in 4 categories' in txt(page, '#right-panel-content') and page.evaluate("document.querySelectorAll('#right-panel-content .layer-link').length") == 4)
    page.evaluate("[...document.querySelectorAll('#right-panel-content .layer-link')].find(b=>b.textContent.includes('Land cover')).click()"); page.wait_for_timeout(700)
    ok('choosing a layer from the overview selects it (marked in the list, details shown)', txt(page, '.meta-title') == 'Land cover' and page.evaluate("document.querySelector('#tree-scroll .layer-button[aria-current]').querySelector('.lname').textContent") == 'Land cover')
    # metadata card
    badges = page.evaluate("[...document.querySelectorAll('.meta-badges .chip')].map(c=>c.textContent)")
    ok('metadata card: badges Base, Land cover, GeoJSON', badges == ['Base', 'Land cover', 'GeoJSON'], badges)
    facts = page.evaluate("Object.fromEntries([...document.querySelectorAll('.fact')].map(f=>[f.querySelector('dt').textContent, f.querySelector('dd').textContent]))")
    ok('"At a glance": Provider, Date, File format, Coverage "Mini watershed MWS-003", Scale', facts == {'Provider': 'Land Use Policy Planning Department', 'Date': '2019-05-01', 'File format': 'GeoJSON', 'Coverage': 'Mini watershed MWS-003', 'Scale': '1:50000'}, facts)
    ok('description under "About this layer"; keywords as tags (land, cover, tea)', 'Land use, land cover; mapped yearly' in txt(page, '.meta-text') and page.evaluate("[...document.querySelectorAll('.tags .tag')].map(t=>t.textContent)") == ['land', 'cover', 'tea'])
    allt = txt(page, '#right-panel-content')
    ok('contact and resolution fields stay hidden (Mr Secret, 30 m)', 'Mr Secret' not in allt and '30 m' not in allt)
    ok('the "Source file" card shows the file name', 'lc.geojson' in txt(page, '.meta-file'))
    # map preview and profile
    ok('map preview: a Leaflet map shows 2 polygons, with the layer\'s legend card', page.evaluate("!document.getElementById('map').hidden") and page.evaluate("document.querySelectorAll('#map path.leaflet-interactive').length") == 2 and page.evaluate("document.querySelectorAll('#map .info.legend').length") == 1)
    ok('preview bar: "2 features. Click a feature to see its values." and the Streets / Satellite switch', '2 features' in txt(page, '#preview-bar') and txt(page, '#preview-bar .segmented').replace(' ', '') == 'StreetsSatellite', txt(page, '#preview-bar'))
    tiles = page.evaluate("Object.fromEntries([...document.querySelectorAll('#meta-profile .tile')].map(t=>[t.querySelector('.tile-l').textContent, t.querySelector('.tile-v').textContent]))")
    ok('data summary: Features 2, Geometry Polygon, Attribute fields 3, Total area 15.8 ha (10.5 + 5.25) from the Area_Ha field', tiles == {'Features': '2', 'Geometry': 'Polygon', 'Attribute fields': '3', 'Total area': '15.8 ha'} and 'Area_Ha' in txt(page, '#meta-profile .hint'), tiles)
    ok('extent written in degrees (E and N); the field table lists classLULC, Area_Ha, Note with types and fill', '\u00B0E' in txt(page, '.extent') and '\u00B0N' in txt(page, '.extent') and page.evaluate("[...document.querySelectorAll('#meta-profile table.fields tbody tr')].map(r=>[r.querySelector('.fname').textContent, r.querySelector('.ftype').textContent, r.querySelector('.bar').title])") == [['classLULC', 'text', '100% filled'], ['Area_Ha', 'decimal number', '100% filled'], ['Note', 'text', '50% filled']])
    page.click('#preview-bar .segmented button:nth-child(2)'); ok('Satellite switches the base map and marks the button pressed', page.evaluate("document.querySelector('#preview-bar .segmented button:nth-child(2)').getAttribute('aria-pressed')") == 'true')
    page.click('#preview-bar .btn'); ok('Zoom to data works without error', not rec['errors'], rec['errors'])
    # download and copy
    with page.expect_download() as dl: page.click('#download-button')
    ok('Download GeoJSON saves lc.geojson', dl.value.suggested_filename == 'lc.geojson', dl.value.suggested_filename)
    page.click('#copy-link-button'); page.wait_for_timeout(300); copied = page.evaluate("document.querySelector('#copy-link-button span').textContent"); prompted = page.evaluate("window.__prompts.length")
    ok('Copy link: either "Copied" or (when the browser blocks the clipboard) the address is offered in a prompt, then the label returns to "Copy link"', copied in ('Copied', 'Copy link') and (copied == 'Copied' or prompted == 1)); page.wait_for_timeout(1900); ok('...label back', txt(page, '#copy-link-button') == 'Copy link')
    # table, image, missing, no file
    pick(page, 'Population table'); ok('a CSV layer: table preview shows the first sheet (columns a, b; one row), summary "Rows 1, Columns 2"; "Download CSV" and "Copy link" buttons', page.evaluate("!document.getElementById('table-preview').hidden") and page.evaluate("[...document.querySelectorAll('#table-preview th')].map(t=>t.textContent)") == ['a', 'b'] and '1Rows' in txt(page, '#meta-profile').replace(' ', '') and '2Columns' in txt(page, '#meta-profile').replace(' ', '') and page.evaluate("[...document.querySelectorAll('.meta-actions button')].map(b=>b.textContent.trim())") == ['Download CSV', 'Copy link'])
    pick(page, 'Slope image'); ok('an image layer: shown in the image area, profile "Size in pixels" 1 \u00D7 1, "Open full size" link', page.evaluate("!document.getElementById('image-preview-wrap').hidden") and '1 \u00D7 1' in txt(page, '#meta-profile') and 'Open full size' in txt(page, '#preview-bar'), txt(page, '#meta-profile'))
    pick(page, 'Missing data layer'); ok('a GeoJSON file that cannot be read: "Preview unavailable" and the download button is still offered', 'Preview unavailable' in txt(page, '#preview-empty') and 'Preview unavailable' in txt(page, '#meta-profile') and page.evaluate("!!document.getElementById('download-button') && !document.getElementById('download-button').disabled"))
    pick(page, 'No file layer'); ok('a layer with no file: disabled "No file available" button, "This layer has no file attached."', txt(page, '#download-button') == 'No file available' and page.evaluate("document.getElementById('download-button').disabled") and 'no file attached' in txt(page, '#preview-empty'))
    pick(page, 'Domestic water supply'); ok('a proposal layer loads and previews', page.evaluate("document.querySelectorAll('#map path.leaflet-interactive, #map .leaflet-marker-icon').length") >= 1 and txt(page, '.meta-title') == 'Domestic water supply')
    # panel
    page.click('#maximize-btn'); ok('the details panel maximises with its button and Escape restores it', page.evaluate("document.getElementById('right-panel').classList.contains('maximized')") and page.evaluate("document.getElementById('maximize-btn').getAttribute('aria-pressed')") == 'true'); page.keyboard.press('Escape'); ok('...Escape', not page.evaluate("document.getElementById('right-panel').classList.contains('maximized')"))
    ok('no script errors in the whole session', not rec['errors'], rec['errors'])
    # cascade
    page.select_option('#catalogDistSelect', ''); page.wait_for_timeout(150)
    ok('changing the district clears the list and asks to choose again; MWS select is disabled', 'Select District, DSD, and MWS ID to load files.' in txt(page, '#tree-scroll') and page.evaluate("document.getElementById('catalogMwsSelect').disabled"))
    ctx.close()
    # no proposal
    page, rec, ctx = open_page(b, base, registry=REGISTRY_NO_PROPOSAL)
    ok('a mini watershed with no approved proposal: the message says so under the prompt', "There is no 'Proposal' in 'MWS-003'." in txt(page, '#right-panel-content'), txt(page, '#right-panel-content'))
    ctx.close()
    # deep link
    page, rec, ctx = open_page(b, base, query='?mwsId=MWS_003', select=False); page.wait_for_function("document.querySelectorAll('#tree-scroll .layer-button').length > 0")
    ok('opened from the dashboard with ?mwsId=MWS_003: district, DSD and MWS are chosen and the layers load by themselves', page.evaluate("document.getElementById('catalogMwsSelect').value") == 'MWS_003' and page.evaluate("document.getElementById('catalogDistSelect').value") == 'Kandy' and page.evaluate("document.querySelectorAll('#tree-scroll .layer-button').length") == 6)
    ctx.close(); b.close()
srv.shutdown()
bad = [r for r in R if not r[1]]
for n, o, d in R: print(('PASS ' if o else 'FAIL ') + n + ('' if o else '   -> ' + d))
print(f'\n{len(R) - len(bad)} / {len(R)} passed')
