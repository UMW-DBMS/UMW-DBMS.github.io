"""Cost-estimate circles for every proposal layer. Stand-ins typed from the old script for the helpers and the loader (same circle logic), real Leaflet, the real add-on."""
import os, sys, json, glob, threading, functools, http.server, socketserver, shutil, tempfile
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.abspath(os.path.join(HERE, '..'))
R = []
def ok(name, cond, detail=''): R.append((name, bool(cond), str(detail)[:380]))
import atexit
def _rep():
    bad = [r for r in R if not r[1]]
    for n, o, d in R: print(('PASS ' if o else 'FAIL ') + n + ('' if o else '   -> ' + d))
    print(f'\n{len(R) - len(bad)} / {len(R)} passed')
atexit.register(_rep)
def pt(i, **p): return {'type': 'Feature', 'properties': p, 'geometry': {'type': 'Point', 'coordinates': [80.5 + 0.02 * i, 7.0 + 0.01 * i]}}
def fc(f): return json.dumps({'type': 'FeatureCollection', 'features': f})
DATA = {
    'old_on_site': fc([pt(0, No=1, Total_Cost=40000), pt(1, No=2, Total_Cost=150000), pt(2, No=3, Total_Cost='500,000'), pt(3, No=4)]),
    'dev': fc([pt(0, No=1, Total_Cost=25000), pt(1, No=2, Total_Cost=900000)]),
    'estimate_text': fc([pt(0, No=1, **{'Estimate (Rs)': 'Rs. 1,250,000.00'}), pt(1, No=2, **{'Estimate (Rs)': '75,000/='}), pt(2, No=3, **{'Estimate (Rs)': 'LKR 30000'}), pt(3, No=4, **{'Estimate (Rs)': 'TBD'}), pt(4, No=5, **{'Estimate (Rs)': '-'}), pt(5, No=6, **{'Estimate (Rs)': ''})]),
    'cost_estimate': fc([pt(0, No=1, Cost_Estimate=120000), pt(1, No=2, COST_ESTIMATE=60000)]),
    'budget': fc([pt(0, No=1, Budget=80000), pt(1, No=2, budget=300000)]),
    'unit_only': fc([pt(0, No=1, Unit_Cost=1500, Length_km=2), pt(1, No=2, Cost_per_km=90000)]),
    'both': fc([pt(0, No=1, Unit_Cost=1500, Total_Cost=500000, Estimate=10)]),
    'contains': fc([pt(0, No=1, Proposed_Amount_Rs=180000, Status='Approved'), pt(1, No=2, Funding_Source='GEF', Phase_cost='95000')]),
    'none': fc([pt(0, No=1, Name='A'), pt(1, No=2, Name='B')]),
    'zero': fc([pt(0, No=1, Total_Cost=0), pt(1, No=2, Total_Cost='0.00')]),
    'mixed': fc([pt(0, No=1, Total_Cost=60000), pt(1, No=2), pt(2, No=3, Total_Cost='')]),
    'nonum': fc([pt(0, Total_Cost=40000, Name='no number')]),
    'polygon': json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'No': 1, 'Total_Cost': 100000}, 'geometry': {'type': 'Polygon', 'coordinates': [[[80.5, 7.0], [80.6, 7.0], [80.6, 7.1], [80.5, 7.0]]]}}]}),
    'base_with_cost': fc([pt(0, No=1, Total_Cost=40000, Name='a base layer point')]),
    'empty': fc([]),
}
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); super().end_headers()
def build(addon=True, twice=False, without=None):
    d = tempfile.mkdtemp(prefix='cc_'); shutil.copytree(os.path.join(HERE, 'standins'), os.path.join(d, 'standins')); shutil.copytree(os.path.join(HERE, 'vendor'), os.path.join(d, 'vendor'))
    os.makedirs(os.path.join(d, 'js', 'layers')); shutil.copy(os.path.join(SRC, 'js', 'layers', 'proposal-cost-circles.js'), os.path.join(d, 'js', 'layers', 'proposal-cost-circles.js'))
    page = open(os.path.join(HERE, 'page.html'), encoding='utf-8').read()
    tag = '<script src="js/layers/proposal-cost-circles.js"></script>' * (2 if twice else 1) if addon else ''
    if without: page = page.replace('<script src="standins/%s.js"></script>' % without, '')
    open(os.path.join(d, 'page.html'), 'w', encoding='utf-8').write(page.replace('<!--ADDON-->', tag)); return d
