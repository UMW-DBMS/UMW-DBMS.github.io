## Round 6: final set (provider "i", Explore area, catalog cards, statistics window, slim footer, language box, help window)

New: `css/umw-enhancements.css`, `js/area/area-explorer.js`, `js/panels/catalog-panel.js`. Replaced: `index.html` (complete page), `js/layers/layer-source-info.js` (provider name only), `js/help/help-modal.js` (new layout, banner kept). `css/agency-banner.css` is no longer used.
- Data provider "i": one box with the provider name (registry `Provider` column, then the layer list file), in Base Layers and Area Layers.
- Explore area (whole UMW / District / DSD): outline of the mini watersheds, Area Layers (layers of the whole area joined and drawn by the existing loaders), Area Statistics (land cover, hazard, soil, population, list of mini watersheds; CSV and image downloads), Open one mini watershed.
- Data Catalog window: cards with search, database buttons and provider filter, made from the rows of the old table.
- Statistics windows: header with the mini watershed, pill tabs, chart card, clean table, equal download buttons.
- Footer: one slim row (about 36 px; was about 70 px).
- Language box: English / සිංහල / தமிழ் in their own letters, translate="no".
- Help window: banner, step dots, text beside photo and video, buttons always on screen; one column on phones; arrow keys; only the visible step's video is prepared.
