/**
 * Layer state
 *
 * Purpose : Registries of what is currently on the map (overlays, GeoJSON layers, legends' state, highlight, fallbacks).
 * Depends : Nothing. Loaded first among the layer modules.
 * Exposes : pngOverlays, geoJsonLayers, roadDecorations, layerState, currentHighlightedFeature, miniWatershedLinkedEnvironmentalArea, populationClickFallbackHandler
 */

// Initialize layers storage
const pngOverlays = {};

const geoJsonLayers = {};

const roadDecorations = {};

const layerState = {};  // Object to track the state of each layer

let currentHighlightedFeature = null;

let miniWatershedLinkedEnvironmentalArea = false;

let populationClickFallbackHandler = null;
