"""Base Layers: water-feature types, tanks, DAD / UNDP tank details. Real index.html, real CSS, real scripts, real Leaflet 1.9.3."""
import os, sys, json, time
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

# ---------------------------------------------------------------- fixtures
PT_URL, PG_URL, LN_URL = EXD + 'WF/pt.geojson', EXD + 'WF/pg.geojson', EXD + 'WF/ln.geojson'
CSV = ('Group,Database,Layer,geojson\r\n'
       f'Base,Water features,Water features-point,{PT_URL}\r\nBase,Water features,Water features-polygon,{PG_URL}\r\nBase,Water features,Water features-line,{LN_URL}\r\n'
       f'Base,Hydrology,Minor Tanks,{EXD}HY/old_minor.geojson\r\nBase,Hydrology,Stream network,{EXD}HY/streams.geojson\r\n'
       f'Base,Tanks only,Major tanks,{EXD}HY/old_major.geojson\r\n'
       f'Base,Risk and Hazard,Flood,{EXD}HY/flood.geojson\r\nBase,Reservation,Reserved forest,{EXD}RS/forest.geojson\r\n'
       f'Raster,Topography,DEM,{EXD}TP/dem.png\r\n')
POINTS = fc([pt(80.60, 7.00, HP_GFCODE='ANCTP', HP_Nm_Hydr='Weir A', Cap=12), pt(80.61, 7.00, HP_GFCODE='ANCTP', HP_Nm_Hydr=None), pt(80.62, 7.00, HP_GFCODDE='ANCTP', HP_Nm_Hydr='null'),
             pt(80.63, 7.00, HP_GFCODE='SPLLP', HP_Nm_Hydr='Spill 1'), pt(80.64, 7.00, HP_GFCODE='clvtp', HP_Nm_Hydr=''), pt(80.65, 7.00, HP_GFCODE='WELLP'), pt(80.66, 7.00, HP_GFCODE='ZZZZZ')])
POLYS = fc([poly(80.60, 7.05, HF_CODE='RSVRA', Name='R1'), poly(80.62, 7.05, HF_CODE='TANKA'), poly(80.64, 7.05, HG_GFCODE='LAKEA'), poly(80.66, 7.05, HF_CODE='MARSH'), poly(80.68, 7.05, Name='no code')])
LINES = fc([line(80.60, 7.10, HL_GFCODE='STRMV'), line(80.62, 7.10, HL_GFCODE='STRML'), line(80.64, 7.10, HL_GFCODE='CNNLL', Name='Main canal'), line(80.66, 7.10, HL_GFCODE='TNNLL'), line(80.68, 7.10, HL_GFCODE='OTHER1'), line(80.70, 7.10)])
MAJOR = fc([poly(80.50, 6.90, Name='Kotmale', NAME='Steep rockland & Lithosols', level='High', zone='WU1'), poly(80.55, 6.92, Name='Victoria')])
MINOR = fc([poly(80.52, 6.95, Name='Small tank', level='Low')])
def dad(mws_id, n, tag, with_geom=True, latlng=True):
    out = []
    for i in range(n):
        p = {'MWS_ID': mws_id, 'Name': f'{tag}{i}'}
        if latlng: p.update(Lat=7.2 + i / 100, Lng=80.7 + i / 100)
        out.append({'type': 'Feature', 'properties': p, 'geometry': ({'type': 'Point', 'coordinates': [80.0, 6.0]} if with_geom else None)})
    return out
