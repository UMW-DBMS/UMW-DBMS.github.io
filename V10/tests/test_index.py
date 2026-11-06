import os, re
SRC = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read(); live = re.sub(r'<!--.*?-->', '', html, flags=re.S)
sc = re.findall(r'<script src="(js/[^"]+)"', live); R = []
def chk(n, c, d=''): R.append((n, bool(c), str(d)[:250]))
need = ['js/layers/layer-state.js', 'js/layers/layer-config.js', 'js/layers/layer-helpers.js', 'js/layers/layer-loaders.js', 'js/layers/layer-panels.js']
chk('the add-on is loaded AFTER every script it uses (layer-state, layer-config, layer-helpers, layer-loaders, layer-panels)', 'js/layers/proposal-cost-circles.js' in sc and all(sc.index(x) < sc.index('js/layers/proposal-cost-circles.js') for x in need), sc.index('js/layers/proposal-cost-circles.js') if 'js/layers/proposal-cost-circles.js' in sc else None)
chk('...and before ui-panels.js and area-explorer.js (which call the proposal loader later, by name)', sc.index('js/layers/proposal-cost-circles.js') < sc.index('js/core/ui-panels.js') < sc.index('js/area/area-explorer.js'))
chk('it appears once', sc.count('js/layers/proposal-cost-circles.js') == 1)
chk('the other 34 script tags are unchanged and in their order (only one line was added)', [s for s in sc if s != 'js/layers/proposal-cost-circles.js'] == ['js/layers/symbology.js', 'js/core/map-init.js', 'js/tools/map-tools.js', 'js/tools/locate-me.js', 'js/location/boundary-overview.js', 'js/location/location-selector.js', 'js/location/gn-search.js', 'js/panels/data-catalog.js', 'js/panels/catalog-panel.js', 'js/panels/data-table.js', 'js/panels/mws-info.js', 'js/panels/station-data.js', 'js/panels/station-cbo.js', 'js/statistics/statistics-shared.js', 'js/statistics/lulc-stats.js', 'js/statistics/admin-stats.js', 'js/statistics/population-stats.js', 'js/statistics/soil-stats.js', 'js/statistics/hazard-stats.js', 'js/tools/print-export.js', 'js/layers/layer-state.js', 'js/layers/layer-config.js', 'js/layers/layer-helpers.js', 'js/layers/layer-legends.js', 'js/layers/layer-loaders.js', 'js/layers/layer-water-features.js', 'js/layers/feature-info.js', 'js/layers/layer-panels.js', 'js/layers/layer-source-info.js', 'js/core/ui-panels.js', 'js/area/area-explorer.js', 'js/help/help-modal.js', 'js/core/translate.js', 'js/core/header-links.js'])
chk('every comment that is opened is closed', html.count('<!--') == html.count('-->'))
for n, c, d in R: print(('PASS ' if c else 'FAIL ') + n + ('' if c else '   -> ' + d))
print(f'\n{sum(1 for _, c, _ in R if c)} / {len(R)} passed')
