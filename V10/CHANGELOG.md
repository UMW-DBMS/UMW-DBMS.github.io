# UMW Watershed Management Plan: restructure, fixes, visual refresh, symbology and catalog

Round 4 (TRC review; new Base Layers and Station Data layers; KML) is described first, then round 3 (map symbology, legends, data catalog), then round 2 (Go lock and visual refresh), then round 1 (fixes A/D and file restructure).

## Round 4: TRC review comments, new Base Layers and Station Data layers, KML download

Source: "TRC comments for GIS database - 36 DSDs" and the updated single-file dashboard (`index (3).html` with `all5m1_v3_photo_legend_highlight.js`). Only the changes listed below were made; every other file is as it was.

### Welcome (selection) window
Ministry emblem, the title "Welcome to the Upper Mahaweli Database", the ministry name, the project name and the IWWRMP logo (emblem left, IWWRMP right, as in the TRC sample). Built in `js/help/help-modal.js` from one settings block (`WELCOME_BANNER`); `index.html` is unchanged for it. Logos: `assets/logos/ministry-logo.png` and `iwwrmp-logo.png` (taken from the TRC Word file: small, 104 x 137 and 160 x 92 px: replace them with the original logo files, same names). A missing logo file is hidden and the names still show. `tools/extract-logos-from-docx.py` extracts them from the Word file (by position on the page).
Found against the real CSS and fixed: the window (z-index 1000) was behind the page header (1100); it is now above it, may use 92% of the screen height (96% under 700 px), and in step mode a step card taller than its 360 px box scrolls inside it instead of being cut off.

### Base Layers (new, from the updated dashboard) - `js/layers/layer-water-features.js`
- **Water features-point / -polygon / -line**: one source file each, shown as one check box per feature type (10 point types, 4 polygon types, 4 line types), filtered by the feature code; each file is read once. Point names are shown as labels (`css/symbology.css`). Each type drawn gets its own legend card. The polygon type colour comes from `symbology.js`. Lines can now be clicked (they could not on the old page).
- **Reservoirs/ Tanks**: Major Tanks and Minor Tanks from `02_HYD/Hydro_Tk/MajorTanks_UMW.geojson` and `MinorTanks_UMW.geojson`. Fixed tank colours (not recoloured by attributes such as `level` or `NAME`), name labels on major tanks, the map zooms to the tanks. The registry's own Minor/Major Tanks rows are replaced.
- **DAD Tanks Details** (Minor Tanks, Anicuts) and **UNDP Tanks Details** (Tanks): one file per mini watershed under `15_TNK/`, filtered to the selected MWS (MWS_003, 003 and 3 are the same), drawn with new markers in `symbology.js` (also listed on the Map Symbols page). Anicuts are placed from their Lat and Lng.
- The three new categories follow "Water features" in the panel. Changed existing files: `layer-panels.js` (hooks and a layer key that keeps the DAD "Minor Tanks" apart from the UMW "Minor Tanks"), `layer-loaders.js` (tank labels and zoom), `symbology.js` (3 markers, 2 styles; 954 comparisons of existing results: 0 differences), `feature-info.js` (a clicked circle point is highlighted; the cost circles of proposals are left alone), `symbology-guide.js`, `css/symbology.css`, `index.html` (two script tags).
- Differences from the old page: a DAD file with no record for the mini watershed unticks its box (it stayed ticked); a layer unticked or a mini watershed changed while a file is loading draws nothing; a failed file is asked for again when ticked again; the new categories use the same heading style as the others; a layer's legend is shown for the new layers (the old page had none for them).

### Station Data (new, from the updated dashboard) - `js/panels/station-cbo.js`
The group "CBO Data - Department of National Community Water Supply": 14 categories, each with a check box and a "See more" link; data from `14_CBO/<category>.geojson`, each in its own colour, with a legend card; a click opens Feature Info. It is a separate file because `station-data.js` could not be edited (it was not available). CBO layers are kept in the same registry as the Base Layers, so ticking a station never removes them and they are printed; like every other layer, a new District, DSD or MWS clears them (on the old page they stayed). A category whose file is missing is unticked with "could not be loaded" beside it.

