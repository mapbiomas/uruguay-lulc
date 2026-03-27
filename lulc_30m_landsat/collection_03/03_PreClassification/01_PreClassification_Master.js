/** 
 * Clasificación Colección 2.0 MapBiomas Pampa
 * 
 * Codigos recopilados por Sarrailhé Sofia, de Banchero Santiago y Schirmbreckj Juliano
 * con ayuda de Schirmbreckj Juliano y Barbieri Andrea 
 * 
 *  CZ: Con Zonificación
 * 
 *  INPUTS: 
 *    - Mosaicos colección 2
 *    - Muestras estables colección 2
 *    - Zonas colección 2
 *    - Colección 1 para ver diferencias
 *  
 * OUTPUT:
 *    -Clasificaciones anuales por zona, según el periodo de años y la zona utilizada
 * 
 * 
 * PARA UTILIZAR EL SCIRPT
 * Las lineas a modificar son de la 30 a la 57 y modificar POR ZONA el balanceo de las 
 * muestras a entre las lineas 373 y 399
 * 
 * verificar cuales classes están el la zona o no: AR 447 a 455   UY  473 a 478
 * 
 * */

/**
 * (EN) MapBiomas Pampa classification script (zoned workflow)
 *
 * This script performs annual land-cover classification for a single zone (ECOZONA / idZona),
 * using:
 *   - Landsat mosaic predictors (MapBiomas mosaics)
 *   - Stable samples (yearly sample tables)
 *   - Optional complementary samples to mitigate mosaic gaps
 *
 * Outputs:
 *   - A multi-band annual classification image (classification_YYYY)
 *   - A CSV report (sample counts / accuracy info)
 *   - Optional area statistics and/or accuracy evaluation (Collection 1/4 testing polygons)
 *
 * IMPORTANT OPERATING NOTES:
 *   - This script should be used for ONE zone at a time (save a copy per zone).
 *   - Main user-edit section: configuration variables (biome, zone IDs, versions, year range, flags).
 *   - Per-zone sample balancing equations MUST be adjusted for each zone and period.
 */


// -----------------------------------------------------------------------------
// USER CONFIGURATION SECTION (edit here)
// -----------------------------------------------------------------------------

// Comment the 'bioma' variable for the countries you do NOT want to run.
// (EN) Choose biome/country context (controls which assets/regions are used).
var bioma = 'PAMPAURUGUAY'
//var bioma = 'PAMPAARGENTINA'

// Each script run must target ONE single zone.
// (EN) Save one script copy per zone to avoid mixing configurations.
var id_zona = 'sedimentaria_Oeste'  // Zone identifier as a string (ECOZONA name)
var id_zona2 = '7'  // Zone numeric identifier as a string (used in raster naming)

// Uruguay zones reference:
// 1-cristalino, 2-graben_L, 3-Sierras_Este,4-sedimentaria_gnw, 5-basaltica, 6-graben_SL, 7-sedimentaria_Oeste

// (EN) Output version tags for classification products.
var version_clasificacion = '1' // Classification version (string): allows multiple versions per zone
var version_anterior = '1'

// (EN) Inputs versions: stable samples + mosaics versions.
var version_muestras = 'V1'// DO NOT CHANGE (stable sample naming convention)
var version_mosaico = '4' // Mosaic version (string) used to filter mosaic collections

// (EN) Sample balancing parameters.
var desvio = 0 // "deviation" term used in sample balancing equations
var nSamplesMin = 50;// minimum samples per class per year (typically 10% of 2000)
var nSamplesMax = 2000;

// (EN) Classification time range.
var year_inicio = 1985 // First year to classify
var year_fin = 2024 // Last year to classify

// (EN) Optional evaluation flags:
// 1 = compute / 0 = do not compute
var calcula_area = 0
var year_calcula_area = '2023'
var year_acuracia = '2023'

// (EN) Accuracy/confusion matrix using Collection 1/4 testing polygons.
// Available only between ~2000 and 2019 (informative/approximate results).
var calcula_acuracia = 0 // If 1, computes accuracy
var conf_mat = 0 // If 1, computes confusion matrix

