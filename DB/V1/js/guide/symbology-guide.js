/**
 * Symbology guide page
 *
 * Purpose : Renders every symbol, colour class and legend defined in symbology.js on one page, so the map
 *           styling can be reviewed (and printed) without loading any map data.
 * Depends : symbology.js, layer-config.js (raster colour ranges). No map is created.
 * Exposes : (page script)
 */

(function () {
    const S = window.Symbology;
    const sheet = document.getElementById('sheet');

    function section(title, intro, innerHtml) {
        return '<section class="sheet-card"><h2>' + S.esc(title) + '</h2>' +
            (intro ? '<p class="sheet-intro">' + S.esc(intro) + '</p>' : '') + innerHtml + '</section>';
    }

    /** Draw a legend card exactly as it appears on the map. */
    function legendCard(spec) {
        return '<div class="umw-legend sheet-legend">' + S.legendHtml(spec) + '</div>';
    }

    function fakeMap(content, cls) {
        return '<div class="fake-map ' + (cls || '') + '">' + content + '</div>';
    }

    const html = [];

    // 1. Land cover
    const lulcLegend = S.legendSpec('Land cover', { features: [] });
    html.push(section('Land use and land cover', 'Twenty classes in four groups. Greens are natural vegetation, yellows and oranges are agriculture, blues are water, reds, browns and greys are built-up and other uses.',
        '<div class="sheet-flex">' + legendCard(lulcLegend) +
        '<div class="swatch-grid">' + S.LULC.map(e =>
            '<div class="swatch"><span style="background:' + S.rgba(e.color, 0.62) + ';border:1px solid ' + S.shade(e.color, 0.38) + '"></span><b>' + S.esc(e.key) + '</b><i>' + e.color + '</i></div>').join('') + '</div></div>'));

    // 2. Hazard, erosion, soil, population, AEZ
    const hazard = S.legendSpec('Landslide hazard zone', { features: [{ properties: { level: 'Low' } }, { properties: { level: null } }] });
    const erosion = S.legendSpec('Soil erosion hazard', { features: S.EROSION.slice(0, 5).map(e => ({ properties: { soil_erosion: e.key } })) });
    const soil = S.legendSpec('Soil type', { features: S.SOIL.map(e => ({ properties: { NAME: e.key } })) });
    const density = S.legendSpec('Population', { features: [{ properties: { Density: 10 } }] });
    const aezCodes = ['WU1', 'WU2a', 'WU3', 'WM1a', 'WM2b', 'WM3a', 'IU1', 'IU3a', 'IU3d', 'IM1a', 'IM3b', 'IL2'];
    const aez = S.legendSpec('Agro ecological zone', { features: aezCodes.map(z => ({ properties: { zone: z } })) });
    html.push(section('Hazard, soil, population and agro-ecological zones', 'Sequential colours (light to dark) show increasing hazard or density. Soil and zone colours are categories.',
        '<div class="sheet-flex">' + [hazard, erosion, density, soil, aez].map(legendCard).join('') + '</div>'));

    // 3. Boundaries and reservations
    const lineNames = ['District Boundary', 'DSD Boundary', 'GN Boundary', 'Mini watershed', 'Stream network', 'Water features-polygon', 'Conservation forest', 'Reserved forest', 'Wild life boundary', 'Environmental protection area', 'To be forest'];
    html.push(section('Boundaries, water and reserved areas', 'Dashed outlines mark administrative boundaries and reservations; solid blue marks water.',
        '<div class="sheet-flex">' + lineNames.map(n => legendCard(S.legendSpec(n, { features: [] }))).join('') + '</div>'));

    // 4. Roads
    html.push(section('Roads and railways', 'Weight shows importance; dashes show unsurfaced tracks and footpaths.',
        '<div class="sheet-flex">' + legendCard(S.legendSpec('Transport', { features: [] }, { roadCategories: ['Major Roads', 'Secondary Roads', 'Jeep/Car Tracks', 'Footpath', 'Railways'] })) + '</div>'));

    // 5. Markers
    const stationKinds = ['rainfall', 'temperature', 'evaporation', 'wq-cea', 'wq-masl', 'wq-nwsdb'];
    const proposalKinds = ['dws', 'wrm', 'wsp', 'mi', 'mt', 'wqi', 'sr', 'swc-on', 'swc-off', 'landslide', 'tourist', 'economic'];
    function markerGrid(kinds) {
        return '<div class="marker-grid">' + kinds.map(k =>
            '<div class="marker-cell"><div class="marker-big">' + S.markerSvg(k, { size: 52 }) + '</div><div class="marker-small">' + S.markerSvg(k, { size: 30 }) +
            '</div><b>' + S.esc(S.MARKERS[k].label) + '</b></div>').join('') + '</div>';
    }
    html.push(section('Station symbols', 'Circles, a diamond and a square separate the three water-quality agencies even without colour.', markerGrid(stationKinds)));
    html.push(section('Proposal symbols', 'Shape groups the type: squares for water supply, irrigation and storage; diamonds for conservation and landslides; circles for quality and streams; hexagons for tourism and economy.', markerGrid(proposalKinds) +
        '<div class="sheet-flex">' + legendCard(S.proposalLegendSpec('Domestic water supply', [{}, {}, {}], { hasAmounts: true })) + '</div>'));

    // Tank and anicut details of Base Layers (DAD Tanks Details, UNDP Tanks Details)
    html.push(section('Tank and anicut symbols', 'Base Layers > DAD Tanks Details and UNDP Tanks Details: one symbol for each kind of record.', markerGrid(['anicut', 'dad-tank', 'undp-tank'])));

    // 6. Raster legends (colours are fixed by the PNG files)
    const rasterNames = ['DEM', 'Annual Rainfall', 'Monthly Rainfall - 01', 'Monthly  Temperature - Max-01', 'Monthly evoporation - 01', 'Slope', 'Soil erosion hazard'];
    html.push(section('Raster layers', 'These colours come from the map images themselves and are shown here unchanged. Long scales are drawn as a ramp with the first, middle and last class.',
        '<div class="sheet-flex">' + rasterNames.map(n => legendCard(S.rasterLegendSpec(n, colorRanges[n]))).join('') + '</div>'));

    // 7. In context
    const sampleLegends = legendCard(S.legendSpec('Land cover', { features: [{ properties: { classLULC: 'Tea' } }, { properties: { classLULC: 'Paddy' } }, { properties: { classLULC: 'Forest lands' } }, { properties: { classLULC: 'Water bodies' } }] }));
    const pins = [['rainfall', 18, 22], ['wq-cea', 40, 36], ['wq-nwsdb', 62, 28], ['dws', 28, 62], ['mt', 52, 70], ['landslide', 74, 58]]
        .map(p => '<span class="pin" style="left:' + p[1] + '%;top:' + p[2] + '%">' + S.markerSvg(p[0], { size: 30 }) + '</span>').join('');
    html.push(section('In context', 'Markers and a legend over a sample map background.',
        fakeMap(pins + '<div class="fake-legend">' + sampleLegends + '</div>', '')));

    sheet.innerHTML = html.join('');
})();
