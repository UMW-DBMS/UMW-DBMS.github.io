"""Welcome window banner on the REAL index.html with your real CSS, the real logo files and the real scripts that exist (others are stand-ins)."""
import os, sys, json
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
SHOW = "localStorage.removeItem('hide_help_modal_on_load');"
MEASURE = """(()=>{const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}};
  const top=e=>{const r=e.getBoundingClientRect(); const x=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2); return !!x&&(e===x||e.contains(x))};
  const md=document.getElementById('readme-modal'), mc=md.querySelector('.modal-content'), bn=mc.querySelector('.welcome-banner'), hd=document.querySelector('.app-header'), fc=mc.querySelector('.flowchart'), ft=mc.querySelector('.modal-footer'), cur=mc.querySelector('.flow-node.current-step');
  const imgs=[...bn.querySelectorAll('img')];
  return {zModal:+getComputedStyle(md).zIndex, zHeader:+getComputedStyle(hd).zIndex, display:getComputedStyle(md).display, topmost:[bn.querySelector('h2'), bn.querySelector('.welcome-ministry'), bn.querySelector('.welcome-project'), ...imgs].map(top),
    logos:imgs.map(i=>({w:i.naturalWidth,h:i.naturalHeight,box:R(i),shown:getComputedStyle(i).display!=='none'})), modal:R(mc), banner:R(bn), footer:R(ft), flow:R(fc), cur:cur?R(cur):null, vh:innerHeight,
    ministry:{tt:getComputedStyle(bn.querySelector('.welcome-ministry')).textTransform, fs:parseFloat(getComputedStyle(bn.querySelector('.welcome-ministry')).fontSize), ls:getComputedStyle(bn.querySelector('.welcome-ministry')).letterSpacing},
    headerSub:getComputedStyle(document.querySelector('.app-topbar .brand-text p')).textTransform, pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    curScrolls: cur ? cur.scrollHeight > cur.clientHeight + 1 : false, curStyle: cur ? getComputedStyle(cur).overflowY : ''}})()"""