// (EN) "Difference map" settings (comparison with previous collection/version).
var clase_diferencia = 15 // class used for difference visualization
var cant_muestras = 0 // If 1, prints number of samples per class per year

// (EN) Random Forest settings.
var nro_arboles = 100 // number of trees
                     // Use low value (e.g., 15) during testing, and >=50 for final exports

// (EN) Outlier threshold for stable samples: max allowed number of outlier bands.
var cant_b_outlier = 20 // tolerated number of outlier bands per sample

// (EN) Mosaic gap handling options:
// If mosaics have gaps/holes, you can merge complementary samples.
var mosaico_con_huecos = 0 // 1 = use complementary samples to fill mosaic gaps
                           // Requires complementary stable samples; otherwise errors

var ver_muestras = 0 // 1 = display yearly samples used for training (debug/inspection)

var agregar_complementariasC3 =1 // 1 = also use complementary samples from Collection 3
                                  // If it errors because no samples exist, set to 0

// (EN) Limits for number of Collection 3 complementary samples per class.
var cant_C3_BC  = 1000
var cant_C3_BA  = 1000
var cant_C3_PF  = 1000
var cant_C3_AHN = 1000
var cant_C3_PZ  = 1000
var cant_C3_PAS = 1000
var cant_C3_AGR = 1000
var cant_C3_ANV = 1000
var cant_C3_AGU = 1000


// -----------------------------------------------------------------------------
// DO NOT EDIT BELOW THIS LINE (core pipeline)
// -----------------------------------------------------------------------------

// (EN) Biome switch: defines input assets, zone layers, and output folders for AR vs UY.
if (bioma == 'PAMPAARGENTINA' ) {
  
  // (EN) Source folder containing yearly stable samples (FeatureCollections).
  var dirsaples = 'projects/MapBiomas_Pampa/SAMPLES/C4/ARGENTINA/YEAR/'+ version_muestras + '/'

  // (EN) Zones vector layer (FeatureCollection) and zones raster image collection prefix.
  var zonas = ee.FeatureCollection('projects/MapBiomas_Pampa/ANCILLARY_DATA/C3/ZonasPampa_ARG_C3_CONbuffer')
  var zonas_ras = ('projects/MapBiomas_Pampa/ANCILLARY_DATA/C3/IC_ZonasPampaArg_C3/')

  // (EN) Output asset folder for classifications (must exist / create a new asset folder).
  var output = 'projects/MapBiomas_Pampa/WORKSPACE/COLLECTION4/ARGENTINA/classification_c4/'
  
  // (EN) Property name used to filter zones in Argentina dataset.
  var id_zona_prop = 'idZona'
  
  // (EN) Region/zone geometry and raster mask for the selected zone.
  var myRegion = zonas.filterMetadata(id_zona_prop , 'equals', id_zona)
  var limite = ee.Image(zonas_ras + 'ZonasPampa_ARG_C3_CONbuffer_raster_z' + id_zona)

}

if (bioma == 'PAMPAURUGUAY' ) {

  // (EN) Source folder containing yearly stable samples (FeatureCollections).
  // NOTE: this path includes '/15_18/' (period folder); keep consistent with your sample assets.
  var dirsaples = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/SAMPLES/YEAR/'+ version_muestras + '/15_18/'

  // (EN) Zones vector layer and zones raster image collection prefix for Uruguay.
  var zonas = ee.FeatureCollection('projects/mapbiomas-uruguay/assets/LAND-COVER/ANCILLARY_DATA/C5/regiones_buffer_uy_ext')
  var zonas_ras = ('projects/mapbiomas-uruguay/assets/LAND-COVER/ANCILLARY_DATA/C5/IC_ZonasPampaUru/')

  // (EN) Output folder for classification assets (must exist).
  var output = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/classificationC5/'

  // (EN) Property name used to filter zones in Uruguay dataset.
  var id_zona_prop = 'ECOZONA'

  // (EN) Filter the selected zone geometry and load raster zone mask.
  var myRegion = zonas.filterMetadata(id_zona_prop, 'equals', id_zona)
  var limite =  ee.Image(zonas_ras + 'ZonasPampa_URU_C3_CONbuffer_raster_z' + id_zona2)

  // (EN) Collection 3 complementary samples for the zone (used optionally).
  var compl_C3 = ee.FeatureCollection('projects/MapBiomas_Pampa/SAMPLES/C3/URUGUAY/COMPLEMENTARIAS/clasificacion-1985-2022-z'+ id_zona2)
}


