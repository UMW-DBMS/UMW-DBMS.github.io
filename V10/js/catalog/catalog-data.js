/**
 * Data catalog: registry data
 *
 * Purpose : Reads the per-MWS registry file (DBMS_{id}.csv), groups its layers into Topic > Category > Layer, and resolves each layer's file URL. No screen code here.
 * Depends : Nothing at load time. getSelectedMwsSuffix() reads #catalogMwsSelect when a URL is resolved.
 * Exposes : parseCsv(), fetchRegistry(), groupFiles(), getCatalogFileUrl(), resolveCatalogFileUrl(), toRawGitHubUrl(), fileFormat(), sortTopicNames(), sortCategoryNames(), proposal / product-map rules
 */

// Only these proposal layers are shown in the proposal section of the catalog.
// Keeping the display category here also makes the tree consistent when registry
// files use slightly different database/category names.
const proposalLayerCategories = new Map([
    ['soil and water conservation - on site', 'Soil and Water Conservation'],
    ['soil and water conservation - off site', 'Soil and Water Conservation'],
    ['lanslides', 'Soil and Water Conservation'],
    ['landslides', 'Soil and Water Conservation'],
    ['water source protection', 'Water Resource Management'],
    ['domestic water supply', 'Water Resource Management'],
    ['minor irrigation related proposals', 'Water Resource Management'],
    ['water quality improvement', 'Water Quality Improvement'],
    ['stream reservation', 'Stream Reservation'],
    ['minor tanks', 'Minor Tanks Restoration'],
    ['developments', 'Product and Entrepreneurships'],
    ['pecoe trail', 'Product and Entrepreneurships'],
    ['tourist attract places', 'Product and Entrepreneurships']
]);

const catalogCategoryOrder = {
    base: ['Administration', 'Land cover', 'Reservation', 'Soil', 'Risk and Hazard', 'Demography', 'Hydrology', 'Location', 'Water features', 'Transportation'],
    raster: ['Topography', 'Risk and Hazard', 'Location'],
    proposal: ['Water Resource Management', 'Water Quality Improvement', 'Stream Reservation', 'Soil and Water Conservation', 'Minor Tanks Restoration', 'Product and Entrepreneurships'],
    proposals: ['Water Resource Management', 'Water Quality Improvement', 'Stream Reservation', 'Soil and Water Conservation', 'Minor Tanks Restoration', 'Product and Entrepreneurships'],
    'environmental indicators': ['Station', 'Rainfall', 'Temperature - Max', 'Temperature - Min', 'Evaporation', 'NDVI'],
    product: ['Map', 'Report', 'Annex', 'Statistic', 'Photo']
};

const catalogTopicOrder = ['Base', 'Detail', 'Raster', 'Proposal', 'Environmental Indicators', 'Product', 'Administration'];

function normalizeCatalogText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function getProposalLayerCategory(file) {
    return proposalLayerCategories.get(normalizeCatalogText(file.Layer));
}

function sortCategoryNames(group, categoryNames) {
    const order = catalogCategoryOrder[normalizeCatalogText(group)] || [];
    return [...categoryNames].sort((first, second) => {
        const firstIndex = order.findIndex(name => normalizeCatalogText(name) === normalizeCatalogText(first));
        const secondIndex = order.findIndex(name => normalizeCatalogText(name) === normalizeCatalogText(second));
        const firstRank = firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex;
        const secondRank = secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex;
        return firstRank - secondRank || String(first).localeCompare(String(second));
    });
}

function sortTopicNames(topicNames) {
    return [...topicNames].sort((first, second) => {
        const firstIndex = catalogTopicOrder.findIndex(name => normalizeCatalogText(name) === normalizeCatalogText(first));
        const secondIndex = catalogTopicOrder.findIndex(name => normalizeCatalogText(name) === normalizeCatalogText(second));
        const firstRank = firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex;
        const secondRank = secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex;
        return firstRank - secondRank || String(first).localeCompare(String(second));
    });
}

function hasApprovedProposal(files) {
    return files.some(file =>
        isProposalFile(file) &&
        getProposalLayerCategory(file)
    );
}

function isProposalFile(file) {
    return ['proposal', 'proposals'].includes(normalizeCatalogText(file.Group));
}

function isHiddenCatalogLayer(file) {
    const group = normalizeCatalogText(file.Group);
    const database = normalizeCatalogText(file.Database);
    const layer = normalizeCatalogText(file.Layer);

    return (group === 'base' && database === 'risk and hazard' && layer === 'flood') ||
        (group === 'product' && database === 'map' && layer.startsWith('proposal'));
}

function isProductMapFile(file) {
    return normalizeCatalogText(file.Group) === 'product' &&
        normalizeCatalogText(file.Database) === 'map';
}

function getProductMapFiles(file) {
    if (!isProductMapFile(file)) return [file];

    const layer = normalizeCatalogText(file.Layer);
    if (layer === 'water quality map') return [];
    if (layer !== 'temperature map') return [file];

    const sourceUrl = file.geojson || file.GeoJSON || file.GeoJson || '';
    const maxFile = {
        ...file,
        Layer: 'Temperature(Max) map',
        geojson: String(sourceUrl).replace(/\/map_16\/Tmin\/16_TminMap_/i, '/map_16/Tmax/15_TmaxMap_')
    };
    return [maxFile, { ...file, Layer: 'Temperature(Min) map' }];
}

