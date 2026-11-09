## Round 8: GN search

- New `js/location/gn-search.js`: the GN / DSD / District / MWS search of `index (4).html` + `dropdown.js`, rebuilt as a result list (grouped, tags, marked letters, keyboard), GN files read 6 at a time with progress, Sinhala / Tamil searchable, GN outlines in a pane under the layers, "Search the whole UMW instead", choosing fills District / DSD / MWS ID by their normal change events.
- `index.html`: the search markup switched on (combobox + result panel), script added after `location-selector.js`.
- `css/umw-enhancements.css`: section 9 rewritten (box, result list, tags, loading bar, widen button, orange GN label).
- Not ported on purpose: `dropdown.js` itself (it duplicates `location-selector.js`), `scripts.js` (overview and drainage lines: to be confirmed in `boundary-overview.js`), `all5m1_v3_photo_legend_highlight.js` (replaced by `layer-*.js`).