### Data catalog: KML download
GeoJSON layers get a "Download KML" button next to "Download GeoJSON" **only when a KML file exists**. The KML files are made separately. `CatalogMeta.kmlSourceOf()` (`catalog-metadata.js`) decides where the KML is: a registry column `kml` (also `kml_url`, `kml_file`, `download_kml`) with a full address or a file name in the GeoJSON's folder; otherwise the file next to the GeoJSON with the same name (`LND_LULC_MWS_003.geojson` -> `LND_LULC_MWS_003.kml`). `catalog-page.js` checks with one HEAD request (remembered), shows the button, and downloads with the existing function. The `kml` column is not listed under "More details".

### New and changed files
Changed: `index.html`, `css/symbology.css`, `js/help/help-modal.js`, `js/catalog/catalog-metadata.js`, `js/catalog/catalog-page.js`, `js/guide/symbology-guide.js`, `js/layers/feature-info.js`, `js/layers/layer-loaders.js`, `js/layers/layer-panels.js`, `js/layers/symbology.js`.
New: `js/layers/layer-water-features.js`, `js/panels/station-cbo.js`, `assets/logos/`, `tools/extract-logos-from-docx.py`, `tests/`, `docs/`.

### Still to check
- `station-data.js` and 14 other scripts were not available: the CBO group is tested against a stand-in of `station-data.js` (the tests say so). Open Station Data once on the live site and confirm the CBO group appears and a station layer can be ticked together with a CBO layer.
- Printing (`print-export.js` was not available): the new layers are registered where the print function reads layers (`geoJsonLayers`, `layerState`, `layerLegends`), as the old page's were, but a print was not run.
- Typos kept as they were on the old page: the line type label "Tunels".

### How it was tested (round 4)
Real Chromium on your real `index.html`, `MWSDataCatalog.html`, `symbology-guide.html` and CSS, with your real scripts that were available and the real Leaflet 1.9.3: 54 checks of the new Base Layers (panel, types, counts, colours, labels, legends, clicks, Measure tool, DAD / UNDP files per mini watershed, failures, races, change of mini watershed), 28 of CBO, 16 of layers and panels that were not changed (including the proposal cost circle), 27 of the welcome window (four screen sizes), 26 of the catalog and KML, 954 symbology comparisons. Not covered: the live GitHub servers and your real data, printing, and the 15 scripts that were not available (stand-ins were used for `station-data.js`, `location-selector.js`).

## Round 3: map symbology, legends and the data catalog

### Symbology: one source of truth
All colours, line styles, point markers and legend contents now live in **`js/layers/symbology.js`**. The map layers, legends, statistics charts, print view and catalog preview all read from it, so a colour is changed in one place. Before, the same colours were copied into five or six files and had drifted apart (for example "Low" and "Very Low" hazard colours differed between the map and the legend).

