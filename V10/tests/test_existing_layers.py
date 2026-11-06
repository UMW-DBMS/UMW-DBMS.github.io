"""Regression: layers and panels that were NOT changed still behave as before (real index.html, real CSS, real scripts, real Leaflet)."""
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
D = EXD
FX = {
    'IWWRMP/Data/EXD/MWS_003/AllDataLayer_003.csv': (200, 'text/csv', f'Group,Database,Layer,geojson\r\nBase,Hydrology,Stream network,{D}HY/s.geojson\r\nBase,Land cover,Land cover,{D}LC/lc.geojson\r\nRaster,Topography,DEM,{D}TP/dem.png\r\n'),
    'IWWRMP/Data/EXD/MWS_003/PropLayers_003.csv': (200, 'text/csv', f'Group,Database,Layer,geojson\r\nProposal,Water,Domestic water supply,{D}PR/dws.geojson\r\nProposal,Water,Landslides,{D}PR/ls.geojson\r\n'),
    'IWWRMP/Data/EXD/MWS_003/ClimLayer.csv': (200, 'text/csv', f'Group,Database,Layer,geojson,Type\r\nClimate,Rainfall,Monthly Rainfall - 01,{D}CL/rf01.png,Raster\r\nClimate,Rainfall,Annual Rainfall,{D}CL/ar.geojson,GeoJSON\r\n'),
    'IWWRMP/Data/EXD/HY/s.geojson': (200, 'application/json', fc([line(80.5, 7.3, Name='Stream 1')])),
    'IWWRMP/Data/EXD/LC/lc.geojson': (200, 'application/json', fc([poly(80.5, 7.0, classLULC='Tea', Area_Ha=3), poly(80.6, 7.0, classLULC='Paddy', Area_Ha=2)])),
    'IWWRMP/Data/EXD/TP/dem.png': (200, 'image/png', PNG), 'IWWRMP/Data/EXD/CL/rf01.png': (200, 'image/png', PNG),
    'IWWRMP/Data/EXD/CL/ar.geojson': (200, 'application/json', fc([poly(80.5, 7.0, Name='AR')])),
    'IWWRMP/Data/EXD/PR/dws.geojson': (200, 'application/json', fc([pt(80.6, 7.1, No=1, Total_Cost=120000, Name='DWS 1'), pt(80.61, 7.11, No=2, Total_Cost=20000, Name='DWS 2')])),
    'IWWRMP/Data/EXD/PR/ls.geojson': (200, 'application/json', fc([pt(80.7, 7.2, No=1, Name='LS 1')])),
    'IWWRMP/Data/EXD/03_RSV/RSV_FRC_TF/RSV_FRC_TF_UMW.geojson': (200, 'application/json', fc([poly(80.5, 7.0, Name='EPA')])),
}
def tick(page, panel, label, on=True, wait=600):
    r = page.evaluate("""([p,l,on])=>{const lab=[...document.querySelectorAll('#'+p+' label')].find(x=>x.textContent===l); if(!lab) return 'no label'; const b=document.getElementById(lab.htmlFor); if(b.checked!==on) b.click(); return 'ok'}""", [panel, l if False else label, on]); page.wait_for_timeout(wait); return r
