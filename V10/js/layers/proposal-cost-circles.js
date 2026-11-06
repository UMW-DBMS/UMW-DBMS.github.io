/**
 * Proposal layers: a cost-estimate circle for EVERY proposal layer
 *
 * Purpose : Until now only a few proposal layers (for example "Soil and water conservation - on site") showed the pale blue circle behind each
 *           marker whose size follows the cost estimate. Two things decided that, both inside the layer scripts:
 *             1. the layer had to be named in a fixed list (proposalLabelLayers in layer-config.js): the layers "Developments", "Pecoe trail" and
 *                "Tourist attract places" were not in it, and a layer added later would not be either;
 *             2. the cost had to be in a column with one of nine exact names (Total_Cost, Amount__Rs ...): a layer whose cost column is called
 *                something else ("Estimate", "Cost_Estimate", "Budget") or written as "Rs. 1,250,000.00" got no circle.
 *           This script lifts both limits without touching the circle drawing itself: every layer opened through the Proposal list or Area Layers is
 *           treated as a proposal layer, and the cost is looked for under more names and read from text such as "Rs. 1,250,000.00" or "75,000/=".
 *           The circles keep their present look and sizes (blue; radius 15, 18 or 35 by cost), because the existing loader still draws them.
 *           The proposal number label (the "No" column) follows the same rule, so it now shows on these layers too.
 * Depends : layer-helpers.js (getAmountFromProps), layer-config.js (proposalLabelLayers), layer-loaders.js (loadGeoJsonLayerP), layer-state.js (geoJsonLayers).
 *           Load it after layer-panels.js. If one of them is missing the script writes one warning in the console and changes nothing.
 * Exposes : window.ProposalCostCircles { COST_COLUMNS, findCost, summary, active }
 *
 * What counts as the cost of a feature (first match wins):
 *   a) what getAmountFromProps already finds (the nine original column names): unchanged;
 *   b) a column whose name, ignoring capitals and punctuation, is in COST_COLUMNS (below): "Estimate", "Cost Estimate", "Estimated_Cost_Rs" ...;
 *   c) any column whose name contains "cost", "amount", "estimat" or "budget" and does not contain a word of AVOID_WORDS (a unit cost or a cost per
 *      kilometre is not the cost of the proposal, so "Unit_Cost" is never used).
 * The value may be a number or text such as "Rs. 1,250,000.00", "75,000/=", "LKR 30000". Text that is not a number ("TBD", "-") gives no circle.
 * To use another column name, add it to COST_COLUMNS. In the browser (F12, Console) each proposal layer reports which column was used, or that none was found.
 * Only point proposals get circles (the loader draws them around the marker); lines and areas are not changed.
 */

