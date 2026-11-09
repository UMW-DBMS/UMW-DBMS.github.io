"""Test harness. Serves the project folder; answers every outside request (GitHub data, CDN libraries) locally.
Leaflet is the REAL library (tests/vendor). The real index.html, real CSS and all real scripts that exist in js/ are used; a script that is
not in js/ (it was not available) is replaced by a small stand-in (tests/stubs/*.standin.js) or an empty file."""
import os, glob, json, threading, functools, http.server, socketserver
from urllib.parse import unquote
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..'))
RAW = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/'
EXD = RAW + 'IWWRMP/Data/EXD/'
CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'}
PNG = bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cfc00000030101009ad9a74a0000000049454e44ae426082')
def rd(p): return open(os.path.join(HERE, p), 'rb').read()
def pt(x, y, **p): return {'type': 'Feature', 'properties': p, 'geometry': {'type': 'Point', 'coordinates': [x, y]}}
def poly(x, y, **p): return {'type': 'Feature', 'properties': p, 'geometry': {'type': 'Polygon', 'coordinates': [[[x, y], [x + .02, y], [x + .02, y + .02], [x, y + .02], [x, y]]]}}
def line(x, y, **p): return {'type': 'Feature', 'properties': p, 'geometry': {'type': 'LineString', 'coordinates': [[x, y], [x + .03, y + .02]]}}
def fc(f): return json.dumps({'type': 'FeatureCollection', 'features': f})
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); super().end_headers()
def serve():
    h = functools.partial(Quiet, directory=ROOT); socketserver.ThreadingTCPServer.allow_reuse_address = True
    s = socketserver.ThreadingTCPServer(('127.0.0.1', 0), h); threading.Thread(target=s.serve_forever, daemon=True).start(); return s, f'http://127.0.0.1:{s.server_address[1]}'
def launch(p):
    exe = glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome')
    return p.chromium.launch(executable_path=exe[0], args=['--no-sandbox']) if exe else p.chromium.launch(args=['--no-sandbox'])
INIT = "window.__alerts=[]; window.alert=function(m){window.__alerts.push(String(m));}; window.__open=[]; window.open=function(u){window.__open.push(String(u)); return null;}; localStorage.setItem('hide_help_modal_on_load','true'); window.__measure=false; window.handleMeasurePointFromLayer=function(){return window.__measure;}; window.isMeasureModeActive=function(){return window.__measure;};"
def cdn(route, url):
    low = url.lower().split('?')[0]
    if 'leaflet' in low and low.endswith('.js'): route.fulfill(status=200, content_type='application/javascript', body=rd('vendor/leaflet.js'))
    elif 'leaflet' in low and low.endswith('.css'): route.fulfill(status=200, content_type='text/css', body=rd('vendor/leaflet.css'))
    elif 'xlsx' in low: route.fulfill(status=200, content_type='application/javascript', body=rd('stubs/xlsx.js'))
    elif 'papaparse' in low: route.fulfill(status=200, content_type='application/javascript', body=rd('stubs/papaparse.js'))
    elif 'chart' in low and low.endswith('.js'): route.fulfill(status=200, content_type='application/javascript', body=rd('stubs/chart.js'))
    elif 'translate.google' in low or low.endswith('.js'): route.fulfill(status=200, content_type='application/javascript', body='')
    elif low.endswith('.css') or 'fonts.g' in low or 'font-awesome' in low: route.fulfill(status=200, content_type='text/css', body='')
    elif 'tile.openstreetmap' in low or 'arcgisonline' in low or low.endswith('.png'): route.fulfill(status=200, content_type='image/png', body=PNG)
    else: return False
    return True
def open_dashboard(browser, base, fixtures, viewport=None, counts=None, delays=None, init='', block=()):
    """Open the real index.html. fixtures: path under the repo root -> (status, content_type, body). delays: path -> seconds to wait before answering."""
    ctx = browser.new_context(viewport=viewport or {'width': 1440, 'height': 900}, accept_downloads=True); ctx.add_init_script(INIT + init)
    rec = {'errors': [], 'console': [], 'requests': []}
    import time
    def handler(route):
        req = route.request; url = req.url; rec['requests'].append(url)
        if url.startswith(base):
            name = url[len(base) + 1:].split('?')[0]
            if any(f in name for f in block): return route.fulfill(status=404, body='not found')
            if name.startswith('js/') and name.endswith('.js') and not os.path.exists(os.path.join(ROOT, name)):
                stand = {'js/panels/station-data.js': 'stubs/station-data.standin.js', 'js/location/location-selector.js': 'stubs/location-selector.standin.js'}.get(name)
                return route.fulfill(status=200, content_type='application/javascript', body=rd(stand) if stand else '')
            return route.continue_()
        if route.request.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS, body='')
        if cdn(route, url): return
        if url.startswith(RAW):
            key = unquote(url[len(RAW):].split('?')[0])
            if counts is not None: counts[key] = counts.get(key, 0) + 1
            if delays and key in delays: time.sleep(delays[key])
            if key in fixtures:
                st, ct, body = fixtures[key]; return route.fulfill(status=st, headers=CORS, content_type=ct, body=body)
            return route.fulfill(status=404, headers=CORS, body='not found')
        return route.fulfill(status=404, body='')
    ctx.route('**/*', handler); page = ctx.new_page(); page.set_default_timeout(20000)
    page.on('pageerror', lambda e: rec['errors'].append(str(e).split('\n')[0]))
    page.on('console', lambda m: rec['console'].append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    page.goto(base + '/index.html', wait_until='load', timeout=30000)
    page.wait_for_function("typeof map !== 'undefined' && document.querySelectorAll('#selectMWSID option').length > 1 && typeof geoJsonLayers !== 'undefined'", timeout=15000)
    page.wait_for_timeout(300)
    return page, rec, ctx
def choose_mws(page, mws='003'):
    page.select_option('#selectDist', 'Kandy'); page.select_option('#selectDSD', 'Pathahewaheta'); page.select_option('#selectMWSID', mws)
    page.wait_for_timeout(120); page.click('#goBtn'); page.wait_for_timeout(150)
