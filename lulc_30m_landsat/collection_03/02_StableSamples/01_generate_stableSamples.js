// -----------------------------------------------------------------------------// Script purpose
// -----------------------------------------------------------------------------// This script generates a "persistent classes" reference map for Uruguay (Pampa),
// based on MapBiomas land cover classifications across a selected multi-year period.
// A class is kept in the reference map only if it appears frequently enough
// (>= freq_lim occurrences) across the years in the chosen period.
// The resulting reference map is exported to an Earth Engine Asset.
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------// Global configuration / parameters
// -----------------------------------------------------------------------------
// Output metadata version tag (used in export name)
var version = '1'  

// MapBiomas collection identifier (used only for output naming/paths)
var colecion = '4'

// Period selector (1..4). Each period defines:
// - years (anos)
// - band names per year (bandas_anos) [not used later but defined]
// - frequency threshold (freq_lim)
// - suffix for outputs (sufix)
var periodo = 4 //1,2,3,4  valores

// Output folder in Assets where the reference map will be exported
var dirout = 'projects/MapBiomas_Pampa/SAMPLES/C' + colecion + '/URUGUAY/'

// Regions FeatureCollection used only to draw outlines on the map
var regioesCollection = ee.FeatureCollection('projects/MapBiomas_Pampa/ANCILLARY_DATA/C3/regionesUy_buffer')
//var region = ['sedimentaria_Oeste']

// Load MapBiomas palettes (used for visualization with classification colors)
var palettes = require('users/mapbiomas/modules:Palettes.js');
//var biomes = ee.Image(assetBiomes);


// -----------------------------------------------------------------------------// Load classification image (multi-band, one band per year)
// -----------------------------------------------------------------------------
// This is a classification image containing bands like 'classification_1985', ... etc.
var colecao = ee.Image('projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-4/WORKSPACE/Col4_MapBiomasPamapa_classification_final') 
      //.min()
print('colecao',colecao) 

// Optional alternatives (commented out):
// - Load a single region image, or select a specific year band, or mask by biome.
//colecao = ee.Image(colecao.filterMetadata('region_name','equals',region).first()).select('classification_2019')
//print('colecao',colecao)   
//colecao = colecao.mask(biomes.eq(2))


// -----------------------------------------------------------------------------// Period definitions (years list + frequency threshold)
// -----------------------------------------------------------------------------
// NOTE: For each period, we define:
// - freq_lim: minimum number of years in which the class must appear at the pixel
// - anos: list of years (strings)
// - bandas_anos: corresponding band names in the classification image
// - sufix: suffix used in layer names and export names

if (periodo == 1){
    var freq_lim = 10, 
        anos = ['1985','1986','1987','1988','1989','1990','1991','1992','1993','1994'], 
        bandas_anos = ['classification_1985','classification_1986','classification_1987','classification_1988',
                'classification_1989','classification_1990','classification_1991',
                'classification_1992','classification_1993','classification_1994'], 
        sufix = '_85_94';
}

if (periodo ==2 ){
    var freq_lim = 10, 
            anos = ['1995','1996','1997','1998','1999','2000','2001','2002','2003','2004'], 
            bandas_anos = ['classification_1995','classification_1996','classification_1997','classification_1998',
                    'classification_1999','classification_2000','classification_2001','classification_2002',
                    'classification_2003','classification_2004'], 
            sufix = '_95_04';
}

if (periodo == 3 ){
  var freq_lim = 10,
              bandas_anos = ['classification_2005','classification_2006','classification_2007','classification_2008','classification_2009',
                             'classification_2010','classification_2011','classification_2012','classification_2013','classification_2014'
                             ],
              anos = ['2005','2006','2007','2008','2009',
                      '2010','2011','2012','2013','2014'
                      ],             
             sufix = '_05_14';
}

if (periodo == 4 ){
  // Period 4 uses 2015–2023 (9 years), so freq_lim is set to 9 by default
  // meaning the class must appear in all years to be considered "persistent".
  var freq_lim = 9,
              bandas_anos = ['classification_2015','classification_2016','classification_2017','classification_2018','classification_2019',
                             'classification_2020','classification_2021','classification_2022','classification_2023']
              anos = ['2015','2016','2017','2018','2019',
                      '2020','2021','2022','2023']           
          sufix = '_15_23';
}


// -----------------------------------------------------------------------------// Quick visualization of the classification image
// -----------------------------------------------------------------------------
// Display the classification image on the map (using the palette),
// defaulting to band 'classification_1985' in this visualization.
var vis = {
    'bands': ['classification_1985' ],
    'min': 0,
    'max': 34,
    'palette': palettes.get('classification2')
};
Map.addLayer(colecao, vis,'colecao')


// -----------------------------------------------------------------------------// Build a list of yearly classification images (restricted to selected classes)
// -----------------------------------------------------------------------------
// We will build an ImageCollection where each image corresponds to one year,
// containing only the target classes (via remap).
// NOTE: remap(...) keeps the listed classes and maps them to the same IDs;
// other values become masked/unset (depending on remap behavior).
var colList = ee.List([])

// Example of a single-year remap (commented out):
//var colremap = colecao.select('classification_2000').remap(
//          [ 2, 3, 4, 9, 11, 12, 15, 18, 21, 22, 33],
//          [ 2, 3, 4, 9, 11, 12, 15, 18, 21, 22, 33])
//colList = colList.add(colremap.int8())

// Re-initialize list (redundant but kept as-is)
var colList = ee.List([])

