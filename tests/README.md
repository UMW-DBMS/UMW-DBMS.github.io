# Tests

Python with Playwright (Chromium). Run from this folder, inside the project: they open your REAL `index.html`, `MWSDataCatalog.html` and `symbology-guide.html` with your real CSS, the real Leaflet 1.9 (`vendor/`) and the real scripts in `../js/`. Outside data (GitHub files, CDN libraries) is answered from fixtures in each test.

    python test_base_layers.py      new Base Layers (54 checks)
    python test_cbo.py              CBO group in Station Data (28)
    python test_existing_layers.py  layers and panels that were not changed (16)
    python test_welcome.py          welcome window (27; saves screenshots in this folder)
    python test_catalog.py          catalog and KML (26)

**Scripts that were not available when these were written** (`js/panels/station-data.js`, `js/location/location-selector.js`; others are empty files) are replaced by the small stand-ins in `stubs/*.standin.js`; the harness uses a stand-in only when the real file is not in `js/`. With your full project (all files in `js/`) the real files are used instead and the stand-ins are ignored. `stubs/` also holds tiny stand-ins for PapaParse, SheetJS and Chart.js.
