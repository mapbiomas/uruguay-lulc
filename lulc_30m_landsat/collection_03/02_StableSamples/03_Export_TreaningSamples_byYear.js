// -----------------------------------------------------------------------------
// Script purpose
// -----------------------------------------------------------------------------
// This script extracts (samples) annual mosaic attributes at pre-generated sample
// points (pts) for Uruguay Pampa, per ecozone (ECOZONA), and exports:
// 1) A FeatureCollection to an Earth Engine Asset (per year)
// 2) A Shapefile (SHP) to Google Drive (per year)
//
// Workflow summary:
// - Load sample points (stratified points with ECOZONA attribute)
// - Load mosaic collections (Landsat main + Landsat 7)
// - For each year in a selected period:
//     * Build annual mosaic image (mosaic())
//     * Compute NDVI amplitude over a rolling 1–3 year window (ndvi_amp_3y)
//     * Add longitude, latitude (scaled) and slope bands
//     * Rename bands to short names (bandNamesShort)
//     * For each ecozone, reduce mosaic values at points (reduceRegions)
//     * Merge all ecozone results into one FeatureCollection
//     * Export to Asset and Drive
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Global configuration / parameters
// -----------------------------------------------------------------------------
var versao = 'v1'
var version_mosaic = '4'

// Output folder (Earth Engine Asset) for exported per-year tables
var dirout = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/SAMPLES/YEAR/';

// Collection number tag used in export naming
var col ='5'

// Mosaic assets (primary mosaics + Landsat 7 mosaics)
var dirasset =  'projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics';
var dirasset7 = 'projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics-landsat-7';

// Regions FeatureCollection (used for geometry + region labels / ECOZONA partition)
var regions = ee.FeatureCollection('projects/MapBiomas_Pampa/ANCILLARY_DATA/RegionesUy_Buf')


// -----------------------------------------------------------------------------
// Period selection (suffix + list of years)
// -----------------------------------------------------------------------------
// Select ONE of the following period blocks by uncommenting it.
// sufix is used to locate the sample points dataset and for output naming.
var sufix = '_85_89', anos = [1985,1986,1987,1988,1989];
//var sufix = '_90_94', anos = [1990,1991,1992,1993,1994];
//var sufix = '_95_99' , anos = [1995,1996,1997,1998,1999];
//var sufix = '_00_04' , anos = [2000,2001,2002,2003,2004]; 
//var sufix = '_05_09', anos = [2005,2006,2007,2008,2009];
//var sufix = '_10_14', anos = [2010,2011,2012,2013,2014];
//var sufix = '_15_19' , anos = [2015,2016,2017,2018,2019];
//var sufix = '_20_23' , anos = [2020,2021,2022,2023,2024]; 


// -----------------------------------------------------------------------------
// Study area and sample points
// -----------------------------------------------------------------------------
// Global limit geometry: union of regions features
var limite = regions.geometry()

// Biome name used to filter mosaics by metadata
var biome = 'PAMPAURUGUAY'

// Load sample points FeatureCollection for the selected suffix + version.
// NOTE: pts must contain the property ECOZONA, used below to subset by region.
var pts = ee.FeatureCollection(
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/SAMPLES/PUNTOS/samples_C5_PAMPAURUGUAY'
  + sufix + '_' + versao
)

// Quick visualization/QA for points
Map.addLayer(pts, {}, 'pontos', false)
print('pontos',pts.first())
print(pts.size())

// Optional: filter points by region ID (commented out)
//var pts_reg = pts.filterMetadata('ID', 'equals', 1)
//print('pontos regiao',pts_reg)


// -----------------------------------------------------------------------------
// Palette module (not used later for layers here, but kept as in original)
// -----------------------------------------------------------------------------
var palettes = require('users/mapbiomas/modules:Palettes.js');


