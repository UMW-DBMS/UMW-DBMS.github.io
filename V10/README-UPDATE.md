# UMW dashboard update: new Base Layers and Station Data layers, welcome-window logos, KML download

**This is an update package, not the whole dashboard.** 15 of your scripts (`js/location`, `js/panels` except the new file, `js/statistics`, `js/tools`) could no longer be read when I built this, so I could not put them in a zip. **Unzip it over your `umw-dashboard` folder** (same paths): it replaces 10 of your files with versions that differ only by the additions below, and adds new files. Nothing is deleted, and no file I did not change is included.

## What to copy

| File | | What changed |
|---|---|---|
| `index.html` | changed | two `<script>` lines added (new layers) |
| `js/layers/layer-water-features.js` | **new** | water-feature types, tanks, DAD / UNDP tank details |
| `js/panels/station-cbo.js` | **new** | CBO group in Station Data |
| `js/layers/layer-panels.js` | changed (+36 -15) | hooks for the above; a layer key that keeps the DAD "Minor Tanks" apart from the UMW "Minor Tanks" |
| `js/layers/layer-loaders.js` | changed (+9) | tank name labels and zoom |
| `js/layers/symbology.js` | changed (+14 -2) | 3 markers, 2 tank styles |
| `js/layers/feature-info.js` | changed (+3) | a clicked circle point is highlighted |
| `js/guide/symbology-guide.js` | changed (+3) | the three new markers on the Map Symbols page |
| `css/symbology.css` | changed (+16) | labels of water-feature points |
| `js/help/help-modal.js` | changed | welcome window: logos and names |
| `js/catalog/catalog-metadata.js`, `catalog-page.js` | changed | Download KML |
| `assets/logos/` | **new** | the two logos (small: replace with the originals) |
| `CHANGELOG.md` | changed | new "Round 4" section |
| `tools/`, `tests/`, `docs/` | new | logo tool, tests, screenshots |

## 1. New layers from your updated dashboard

**Base Layers** (`index (3).html` + `all5m1_v3_photo_legend_highlight.js`):
- **Water features-point / -polygon / -line** are now one check box per feature type: Anicut, Flood Gate, Sluice, Spill, Waterfall, Culvert, Spring, Water Tower, Tube Well, Well; Reservoir area, Tank area, Lake, Others; Streams, Canals, Tunels, Others. Each file is read once. Point names show as labels; each ticked type has a legend card.
- **Reservoirs/ Tanks**: Major Tanks and Minor Tanks (their own UMW files), fixed tank colour, names on major tanks, the map zooms to them.
- **DAD Tanks Details** (Minor Tanks, Anicuts) and **UNDP Tanks Details** (Tanks): the file of the selected mini watershed in `15_TNK/`, drawn with new markers (listed on the Map Symbols page).
- The three new categories sit right after "Water features".

**Station Data**: the group **CBO Data - Department of National Community Water Supply**: 14 categories with a "See more" link each; data from `14_CBO/<category>.geojson` in its own colour; click a feature for Feature Info.

All of it follows your current design: colours, markers and legend cards come from `symbology.js`, rows use your `dashboard.css`, and a new District, DSD or MWS clears everything.

## 2. Welcome window and KML (as in the earlier update)
Ministry emblem | "Welcome to the Upper Mahaweli Database" / ministry / project | IWWRMP logo. **The logos came from the TRC Word file and are small (104 x 137 and 160 x 92 px): put your original logo files in `assets/logos/` as `ministry-logo.png` and `iwwrmp-logo.png`.** A **Download KML** button appears next to Download GeoJSON when the layer's KML file exists: put each `.kml` next to its `.geojson` with the same name (or name it in a registry column `kml`).

## Please check on the live site (5 minutes)
1. **Station Data**: the CBO group appears under the two station groups. Tick a CBO category **and** a station (for example Rainfall): both must stay on the map. *This is the one thing I could not test against your real `station-data.js`*: I tested against a stand-in built to be the worst case (it removes any layer it does not know), and the CBO layers survived it. If the group does not appear, send me `station-data.js`.
2. **Base Layers** for one mini watershed: the new categories appear after "Water features"; tick Anicut (points with labels), Major Tanks, and DAD Anicuts.
3. **Print** with one of the new layers ticked (`print-export.js` was not available to me; the layers are registered where it reads them, as the old page's were).
4. Open the welcome window (Help) and a layer with a KML in the catalog.

## Differences from the old page (all deliberate)
- Water-feature **lines** can be clicked (they could not).
- Each new layer has a **legend card** (the old page had none for them).
- CBO layers are **cleared when the mini watershed changes** (on the old page they stayed); they are no longer removed when a station is ticked.
- A DAD file with no record for the mini watershed unticks its box; a file that fails to load is asked for again next time; a layer unticked while loading never appears.
- Point labels and the "Tunels" spelling are as on the old page.
- Points drawn as circles (water-feature points, CBO) are highlighted when clicked; proposal cost circles are left alone.

## Tested
Real Chromium on your real `index.html`, `MWSDataCatalog.html`, `symbology-guide.html`, your CSS, your scripts that were available and the real Leaflet 1.9.3: **54** checks of the new Base Layers, **28** of CBO, **16** of everything that was not changed (ordinary layers, rasters, proposals including the cost circles, climate, change of MWS), **27** of the welcome window (four screen sizes), **26** of the catalog and KML, and **954** comparisons of your existing symbology against the edited file (0 differences). Not tested: the live GitHub servers and your real data, printing, and anything that needs the 15 scripts I did not have (`station-data.js` and `location-selector.js` were replaced by marked stand-ins in the tests).

`tests/README.md` explains how to run the tests; `docs/` has screenshots.
