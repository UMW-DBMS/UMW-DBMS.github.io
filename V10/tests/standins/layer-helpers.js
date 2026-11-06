/* STAND-IN typed from the old script (all5m1_v3_photo_legend_highlight.js lines 22-24 and 361-390): the helpers the loader uses for the cost circle and the number label. */
function shouldShowNoLabel(layerName) { return proposalLabelLayers.has(String(layerName || '').toLowerCase()); }
function parseAmount(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).replace(/[, ]+/g, '');
    if (!str) return null;
    const num = Number(str);
    return Number.isFinite(num) ? num : null;
}
function getAmountFromProps(props) {
    if (!props) return null;
    return parseAmount(props['Total_Cost:'] ?? props['Total_Cost'] ?? props['Amount__Rs:'] ?? props['Amount (LKR):'] ?? props['Amount__Rs'] ?? props['Estimated Cost:'] ?? props['Estimated Cost'] ?? props['Total Cost (Rs.):'] ?? props['Total Cost (Rs.)']);
}
function getAmountColor() { return '#1e88e5'; }
function getAmountRadius(amount) { if (amount <= 50000) return 15; if (amount <= 200000) return 18; return 35; }
function getNoValue(props) {
    if (!props) return null;
    const direct = props['No_'] ?? props['No.'] ?? props['No:'] ?? props['No'];
    if (direct !== undefined && direct !== null) return direct;
    for (const [key, value] of Object.entries(props)) { const normalized = String(key).trim().toLowerCase().replace(/[^a-z0-9]/g, ''); if (normalized === 'no') return value; }
    return null;
}