def serve(directory):
    h = functools.partial(Quiet, directory=directory); socketserver.ThreadingTCPServer.allow_reuse_address = True
    s = socketserver.ThreadingTCPServer(('127.0.0.1', 0), h); threading.Thread(target=s.serve_forever, daemon=True).start(); return s, f'http://127.0.0.1:{s.server_address[1]}'
def launch(p):
    exe = glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome'); return p.chromium.launch(executable_path=exe[0], args=['--no-sandbox']) if exe else p.chromium.launch(args=['--no-sandbox'])
def open_page(b, base):
    ctx = b.new_context(viewport={'width': 1000, 'height': 700}); rec = {'errors': [], 'info': [], 'warn': [], 'err': []}
    def h(route):
        url = route.request.url
        if url.startswith(base): return route.continue_()
        if url.startswith('https://data.test/'):
            name = url.split('/')[-1].replace('.geojson', '')
            if name in DATA: return route.fulfill(status=200, headers={'Access-Control-Allow-Origin': '*'}, content_type='application/json', body=DATA[name])
            return route.fulfill(status=404, headers={'Access-Control-Allow-Origin': '*'}, body='nf')
        route.fulfill(status=404, body='')
    ctx.route('**/*', h); page = ctx.new_page(); page.set_default_timeout(15000)
    page.on('pageerror', lambda e: rec['errors'].append(str(e).split('\n')[0]))
    page.on('console', lambda m: (rec['info'] if m.type == 'info' else rec['warn'] if m.type == 'warning' else rec['err'] if m.type == 'error' else []).append(m.text))
    page.goto(base + '/page.html', wait_until='load'); page.wait_for_timeout(200); return page, rec, ctx
def load(page, name, layer, proposal=True, wait=900):
    page.evaluate("([n,l,p])=>{ window.__ret = (p ? loadGeoJsonLayerP : loadGeoJsonLayer)('https://data.test/'+n+'.geojson', l); }", [name, layer, proposal]); page.wait_for_timeout(wait)
def feats(page, layer):
    return page.evaluate("""l=>{ const g=geoJsonLayers[l]; if(!g) return null; const out=[]; g.eachLayer(x=>{ const hasCircle = !!(x.eachLayer && (()=>{let c=null; x.eachLayer(y=>{ if(y instanceof L.CircleMarker) c=y; }); return c})()); let circle=null; if(x.eachLayer) x.eachLayer(y=>{ if(y instanceof L.CircleMarker) circle=y; });
        const tip = (()=>{ let t=null; const f=y=>{ if(y.getTooltip && y.getTooltip()) t=y.getTooltip().getContent(); }; f(x); if(x.eachLayer) x.eachLayer(f); return t })();
        out.push({props:x.feature.properties, circle: circle ? {r:circle.options.radius, color:circle.options.color, fill:circle.options.fillColor, op:circle.options.fillOpacity, stroke:circle.options.stroke} : null, label: tip}); }); return out }""", layer)