function formatMwsId(mwsId) {
    return /^mws[-_]?/i.test(String(mwsId || '').trim())
        ? String(mwsId).trim().replace(/^mws[-_]?/i, 'MWS-')
        : `MWS-${String(mwsId || '').trim()}`;
}

function getSelectedMwsSuffix() {
    const mwsId = String(document.getElementById('catalogMwsSelect').value || '').trim();
    const suffix = mwsId.replace(/^mws[-_]?/i, '');
    return /^\d+$/.test(suffix) ? suffix.padStart(3, '0') : suffix;
}

function resolveCatalogFileUrl(file, url) {
    if (!url || !isProductMapFile(file)) return url;

    const mwsSuffix = getSelectedMwsSuffix();
    if (!mwsSuffix) return url;

    return String(url).replace(
        /(\/IWWRMP\/Data\/Derive\/Map\/[^/?#]+\/[^/?#]+_)\d{3}(\.[^/?#]+)$/i,
        `$1${mwsSuffix}$2`
    );
}

function groupFiles(files) {
    const grouped = {};
    files.forEach(file => {
        if (isHiddenCatalogLayer(file)) return;

        const group = file.Group || "Ungrouped";
        const isProposal = ['proposal', 'proposals'].includes(normalizeCatalogText(group));
        const database = isProposal ? getProposalLayerCategory(file) : (file.Database || "Undefined");

        // Proposal data is intentionally limited to the approved layers above.
        if (isProposal && !database) return;

        if (!grouped[group]) grouped[group] = {};
        if (!grouped[group][database]) grouped[group][database] = [];
        grouped[group][database].push(...getProductMapFiles(file));
    });
    return grouped;
}

function toRawGitHubUrl(url) {
    if (!url) return url;
    try {
        const u = url.trim();
        // If already a raw.githubusercontent URL, return as-is
        if (u.includes('raw.githubusercontent.com')) return u;
        // Convert typical GitHub blob URLs to raw URLs
        // e.g. https://github.com/<owner>/<repo>/blob/<branch>/path -> https://raw.githubusercontent.com/<owner>/<repo>/<branch>/path
        if (u.includes('github.com') && u.includes('/blob/')) {
            return u.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/');
        }
        return u;
    } catch (e) {
        return url;
    }
}

function sortCatalogValues(values) {
    return Array.from(values).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

// ---------------------------------------------------------------------------
// Registry file reading
// ---------------------------------------------------------------------------

/**
 * Parse CSV text (RFC 4180): quoted fields may contain commas, quotes ("") and line breaks.
 * Returns an array of rows, each an array of strings. A leading byte-order mark is ignored.
 */
function parseCsv(text) {
    const src = String(text || '').replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (quoted) {
            if (ch === '"') {
                if (src[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === ',') {
            row.push(field); field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && src[i + 1] === '\n') i++;
            row.push(field); field = '';
            rows.push(row); row = [];
        } else {
            field += ch;
        }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
}

/** Rows to objects keyed by the header row. Extra cells without a header are ignored. */
function csvToObjects(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map(h => String(h).trim());
    return rows.slice(1).map(cells => {
        const obj = {};
        headers.forEach((h, i) => { if (h) obj[h] = cells[i] === undefined ? '' : String(cells[i]).trim(); });
        return obj;
    });
}

async function fetchRegistry(urls) {
    const allFiles = [];
    for (const url of urls) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Catalog file request failed (${response.status}): ${url}`);
        }
        allFiles.push(...csvToObjects(parseCsv(await response.text())));
    }
    return allFiles;
}

/** The file a registry row points to (the column name varies between registry files). */
function getCatalogFileUrl(file) {
    const url = file.geojson || file.GeoJSON || file.GeoJson || file['Download'] || file['download'] || file['Download_URL'] ||
        file['download_url'] || file['File'] || file['file'] || file.Path || file.path || file.URL || file.Url || file.url || '';
    return String(url).trim();
}

/** File format of a URL, for icons and labels. */
function fileFormat(url) {
    const clean = String(url || '').split('?')[0].split('#')[0];
    const ext = (clean.match(/\.([A-Za-z0-9]+)$/) || [])[1];
    const e = ext ? ext.toLowerCase() : '';
    const map = {
        geojson: { id: 'geojson', label: 'GeoJSON', kind: 'map' }, json: { id: 'json', label: 'JSON', kind: 'file' },
        csv: { id: 'csv', label: 'CSV', kind: 'table' }, xlsx: { id: 'xlsx', label: 'Excel', kind: 'table' }, xls: { id: 'xls', label: 'Excel', kind: 'table' },
        png: { id: 'png', label: 'PNG image', kind: 'image' }, jpg: { id: 'jpg', label: 'JPG image', kind: 'image' }, jpeg: { id: 'jpg', label: 'JPG image', kind: 'image' },
        tif: { id: 'tif', label: 'GeoTIFF', kind: 'image' }, tiff: { id: 'tif', label: 'GeoTIFF', kind: 'image' },
        pdf: { id: 'pdf', label: 'PDF', kind: 'file' }, zip: { id: 'zip', label: 'ZIP', kind: 'file' }, shp: { id: 'shp', label: 'Shapefile', kind: 'map' }
    };
    return map[e] || { id: e || 'none', label: e ? e.toUpperCase() : 'No file', kind: 'file' };
}
