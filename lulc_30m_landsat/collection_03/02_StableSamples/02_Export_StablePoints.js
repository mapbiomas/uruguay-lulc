/ AUTHOR: Juliano Schirmbeck
// DATE: Nov 2020

// -----------------------------------------------------------------------------// Script purpose
// -----------------------------------------------------------------------------// This script generates stratified training points (samples) from a "stable classes"
// reference map (dirsamples). Samples are generated per region (ECOZONA) using a
// fixed number of points per class (nSamples) via stratifiedSample().
// The resulting points are exported as a FeatureCollection Asset.
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------// Study area / biome configuration
// -----------------------------------------------------------------------------
// Geometry defining the Pampa limit (Uruguay area of interest).
// NOTE: In this script it is defined but not directly used later (kept as-is).
var limite_PAMPA = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[-58.89903243473292, -33.90945759789922],
          [-58.16280033456499, -34.499816860847936],
          [-57.2862137727395, -34.79490451623124],
          [-55.19834373490166, -35.44914265276266],
          [-53.765088158901605, -34.46740051239218],
          [-53.17125331408759, -33.65836262321688],
          [-52.8934190863683, -32.811213773068836],
          [-53.50937251712497, -32.03185386133755],
          [-54.8003634592565, -31.06489845827693],
          [-56.10117941688713, -30.162803430416954],
          [-57.67702021839042, -29.826468649902285],
          [-58.21360234939319, -30.66900608099251],
          [-58.49497045967579, -31.812411235606]]]);
          

// Biome identifier used in naming outputs (and usually to document provenance)
var bioma = "PAMPAURUGUAY";

// Version tag used in naming input/output assets
var versao = 'v1'

// Number of points per class to sample in EACH region (ECOZONA)
var nSamples = 2000;


// -----------------------------------------------------------------------------// Temporal suffix selection
// -----------------------------------------------------------------------------// This suffix identifies the time window used to build the stable reference map.
// Only one suffix should be active at a time.
// (The suffix becomes part of the input path and output name.)
var sufix = '85_89'
//var sufix = '90_94' 
//var sufix = '95_99'
//var sufix = '00_04'
//var sufix = '05_09'
//var sufix = '10_14' 
//var sufix = '15_19'
//var sufix = '20_23'


// -----------------------------------------------------------------------------// Input assets
// -----------------------------------------------------------------------------// dirsamples: Raster stable reference map for the selected time window
// (Band 'reference' contains the class code for pixels considered "persistent/stable".)
// NOTE: Path includes sufix and versao, so it must match an existing asset.
var dirsamples = ee.Image(
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/SAMPLES/C4Pampa_amostras_estaveis_Uruguay_C4_' 
  + sufix + '_' + versao
)

// Output folder for sample points (FeatureCollection export)
var dirout = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/SAMPLES/PUNTOS/'

// Regions FeatureCollection used to spatially partition the sampling.
// Each feature must contain an attribute "ECOZONA" (used to tag output points).
var regioesCollection = ee.FeatureCollection('projects/MapBiomas_Pampa/ANCILLARY_DATA/RegionesUy_Buf')


// -----------------------------------------------------------------------------// Visualization setup
// -----------------------------------------------------------------------------// Load MapBiomas palette module and add stable reference map for visual inspection.
var palettes = require('users/mapbiomas/modules:Palettes.js');

var vis = {
    'bands': ['reference'],
    'min': 0,
    'max': 34,
    'palette': palettes.get('classification2')
};

// Display stable classes map on the map viewer
Map.addLayer(dirsamples, vis, 'Classes persistentes' + sufix, true);

// Print regions collection for inspection (attributes, number of features, etc.)
print(regioesCollection)


// -----------------------------------------------------------------------------// Function: generate training samples for one region feature
// -----------------------------------------------------------------------------// This function is mapped over regioesCollection.
// For each region (feature):
// 1) Read the ECOZONA attribute
// 2) Clip reference map to the region geometry
// 3) Run stratified sampling with a fixed number of points per class
// 4) Add ECOZONA attribute to each sampled point
// 5) Return the region's training points FeatureCollection
////////////////////////////////////////////////////////
var getTrainingSamples = function (feature) {

  // Extract region label from feature properties
  var regiao = feature.get('ECOZONA');
  //print(regiao)

  // Number of training points per class for this region
  // (All classes receive the same nSamples here.)
  var num_train_02 = nSamples
  var num_train_03 = nSamples
  var num_train_04 = nSamples
  var num_train_09 = nSamples
  var num_train_11 = nSamples
  var num_train_12 = nSamples
  var num_train_15 = nSamples
  var num_train_18 = nSamples
  var num_train_21 = nSamples
  var num_train_22 = nSamples
  var num_train_33 = nSamples
  

  // Region geometry (used to clip the stable reference map)
  var clippedGrid = ee.Feature(feature).geometry()

  // Clip stable reference map to the region extent
  var referenceMap = dirsamples.clip(clippedGrid);
  //Map.addLayer(referenceMap,vis)
                      
  // Stratified sampling:
  // - classBand: 'reference' indicates the raster class band
  // - classValues: list of target class IDs
  // - classPoints: requested number of points per class
  // - geometries: true returns point geometries in the output features
  // - region: limits sampling to the region geometry
  // - seed: makes sampling reproducible
  //
  // NOTE: If a class has fewer available pixels than requested points,
  // the sample size for that class may be lower.
  var training = referenceMap.stratifiedSample({
           scale: 30,
           classBand: 'reference',
           numPoints: 0,
           region: feature.geometry(),
           seed: 1,
           geometries: true,
           classValues: [2, 3, 4, 9, 11, 12, 15, 18, 21, 22, 33], 
           classPoints: [num_train_02,
                         num_train_03,
                         num_train_04,
                         num_train_09,
                         num_train_11,
                         num_train_12,
                         num_train_15,
                         num_train_18,
                         num_train_21,
                         num_train_22,
                         num_train_33]
  });

  // Add ECOZONA field to each sampled feature to preserve region provenance
  training = training.map(function(feat) {
    return feat.set({'ECOZONA': regiao})
  });

  return training;
};


// -----------------------------------------------------------------------------// Generate samples for all regions and merge into a single FeatureCollection
// -----------------------------------------------------------------------------// Map getTrainingSamples over all region features,
// then flatten() to merge nested collections into one.
var mySamples = regioesCollection.map(getTrainingSamples).flatten();

// Display the sampled points on the map for a quick spatial inspection
Map.addLayer(mySamples)

// Basic prints for QA / debugging
print(mySamples.first())
print(mySamples.limit(1))
print(mySamples.size())


// -----------------------------------------------------------------------------// Export samples to an Earth Engine Asset
// -----------------------------------------------------------------------------// Export naming includes:
/// - "samples_C5_" prefix
//  - biome name
//  - suffix (time window)
//  - version tag
//
// Output is saved to dirout (Asset folder).
//
// NOTE: This uses the 3-argument signature shown here (collection, description, assetId),
// which is commonly used in older scripts.
Export.table.toAsset(mySamples,
  'samples_C5_' + bioma + '_'  + sufix + '_' + versao,
  dirout + 'samples_C5_' + bioma + '_'  + sufix + '_' + versao
)