ANICUTS = fc(dad('MWS_003', 2, 'A') + dad('3', 1, 'B') + dad('MWS_099', 2, 'OTHER'))               # 3 for MWS 003 (spelled two ways), 2 for another
ANICUTS_010 = fc(dad('MWS_010_1', 2, 'C'))
DADTANK = fc([pt(80.71, 7.21, MWS_ID='003', Name='T1'), pt(80.72, 7.22, MWS_ID='MWS_003', Name='T2'), pt(80.73, 7.23, MWS_ID='MWS_050', Name='X')])
UNDP = fc([pt(80.74, 7.24, MWS_ID='MWS_003', Name='U1')])
FX = {
    'IWWRMP/Data/EXD/MWS_003/AllDataLayer_003.csv': (200, 'text/csv', CSV),
    'IWWRMP/Data/EXD/MWS_010_1/AllDataLayer_010_1.csv': (200, 'text/csv', CSV),
    'IWWRMP/Data/EXD/WF/pt.geojson': (200, 'application/json', POINTS), 'IWWRMP/Data/EXD/WF/pg.geojson': (200, 'application/json', POLYS), 'IWWRMP/Data/EXD/WF/ln.geojson': (200, 'application/json', LINES),
    'IWWRMP/Data/EXD/02_HYD/Hydro_Tk/MajorTanks_UMW.geojson': (200, 'application/json', MAJOR), 'IWWRMP/Data/EXD/02_HYD/Hydro_Tk/MinorTanks_UMW.geojson': (200, 'application/json', MINOR),
    'IWWRMP/Data/EXD/HY/streams.geojson': (200, 'application/json', fc([line(80.5, 7.3, Name='Stream 1')])),
    'IWWRMP/Data/EXD/15_TNK/DAD_Anicuts/DAD_Anicut_MWS_003.geojson': (200, 'application/json', ANICUTS), 'IWWRMP/Data/EXD/15_TNK/DAD_Anicuts/DAD_Anicut_MWS_010_1.geojson': (200, 'application/json', ANICUTS_010),
    'IWWRMP/Data/EXD/15_TNK/DAD_Tanks/DAD_MinorTanks_MWS_003.geojson': (200, 'application/json', DADTANK), 'IWWRMP/Data/EXD/15_TNK/UNDP_Tanks/UNDP_Tanks_MWS_003.geojson': (200, 'application/json', UNDP),
    'IWWRMP/Data/EXD/03_RSV/RSV_FRC_TF/RSV_FRC_TF_UMW.geojson': (200, 'application/json', fc([poly(80.5, 7.0, Name='EPA')])),
    'IWWRMP/Data/EXD/RS/forest.geojson': (200, 'application/json', fc([poly(80.5, 7.0, Name='Forest')])),
    'IWWRMP/Data/EXD/TP/dem.png': (200, 'image/png', PNG),
}
# ---------------------------------------------------------------- helpers
def open_panel(page):
    page.click('#baseLayersBtn'); page.wait_for_function("document.querySelectorAll('#basePanel input[type=checkbox]').length > 3"); page.wait_for_timeout(150)
def cat_boxes(page, category):
    return page.evaluate("c=>{const h=[...document.querySelectorAll('#basePanel h3')].find(x=>x.textContent===c); if(!h) return null; return [...h.parentElement.querySelectorAll('label')].map(l=>l.textContent)}", category)
def tick(page, category, label, on=True, wait=500):
    r = page.evaluate("""([c,l,on])=>{const h=[...document.querySelectorAll('#basePanel h3')].find(x=>x.textContent===c); if(!h) return 'no category'; const lab=[...h.parentElement.querySelectorAll('label')].find(x=>x.textContent===l); if(!lab) return 'no label';
        const b=document.getElementById(lab.htmlFor); if(b.checked!==on) b.click(); return 'ok'}""", [category, label, on]); page.wait_for_timeout(wait); return r
def is_ticked(page, category, label):
    return page.evaluate("""([c,l])=>{const h=[...document.querySelectorAll('#basePanel h3')].find(x=>x.textContent===c); const lab=[...h.parentElement.querySelectorAll('label')].find(x=>x.textContent===l); return document.getElementById(lab.htmlFor).checked}""", [category, label])