// -----------------------------------------------------------------------------
// Band name lists: full names and shortened names
// -----------------------------------------------------------------------------
// bandNames: expected mosaic band names (input)
// bandNamesShort: output names used in exports (short field names)
// NOTE: Some bands are noted as "calculated in script" (lat/long/ndvi_amp_3y).
{
var bandNames = ee.List([
'evi2_amp',
'gv_amp',
'ndfi_amp',
'ndvi_amp',
'ndwi_amp',
'soil_amp',
'wefi_amp',
'blue_median',
'blue_median_dry',
'blue_median_wet',
'cai_median',
'cai_median_dry',
'cloud_median',
'evi2_median',
'evi2_median_dry',
'evi2_median_wet',
'gcvi_median',
'gcvi_median_dry',
'gcvi_median_wet',
'green_median',
'green_median_dry',
'green_median_wet',
'green_median_texture',
'gv_median',
'gvs_median',
'gvs_median_dry',
'gvs_median_wet',
'hallcover_median',
'latitude', // calculated in script
'longitude', // calculated in script
'ndfi_median',
'ndfi_median_dry',
'ndfi_median_wet',
'ndvi_median',
'ndvi_median_dry',
'ndvi_median_wet',
'ndvi_amp_3y', // calculated in script
'ndwi_median',
'ndwi_median_dry',
'ndwi_median_wet',
'nir_median',
'nir_median_dry',
'nir_median_wet',
'npv_median',
'pri_median',
'pri_median_dry',
'pri_median_wet',
'red_median',
'red_median_dry',
'red_median_wet',
'savi_median',
'savi_median_dry',
'savi_median_wet',
'sefi_median',
'sefi_median_dry',
'shade_median',
'soil_median',
'swir1_median',
'swir1_median_dry',
'swir1_median_wet',
'swir2_median',
'swir2_median_dry',
'swir2_median_wet',
'wefi_median',
'wefi_median_wet',
'blue_min',
'green_min',
'nir_min',
'red_min',
'swir1_min',
'swir2_min',
'blue_stdDev',
'cai_stdDev',
'cloud_stdDev',
'evi2_stdDev',
'gcvi_stdDev',
'green_stdDev',
'gv_stdDev',
'gvs_stdDev',
'hallcover_stdDev',
'ndfi_stdDev',
'ndvi_stdDev',
'ndwi_stdDev',
'nir_stdDev',
'red_stdDev',
'savi_stdDev',
'sefi_stdDev',
'shade_stdDev',
'soil_stdDev',
'swir1_stdDev',
'swir2_stdDev',
'wefi_stdDev',
'slope'
]);


var bandNamesShort = ee.List([
'evi2_a',
'gv_a',
'ndfi_a',
'ndvi_a',
'ndwi_a',
'soil_a',
'wefi_a',
'blue_m',
'blue_m_d',
'blue_m_w',
'cai_m',
'cai_m_d',
'cloud_m',
'evi2_m',
'evi2_m_d',
'evi2_m_w',
'gcvi_m',
'gcvi_m_d',
'gcvi_m_w',
'green_m',
'green_m_d',
'green_m_w',
'green_m_t',
'gv_m',
'gvs_m',
'gvs_m_d',
'gvs_m_w',
'hallcov_m',
'lat', // calculated in script
'long', // calculated in script
'ndfi_m',
'ndfi_m_d',
'ndfi_m_w',
'ndvi_m',
'ndvi_m_d',
'ndvi_m_w',
'ndvi_a_3y', // calculated in script
'ndwi_m',
'ndwi_m_d',
'ndwi_m_w',
'nir_m',
'nir_m_d',
'nir_m_w',
'npv_m',
'pri_m',
'pri_m_d',
'pri_m_w',
'red_m',
'red_m_d',
'red_m_w',
'savi_m',
'savi_m_d',
'savi_m_w',
'sefi_m',
'sefi_m_d',
'shade_m',
'soil_m',
'swir1_m',
'swir1_m_d',
'swir1_m_w',
'swir2_m',
'swir2_m_d',
'swir2_m_w',
'wefi_m',
'wefi_m_w',
'blue_min',
'green_min',
'nir_min',
'red_min',
'swir1_min',
'swir2_min',
'blue_sD',
'cai_sD',
'cloud_sD',
'evi2_sD',
'gcvi_sD',
'green_sD',
'gv_sD',
'gvs_sD',
'hallcov_sD',
'ndfi_sD',
'ndvi_sD',
'ndwi_sD',
'nir_sD',
'red_sD',
'savi_sD',
'sefi_sD',
'shade_sD',
'soil_sD',
'swir1_sD',
'swir2_sD',
'wefi_sD',
'slope'
])
}


// -----------------------------------------------------------------------------
// Terrain derivatives
// -----------------------------------------------------------------------------
// Load ALOS DEM and compute slope (added later as a band)
var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");
var slope = ee.Terrain.slope(terrain)

