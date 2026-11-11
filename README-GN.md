# GN search: the old box, working in the new dashboard

Three files, **no Python, no command line**. Copy them into your `umw-dashboard` folder (same paths), then reload with **Ctrl+F5**.

| File | What to do |
|---|---|
| `js/location/gn-search.js` | **new** (the whole GN search) |
| `index.html` | **replace** (the box is switched on; one `<script>` line added) |
| `css/umw-enhancements.css` | **replace** (section 9 is the look of the box and its result list) |

**Do not add `dropdown.js`, `scripts.js` or `all5m1_v3_photo_legend_highlight.js` to the new page.** `dropdown.js` fills the District, DSD and MWS boxes itself, which `location-selector.js` already does in the new structure: both together would fill them twice. `all5m1_...js` is the old layer script that `layer-*.js` replaced. I took the GN search out of `dropdown.js` and rebuilt it as `gn-search.js`, which only sets the values of your three boxes and fires their normal change events.

## How it works now
Type in **Search** (first field of the dark bar). A list opens under it, grouped, each result with a coloured tag, the typed letters marked, and where it is (MWS, DSD, District).
- **GN division**: the District, DSD and MWS ID boxes are filled, the GN is outlined **orange** with its name on the map and the map zooms to it. Then press **Go**. Clicking the GN opens a popup (GN, MWS_ID, DSD, District).
- **Mini watershed**: the three boxes are filled and **all its GN divisions** are outlined, as in the old box.
- **DSD** or **District**: that box is filled (the ones below it are emptied) and its mini watersheds are outlined in magenta. Then choose an MWS ID, or press **Explore area** to see everything of that DSD or District.
- **Enter** without choosing: the best match is used. If several GN divisions match equally (two "Haragama"), all are outlined and the list stays open for you to pick one.
- Arrow keys, Enter, Esc and Tab work; **Clear** removes the text and the outlines and returns the map to the open mini watershed.

## What is better than the old box
- A real result list (the old one was the browser's plain suggestion box): grouped, with the typed letters marked, and no alert boxes ("no match" is a message in the list).
- **GN files are read 6 at a time with a loading bar**, and results appear while the rest load (the old box asked for all at once). Once read they are kept for the visit.
- **Sinhala and Tamil letters** can be searched; capitals and punctuation do not matter; GN **codes** (GND_C ...) are searchable too.
- A GN inside the mini watershed that is **already open** changes no box and resets none of your layers (the old box reset them every time).
- The orange outlines are in their own map pane **just under your layers**, so they never block a click on a layer you have switched on.
- GN divisions are searched in the **area the boxes say** (the mini watershed, else the DSD, else the District, else the whole UMW), as in the old box, and the panel always says which. New: when that is too narrow, **"Search the whole UMW instead"** appears in the panel (with MWS 003 open you could not otherwise find a GN of MWS 004).

## Differences from the old box (on purpose)
- Choosing a DSD or District no longer draws the GN divisions of all its mini watersheds (that meant reading dozens of files); it outlines the mini watersheds, which is what Explore area then builds on.
- Clear does not empty the three boxes (they say what is open); it clears the search and the outlines.

## Please check on the live site (3 minutes)
1. Type `hara`, wait for the loading bar to finish, choose a GN: do the three boxes fill, does Go light up, is the GN orange with its name on the map?
2. Choose an MWS from the list: are all its GN divisions outlined? Choose a DSD: does the MWS ID box empty?
3. **How long does the first search take on your connection?** It reads the GN file of every mini watershed in the area (the old box did the same). If it is slow, tell me: the fix is one small GN index file made once, and I can make the script for it.
4. **Drainage lines:** the old `scripts.js` also drew the drainage lines (`ED_02_HYD_DRN_line_v1.geojson`) and the magenta overview. I assume `boundary-overview.js` does that in the new structure; if the drainage lines are missing on the map, tell me and I will add them.

## Tested, and what was not
Real Chromium with real Leaflet, the final `index.html`, `umw-enhancements.css` and `gn-search.js`, test copies of your theme and dashboard CSS, and **stand-ins for your `location-selector.js` and `ui-panels.js`** (I could not open the real ones this round; the stand-ins fill the District / DSD / MWS lists a moment *after* each change and zoom the map after a change, so timing problems would show): **75 checks** of the search (every kind of result, typing, GN files 6 at a time, scope, failed and missing files, choosing GN / MWS / DSD / District, same-MWS and other-MWS and other-district cases, Enter and keyboard, Clear, quick double choices, Sinhala and Tamil, HTML in a name shown as text, MWS_ID written with or without the "MWS_" prefix), **30** of the layout at seven screen sizes from 1440 to 320 px, **67** of the header and Stakeholders window and **18** of the page's ids and script tags.
**Not tested:** your real `location-selector.js` (the script waits up to about 2.5 s for a box's list to fill, then reports that it could not set it), your real GN files (property names GND_N, GND_Name, GN_Name, GN, Name were taken from `dropdown.js`) and the live GitHub servers.