srv, base = serve()
with sync_playwright() as p:
    b = launch(p)
    for label, vp in (('laptop 1366x768', {'width': 1366, 'height': 768}), ('desktop 1440x900', {'width': 1440, 'height': 900}), ('short 1280x600', {'width': 1280, 'height': 600}), ('phone 390x800', {'width': 390, 'height': 800})):
        page, rec, ctx = open_dashboard(b, base, {}, viewport=vp, init=SHOW); page.wait_for_timeout(1200); m = page.evaluate(MEASURE)
        ok(f'[{label}] the window is open and above the real header (z-index {m["zModal"]} over {m["zHeader"]}); title, ministry, project and both logos are the topmost things at their position', m['display'] == 'flex' and m['zModal'] > m['zHeader'] and all(m['topmost']), m['topmost'])
        ok(f'[{label}] both logo files load and show (emblem 104 x 137, IWWRMP 160 x 92); emblem left of the names, IWWRMP right' + ('' if vp['width'] > 600 else ' (phone: both above the names)'), [(l['w'], l['h']) for l in m['logos']] == [(104, 137), (160, 92)] and all(l['shown'] for l in m['logos']) and (vp['width'] <= 600 or (m['logos'][0]['box']['r'] <= m['banner']['l'] + m['banner']['w'] / 2 <= m['logos'][1]['box']['l'])), m['logos'])
        ok(f'[{label}] ministry and project lines are normal sentence case (the header\'s uppercase style does not leak in); the real header subtitle is still uppercase', m['ministry']['tt'] == 'none' and m['ministry']['ls'] == 'normal' and m['headerSub'] == 'uppercase', (m['ministry'], m['headerSub']))
        ok(f'[{label}] window and Close / Next buttons fully on screen; no sideways page scroll', m['modal']['t'] >= 0 and m['modal']['b'] <= m['vh'] and m['footer']['b'] <= m['vh'] and m['pageOverflow'] <= 1, (m['modal'], m['footer'], m['vh']))
        ok(f'[{label}] the current step card is inside its box (it scrolls inside the box when it is taller instead of being cut off)', m['cur'] and m['cur']['t'] >= m['flow']['t'] - 1 and m['cur']['b'] <= m['flow']['b'] + 1 and m['curStyle'] == 'auto', {'cur': m['cur'], 'flow': m['flow'], 'ov': m['curStyle']})
        page.screenshot(path=os.path.join(HERE, f'welcome-{label.split()[0]}.png'), animations='disabled', timeout=40000); ctx.close()
    page, rec, ctx = open_dashboard(b, base, {}, init=SHOW); page.wait_for_timeout(1200)
    d = page.evaluate("""(()=>{const mc=document.querySelector('#readme-modal .modal-content'), bn=mc.querySelector('.welcome-banner'); return {first:mc.firstElementChild===bn, before:bn.nextElementSibling===mc.querySelector('.flowchart'), n:mc.querySelectorAll('.welcome-banner').length, h2s:[...document.querySelectorAll('#readme-modal h2')].map(h=>h.textContent), ministry:bn.querySelector('.welcome-ministry').textContent, project:bn.querySelector('.welcome-project').textContent, order:[...bn.children].map(c=>c.tagName), src:[...bn.querySelectorAll('img')].map(i=>i.getAttribute('src')), alt:[...bn.querySelectorAll('img')].map(i=>!!i.alt), steps:document.querySelectorAll('#readme-modal .flow-node').length, media:[document.querySelectorAll('#readme-modal .step-photo').length, document.querySelectorAll('#readme-modal .step-video').length]}})()""")
    ok('banner built once, first in the window, just before the steps; the TRC wording exactly; one heading only; ministry logo | names | IWWRMP logo; alt text on both logos', d['first'] and d['before'] and d['n'] == 1 and d['h2s'] == ['Welcome to the Upper Mahaweli Database'] and d['ministry'] == 'Ministry of Agriculture, Livestock, Land and Irrigation' and d['project'] == 'Integrated Watershed and Water Resources Management Project' and d['order'] == ['IMG', 'DIV', 'IMG'] and d['src'] == ['assets/logos/ministry-logo.png', 'assets/logos/iwwrmp-logo.png'] and all(d['alt']), d)
    ok('your 10 steps are unchanged and each still gets its photo and video', d['steps'] == 10 and d['media'] == [10, 10], d)
    cur = lambda: page.evaluate("[...document.querySelectorAll('#readme-modal .flow-node')].findIndex(n=>n.classList.contains('current-step'))")
    c0 = cur(); page.click('#next-step-btn'); page.click('#next-step-btn'); c2 = cur(); page.click('#prev-step-btn'); c1 = cur()
    ok('Next and Previous still move between the steps', (c0, c2, c1) == (0, 2, 1), (c0, c2, c1))
    page.click('#close-readme'); closed = page.evaluate("getComputedStyle(document.getElementById('readme-modal')).display"); page.evaluate("document.getElementById('help-button').click()"); reopened = page.evaluate("getComputedStyle(document.getElementById('readme-modal')).display")
    ok('Close hides the window; the Help button shows it again at step 1, banner still there once, and does not open the guide instead', closed == 'none' and reopened == 'flex' and cur() == 0 and page.evaluate("document.querySelectorAll('.welcome-banner').length") == 1 and page.evaluate("window.__open.length") == 0, (closed, reopened, page.evaluate("window.__open")))
    page.keyboard.press('Escape'); ok('Escape closes it', page.evaluate("getComputedStyle(document.getElementById('readme-modal')).display") == 'none'); ctx.close()
    page, rec, ctx = open_dashboard(b, base, {}); ok('a visitor who chose "Don\'t show again": hidden at load, banner already built, Help opens it complete', page.evaluate("getComputedStyle(document.getElementById('readme-modal')).display") == 'none' and page.evaluate("document.querySelectorAll('.welcome-banner').length") == 1); ctx.close()
    page, rec, ctx = open_dashboard(b, base, {}, init=SHOW, block=('assets/logos/',)); page.wait_for_timeout(900)
    m = page.evaluate("""(()=>{const bn=document.querySelector('.welcome-banner'); const imgs=[...bn.querySelectorAll('img')]; return {hidden:imgs.map(i=>getComputedStyle(i).display), visible:[bn.querySelector('h2'),bn.querySelector('.welcome-ministry'),bn.querySelector('.welcome-project')].map(e=>e.getBoundingClientRect().height>0)}})()""")
    ok('logo files not in the folder: both logos hidden (no broken-image symbol), the three text lines still show', m['hidden'] == ['none', 'none'] and all(m['visible']), m); ctx.close(); b.close()
srv.shutdown()