// Loop through each year and:
// - select the corresponding classification band
// - remap to keep only the classes of interest
// - cast to int8 for compact storage
for (var i_ano=0;i_ano<anos.length; i_ano++){
  var ano = anos[i_ano];

  var colflor = colecao.select('classification_'+ano).remap(
          [ 2, 3, 4, 9, 11, 12, 15, 18, 21, 22, 33],
          [ 2, 3, 4, 9, 11, 12, 15, 18, 21, 22, 33])

  colList = colList.add(colflor.int8())
};

// Convert the list of images to an ImageCollection (one image per year)
var collection = ee.ImageCollection(colList)
//print(collection)
//Map.addLayer(collection)


// -----------------------------------------------------------------------------// Utility: unique() (client-side JS helper)
// -----------------------------------------------------------------------------
// This helper returns unique values from a JavaScript array.
// NOTE: In Earth Engine, most arrays are server-side; this is a pure JS function.
// It is defined but not used later in the script.
var unique = function(arr) {
    var u = {},
        a = [];
    for (var i = 0, l = arr.length; i < l; ++i) {
        if (!u.hasOwnProperty(arr[i])) {
            a.push(arr[i]);
            u[arr[i]] = 1;
        }
    }
    return a;
};


// -----------------------------------------------------------------------------// REFERENCE MAP: frequency-based persistence mask
// -----------------------------------------------------------------------------
// The idea:
// For each target classId, build a mask per year: image.eq(classId)
// Sum across years -> frequency image (counts occurrences)
// Keep pixels where frequency >= classFrequency[classId]
// Output each class mask as an image containing the classId
// Finally, combine all class masks with firstNonNull to build a single reference map

var getFrenquencyMask = function(collection, classId) {

    // Convert classId string to integer
    var classIdInt = parseInt(classId, 10);

    // Create a binary mask collection: 1 where pixel == classId, else 0
    var maskCollection = collection.map(function(image) {
        return image.eq(classIdInt);
    });

    // Sum masks across the time series -> number of years that class appears at each pixel
    var frequency = maskCollection.reduce(ee.Reducer.sum());

    // Build a mask for "persistent" pixels: frequency >= required threshold
    // Multiply by classId so the output stores the class code
    var frequencyMask = frequency.gte(classFrequency[classId])
        .multiply(classIdInt)
        .toByte();

    // Mask-out everything that is not exactly classIdInt
    frequencyMask = frequencyMask.mask(frequencyMask.eq(classIdInt));

    // Return single-band image named 'frequency' with a property indicating the class_id
    return frequencyMask.rename('frequency').set('class_id', classId);
};


// -----------------------------------------------------------------------------// Frequency thresholds per class
// -----------------------------------------------------------------------------
// classFrequency defines the minimum count required for each class to be "persistent".
// Here most classes use freq_lim, defined above by period.
var lista_image = ee.List([]); // defined but not used later (kept unchanged)

var classFrequency = { 
  "2": freq_lim, "3": freq_lim, "9": freq_lim, "11": freq_lim, "12": freq_lim, "15": freq_lim,"18": freq_lim, 
  "21": freq_lim, "22": freq_lim, "29": freq_lim, "33": freq_lim
}

//print(Object.keys(classFrequency))


// -----------------------------------------------------------------------------// Generate an ImageCollection of per-class frequency masks
// -----------------------------------------------------------------------------
// For each classId in classFrequency, compute a "persistent pixels mask" image.
var frequencyMasks = Object.keys(classFrequency).map(function(classId) {
    return getFrenquencyMask(collection, classId);
});

// Convert list of images into an ImageCollection
frequencyMasks = ee.ImageCollection.fromImages(frequencyMasks);


// -----------------------------------------------------------------------------// Merge masks into a single reference map
// -----------------------------------------------------------------------------
// Combine the per-class masks by taking the first non-null pixel among images.
// Then clip to 'pampa' geometry (must exist in the environment).
var referenceMap = frequencyMasks.reduce(ee.Reducer.firstNonNull()).clip(pampa);

// Remove class 27 if present (acts as an exclusion mask); then rename to "reference"
referenceMap = referenceMap.mask(referenceMap.neq(27)).rename("reference");


// -----------------------------------------------------------------------------// Visualization of the reference map
// -----------------------------------------------------------------------------
// Display the persistent classes map using MapBiomas palette.
var vis = {
    'bands': ['reference'],
    'min': 0,
    'max': 34,
    'palette': palettes.get('classification2')
};

Map.addLayer(referenceMap, vis, 'Classes persistentes'+ sufix, true);


// -----------------------------------------------------------------------------// Export reference map to Asset
// -----------------------------------------------------------------------------
// Export parameters:
// - image: reference map as int8
// - scale: 30m
// - pyramidingPolicy: mode (recommended for categorical maps)
// - region: pampa geometry
Export.image.toAsset({
    "image": referenceMap.toInt8(),
    "description": 'Pampa_amostras_estaveis_Uruguay_C' + colecion + sufix +'_v' + version ,
    "assetId": dirout + 'Pampa_amostras_estaveis_Uruguay_C' + colecion + sufix +'_v' + version ,
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": pampa
});  


// -----------------------------------------------------------------------------// Overlay: draw region outlines for context
// -----------------------------------------------------------------------------
// Create an empty image and paint the boundaries of regioesCollection.
// Then add it as a map layer for visualization.
var blank = ee.Image(0).mask(0);
var outline = blank.paint(regioesCollection, 'AA0000', 2); 
var visPar = {'palette':'000000','opacity': 0.6};
Map.addLayer(outline, visPar, 'Regiao', true);