| Area | What changed |
|---|---|
| Polygons | Translucent fill with a **crisp darker outline** (was a 0.1 px outline in the fill colour, so neighbouring areas blurred together). |
| Land cover | New 20-colour palette in four legend groups (Agriculture, Forest and natural vegetation, Water, Built-up and other). Checked numerically: the smallest colour difference between any two classes is 12.3 (CIE dE), against 7.5 before. |
| Hazard and soil | Landslide: yellow, orange, red. Erosion: matches the colours of the erosion raster image exactly. Soil: the neon greens were toned down; each soil type is distinct (min dE 21). |
| Agro-ecological zones | Colour now follows the zone: wet = blue/green, intermediate = orange/yellow, lighter = higher sub-zone. The legend groups zones ("Wet zone - mid-country"). |
| Boundaries and reserves | District: heavy dashed charcoal. DSD: brown dashes. GN: thin orange dashes. Reserved areas: green dashed outlines with a light fill. Water: blue (the pure #0000FF is gone). |
| Roads | Major road red, secondary road amber, tracks dashed brown, footpath dotted grey, railway dark grey with cross-ties. |
| Selected area | The chosen district, DSD and MWS are outlined in crimson (was neon magenta); the MWS outline has a white halo so it reads on satellite imagery. |
| Point markers | One consistent family: coloured badge with a white symbol (rain cloud, thermometer, evaporation, water drop, tap, shield, tank, tree, mountain, warning, star, building). **Shape is a second cue**: the three water-quality agencies are a circle, diamond and square, so they stay distinct without colour. 19 marker types in total, including a separate marker for each proposal type (they all used one blue dot before). |
| Selected feature | A selected marker gets a cyan ring (was replaced by a tiny cyan dot). Selected polygons use a teal outline. |
| Charts | Admin and population pie charts used **random** colours that changed on every load; they now use a fixed colour-blind friendly palette. Land cover, soil and hazard charts use the same colours as the map. |

Colour-blind check (simulated red-green colour blindness): land cover has one remaining red/green pair (Scrub land vs Built-up) that is separated by position in the legend; every other set passes.

### Legends
- **New card design:** title bar, grouped sections, swatches that match the drawn symbol (filled area with outline, dashed or dotted line, railway with ties, marker symbol).
- **Only what is on the map:** land cover, soil, erosion and zone legends list only the classes present in the loaded data.
- **Collapsible:** click a legend title (or press Enter) to fold it. A folded legend is still printed in full.
- **Long scales as a ramp:** DEM, temperature and annual rainfall (more than 16 classes) are drawn as a colour bar with the first, middle and last class, instead of a 25-line list.
- **Raster legends stack:** switching on two rasters (for example DEM and erosion) now shows both legends; before, the second replaced the first.
- **Proposal layers now have a legend:** marker symbol, number of proposals, and what the circle size means (up to Rs 50,000 / 200,000 / over).
- **Never an empty box:** a layer with no special rule gets a swatch based on its geometry.
- **Readable size:** 12.5 px text (was 9 px). Legends are also used by the print view and the catalog preview.
- **Map Symbols guide:** a new page, `symbology-guide.html` (link in the dashboard header), shows every colour, symbol and legend in one place. It is generated from the same file, so it is always current. Good for review and for printing.

Raster legends (rainfall, temperature, evaporation, DEM, slope, erosion image) keep their colours: those colours are baked into the PNG files and the legend has to match them. Only their layout changed.

### Data catalog (`MWSDataCatalog.html`), rebuilt
- **Metadata cards:** each layer shows a title block with badges (topic, category, format), **Download** and **Copy link** buttons, an "At a glance" grid with icons (provider, date, format, coverage, scale, licence), an "About this layer" description with keywords, and a collapsible "More details".
- **"What is in this file":** read from the data itself, not typed by hand. Maps show the number of features, geometry type, attribute fields, total area (sum of the Area_Ha field) and extent; each field lists its type, example values and how complete it is. Tables show rows, columns and column names; images show their size.
- **Preview map:** uses the dashboard symbology and legend, has Zoom to data and a Streets / Satellite switch, and clicking a feature shows its values.
- **Layer list:** search box, live counts, expand/collapse all, format icons, and the current layer is highlighted. Clicking a topic shows an overview with its layers.
- **Privacy kept:** contact, e-mail, phone, address, limitations, resolution, file size and the other fields your old catalog hid are still hidden. The list is `HIDDEN_FIELDS` at the top of `js/catalog/catalog-metadata.js` (delete a name to show that field).
- **Works with any registry columns:** fields are sorted into source, dates, technical, use and access by their names; anything unknown goes under "More details".
- **Safer and faster:** values from the registry are escaped before display (the old page inserted them as raw HTML); large tables show the first 500 rows with a note; a slow answer for a layer you have already left is ignored; changing the district clears the old list.
- **Registry reading fixed:** the old reader split lines on commas, so a description containing a comma would shift the columns. It is replaced by a proper CSV reader (needed now that descriptions are shown). This also removes the stray "undefined" rows.
- Kept as before: District / DSD / MWS selectors, `?mwsId=` from the dashboard, topic and category order, the proposal rules, the product-map rules (temperature min/max, hidden water-quality map), the download routine, a resizable details panel (double-click or the button to enlarge), and the "no proposal" notices.

### Small fixes in this round
- Removed the call to `createLegendControl` (it was never defined and caused a console error on every base-layer tick). **This closes the issue I reported in round 1.**
- Slope legend labels read "5-2", "10-5", "20-10" (upper bound first); they now read "2-5", "5-10", "10-20". Please confirm these match the slope classes of your raster.
- SheetJS in the catalog is pinned (it loaded "latest"); Leaflet there is 1.9.4 like the dashboard.

### New and changed files (round 3)
New: `js/layers/symbology.js`, `css/symbology.css`, `symbology-guide.html`, `js/guide/symbology-guide.js`, `css/guide-sheet.css`, `css/catalog.css`, `js/catalog/catalog-data.js`, `js/catalog/catalog-metadata.js`, `js/catalog/catalog-page.js`.
Rewritten: `MWSDataCatalog.html`, `js/layers/layer-legends.js`.
Edited: `layer-config.js`, `layer-helpers.js`, `layer-loaders.js`, `layer-panels.js`, `feature-info.js`, `station-data.js`, the five statistics files, `location-selector.js`, `boundary-overview.js`, `print-export.js`, `ui-panels.js`, `index.html`, `print-map.html`, `dashboard.css`, `pages.css`.

### How it was tested (round 3)
- Real Chromium, same stub libraries and fixtures as before, plus a richer registry. All 12 earlier flows compared with the round-2 build: identical except the one console error that is now gone.
- New checks: legends per layer type, legend toggle and keyboard use, stacked raster legends, proposal legend on/off, selected-marker ring, print copy of a folded legend, legends cleared on MWS change, colours of map = colours of charts, catalog search/preview/profile/privacy/download/stale-answer handling.
- 26 unit checks of the CSV reader, metadata sorting, privacy list, HTML escaping, data profile and legend rules. All pass.
- Colour separation measured with CIE dE, including simulated colour blindness (see above).
- **Not covered:** real Leaflet drawing (map tiles, polygons) and real Chart.js drawing, because the online libraries were not reachable. Please check the live site: tick a few base layers and a proposal layer, fold a legend, print a map, and open a layer in the catalog.

---

## Round 2: Go button lock and visual refresh

### Is the Go button required?
No. Nothing in the code depends on it, because every panel reads the selected MWS_ID directly. It is kept as an explicit step, now with a real purpose:

| State | Go | Base Layers, Proposal, Climate Layer, Data Catalog, Statistics |
|---|---|---|
| Nothing or part of the location chosen | locked | locked |
| District, DSD and MWS ID chosen | active | **locked** until Go is pressed |
| After Go | active | unlocked |
| Any dropdown changed afterwards | follows the dropdowns | locked again, and the map and panels are cleared |

- Always available: Station Data (it shows district-wide stations), Stakeholders, Help, User Guide, Log in, and the footer "Open MWS Data Catalog".
- A line under the dropdowns tells the user what to do next ("Select District, DSD and MWS ID, then press Go." / "Press Go to open data for MWS 003." / "Showing MWS 003 (...)").
- To change which buttons are locked, add or remove the attribute `data-requires-mws` on a button in `index.html`.
- Locked buttons use the real `disabled` attribute, so keyboard and screen-reader users cannot trigger them either.
- Changing District silently resets DSD and MWS, so the lock state is read after the dropdowns finish updating.

### Visual refresh (government officers and the public)
- **One design system for all 7 pages:** `css/theme.css` holds the palette, fonts, focus style and a skip link. Deep green with a gold accent line and white work areas, flat and formal.
- **Dashboard layout:** two-tier header. The dark top bar holds the brand, the District / DSD / MWS ID selector with Go, and the language switcher. A light tool bar below holds the data buttons, with icons.
- **Panels:** panels now sit inside the map area, so they no longer depend on screen-height percentages. Left drawers sit beside the zoom controls; Statistics and Stakeholders open on the right; Catalog and Data Table are centred.
- **Readability:** body text 15px, panel text 14px, table text 13px, legends 12px (they were 9px), and 36-44px tall controls. Text and button colours meet WCAG AA contrast.
- **Accessibility:** visible keyboard focus, skip link, labelled dropdowns, status line announced to screen readers, reduced-motion support, statistics tabs are real buttons.
- **Phones:** the data buttons become one swipeable row, selectors use a 2-column grid, and panels open as bottom sheets.
- **Fonts:** system fonts only (Segoe UI, Noto Sans, Nirmala UI for Sinhala and Tamil), so there is no web-font download. The guide no longer loads Google Fonts.
- **Other pages:** `forms.css` styles the three login/upload pages, and `pages.css` re-points the catalog, guide and print view to the same palette.

New and changed files: `css/theme.css` (new), `css/dashboard.css` (rewritten), `css/forms.css` (new), `css/pages.css` (new), `css/help-modal.css` (recoloured), `css/base.css` (removed). Changed JS: `js/core/ui-panels.js` (Go lock, position code removed), `js/panels/station-data.js`, `js/panels/data-table.js` (small). All seven HTML pages changed (stylesheet links; `index.html` restructured). `MWSDataCatalog.html`, `WaterQuality.html` and `LULC.html` are no longer byte-identical to your upload: the only change is two added `<link>` lines.

Small related fixes: the Stakeholders panel now also closes when the location changes (before, it could stay open with nothing pointing at it); "Open MWS Data Catalog" only passes an MWS when all three dropdowns are chosen; "Loading..." text replaces the placeholder text "Base Layers Content" etc.; the dead "Show All" button was removed.

### Round 2 notes
- The icons use Font Awesome from the CDN already used by the page. If that CDN is blocked on a government network, the buttons still work and read correctly, with a small blank space where the icon would be.
- I could not load real map tiles or the live libraries in my test environment, so I verified layout with Chromium screenshots (desktop, tablet, phone) and behaviour with the same stub-based tests as round 1.
- Please check the layout on your office screens (for example 1366x768) and one phone.

---

# Round 1: restructure and fixes

Scope: all **A** issues except A6, and all **D** issues. B and C items, and A6, are untouched.
Pages keep the same URLs; only the JS/CSS behind them moved.

## 1. Fixes

| ID | Fix | Where |
|---|---|---|
| A1 | `otherButtons` was used but never defined, so `resetSystem()` threw on every dropdown change and the panel/layer reset never ran. It now runs. | `js/core/ui-panels.js` |
| A2 | Go button no longer calls a function that did not exist. `activateButtons()` is now a real global; the inline `onclick` was removed and the listener is attached in JS. | `ui-panels.js`, `index.html` |
| A3 | MWS Info script no longer throws on load while its button is commented out. The feature stays dormant until you restore the button. | `js/panels/mws-info.js` |
| A4 | Data Table Next/Previous failed (`#descriptionDropdown` no longer exists). Paging now re-renders the cached rows. Switching layer resets to page 1; the Download button survives paging. | `js/panels/data-table.js` |
| A5 | Only one `#tablePanel` remains (the nested duplicate inside the Statistics panel and its unused `#statContent` were removed). `selectTab()` no longer relies on the implicit `event`. | `index.html`, `ui-panels.js` |
| A7 | The station parameter list is chosen from the layer that was clicked (CEA / MASL / NWSDB). The name check is only a fallback, and `Ambuluwawa_Intake` was added to it. | `js/panels/station-data.js` |
| A8 | "Open MWS Data Catalog" opens `MWSDataCatalog.html?mwsId=<selected MWS>`. The catalog already supported this. | `ui-panels.js` |
| D1 | Leaflet is loaded once, pinned to 1.9.4 (was "latest" twice plus 1.7.1). PapaParse loads once (5.4.1). Chart.js pinned to v4. `print-map.html` uses the same Leaflet. | `index.html`, `print-map.html` |
| D2 | Removed Turf.js. Also removed `leaflet.pm` and `esri-leaflet`: they were loaded before a later Leaflet reload, so they were already inert. | `index.html` |
| D3 | Removed the per-tab download listeners (and unused download functions) that the page previously cloned away. One CSV and one PNG handler now live in the shared file. | `js/statistics/*` |
| D4 | Removed 8 nested helper copies inside `renderDwsForm()`. They were verified AST-identical to the global ones, so behaviour is unchanged. | `js/admin/user-input.js` |
| D5 | Guide sidebar labels are keyed by `data-target`, not position. Added the missing Sinhala/Tamil text for the Login group, Proposal Data, Water Quality, LULC and both sub-page sections. | `js/guide/*` |

## 2. File map (old to new)

| Original | New |
|---|---|
| `style.css` | merged into `css/dashboard.css` (round 2) |
| `readmetext.css` | `css/help-modal.css` |
| inline `<style>` in `index.html` | `css/dashboard.css` |
| inline: Google Translate | `js/core/translate.js` |
| inline: map, base maps, click popup | `js/core/map-init.js` |
| inline: header buttons, Go, panels, page links | `js/core/ui-panels.js` |
| inline: station panel and charts | `js/panels/station-data.js` |
| inline: print | `js/tools/print-export.js` |
| inline: statistics legend and downloads | `js/statistics/statistics-shared.js` |
| `scripts.js` | `js/location/boundary-overview.js` |
| `dropdown.js` | `js/location/location-selector.js` |
| `all5m1_v3_photo_legend_highlight.js` (2,600 lines) | `js/layers/`: layer-state, layer-config, layer-helpers, layer-legends, layer-loaders, feature-info, layer-panels |
| `proposal_all7a_dbtree.js` | `js/panels/data-table.js` |
| `table4.js` | `js/panels/data-catalog.js` |
| `infoPanelxlsx4.js` | `js/panels/mws-info.js` |
| `paichart13.js`, `_gnd13`, `_pop13`, `_soil13`, `_risk13` | `js/statistics/`: lulc-stats, admin-stats, population-stats, soil-stats, hazard-stats |
| `scale.js` plus footer Measure code | `js/tools/map-tools.js` |
| `navigate.js` | `js/tools/locate-me.js` |
| `readmetext.js` | `js/help/help-modal.js` |
| inline script in `UserInput.html` | `js/admin/user-input.js` |
| inline script in `workthrough.html` | `js/guide/guide.js` and `guide-translations.js` |

`MWSDataCatalog.html`, `WaterQuality.html` and `LULC.html` were left unchanged in round 1 (round 2 adds two stylesheet links).
Each JS file starts with a header (purpose / depends / exposes). Script order is documented in `index.html`.

## 3. Behaviour you will notice

- Panels and layers now reset when District, DSD or MWS changes. This was always the intent, but the error in A1 stopped it from running.
- Go looks active only once District, DSD and MWS are all chosen.
- Data Table paging works and shows the right rows.
- NWSDB stations show the NWSDB parameter list.
- The Google Translate script now loads last, so a blocked Google no longer delays the rest of the page.

## 4. Decisions you may want to reverse

1. **`hidePanel`** had two definitions. The simpler one (in the layers file) overrode the inline one at run time, so I kept that behaviour: closing a panel does not un-highlight its header button or clear the Feature Info panel. The richer version is a swap of about 10 lines in `ui-panels.js`.
2. **Unreferenced functions left in place:** `ensureHtml2CanvasLoaded`, `getPrintCaptureRect`, `getVisibleLegendBlocks`, `wireStationPanelSizeToggle`, `updateSidePanel`, `ensureLinkedEnvironmentalProtectionArea`.
3. **Removed as dead:** earlier duplicate definitions that were already overridden (`loadGeoJsonLayer` x2, `loadPngOverlay`, `updateLegend`, `removeLayer`, `hidePanel` x2 in the layers file; five repeated functions in `dropdown.js`), and the detached `<select>` code in `scripts.js`.
4. **Sinhala and Tamil text was written by me.** Please have a native speaker review it.

## 5. New findings (not changed)

- (Fixed in round 3.) `createLegendControl` is called in the Base Layers panel but defined nowhere. It throws a console error each time a base layer is ticked. It is harmless, because the loader builds the legend itself.
- `location-selector.js` adds a new `change` listener each time the District or DSD changes, so listeners accumulate.
- The MWS boundary file is downloaded twice at start-up. The five statistics GeoJSON files are fetched on every MWS change even if Statistics is never opened.

## 6. How it was tested

Real Chromium (Playwright). The original and the new build ran through identical scenarios. The CDNs were not reachable from my environment, so Leaflet, Chart.js, PapaParse, SheetJS and Supabase were replaced by small stubs, and GitHub data by fixtures.

- Before: 3 uncaught errors on a normal dropdown + Go flow. After: none.
- Unchanged flows (layer panels, statistics tabs and downloads, measure, print payload, language switch, DWS save payload) matched the original.
- Every local file referenced by every page loads (HTTP 200), and `print-map.html` renders with the pinned Leaflet.
- Not covered: real map rendering and real Chart.js drawing. Please do a 2-minute manual pass on the live site: pick an MWS, click Go, tick a base layer, open Statistics, page the Data Table, open the Data Catalog.

## 7. Layout

```
index.html  print-map.html  UserInput.html  workthrough.html  symbology-guide.html
MWSDataCatalog.html  WaterQuality.html  LULC.html
css/   theme.css  dashboard.css  symbology.css  catalog.css  forms.css  pages.css  guide-sheet.css  help-modal.css
js/
  core/        map-init  ui-panels  translate
  location/    boundary-overview  location-selector
  layers/      symbology  layer-state  layer-config  layer-helpers  layer-legends  layer-loaders  feature-info  layer-panels
  catalog/     catalog-data  catalog-metadata  catalog-page
  panels/      data-table  data-catalog  mws-info  station-data
  statistics/  statistics-shared  lulc-stats  admin-stats  population-stats  soil-stats  hazard-stats
  tools/       map-tools  locate-me  print-export
  help/        help-modal
  guide/       guide  guide-translations  symbology-guide
  admin/       user-input
```