// Kernel defined (used only in commented entropy section)
var square = ee.Kernel.square({radius: 5});


// -----------------------------------------------------------------------------
// Region names (ECOZONA values) used to loop through ecozones
// -----------------------------------------------------------------------------
var regions_name= ['cristalino','graben_LM','Sierras_Este', 'sedimentaria_gnw','basaltica','graben_SL','sedimentaria_Oeste'] 


// -----------------------------------------------------------------------------
// Latitude/Longitude bands (pixelLonLat), scaled and converted to int16
// -----------------------------------------------------------------------------
// pixelLonLat produces floating degrees; here they are multiplied by (-1 * 100)
// and stored as int16. This is likely done to keep integers (smaller files / stable fields).
var ll = ee.Image.pixelLonLat().clip(limite)
    
var long = ll.select('longitude').add(0).multiply(-1).multiply(100).toInt16()
var lati = ll.select('latitude').add(0).multiply(-1).multiply(100).toInt16()


// -----------------------------------------------------------------------------
// Load mosaics collections (Landsat main + Landsat 7) for the selected biome/version
// -----------------------------------------------------------------------------
// Filter mosaic collections by biome and version, then merge.
var mosaicos1 = ee.ImageCollection(dirasset)
                  .filterMetadata('biome', 'equals', biome)
                  .filterMetadata('version', 'equals', version_mosaic)
print('mosaicos1',mosaicos1)

var mosaicos2 = ee.ImageCollection(dirasset7)
                  .filterMetadata('biome', 'equals', biome)
                  .filterMetadata('version', 'equals', version_mosaic)

var mosaicos = mosaicos1.merge(mosaicos2)

print('mosaicos',mosaicos)