// -----------------------------------------------------------------------------
// External modules / utilities
// -----------------------------------------------------------------------------

// (EN) Time series plotting module (used in the UI/app section).
var ts = require('users/santiagobanchero/plots:plots.js')

// (EN) Training target property name (class label).
var target = 'reference';

// (EN) NOTE: variable "region" must exist in the full script context.
// This line filters it by biome; if "region" is undefined upstream, it will error.
var region = region.filter(ee.Filter.eq('biome', bioma))

// (EN) Difference map helper (compares two classification maps for a given class).
var diferenca = require('users/schirmbeckj/PampaTriNacional:Utils/Passo100_Mapa_Diferencas_Classe_v02.js').diferenca

// (EN) Legend utilities for UI styling.
var utils = require("users/schirmbeckj/PampaTriNacional:Colecion_04/getlegend_Pampa_c4")
var legend = require('users/schirmbeckj/PampaTriNacional:Colecion_04/legend_Pampa_c4').legend


// -----------------------------------------------------------------------------
// Mosaic predictors (feature space): merge Landsat mosaics + Landsat-7 mosaics,
// then filter by mosaic version and biome.
// -----------------------------------------------------------------------------
var mosaics =  ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics')
                 .merge(ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics-landsat-7'))
                 .filterMetadata('version', 'equals', version_mosaico)
                 .filterMetadata('biome', 'equals', bioma)


// -----------------------------------------------------------------------------
// Predictor bands list: full names and shortened export names
// -----------------------------------------------------------------------------
{var bandNames = ee.List([
  // (EN) Seasonal amplitude bands
  'evi2_amp','gv_amp','ndfi_amp','ndvi_amp','ndwi_amp','soil_amp','wefi_amp',

  // (EN) Median bands (annual / dry / wet)
  'blue_median','blue_median_dry','blue_median_wet',
  'cai_median','cai_median_dry',
  'cloud_median',
  'evi2_median','evi2_median_dry','evi2_median_wet',
  'gcvi_median','gcvi_median_dry','gcvi_median_wet',
  'green_median','green_median_dry','green_median_wet','green_median_texture',
  'gv_median','gvs_median','gvs_median_dry','gvs_median_wet',
  'hallcover_median',

  // (EN) Coordinates bands (computed in this script)
  'latitude','longitude',

  // (EN) SMA and indices
  'ndfi_median','ndfi_median_dry','ndfi_median_wet',
  'ndvi_median','ndvi_median_dry','ndvi_median_wet',

  // (EN) NDVI amplitude over 3 years (computed in this script)
  'ndvi_amp_3y',

  'ndwi_median','ndwi_median_dry','ndwi_median_wet',
  'nir_median','nir_median_dry','nir_median_wet',
  'npv_median',
  'pri_median','pri_median_dry','pri_median_wet',
  'red_median','red_median_dry','red_median_wet',
  'savi_median','savi_median_dry','savi_median_wet',
  'sefi_median','sefi_median_dry',
  'shade_median',
  'soil_median',
  'swir1_median','swir1_median_dry','swir1_median_wet',
  'swir2_median','swir2_median_dry','swir2_median_wet',
  'wefi_median','wefi_median_wet',

  // (EN) Min bands
  'blue_min','green_min','nir_min','red_min','swir1_min','swir2_min',

  // (EN) Standard deviation bands
  'blue_stdDev','cai_stdDev','cloud_stdDev','evi2_stdDev','gcvi_stdDev',
  'green_stdDev','gv_stdDev','gvs_stdDev','hallcover_stdDev','ndfi_stdDev',
  'ndvi_stdDev','ndwi_stdDev','nir_stdDev','red_stdDev','savi_stdDev',
  'sefi_stdDev','shade_stdDev','soil_stdDev','swir1_stdDev','swir2_stdDev',
  'wefi_stdDev',

  // (EN) Topography
  'slope'
]);