(function () {
    'use strict';

    if (window.ProposalCostCircles) return;                       // loaded twice: the first one stays

    const missing = ['getAmountFromProps', 'loadGeoJsonLayerP'].filter((name) => typeof window[name] !== 'function');
    if (typeof proposalLabelLayers === 'undefined') missing.push('proposalLabelLayers');
    if (typeof geoJsonLayers === 'undefined') missing.push('geoJsonLayers');
    if (missing.length) {
        console.warn('[Proposal cost circles] not started: ' + missing.join(', ') + ' not found. Load this script after layer-panels.js.');
        window.ProposalCostCircles = { active: false, missing: missing };
        return;
    }

    // ------------------------------------------------------------------------------------------
    // Which column holds the cost (edit these lists to suit your data)
    // ------------------------------------------------------------------------------------------

    // Exact names (capitals, spaces and punctuation ignored), best first
    const COST_COLUMNS = ['totalcost', 'totalcostrs', 'totalcostlkr', 'estimatedcost', 'estimatedcostrs', 'estimatedcostlkr', 'costestimate', 'costestimaters', 'estimate', 'estimaters',
        'estimatedamount', 'totalamount', 'amountrs', 'amountlkr', 'amount', 'estimatedbudget', 'totalbudget', 'budget', 'costrs', 'costlkr', 'cost'];
    // Names that contain one of these are tried after the exact names ...
    const CONTAINS = ['cost', 'amount', 'estimat', 'budget'];
    // ... unless they also contain one of these (a cost per unit, per kilometre ... is not the cost of the proposal)
    const AVOID_WORDS = ['unit', 'per', 'rate', 'qty', 'quant', 'length', 'area', 'width', 'depth', 'height', 'date', 'year', 'status', 'remark', 'note', 'source', 'desc', 'type', 'name', 'code'];

    const norm = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, '');

    /** A number, or text such as "Rs. 1,250,000.00" / "75,000/=" / "LKR 30000", as a number; null for anything else. */
    function parseCost(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        let text = String(value).trim();
        if (!text) return null;
        text = text.replace(/rs\.?|lkr|\u0dbb\u0dd4\.?|\/=|[,\s]/gi, '');
        if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
        return Number(text);
    }

    /** { value, column } for the properties of a feature, or { value: null, column: '' } */
    function findCost(props) {
        if (!props || typeof props !== 'object') return { value: null, column: '' };
        const keys = Object.keys(props);
        for (const wanted of COST_COLUMNS) {
            for (const key of keys) {
                if (norm(key) !== wanted) continue;
                const value = parseCost(props[key]);
                if (value !== null) return { value: value, column: key };
            }
        }
        for (const key of keys) {
            const n = norm(key);
            if (!CONTAINS.some((c) => n.indexOf(c) !== -1) || AVOID_WORDS.some((w) => n.indexOf(w) !== -1)) continue;
            const value = parseCost(props[key]);
            if (value !== null) return { value: value, column: key };
        }
        return { value: null, column: '' };
    }

    // ------------------------------------------------------------------------------------------
    // 1. The cost of a feature: what the layer scripts find first, then the wider search
    // ------------------------------------------------------------------------------------------

    const originalGetAmount = window.getAmountFromProps;
    window.getAmountFromProps = function (props) {
        const original = originalGetAmount.apply(this, arguments);
        if (original !== null && original !== undefined) return original;
        return findCost(props).value;
    };

    // ------------------------------------------------------------------------------------------
    // 2. Every layer opened as a proposal layer is a proposal layer
    // ------------------------------------------------------------------------------------------

    const summaries = {};

    function collect(group, out) {
        if (!group || typeof group.eachLayer !== 'function') return;
        group.eachLayer((layer) => {
            if (layer && layer.feature && layer.feature.properties) out.push(layer.feature);
            else collect(layer, out);
        });
    }

    function report(layerName) {
        let waited = 0;
        const poll = setInterval(() => {
            waited += 100;
            const layer = geoJsonLayers[layerName];
            if (!layer && waited < 20000) return;
            clearInterval(poll);
            if (!layer) return;                                   // the layer did not load (the loader writes its own error)
            const features = [];
            collect(layer, features);
            const columns = {};
            let withCost = 0;
            features.forEach((feature) => {
                const found = findCost(feature.properties);
                const original = originalGetAmount(feature.properties);
                if (found.value === null && (original === null || original === undefined)) return;
                withCost++;
                const column = found.column || '(original column)';
                columns[column] = (columns[column] || 0) + 1;
            });
            const best = Object.keys(columns).sort((a, b) => columns[b] - columns[a])[0] || '';
            summaries[layerName] = { features: features.length, withCost: withCost, column: best, columns: columns };
            if (!features.length) return;
            if (withCost) {
                console.info('[Proposal cost circles] ' + layerName + ': cost circles for ' + withCost + ' of ' + features.length + ' features' + (Object.keys(columns).length > 1 ? ' (columns ' + Object.keys(columns).join(', ') + ')' : ' (column "' + best + '")') + '.');
            } else {
                const first = features.find((f) => f.properties && Object.keys(f.properties).length);
                console.info('[Proposal cost circles] ' + layerName + ': no circle, no cost found in any of ' + features.length + ' features. Columns in the data: ' +
                    (first ? Object.keys(first.properties).join(', ') : '(none)') + '. If one of them holds the cost estimate, add its name to COST_COLUMNS in proposal-cost-circles.js.');
            }
        }, 100);
    }

    const originalLoadP = window.loadGeoJsonLayerP;
    window.loadGeoJsonLayerP = function (url, layerName) {
        proposalLabelLayers.add(String(layerName || '').toLowerCase());
        const result = originalLoadP.apply(this, arguments);
        report(layerName);
        return result;
    };

    window.ProposalCostCircles = {
        active: true,
        COST_COLUMNS: COST_COLUMNS,
        findCost: findCost,
        summary: function () { return JSON.parse(JSON.stringify(summaries)); }
    };
})();
