// -----------------------------------------------------------------------------
// Spatial smoothing filter for annual classification (EN)
// -----------------------------------------------------------------------------
// This script applies a spatial "majority" (mode) filter to a multi-band annual
// classification image (classification_YYYY) that already contains connectivity
// diagnostics (connect_YYYY).
//
// The filter is applied ONLY to small connected components:
// - For each year, compute focal_mode with a 1-pixel square kernel.
// - Mask the mode result where connect_YYYY <= 6 (small patches only).
// - Blend the mode result into the original classification.
//
// Outputs:
// - A new multi-band image with one band per year (classification_1985..classification_2024),
//   exported to an Earth Engine Asset.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Optional region label (kept for context; not used directly below)
// -----------------------------------------------------------------------------
var regiao = 'sedimentaria_Oeste'; 
//var regiao = 'graben_SL';

/*
Possible regions (ECOZONA):
'cristalino',
'graben_LM',
'Sierras_Este', 
'sedimentaria_gnw',
'basaltica',
'graben_SL',
'sedimentaria_Oeste'
*/

// -----------------------------------------------------------------------------
// Versioning / output naming
// -----------------------------------------------------------------------------
var ver = '1';
var version = 'v1'; 
var versionIn = 'v_' + ver + '_gap';   // input label (not used in the active asset line)
var versionOut = 'v_' + ver + '_esp';  // output label

var dirout = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/classificationC5/';

// (EN) Region FC included for reference; export uses geometryPampa below.
var regioesCollection = ee.FeatureCollection('projects/MapBiomas_Pampa/ANCILLARY_DATA/RegionesUy_Buf');

// -----------------------------------------------------------------------------
// Input: gap-filled classification + connectivity bands
// -----------------------------------------------------------------------------
// Expected bands:
// - classification_1985 ... classification_2024
// - connect_1985 ... connect_2024
var class4GAP = ee.Image(
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/classificationC5/col5-v1-gap-85-24-mosaic'
);

// -----------------------------------------------------------------------------
// Visualization (QA)
// -----------------------------------------------------------------------------
var palettes = require('users/mapbiomas/modules:Palettes.js');
var visClass = { min: 0, max: 45, palette: palettes.get('classification5') };

// (EN) Quick pre-filter check (example year).
Map.addLayer(class4GAP.select('classification_2021'), visClass, 'Pre Spatial Filter (GAP)', false);

// -----------------------------------------------------------------------------
// Filter parameters
// -----------------------------------------------------------------------------
var CONNECT_THRESHOLD = 6;  // (EN) Only smooth patches with <= 6 connected pixels
var MODE_RADIUS = 1;        // (EN) 1-pixel neighborhood radius
var MODE_KERNEL = 'square'; // (EN) square kernel
var MODE_UNITS = 'pixels';  // (EN) units in pixels

// -----------------------------------------------------------------------------
// Helper: apply spatial mode correction for a single year
// -----------------------------------------------------------------------------
var filterYear = function(yearStr) {
  // (EN) Original classification for the year
  var cls = class4GAP.select('classification_' + yearStr);

  // (EN) Neighborhood majority (mode)
  var modeImg = cls.focal_mode(MODE_RADIUS, MODE_KERNEL, MODE_UNITS);

  // (EN) Mask to apply smoothing only where connected components are small
  var smallPatchMask = class4GAP.select('connect_' + yearStr).lte(CONNECT_THRESHOLD);

  // (EN) Keep mode only where mask is true, then blend into original
  modeImg = modeImg.updateMask(smallPatchMask);
  var out = cls.blend(modeImg).rename('classification_' + yearStr);

  return out;
};

// -----------------------------------------------------------------------------
// Build output image: one band per year (1985–2024)
// -----------------------------------------------------------------------------
var class_outTotal = filterYear('1985');

for (var y = 1986; y <= 2024; y++) {
  class_outTotal = class_outTotal.addBands(filterYear(String(y)));
}

print(class_outTotal, 'Spatially filtered classification (class_outTotal)');

// (EN) Quick post-filter check (example year).
Map.addLayer(class_outTotal.select('classification_2021'), visClass, 'Post Spatial Filter', false);

// -----------------------------------------------------------------------------
// Export to Asset
// -----------------------------------------------------------------------------
// NOTE (EN): geometryPampa must exist in your environment (not defined here).
Export.image.toAsset({
  image: class_outTotal,
  description: '_class_' + versionOut,
  assetId: dirout + 'class_' + versionOut,
  pyramidingPolicy: { '.default': 'mode' }, // categorical map
  region: geometryPampa,
  scale: 30,
  maxPixels: 1e13
});