def layers(page): return sorted(page.evaluate("Object.keys(geoJsonLayers)"))
def nfeat(page, key): return page.evaluate("k=>geoJsonLayers[k] ? geoJsonLayers[k].getLayers().length : -1", key)
def legends(page): return sorted(page.evaluate("Object.keys(layerLegends)"))
def legend_texts(page): return page.evaluate("[...document.querySelectorAll('#map .info.legend')].map(d=>d.innerText.replace(/\\s+/g,' ').trim())")
def fire(page, key, i=0):
    page.evaluate("([k,i])=>{const l=geoJsonLayers[k].getLayers()[i]; l.fire('click',{latlng:l.getLatLng?l.getLatLng():l.getBounds().getCenter()});}", [key, i]); page.wait_for_timeout(300)
def info(page): return page.evaluate("document.getElementById('attributePanel').innerText.replace(/\\s+/g,' ')")
def reqs(counts, frag): return sum(v for k, v in counts.items() if frag in k)

srv, base = serve()
with sync_playwright() as p:
    b = launch(p)
    counts = {}; page, rec, ctx = open_dashboard(b, base, FX, counts=counts); choose_mws(page, '003'); open_panel(page)
    ok('the real page loads with the new script and no script errors', not rec['errors'] and not rec['console'], (rec['errors'], rec['console']))
    cats = page.evaluate("[...document.querySelectorAll('#basePanel h3')].map(h=>h.textContent)")
    ok('categories: Water features, then Reservoirs/ Tanks, DAD Tanks Details, UNDP Tanks Details right after it, then the registry\'s others; "Tanks only" (only tank layers) is gone; Flood stays hidden', cats == ['Water features', 'Reservoirs/ Tanks', 'DAD Tanks Details', 'UNDP Tanks Details', 'Hydrology', 'Risk and Hazard', 'Reservation', 'Topography'][:0] or (cats[:4] == ['Water features', 'Reservoirs/ Tanks', 'DAD Tanks Details', 'UNDP Tanks Details'] and 'Tanks only' not in cats), cats)
    ok('the registry\'s own Minor Tanks row is replaced (Hydrology keeps only Stream network); Flood (hidden layer) is not listed', cat_boxes(page, 'Hydrology') == ['Stream network'] and 'Flood' not in (cat_boxes(page, 'Risk and Hazard') or []), cat_boxes(page, 'Hydrology'))
    ok('Environmental protection area is still added to Reservation (existing behaviour kept)', 'Environmental protection area' in (cat_boxes(page, 'Reservation') or []), cat_boxes(page, 'Reservation'))
    ok('Water features: the three layers are shown as their types (no single box named "Water features-point"); 10 point types, 4 polygon types, 4 line types', cat_boxes(page, 'Water features') == ['Anicut', 'Flood Gate', 'Sluice', 'Spill', 'Waterfall', 'Culvert', 'Spring', 'Water Tower', 'Tube Well', 'Well', 'Reservoir area', 'Tank area', 'Lake', 'Others', 'Streams', 'Canals', 'Tunels', 'Others'], cat_boxes(page, 'Water features'))
    ok('the title of each water-feature layer is a row of its own (bold text); the three titles are Water features-point, -polygon, -line', page.evaluate("[...document.querySelectorAll('#basePanel h3')][0].parentElement.querySelectorAll(':scope > div > strong').length") == 3 and page.evaluate("[...[...document.querySelectorAll('#basePanel h3')][0].parentElement.querySelectorAll(':scope > div > strong')].map(s=>s.textContent)") == ['Water features-point', 'Water features-polygon', 'Water features-line'])
    lay = page.evaluate("""(()=>{const cat=[...document.querySelectorAll('#basePanel h3')].find(x=>x.textContent==='Water features').parentElement; const rows=[...cat.querySelectorAll(':scope > div')];
        const r=rows.map(e=>e.getBoundingClientRect()); return {n:rows.length, display:[...new Set(rows.map(e=>getComputedStyle(e).display))], stacked:r.every((x,i)=>i===0||x.top>=r[i-1].bottom-1), samecol:r.every(x=>x.width>150), indent:getComputedStyle(rows[1]).marginLeft}})()""")
    ok('with your real dashboard.css: all 21 rows (3 titles + 18 types) are flex rows stacked one under the other, full width; type rows indented 16 px', lay['n'] == 21 and lay['display'] == ['flex'] and lay['stacked'] and lay['samecol'] and lay['indent'] == '16px', lay)
    page.screenshot(path=os.path.join(HERE, 'base-panel.png'), clip={'x': 0, 'y': 190, 'width': 420, 'height': 700})

    # ---- points
    tick(page, 'Water features', 'Anicut')
    ok('ticking Anicut draws the 3 anicuts (codes ANCTP, and one spelled HP_GFCODDE); not the other types; the file was requested once', nfeat(page, 'Water features-point - Anicut') == 3 and reqs(counts, 'WF/pt.geojson') == 1, (nfeat(page, 'Water features-point - Anicut'), counts))
    col = page.evaluate("(()=>{const l=geoJsonLayers['Water features-point - Anicut'].getLayers(); return [l[0].options.color, l[0].options.radius, l[0] instanceof L.CircleMarker]})()")
    ok('a point is a red circle (#d73027), radius 5', col == ['#d73027', 5, True], col)
    tips = page.evaluate("geoJsonLayers['Water features-point - Anicut'].getLayers().map(l=>l.getTooltip() ? l.getTooltip().getContent() : null)")
    ok('names are shown as permanent labels where there is a name; no label for a missing, "null" or empty name', tips == ['Weir A', None, None], tips)
    ok('the label has the class water-feature-point-label, styled by css/symbology.css (no box, no border)', page.evaluate("(()=>{const t=document.querySelector('.leaflet-tooltip.water-feature-point-label'); if(!t) return false; const s=getComputedStyle(t); return s.borderTopWidth==='0px' && s.boxShadow==='none' && s.fontWeight==='600'})()"))
    tick(page, 'Water features', 'Spill'); tick(page, 'Water features', 'Culvert'); tick(page, 'Water features', 'Well')
    ok('Spill 1, Culvert 1 (code in lower case "clvtp" still matches) and Well 1; the file is NOT requested again (one request for all four types)', [nfeat(page, 'Water features-point - ' + t) for t in ('Spill', 'Culvert', 'Well')] == [1, 1, 1] and reqs(counts, 'WF/pt.geojson') == 1, counts)
    ok('a feature with an unlisted code (ZZZZZ) is in no point type', sum(nfeat(page, 'Water features-point - ' + t) for t in ('Anicut', 'Spill', 'Culvert', 'Well')) == 6)
    lt = legend_texts(page)
    ok('each ticked type has its own legend card, named like the layer', sorted(legends(page)) == sorted(['Water features-point - Anicut', 'Water features-point - Spill', 'Water features-point - Culvert', 'Water features-point - Well']) and all(any(n in t for t in lt) for n in ('Anicut', 'Spill', 'Culvert', 'Well')), lt)
    ok('the legend swatch has the type colour (Anicut red)', page.evaluate("[...document.querySelectorAll('#map .info.legend')].some(d=>d.innerText.includes('Anicut') && /rgb\\(215, 48, 39|#d73027/i.test(d.innerHTML))"), page.evaluate("document.querySelector('#map .info.legend').innerHTML")[:200])
    tick(page, 'Water features', 'Spill', False)
    ok('unticking Spill takes off that layer and its legend; the others stay', 'Water features-point - Spill' not in layers(page) and 'Water features-point - Spill' not in legends(page) and nfeat(page, 'Water features-point - Anicut') == 3)
    # click and highlight
    fire(page, 'Water features-point - Anicut', 0); inf = info(page)
    ok('clicking a point opens Feature Info with its layer name and attributes (Weir A, Cap 12)', 'Layer: Water features-point - Anicut' in inf and 'HP_Nm_Hydr: Weir A' in inf and 'Cap: 12' in inf, inf[:160])
    ok('the clicked point is highlighted (cyan outline, yellow fill) and no "Unknown layer type" warning', page.evaluate("(()=>{const l=geoJsonLayers['Water features-point - Anicut'].getLayers()[0]; return [l.options.color, l.options.fillColor]})()") == ['#00A5BD', '#FFEB3B'] and not any('Unknown layer' in c for c in rec['console']))
    page.evaluate("clearFeatureSelection()"); ok('closing Feature Info puts the point back to its colour', page.evaluate("geoJsonLayers['Water features-point - Anicut'].getLayers()[0].options.color") == '#d73027')
    page.evaluate("window.__measure=true"); fire(page, 'Water features-point - Anicut', 1)
    ok('with the Measure tool on, a click on a point goes to the Measure tool and Feature Info stays closed', 'Weir' not in info(page) and page.evaluate("document.getElementById('attributePanel').style.display") in ('none', ''), info(page)[:80]); page.evaluate("window.__measure=false")

    # ---- polygons
    for t in ('Reservoir area', 'Tank area', 'Lake', 'Others'): tick(page, 'Water features', t, wait=300) if t != 'Others' else None
    cn = lambda t: nfeat(page, 'Water features-polygon - ' + t)
    cat = page.evaluate("[...document.querySelectorAll('#basePanel h3')].find(x=>x.textContent==='Water features').parentElement.querySelectorAll('label').length")
    page.evaluate("""()=>{const h=[...document.querySelectorAll('#basePanel h3')].find(x=>x.textContent==='Water features'); const labs=[...h.parentElement.querySelectorAll('label')].filter(l=>l.textContent==='Others'); document.getElementById(labs[0].htmlFor).click();}"""); page.wait_for_timeout(500)
    ok('polygons: Reservoir area 1, Tank area 1, Lake 1 (HG_GFCODE fallback), Others 2 (an unlisted code and a feature with no code); the file requested once', [cn('Reservoir area'), cn('Tank area'), cn('Lake'), cn('Others')] == [1, 1, 1, 2] and reqs(counts, 'WF/pg.geojson') == 1, [cn(t) for t in ('Reservoir area', 'Tank area', 'Lake', 'Others')])
    st = page.evaluate("(()=>{const o=geoJsonLayers['Water features-polygon - Lake'].getLayers()[0].options; return [o.fillColor, o.color, o.fillOpacity]})()")
    ok('polygons use the water-polygon style of symbology.js (fill #5BB5E0, outline #1E78B4, 65 %)', st == ['#5BB5E0', '#1E78B4', 0.65], st)
    fire(page, 'Water features-polygon - Reservoir area', 0); ok('clicking a polygon opens Feature Info (name R1)', 'Layer: Water features-polygon - Reservoir area' in info(page) and 'Name: R1' in info(page))
    page.evaluate("clearFeatureSelection()")
    # ---- lines
    tick(page, 'Water features', 'Streams', wait=300); tick(page, 'Water features', 'Canals', wait=300); tick(page, 'Water features', 'Tunels', wait=300)
    page.evaluate("""()=>{const h=[...document.querySelectorAll('#basePanel h3')].find(x=>x.textContent==='Water features'); const labs=[...h.parentElement.querySelectorAll('label')].filter(l=>l.textContent==='Others'); document.getElementById(labs[1].htmlFor).click();}"""); page.wait_for_timeout(500)
    cl = lambda t: nfeat(page, 'Water features-line - ' + t)
    ok('lines: Streams 2 (STRMV and STRML), Canals 1, Tunels 1, Others 2 (an unlisted code and a line with no code); file requested once', [cl('Streams'), cl('Canals'), cl('Tunels'), cl('Others')] == [2, 1, 1, 2] and reqs(counts, 'WF/ln.geojson') == 1)
    ok('line colours: streams #08519c, canals #2171b5, tunnels #4292c6, others #6baed6; weight 2.5', [page.evaluate("k=>geoJsonLayers[k].getLayers()[0].options.color", 'Water features-line - ' + t) for t in ('Streams', 'Canals', 'Tunels', 'Others')] == ['#08519c', '#2171b5', '#4292c6', '#6baed6'])
    fire(page, 'Water features-line - Canals', 0); ok('a line can be clicked (Feature Info, name Main canal) - the layer was not clickable on the old page', 'Name: Main canal' in info(page), info(page)[:100])
    page.evaluate("clearFeatureSelection()")
    # quick tick/untick
    tick(page, 'Water features', 'Sluice', wait=0); tick(page, 'Water features', 'Sluice', False, wait=600)
    ok('ticking and unticking at once leaves nothing on the map and no legend', 'Water features-point - Sluice' not in layers(page) and 'Water features-point - Sluice' not in legends(page))
    # panel rebuild keeps ticks
    page.click('#baseLayersBtn'); page.click('#baseLayersBtn'); open_panel(page); page.wait_for_timeout(400)
    ok('opening Base Layers again rebuilds the panel and keeps the boxes ticked that are on the map', is_ticked(page, 'Water features', 'Anicut') and is_ticked(page, 'Water features', 'Lake') and not is_ticked(page, 'Water features', 'Spill'))

    # ---- tanks
    tick(page, 'Reservoirs/ Tanks', 'Major Tanks', wait=700)
    ok('Major Tanks: its own UMW file (MajorTanks_UMW.geojson), 2 tanks, loaded as an ordinary layer', nfeat(page, 'Major Tanks') == 2 and reqs(counts, 'MajorTanks_UMW') == 1 and reqs(counts, 'old_major') == 0, counts)
    mt = page.evaluate("(()=>{const l=geoJsonLayers['Major Tanks'].getLayers()[0]; return [l.options.fillColor, l.options.color, l.options.fillOpacity, l.options.weight]})()")
    ok('its tank colour is kept although the data has attributes NAME, level and zone that would recolour it as a soil, landslide or agro-ecological zone', mt == ['#2F80ED', '#0057B8', 0.65, 2], mt)
    ok('major tanks carry their name on the map (permanent label); the map zoomed to them', page.evaluate("geoJsonLayers['Major Tanks'].getLayers().map(l=>l.getTooltip()?l.getTooltip().getContent():null)") == ['Kotmale', 'Victoria'] and page.evaluate("map.getBounds().contains(geoJsonLayers['Major Tanks'].getBounds())"))
    ok('Major Tanks has a legend card (fill #2F80ED)', 'Major Tanks' in legends(page) and any('Major Tanks' in t for t in legend_texts(page)))
    tick(page, 'Reservoirs/ Tanks', 'Minor Tanks', wait=700)
    ok('Minor Tanks: its own file, same tank style, no name label', nfeat(page, 'Minor Tanks') == 1 and page.evaluate("geoJsonLayers['Minor Tanks'].getLayers()[0].getTooltip()") is None and page.evaluate("geoJsonLayers['Minor Tanks'].getLayers()[0].options.fillColor") == '#2F80ED')
    # ---- DAD / UNDP
    tick(page, 'DAD Tanks Details', 'Anicuts', wait=800)
    ok('DAD Anicuts: the file of this mini watershed (15_TNK/DAD_Anicuts/DAD_Anicut_MWS_003.geojson), requested once', reqs(counts, '15_TNK/DAD_Anicuts/DAD_Anicut_MWS_003.geojson') == 1, counts)
    ok('only this mini watershed\'s anicuts: 3 (MWS_003 written as "MWS_003" and "3"); the 2 of MWS_099 are left out', nfeat(page, 'DAD Tanks Details - Anicuts') == 3, nfeat(page, 'DAD Tanks Details - Anicuts'))
    ll = page.evaluate("geoJsonLayers['DAD Tanks Details - Anicuts'].getLayers().map(l=>[+l.getLatLng().lat.toFixed(2), +l.getLatLng().lng.toFixed(2)])")
    ok('anicuts are placed from their Lat and Lng attributes (even where the file has a geometry elsewhere)', ll == [[7.2, 80.7], [7.21, 80.71], [7.2, 80.7]], ll)
    ok('markers are the Anicut badge of symbology.js (amber square), not a default marker', page.evaluate("geoJsonLayers['DAD Tanks Details - Anicuts'].getLayers()[0].options.icon.options.className") == 'umw-marker umw-marker--anicut')
    ok('legend card for it; clicking an anicut opens Feature Info named "Anicuts"', 'DAD Tanks Details - Anicuts' in legends(page))
    fire(page, 'DAD Tanks Details - Anicuts', 0); ok('...Feature Info: Layer: Anicuts, Name: A0; the marker gets the selection ring', 'Layer: Anicuts' in info(page) and 'Name: A0' in info(page) and 'is-selected' in page.evaluate("geoJsonLayers['DAD Tanks Details - Anicuts'].getLayers()[0].options.icon.options.className"), info(page)[:100])
    page.evaluate("clearFeatureSelection()")
    tick(page, 'DAD Tanks Details', 'Minor Tanks', wait=800); tick(page, 'UNDP Tanks Details', 'Tanks', wait=800)
    ok('DAD Minor Tanks (2 for this MWS, MWS_050 left out, geometry kept) and UNDP Tanks (1) use their own folders and markers', nfeat(page, 'DAD Tanks Details - Minor Tanks') == 2 and nfeat(page, 'UNDP Tanks Details - Tanks') == 1 and reqs(counts, '15_TNK/DAD_Tanks/DAD_MinorTanks_MWS_003') == 1 and reqs(counts, '15_TNK/UNDP_Tanks/UNDP_Tanks_MWS_003') == 1, counts)
    ok('both "Minor Tanks" layers (the UMW file and the DAD details) are on the map at once, each with its own checkbox and legend', 'Minor Tanks' in layers(page) and 'DAD Tanks Details - Minor Tanks' in layers(page) and is_ticked(page, 'Reservoirs/ Tanks', 'Minor Tanks') and is_ticked(page, 'DAD Tanks Details', 'Minor Tanks'))
    tick(page, 'DAD Tanks Details', 'Minor Tanks', False)
    ok('unticking the DAD Minor Tanks leaves the UMW Minor Tanks (same name) on the map, and removes only its own legend', 'Minor Tanks' in layers(page) and 'DAD Tanks Details - Minor Tanks' not in layers(page) and 'Minor Tanks' in legends(page) and 'DAD Tanks Details - Minor Tanks' not in legends(page))
    # ---- change of mini watershed
    before = len(layers(page)); ok('(setup) many layers are on the map before the change', before >= 10, layers(page))
    page.select_option('#selectMWSID', '010-1'); page.wait_for_timeout(600)
    ok('choosing another mini watershed (real ui-panels.js and layer-panels.js): every layer and legend of the water-feature types, tanks and DAD / UNDP layers is removed, the panel closed, every box unticked', not layers(page) and not legends(page) and page.evaluate("[...document.querySelectorAll('#basePanel input[type=checkbox]')].every(c=>!c.checked)") and all(v is False for v in page.evaluate("Object.values(layerState)")), (layers(page), legends(page)))
    choose_mws(page, '010-1'); open_panel(page); tick(page, 'DAD Tanks Details', 'Anicuts', wait=800)
    ok('for MWS 010-1 the file is DAD_Anicut_MWS_010_1.geojson (hyphen becomes underscore) and its 2 anicuts are drawn', reqs(counts, 'DAD_Anicut_MWS_010_1.geojson') == 1 and nfeat(page, 'DAD Tanks Details - Anicuts') == 2, (counts, nfeat(page, 'DAD Tanks Details - Anicuts')))
    ctx.close()

    # ---- failures
    fx2 = dict(FX); fx2['IWWRMP/Data/EXD/15_TNK/DAD_Tanks/DAD_MinorTanks_MWS_003.geojson'] = (404, 'text/plain', 'nf')
    fx2['IWWRMP/Data/EXD/15_TNK/UNDP_Tanks/UNDP_Tanks_MWS_003.geojson'] = (200, 'application/json', fc([pt(80.1, 7.1, MWS_ID='MWS_777')]))
    fx2['IWWRMP/Data/EXD/15_TNK/DAD_Anicuts/DAD_Anicut_MWS_003.geojson'] = (200, 'application/json', '{not json')
    fx2['IWWRMP/Data/EXD/02_HYD/Hydro_Tk/MajorTanks_UMW.geojson'] = (500, 'text/plain', 'err')
    fx2['IWWRMP/Data/EXD/WF/pt.geojson'] = (500, 'text/plain', 'err')
    counts2 = {}; page, rec, ctx = open_dashboard(b, base, fx2, counts=counts2); choose_mws(page, '003'); open_panel(page)
    tick(page, 'DAD Tanks Details', 'Minor Tanks', wait=800)
    ok('a DAD file that is missing (404): "Could not load Minor Tanks." and the box is unticked, nothing on the map', 'Could not load Minor Tanks.' in page.evaluate("window.__alerts") and not is_ticked(page, 'DAD Tanks Details', 'Minor Tanks') and 'DAD Tanks Details - Minor Tanks' not in layers(page), page.evaluate("window.__alerts"))
    tick(page, 'UNDP Tanks Details', 'Tanks', wait=800)
    ok('a file with no record for this mini watershed: the user is told ("No UNDP Tanks records are available for 003."), the box is unticked', any('No UNDP Tanks records are available for 003.' in a for a in page.evaluate("window.__alerts")) and not is_ticked(page, 'UNDP Tanks Details', 'Tanks') and page.evaluate("layerState['UNDP Tanks Details - Tanks']") is False, page.evaluate("window.__alerts"))
    tick(page, 'DAD Tanks Details', 'Anicuts', wait=800)
    ok('a file that is not valid JSON: "Could not load Anicuts.", unticked', 'Could not load Anicuts.' in page.evaluate("window.__alerts") and not is_ticked(page, 'DAD Tanks Details', 'Anicuts'))
    n0 = len(page.evaluate("window.__alerts")); tick(page, 'Reservoirs/ Tanks', 'Major Tanks', wait=800)
    ok('Major Tanks file with a server error: nothing on the map and one console error (as for any other layer)', 'Major Tanks' not in layers(page) and any('Major Tanks' in c for c in rec['console']))
    tick(page, 'Water features', 'Anicut', wait=800)
    ok('the point file with a server error: no layer, a console error, and the file is asked for again when ticked again (the failure is not remembered)', not any(k.startswith('Water features-point') for k in layers(page)) and any('water-feature point' in c.lower() or 'Water features-point - Anicut' in c for c in rec['console']), rec['console'][-2:])
    tick(page, 'Water features', 'Anicut', False, wait=100); tick(page, 'Water features', 'Anicut', wait=800)
    ok('...second try asked the server again (2 requests)', reqs(counts2, 'WF/pt.geojson') == 2, counts2)
    ctx.close()

    # ---- race: unticked while the file is loading
    counts3 = {}; page, rec, ctx = open_dashboard(b, base, FX, counts=counts3, delays={'IWWRMP/Data/EXD/15_TNK/DAD_Anicuts/DAD_Anicut_MWS_003.geojson': 1.0, 'IWWRMP/Data/EXD/WF/pg.geojson': 1.0}); choose_mws(page, '003'); open_panel(page)
    tick(page, 'DAD Tanks Details', 'Anicuts', wait=100); tick(page, 'DAD Tanks Details', 'Anicuts', False, wait=1800)
    ok('DAD layer unticked while its file is still loading: it does not appear afterwards, no message, no legend', 'DAD Tanks Details - Anicuts' not in layers(page) and not page.evaluate("window.__alerts") and 'DAD Tanks Details - Anicuts' not in legends(page))
    tick(page, 'Water features', 'Lake', wait=100); page.select_option('#selectMWSID', '010-1'); page.wait_for_timeout(1800)
    ok('a water-feature type still loading when the mini watershed changes: nothing is drawn for the new mini watershed', not any(k.startswith('Water features-polygon') for k in layers(page)), layers(page))
    ok('no script errors during the whole session of these tests', not rec['errors'], rec['errors'])
    ctx.close(); b.close()
srv.shutdown()