def layers(page): return sorted(page.evaluate("Object.keys(geoJsonLayers)"))
def info(page): return page.evaluate("document.getElementById('attributePanel').innerText.replace(/\\s+/g,' ')")
srv, base = serve()
with sync_playwright() as p:
    b = launch(p); page, rec, ctx = open_dashboard(b, base, FX); choose_mws(page, '003')
    page.click('#baseLayersBtn'); page.wait_for_function("document.querySelectorAll('#basePanel input[type=checkbox]').length > 3"); page.wait_for_timeout(200)
    tick(page, 'basePanel', 'Stream network')
    ok('an ordinary base layer (Stream network) loads, has its legend card and opens Feature Info when clicked', 'Stream network' in layers(page) and 'Stream network' in page.evaluate("Object.keys(layerLegends)"), layers(page))
    page.evaluate("(()=>{const l=geoJsonLayers['Stream network'].getLayers()[0]; l.fire('click',{latlng:l.getBounds().getCenter()});})()"); page.wait_for_timeout(250)
    ok('...Feature Info shows Layer: Stream network and Name: Stream 1', 'Layer: Stream network' in info(page) and 'Name: Stream 1' in info(page), info(page)[:80]); page.evaluate("clearFeatureSelection()")
    tick(page, 'basePanel', 'Land cover'); lc = page.evaluate("geoJsonLayers['Land cover'].getLayers().map(l=>l.options.fillColor)")
    ok('Land cover is still coloured by class (Tea and Paddy differ) with the class legend', len(set(lc)) == 2 and any('Tea' in t for t in page.evaluate("[...document.querySelectorAll('#map .info.legend')].map(d=>d.innerText)")), lc)
    tick(page, 'basePanel', 'DEM', wait=700)
    ok('a raster layer (DEM) is added as an image overlay with the bottom legend', 'DEM' in page.evaluate("Object.keys(pngOverlays)") and page.evaluate("!!document.querySelector('#map .legend #legend-list, #legend-list')"))
    tick(page, 'basePanel', 'DEM', False); ok('...and removed again', 'DEM' not in page.evaluate("Object.keys(pngOverlays)"))
    tick(page, 'basePanel', 'Environmental protection area', wait=700); ok('Environmental protection area loads through its special loader', 'Environmental protection area' in layers(page))
    ok('unticking Stream network removes it and its legend', tick(page, 'basePanel', 'Stream network', False) == 'ok' and 'Stream network' not in layers(page) and 'Stream network' not in page.evaluate("Object.keys(layerLegends)"))
    # proposals
    page.click('#proposalBtn'); page.wait_for_function("document.querySelectorAll('#proposalPanel input[type=checkbox]').length >= 2"); page.wait_for_timeout(200)
    tick(page, 'proposalPanel', 'Domestic water supply', wait=800)
    ok('a proposal layer loads with its own marker and its "Domestic water supply" legend', 'Domestic water supply' in layers(page) and page.evaluate("[...document.querySelectorAll('#map .info.legend')].some(d=>d.innerText.includes('Domestic water supply'))"))
    ok('cost circles and number labels are drawn (2 circles, 2 permanent number labels)', page.evaluate("document.querySelectorAll('.leaflet-tooltip.proposal-no-label').length") == 2)
    circ = page.evaluate("""(()=>{const g=geoJsonLayers['Domestic water supply'].getLayers()[0]; const c=g.getLayers().find(l=>l instanceof L.CircleMarker); c.fire('click',{latlng:c.getLatLng()}); return [c.options.fillOpacity, c.options.stroke, c.options.color, c.options.fillColor]})()""")
    page.wait_for_timeout(250)
    ok('clicking a proposal\'s cost circle opens Feature Info and does NOT restyle the circle (the new circle highlight skips circles without an outline)', circ[0] == 0.15 and circ[1] is False and 'DWS 1' in info(page), (circ, info(page)[:60]))
    tick(page, 'proposalPanel', 'Landslides', wait=800)
    ok('a second proposal layer works and has its own marker kind (landslide)', 'Landslides' in layers(page) and 'umw-marker--landslide' in page.evaluate("(()=>{const m=geoJsonLayers['Landslides'].getLayers()[0]; const f=m.getLayers?m.getLayers()[0]:m; return f.options.icon.options.className})()"))
    # climate
    page.click('#climateLayerBtn'); page.wait_for_function("document.querySelectorAll('#climPanel input[type=checkbox]').length >= 2"); page.wait_for_timeout(200)
    tick(page, 'climPanel', 'Monthly Rainfall - 01', wait=700); ok('a climate raster loads (overlay + legend)', 'Monthly Rainfall - 01' in page.evaluate("Object.keys(pngOverlays)"))
    tick(page, 'climPanel', 'Annual Rainfall', wait=700); ok('a climate vector layer loads with its legend', 'Annual Rainfall' in layers(page) and 'Annual Rainfall' in page.evaluate("Object.keys(layerLegends)"))
    # MWS change
    page.select_option('#selectMWSID', '010-1'); page.wait_for_timeout(600)
    ok('choosing another mini watershed clears all of them (layers, overlays, legends, ticks)', not layers(page) and not page.evaluate("Object.keys(pngOverlays)") and not page.evaluate("Object.keys(layerLegends)") and all(v is False for v in page.evaluate("Object.values(layerState)")), (layers(page), page.evaluate("Object.keys(layerLegends)")))
    ok('no script errors in the whole session', not rec['errors'] and not rec['console'], (rec['errors'], rec['console'])); ctx.close()
    # the Map Symbols page lists the new markers by itself
    ctx = b.new_context(viewport={'width': 1300, 'height': 900}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    def h(route):
        u = route.request.url
        if u.startswith(base): return route.continue_()
        if cdn(route, u): return
        route.fulfill(status=404, body='')
    ctx.route('**/*', h); pg.goto(base + '/symbology-guide.html', wait_until='load'); pg.wait_for_timeout(500)
    txt = pg.evaluate("document.body.innerText")
    ok('the Map Symbols page (symbology-guide.html) shows the three new markers in a new section (Anicut (DAD), Minor tank (DAD), Tank (UNDP)) next to the old ones, with no script error', all(t in txt for t in ('Anicut (DAD)', 'Minor tank (DAD)', 'Tank (UNDP)', 'Domestic water supply', 'Rainfall', 'Tank and anicut symbols')) and not errs, errs)
    ctx.close(); b.close()
srv.shutdown()
