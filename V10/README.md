# Cost-estimate circles for every proposal layer

Two files, **no Python, no command line**. Copy them into your `umw-dashboard` folder (same paths), then reload with **Ctrl+F5**.

| File | What to do |
|---|---|
| `js/layers/proposal-cost-circles.js` | **new** |
| `index.html` | **replace** (the page you have, plus one `<script>` line after `layer-panels.js`) |

## Why only a few layers had circles
The circle behind a marker is drawn by your layer scripts, and two rules decided which layers got one (I read them in the old `all5m1...js`, which the new `layer-*.js` files carry over):
1. **The layer had to be on a fixed list** of 12 names (`proposalLabelLayers`). "Developments", "Pecoe trail", "Tourist attract places" and any layer added later were not on it.
2. **The cost had to be in a column with one of nine exact names** (`Total_Cost`, `Amount__Rs`, `Amount (LKR):`, `Estimated Cost` ...) and be a plain number. A column called `Estimate`, `Cost_Estimate` or `Budget`, or a value written as `Rs. 1,250,000.00` or `75,000/=`, got no circle.

## What the add-on does
- **Every layer opened from the Proposal list or from Area Layers is treated as a proposal layer**, whatever its name.
- The cost is looked for under more names, and read from text such as `Rs. 1,250,000.00`, `75,000/=`, `LKR 30000`. Your existing columns are tried first, so nothing that works today changes.
- A **unit cost is never used** (`Unit_Cost`, `Cost_per_km`, anything with unit / per / rate / length / area in the name), nor text like "TBD" or "-".
- The circles are still drawn by your own loader, so **the look and sizes are exactly as today** (blue, radius 15 / 18 / 35 for costs up to 50,000 / up to 200,000 / above).
- **The proposal number label** (the "No" column) follows the same rule, so it now also shows on the layers that gained circles.
- See the picture `docs_before_after.png`.

## What it does not do (and what you can check)
- **If a layer has no cost column at all**, there is nothing to draw. Press **F12 > Console** after ticking the layer: it prints either *"cost circles for 12 of 14 features (column "Estimate")"* or *"no circle, no cost found ... Columns in the data: ..."*. If one of those columns is the cost, add its name to `COST_COLUMNS` at the top of the script (one word, capitals and punctuation do not matter), or send me the column name.
- **Only point proposals get circles** (your loader draws them around the marker). A proposal drawn as an area or a line is left as it was.
- **The three sizes are fixed by cost** (50,000 / 200,000), the same for every layer. If a layer's costs are mostly in the millions, most circles will be the biggest. If you want the sizes to follow each layer's own range, tell me.
- **The legend:** I could not read `layer-legends.js` and `symbology.js` this round. If the legend of a newly circled layer does not mention the circles, send me those two files and I will connect it. Please check one such layer.
- A feature with no cost in a layer that otherwise has circles shows its marker only.

## Tested, and what was not
A real browser (Chromium) with real Leaflet and **stand-ins typed from the old script** for the helpers and the loader (same circle logic as yours): **36 checks** (layers that already had circles unchanged: sizes, colour, labels; layers not on the old list; other column names; text costs; unit costs and text that must not become circles; layers without a cost; zero costs; mixed layers; area proposals; base layers untouched; failed and empty layers; the add-on missing, loaded twice, or loaded before the scripts it needs) and **5 checks** of the script tag's position in `index.html` (after the layer scripts, before `ui-panels.js` and `area-explorer.js`; the other 34 tags unchanged).
**Not tested:** your current `layer-helpers.js`, `layer-loaders.js` and `layer-config.js` (not available this round: the stand-ins follow the old script, and the add-on tries your own helper first, so any extra column names your new helper knows still work), your real proposal files, the legend, and printing.