def radii(page, layer): return [f['circle']['r'] if f['circle'] else None for f in feats(page, layer)]
def labels(page, layer): return [f['label'] for f in feats(page, layer)]
srv = None
site = build(); srv, base = serve(site)
with sync_playwright() as p:
    b = launch(p)
    page, rec, ctx = open_page(b, base)
    ok('the add-on starts: ProposalCostCircles is active and the loader, the helper and the label set are still functions / a Set', page.evaluate("ProposalCostCircles.active === true && typeof loadGeoJsonLayerP === 'function' && typeof getAmountFromProps === 'function' && proposalLabelLayers instanceof Set") and not rec['errors'] and not rec['warn'], (rec['errors'], rec['warn']))
    # ---- 1 unchanged layers
    load(page, 'old_on_site', 'Soil and water conservation - on site'); r = radii(page, 'Soil and water conservation - on site')
    ok('a layer that already had circles is unchanged: 40,000 -> radius 15, 150,000 -> 18, "500,000" (text with a comma) -> 35, no cost -> no circle', r == [15, 18, 35, None], r)
    f0 = feats(page, 'Soil and water conservation - on site')[0]['circle']
    ok('...with the same look as before: blue (#1e88e5), no outline, 15 % fill', f0['color'] == '#1e88e5' and f0['fill'] == '#1e88e5' and f0['op'] == 0.15 and f0['stroke'] is False, f0)
    ok('...and the same proposal number labels (1, 2, 3, 4)', labels(page, 'Soil and water conservation - on site') == ['1', '2', '3', '4'], labels(page, 'Soil and water conservation - on site'))
    # ---- 2 layers that were not in the list
    for lay in ('Developments', 'Pecoe trail', 'Tourist attract places', 'A layer added next year'):
        load(page, 'dev', lay, wait=500)
    ok('layers that were NOT in the old list (Developments, Pecoe trail, Tourist attract places, and a layer with any new name) now get circles by cost: 25,000 -> 15, 900,000 -> 35', all(radii(page, l) == [15, 35] for l in ('Developments', 'Pecoe trail', 'Tourist attract places', 'A layer added next year')), [radii(page, l) for l in ('Developments', 'Pecoe trail')])
    ok('...and their proposal numbers are shown (1, 2), as on the other proposal layers', labels(page, 'Developments') == ['1', '2'])
    ok('the layer name is added to the label set in lower case, once', page.evaluate("[proposalLabelLayers.has('developments'), proposalLabelLayers.has('pecoe trail'), proposalLabelLayers.has('a layer added next year')]") == [True, True, True])
    load(page, 'dev', 'Domestic Water Supply', wait=500); ok('names with capitals ("Domestic Water Supply") work: the label set is compared in lower case', radii(page, 'Domestic Water Supply') == [15, 35])
    # ---- 3 other column names and text values
    load(page, 'estimate_text', 'Water quality improvement'); r = radii(page, 'Water quality improvement')
    ok('a cost column called "Estimate (Rs)" with text values: "Rs. 1,250,000.00" -> 35, "75,000/=" -> 18, "LKR 30000" -> 15; "TBD", "-" and an empty cell -> no circle (the marker stays)', r == [35, 18, 15, None, None, None], r)
    load(page, 'cost_estimate', 'Minor tanks'); ok('"Cost_Estimate" and "COST_ESTIMATE" (any capitals and punctuation) are found', radii(page, 'Minor tanks') == [18, 18], radii(page, 'Minor tanks'))
    load(page, 'budget', 'Stream reservation'); ok('"Budget" and "budget" are found', radii(page, 'Stream reservation') == [18, 35], radii(page, 'Stream reservation'))
    load(page, 'contains', 'Water source protection'); r = radii(page, 'Water source protection')
    ok('a column that merely contains the word ("Proposed_Amount_Rs", "Phase_cost" with the text "95000") is used; "Status" and "Funding_Source" are not mistaken for a cost (180,000 -> 18, 95,000 -> 18)', r == [18, 18], r)
    # ---- 4 things that must NOT become circles
    load(page, 'unit_only', 'Landslides'); ok('a unit cost ("Unit_Cost", "Cost_per_km") is not the cost of the proposal: no circles, no mistakes', radii(page, 'Landslides') == [None, None], radii(page, 'Landslides'))
    load(page, 'both', 'Minor irrigation related proposals'); ok('a layer with Total_Cost 500,000, a Unit_Cost 1,500 and an "Estimate" of 10: the first original column wins (Total_Cost, radius 35)', radii(page, 'Minor irrigation related proposals') == [35], radii(page, 'Minor irrigation related proposals'))
    load(page, 'none', 'Proposal without cost'); ok('a layer with no cost column at all: no circles, markers only, labels still shown, no error', radii(page, 'Proposal without cost') == [None, None] and labels(page, 'Proposal without cost') == ['1', '2'] and not rec['errors'], radii(page, 'Proposal without cost'))
    load(page, 'zero', 'Zero cost layer'); ok('a cost of 0 (or "0.00") gives the smallest circle, as the existing code did', radii(page, 'Zero cost layer') == [15, 15], radii(page, 'Zero cost layer'))
    load(page, 'mixed', 'Mixed layer'); ok('a layer where only some features have a cost: circles only on those (60,000 -> 18; blank and missing -> none)', radii(page, 'Mixed layer') == [18, None, None], radii(page, 'Mixed layer'))
    load(page, 'nonum', 'No number layer'); ok('a feature with a cost but no proposal number: circle yes, label no', radii(page, 'No number layer') == [15] and labels(page, 'No number layer') == [None], (radii(page, 'No number layer'), labels(page, 'No number layer')))
    load(page, 'polygon', 'Area proposal'); fp = page.evaluate("(()=>{const out=[]; geoJsonLayers['Area proposal'].eachLayer(x=>out.push(x instanceof L.Polygon)); return out})()")
    ok('a proposal drawn as an area (not a point) is left as it was: no circle, no error (circles are for points only)', fp == [True] and not rec['errors'], fp)
    # ---- 5 base layers are not touched
    load(page, 'base_with_cost', 'Land cover', proposal=False); ok('a BASE layer (opened through the Base Layers loader) that happens to have a Total_Cost column gets no circle: nothing changes for base layers', radii(page, 'Land cover') == [None] and labels(page, 'Land cover') == ['1'] or radii(page, 'Land cover') == [None], (radii(page, 'Land cover'), labels(page, 'Land cover')))
    ok('...and the label set did not learn the base layer name', page.evaluate("proposalLabelLayers.has('land cover')") is False)
    # ---- 6 the wrapper
    page.evaluate("window.__ret = loadGeoJsonLayerP('https://data.test/dev.geojson', 'Return check')"); page.wait_for_timeout(400)
    ok('the wrapper hands back what the original loader returns and passes both arguments on (the layer "Return check" was drawn from the file it was given)', page.evaluate("window.__ret") == 'loader-return' and radii(page, 'Return check') == [15, 35], page.evaluate("window.__ret"))
    ok('the helper still returns what it returned: the original columns first (Total_Cost 7), null when there is nothing; the widened search only after that', page.evaluate("[getAmountFromProps({Total_Cost: 7, Estimate: 9}), getAmountFromProps({Name:'x'}), getAmountFromProps(null), getAmountFromProps({Estimate:'Rs 12,000'}), getAmountFromProps({'Amount (LKR):': '5,000'})]") == [7, None, None, 12000, 5000])
    ok('findCost reports which column it used (for the console message): Estimate -> "Estimate"', page.evaluate("[ProposalCostCircles.findCost({Estimate: 5}).column, ProposalCostCircles.findCost({Foo: 5}).column, ProposalCostCircles.findCost({Foo:'1'}).value]") == ['Estimate', '', None])
    # ---- 7 the report
    page.wait_for_timeout(500); S = page.evaluate("ProposalCostCircles.summary()")
    ok('summary(): per layer how many features have a cost and from which column (Water quality improvement: 3 of 6 from "Estimate (Rs)"; Proposal without cost: 0 of 2)', S['Water quality improvement']['withCost'] == 3 and S['Water quality improvement']['features'] == 6 and S['Water quality improvement']['column'] == 'Estimate (Rs)' and S['Proposal without cost']['withCost'] == 0 and S['Soil and water conservation - on site']['withCost'] == 3 and S['Soil and water conservation - on site']['column'] == 'Total_Cost', {k: (v['withCost'], v['features'], v['column']) for k, v in list(S.items())[:6]})
    infos = ' || '.join(rec['info'])
    ok('the console says what happened for each layer: "cost circles for 3 of 6 features (column "Estimate (Rs)")"', '[Proposal cost circles] Water quality improvement: cost circles for 3 of 6 features (column "Estimate (Rs)")' in infos, infos[:300])
    ok('a layer with no cost found is explained in the console, listing its columns so you can see which one to add: "no cost found in any of 2 features. Columns in the data: No, Name"', '[Proposal cost circles] Proposal without cost: no circle, no cost found in any of 2 features. Columns in the data: No, Name.' in infos, [i for i in rec['info'] if 'without cost' in i])
    ok('no script errors in all of that', not rec['errors'] and not rec['err'], (rec['errors'], rec['err']))
    # ---- 8 failures
    page.evaluate("loadGeoJsonLayerP('https://data.test/does_not_exist.geojson', 'Gone layer')"); page.wait_for_timeout(700)
    ok('a layer whose file does not exist (404): the loader writes its own error, the add-on adds nothing and raises no error', 'Gone layer' not in page.evaluate("Object.keys(geoJsonLayers)") and not rec['errors'] and any('Gone layer' in e for e in rec['err']), rec['err'][-1:])
    load(page, 'empty', 'Empty layer'); ok('a layer with no features: nothing drawn, no error, no console message', radii(page, 'Empty layer') == [] and not rec['errors'] and not any('Empty layer' in i for i in rec['info']))
    ctx.close()
    # ---- 9 the add-on absent / broken / twice
    site0 = build(addon=False); srv0, base0 = serve(site0); page, rec, ctx = open_page(b, base0); load(page, 'estimate_text', 'Water quality improvement'); load(page, 'dev', 'Developments', wait=500)
    ok('WITHOUT the add-on the page behaves exactly as it does today (this is the "before"): "Water quality improvement" ("Estimate (Rs)" text) has no circle and "Developments" (not in the list) has none either', radii(page, 'Water quality improvement') == [None] * 6 and radii(page, 'Developments') == [None, None], (radii(page, 'Water quality improvement'), radii(page, 'Developments'))); ctx.close(); srv0.shutdown()
    site2 = build(twice=True); srv2, base2 = serve(site2); page, rec, ctx = open_page(b, base2); load(page, 'dev', 'Developments', wait=500)
    ok('the add-on loaded twice (the script tag added twice by mistake) does no harm: one set of wrappers, circles drawn once per feature', radii(page, 'Developments') == [15, 35] and page.evaluate("feats = 0; (()=>{ let n=0; geoJsonLayers['Developments'].eachLayer(x=>{ if(x.eachLayer) x.eachLayer(y=>{ if(y instanceof L.CircleMarker) n++; }); }); return n })()") == 2 and not rec['errors'], radii(page, 'Developments')); ctx.close(); srv2.shutdown()
    for missing in ('layer-helpers', 'layer-config', 'layer-loaders', 'layer-state'):
        s3 = build(without=missing); sv3, b3 = serve(s3); ctx3 = b.new_context(); pg = ctx3.new_page(); errs = []; warns = []; pg.on('pageerror', lambda e: errs.append(str(e)[:100])); pg.on('console', lambda m: warns.append(m.text) if m.type == 'warning' else None)
        ctx3.route('**/*', (lambda base_: (lambda route: route.continue_() if route.request.url.startswith(base_) else route.fulfill(status=404, body='')))(b3)); pg.goto(b3 + '/page.html', wait_until='load'); pg.wait_for_timeout(300)
        ok(f'if {missing}.js is not loaded before the add-on, it writes one clear warning in the console and changes nothing (no cost circles, but nothing breaks)', any('[Proposal cost circles] not started' in w for w in warns) and pg.evaluate("ProposalCostCircles.active") is False, (warns[:1], errs[:1])); ctx3.close(); sv3.shutdown()
    b.close()
srv.shutdown()
