"""Station Data: CBO group. Real index.html, real CSS, real scripts; station-data.js is a worst-case STAND-IN (it removes layers that are not ticked)."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *
R = []
def ok(name, cond, detail=''): R.append((name, bool(cond), str(detail)[:320]))
import atexit
def _report():
    bad = [r for r in R if not r[1]]
    for n, o, d in R: print(('PASS ' if o else 'FAIL ') + n + ('' if o else '   -> ' + d))
    print(f'\n{len(R) - len(bad)} / {len(R)} passed')
atexit.register(_report)

CBO = EXD + '14_CBO/'
FX = {
    'IWWRMP/Data/EXD/MWS_003/AllDataLayer_003.csv': (200, 'text/csv', 'Group,Database,Layer,geojson\r\nBase,Hydrology,Stream network,' + EXD + 'HY/s.geojson\r\n'),
    'IWWRMP/Data/EXD/12_WQ/CEA_pH.geojson': (200, 'application/json', fc([pt(80.66, 7.06, station_na='MR 1')])),
    'IWWRMP/Data/EXD/10_MET/RF_St/MET_RF_St.geojson': (200, 'application/json', fc([pt(80.6, 7.1, station_na='Kandy RF', Jan=100)])),
    'IWWRMP/Data/EXD/14_CBO/Intake.geojson': (200, 'application/json', fc([pt(80.61, 7.01, Name='Intake 1', Capacity=40), pt(80.62, 7.02, Name='Intake 2')])),
    'IWWRMP/Data/EXD/14_CBO/Reservoir.geojson': (200, 'application/json', fc([poly(80.70, 7.10, Name='Res 1')])),
    'IWWRMP/Data/EXD/14_CBO/Water Overall.geojson': (500, 'text/plain', 'server error'),
    'IWWRMP/Data/EXD/14_CBO/Gender Empowerment.geojson': (200, 'application/json', fc([pt(80.5, 7.0, Name='G')])),
}
def open_water(page): page.click('#waterQualityBtn'); page.wait_for_timeout(200)
def cbo_box(page, name): return page.evaluate("n=>{const l=[...document.querySelectorAll('#waterPanel label')].find(x=>x.textContent===n); return l ? l.htmlFor : null}", name)
def tick(page, name, on=True, wait=600):
    page.evaluate("([n,on])=>{const l=[...document.querySelectorAll('#waterPanel label')].find(x=>x.textContent===n); const b=document.getElementById(l.htmlFor); if(b.checked!==on) b.click();}", [name, on]); page.wait_for_timeout(wait)
def ticked(page, name): return page.evaluate("n=>{const l=[...document.querySelectorAll('#waterPanel label')].find(x=>x.textContent===n); return document.getElementById(l.htmlFor).checked}", name)
def status(page, name): return page.evaluate("n=>{const l=[...document.querySelectorAll('#waterPanel label')].find(x=>x.textContent===n); const s=l.parentElement.querySelector('.cbo-status'); return [s.textContent, s.style.display!=='none']}", name)
def layers(page): return sorted(page.evaluate("Object.keys(geoJsonLayers)"))
def legends(page): return sorted(page.evaluate("Object.keys(layerLegends)"))
def info(page): return page.evaluate("document.getElementById('attributePanel').innerText.replace(/\\s+/g,' ')")
def fire(page, key, i=0):
    page.evaluate("([k,i])=>{const l=geoJsonLayers[k].getLayers()[i]; l.fire('click',{latlng:l.getLatLng?l.getLatLng():l.getBounds().getCenter()});}", [key, i]); page.wait_for_timeout(300)

srv, base = serve()
with sync_playwright() as p:
    b = launch(p)
    counts = {}; page, rec, ctx = open_dashboard(b, base, FX, counts=counts); choose_mws(page, '003'); open_water(page)
    ok('the real page loads with the CBO script and no script errors', not rec['errors'] and not rec['console'], (rec['errors'], rec['console']))
    heads = page.evaluate("[...document.querySelectorAll('#waterPanel h3')].map(h=>h.textContent)")
    ok('Station Data: your two groups first, then "CBO Data - Department of National Community Water Supply"', heads == ['Water Quality Stations', 'Other Stations', 'CBO Data - Department of National Community Water Supply'], heads)
    names = page.evaluate("[...document.querySelectorAll('#cboDataGroup label')].map(l=>l.textContent)")
    ok('14 categories in the order of the old page', names == ['Absence of Vegetation', 'Availability of Water Treatment', 'CBO Category', 'Containments from Houses', 'Erosion or Landslide', 'Gender Empowerment', 'Intake', 'Protection for Source', 'Pump', 'Reservoir Type', 'Reservoir', 'Schema Type', 'Type of Water Source', 'Water Overall'], names)
    links = page.evaluate("[...document.querySelectorAll('#cboDataGroup a')].map(a=>[a.textContent, a.target, a.rel, a.href])")
    ok('each has a "See more" link to its RWSS page that opens in a new tab safely (Intake = dq=24, Pump = dq=25, Water Overall = dq=35)', len(links) == 14 and all(l[0] == 'See more' and l[1] == '_blank' and 'noopener' in l[2] for l in links) and links[6][3].endswith('dq=24&is_public=true') and links[8][3].endswith('dq=25&is_public=true') and links[13][3].endswith('dq=35&is_public=true'), links[6])
    ok('boxes are named cboDataCategory (not waterSource), so station-data.js and ui-panels.js do not handle them', page.evaluate("document.querySelectorAll('#cboDataGroup input[name=cboDataCategory]').length") == 14 and page.evaluate("document.querySelectorAll('#cboDataGroup input[name=waterSource]').length") == 0)
    lay = page.evaluate("""(()=>{const g=document.getElementById('cboDataGroup'); const rows=[...g.querySelectorAll(':scope > div')].map(e=>e.getBoundingClientRect()); const first=g.querySelector(':scope > div'); const panel=document.getElementById('waterPanel');
        return {display:getComputedStyle(first).display, stacked:rows.every((x,i)=>i===0||x.top>=rows[i-1].bottom-1), fits:panel.scrollWidth<=panel.clientWidth+1, h3:getComputedStyle(g.querySelector('h3')).textTransform, other:getComputedStyle(document.querySelector('#waterPanel > div:nth-of-type(2) h3')).textTransform}})()""")
    ok('with your real dashboard.css: the CBO rows are flex rows stacked one under the other, nothing wider than the panel, the heading in the same uppercase style as the other groups', lay['display'] == 'flex' and lay['stacked'] and lay['fits'] and lay['h3'] == lay['other'] == 'uppercase', lay)
    page.screenshot(path=os.path.join(HERE, 'station-panel.png'), clip={'x': 0, 'y': 90, 'width': 440, 'height': 800})

    tick(page, 'Intake')
    ok('ticking Intake reads 14_CBO/Intake.geojson (once) and draws 2 points', page.evaluate("geoJsonLayers['CBO - Intake'] ? geoJsonLayers['CBO - Intake'].getLayers().length : -1") == 2 and sum(v for k, v in counts.items() if k.endswith('14_CBO/Intake.geojson')) == 1, counts)
    st = page.evaluate("(()=>{const o=geoJsonLayers['CBO - Intake'].getLayers()[0].options; return [o.color, o.fillColor, o.radius, o.fillOpacity]})()")
    ok('points are circles in the category colour (#f781bf), radius 4.5 (Leaflet applies the layer style to them, so the fill is 35 %, as on the old page)', st == ['#f781bf', '#f781bf', 4.5, 0.35], st)
    ok('a legend card "CBO - Intake" with the category colour; the map zoomed to the data', 'CBO - Intake' in legends(page) and any('CBO - Intake' in t for t in page.evaluate("[...document.querySelectorAll('#map .info.legend')].map(d=>d.innerText)")) and page.evaluate("map.getBounds().contains(geoJsonLayers['CBO - Intake'].getBounds())"))
    ok('the layer is also in the registry the print function reads (geoJsonLayers and layerState), so it is printed with the other layers', page.evaluate("layerState['CBO - Intake']") is True and 'CBO - Intake' in layers(page))
    fire(page, 'CBO - Intake', 0); ok('clicking a feature opens Feature Info: Layer CBO - Intake, Name Intake 1, Capacity 40', 'Layer: CBO - Intake' in info(page) and 'Name: Intake 1' in info(page) and 'Capacity: 40' in info(page), info(page)[:120])
    page.evaluate("clearFeatureSelection()")
    page.evaluate("window.__measure=true"); fire(page, 'CBO - Intake', 1); ok('with the Measure tool on, the click goes to the Measure tool and Feature Info stays closed', 'Intake 2' not in info(page), info(page)[:80]); page.evaluate("window.__measure=false")
    tick(page, 'Reservoir')
    pg = page.evaluate("(()=>{const o=geoJsonLayers['CBO - Reservoir'].getLayers()[0].options; return [o.color, o.fillColor, o.fillOpacity, o.weight]})()")
    ok('polygons: outline and fill in the category colour (#1f618d), fill 35 %, weight 2', pg == ['#1f618d', '#1f618d', 0.35, 2], pg)
    # the worst case: station-data.js removes layers that are not ticked
    page.evaluate("document.getElementById('water_source_primary_0').click()"); page.wait_for_timeout(700)
    page.evaluate("document.getElementById('water_source_other_1').click()"); page.wait_for_timeout(700)
    ok('ticking water-quality and rainfall stations (the station-data.js handler removes layers it does not know) does NOT remove the CBO layers', 'CBO - Intake' in layers(page) and 'CBO - Reservoir' in layers(page) and page.evaluate("Object.keys(waterQualityLayers).sort().join()") == 'CEA,Rainfall', (layers(page), page.evaluate("Object.keys(waterQualityLayers)")))
    ok('...and the CBO layers are not put in station-data.js\'s own registry', 'CBO - Intake' not in page.evaluate("Object.keys(waterQualityLayers)"))
    tick(page, 'Intake', False)
    ok('unticking Intake removes the layer, its legend and its state; Reservoir stays', 'CBO - Intake' not in layers(page) and 'CBO - Intake' not in legends(page) and page.evaluate("layerState['CBO - Intake']") is False and 'CBO - Reservoir' in layers(page))
    # failures
    tick(page, 'Pump', wait=700)
    ok('a category whose file is not in the repository (Pump, 404): unticked, "could not be loaded" shown beside it, nothing on the map', not ticked(page, 'Pump') and status(page, 'Pump') == ['could not be loaded', True] and 'CBO - Pump' not in layers(page), status(page, 'Pump'))
    ok('...and a missing file (404) is a plain "could not be loaded" note: one console message, no script error', not rec['errors'])
    tick(page, 'Water Overall', wait=700)
    ok('a server error (500): the same, and one console error', not ticked(page, 'Water Overall') and status(page, 'Water Overall')[0] == 'could not be loaded' and any('Water Overall' in c for c in rec['console']), rec['console'][-1:])
    tick(page, 'Pump', wait=700); ok('ticking it again tries again (2 requests for Pump), the note is replaced while it loads', sum(v for k, v in counts.items() if k.endswith('14_CBO/Pump.geojson')) == 2, counts)
    # quick tick/untick
    tick(page, 'Gender Empowerment', wait=0); tick(page, 'Gender Empowerment', False, wait=800)
    ok('ticked and unticked at once: nothing on the map, no legend, no "loading..." text left', 'CBO - Gender Empowerment' not in layers(page) and 'CBO - Gender Empowerment' not in legends(page) and status(page, 'Gender Empowerment') == ['', False])
    # the panel is rebuilt
    page.evaluate("renderWaterPanel()"); page.wait_for_timeout(200)
    ok('when station-data.js rebuilds the panel (renderWaterPanel), the CBO group is added again, exactly once, and Reservoir (still on the map) is shown ticked', page.evaluate("document.querySelectorAll('#cboDataGroup').length") == 1 and page.evaluate("document.querySelectorAll('input[name=cboDataCategory]').length") == 14 and ticked(page, 'Reservoir') and not ticked(page, 'Intake'))
    page.evaluate("renderWaterPanel()"); page.evaluate("renderWaterPanel()"); ok('...and several rebuilds never give two groups', page.evaluate("document.querySelectorAll('#cboDataGroup').length") == 1)
    # location change
    page.select_option('#selectMWSID', '010-1'); page.wait_for_timeout(600)
    ok('choosing another mini watershed clears every CBO layer and legend and unticks the boxes (a new MWS starts clean, like every other layer)', not [k for k in layers(page) if k.startswith('CBO')] and not [k for k in legends(page) if k.startswith('CBO')] and not page.evaluate("[...document.querySelectorAll('input[name=cboDataCategory]')].some(b=>b.checked)"), (layers(page), legends(page)))
    choose_mws(page, '003'); open_water(page); tick(page, 'Intake'); page.select_option('#selectDist', 'Kandy'); page.wait_for_timeout(500)
    ok('...also when the District or DSD is changed', 'CBO - Intake' not in layers(page))
    ok('no script errors in the whole session', not rec['errors'], rec['errors']); ctx.close()

    # race: location changes while a file is loading
    page, rec, ctx = open_dashboard(b, base, FX, delays={'IWWRMP/Data/EXD/14_CBO/Intake.geojson': 1.0}); choose_mws(page, '003'); open_water(page)
    tick(page, 'Intake', wait=100); page.select_option('#selectMWSID', '010-1'); page.wait_for_timeout(1800)
    ok('a category still loading when the mini watershed changes is not drawn afterwards, and its "loading..." note is gone', 'CBO - Intake' not in layers(page) and status(page, 'Intake') == ['', False], (layers(page), status(page, 'Intake')))
    ctx.close()
    # another script already added CBO boxes (a future station-data.js with CBO built in): no duplicate group
    page, rec, ctx = open_dashboard(b, base, FX)
    page.evaluate("""()=>{const p=document.getElementById('waterPanel'); document.getElementById('cboDataGroup').remove();
        const g=document.createElement('div'); g.innerHTML='<h3>CBO</h3><div><input type="checkbox" name="cboDataCategory" value="X" id="cbo_x"><label for="cbo_x">X</label></div>'; p.appendChild(g); StationCbo.ensureGroup(); }""")
    ok('if the panel already holds CBO boxes from another script, no second group is added (no duplicate boxes)', page.evaluate("document.querySelectorAll('#cboDataGroup').length") == 0 and page.evaluate("document.querySelectorAll('input[name=cboDataCategory]').length") == 1)
    ctx.close(); b.close()
srv.shutdown()