// -----------------------------------------------------------------------------
// Main loop: process each year and extract mosaic values at sample points
// -----------------------------------------------------------------------------
for (var i_ano=0;i_ano<anos.length; i_ano++){
//for (var i_ano=0;i_ano<1; i_ano++){
  var ano = anos[i_ano];
  //print('ano',ano)

  // Build the annual mosaic image by filtering mosaics by year and mosaicking
  // (mosaic() merges images in collection order, using the first non-masked pixel)
  var mosaicoTotal = mosaicos.filterMetadata('year', 'equals', (ano))
                        .mosaic()

  // ---------------------------------------------------------------------------
  // Compute NDVI amplitude across a rolling 1–3 year window:
  // - For the first years, fewer previous years are available
  // - min3anos = min(ndvi_median_dry across available years)
  // - max3anos = max(ndvi_median_wet across available years)
  // - amp3anos = max3anos - min3anos
  // Output band: 'ndvi_amp_3y'
  // ---------------------------------------------------------------------------
  if (ano == 1985){// uses only current year (no previous years)
      var min3anos = mosaicoTotal.select('ndvi_median_dry')
      var max3anos = mosaicoTotal.select('ndvi_median_wet')
  }

  if (ano == 1986){// uses current year + 1 previous year
      var mosaico1ano_antes = mosaicos
                      .filterMetadata('year', 'equals', ( ano - 1))
                      .filterBounds(limite)
                      .mosaic()

      var min3anos = ee.ImageCollection.fromImages([
                        mosaicoTotal.select('ndvi_median_dry'),
                        mosaico1ano_antes.select('ndvi_median_dry')
                      ]).min()

      var max3anos = ee.ImageCollection.fromImages([
                        mosaicoTotal.select('ndvi_median_wet'),
                        mosaico1ano_antes.select('ndvi_median_wet')
                      ]).max()
  }

  if (ano > 1987){
      // uses current year + 2 previous years
      var mosaico1ano_antes = mosaicos
                      .filterMetadata('year', 'equals', ( ano - 1))
                      .filterBounds(limite)
                      .mosaic()

      var mosaico2anos_antes = mosaicos
                      .filterMetadata('year', 'equals', ( ano - 2))
                      .filterBounds(limite)
                      .mosaic()

      var min3anos = ee.ImageCollection.fromImages([
                        mosaicoTotal.select('ndvi_median_dry'),
                        mosaico1ano_antes.select('ndvi_median_dry'),
                        mosaico2anos_antes.select('ndvi_median_dry')
                      ]).min()

      var max3anos = ee.ImageCollection.fromImages([
                        mosaicoTotal.select('ndvi_median_wet'),
                        mosaico1ano_antes.select('ndvi_median_wet'),
                        mosaico2anos_antes.select('ndvi_median_wet')
                      ]).max()
  }

  // Amplitude band (difference between wet max and dry min across the window)
  var amp3anos = max3anos.subtract(min3anos).rename('ndvi_amp_3y')

  // Visualization parameters for amplitude (used only if Map.addLayer is enabled)
  var ndvi_color = '0f330f, 005000, 4B9300, 92df42, bff0bf, FFFFFF, eee4c7, ecb168, f90000'
  var visParNDFI_amp = {'min':0, 'max':60, 'palette':ndvi_color};
  //Map.addLayer(amp3anos, visParNDFI_amp, 'amp3anos', true);

  // Add derived bands to the annual mosaic:
  // - NDVI amplitude (3-year window)
  // - longitude, latitude
  // - slope
  mosaicoTotal = mosaicoTotal.addBands(amp3anos)

  mosaicoTotal = mosaicoTotal.addBands(long.rename('longitude'))
  mosaicoTotal = mosaicoTotal.addBands(lati.rename('latitude' ))
    
  mosaicoTotal = mosaicoTotal.addBands(slope.int8().clip(limite),['slope'])
    
  // Optional texture/entropy calculation (commented out)
  //var entropyG = mosaicoTotal.select('green_median').entropy(square);
  //mosaicoTotal = mosaicoTotal.addBands(entropyG.select([0],['textG']).multiply(100).int16())

  // Debug prints before and after renaming bands
  print('mosaico longo',mosaicoTotal,ano)

  // Rename/select bands to match short names list (export-friendly field names)
  mosaicoTotal = mosaicoTotal.select(bandNames,bandNamesShort)

  print('mosaico curto',mosaicoTotal,ano)

  // Optional: add the mosaic layer to the map (disabled by default)
  Map.addLayer(mosaicoTotal, {}, 'mosaico', false)


  // ---------------------------------------------------------------------------
  // Loop through ecozones (regions_name) and extract mosaic values at points
  // ---------------------------------------------------------------------------
  for (var i_reg=0; i_reg<regions_name.length; i_reg++){
    var region = regions_name[i_reg];

    // Filter points for this ECOZONA
    var pts_reg = pts.filterMetadata('ECOZONA', 'equals', region)

    // Extract raster values at the sample points:
    // reduceRegions returns the input features with the reducer result(s) appended.
    // Here:
    // - reducer: first() for each band
    // - scale: 30m
    // - tileScale: 4 (helps performance/memory in some cases)
    var training = mosaicoTotal.reduceRegions({
      collection: pts_reg, 
      reducer: ee.Reducer.first().forEachBand(mosaicoTotal), 
      scale: 30, 
      tileScale: 4
    })

    print(training.first())

    // Alternative approach using sampleRegions (commented out):
    // - It samples raster bands at point locations, returning features with band properties.
    // - Here it was planned for SHP export naming, but it's disabled.
    //      var trainingSHP = mosSHP.sampleRegions({
    //          'collection': pts_reg,
    //          'scale': 30,
    //          'tileScale': 4,
    //          'geometries': true
    //      });

    // Initialize or merge results for all ecozones into training_reg
    if (i_reg == 0){ 
      var training_reg = training 
      Map.addLayer(training_reg, {}, 'primeira', false)
      //var training_regSHP = trainingSHP 
    }  
    else {
      training_reg = training_reg.merge(training);
      //training_regSHP = training_regSHP.merge(trainingSHP);
    }

  }    

  // ---------------------------------------------------------------------------
  // Final merged samples for this year
  // ---------------------------------------------------------------------------
  Map.addLayer(training_reg, {}, 'resultado final', false)

  // Export extracted samples to Earth Engine Asset (one table per year)
  Export.table.toAsset(training_reg, 
                      'pontos_C'+col+'_' + versao + '_' + ano , 
                       dirout + 'pontos_C'+col+'_' + versao + '_' + ano);

  // Export extracted samples to Google Drive as a Shapefile (one SHP per year)
  Export.table.toDrive({
    collection: training_reg,
    fileFormat: 'SHP', // alternatives: 'CSV', 'KML'
    folder:'amostras_coll'+col+'_shp',
    description: 'pontos_exp1_UY_' + versao + '_' + ano + '_shp'
  })

} 
