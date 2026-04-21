// -----------------------------------------------------------------------------
// Script purpose (EN)
// -----------------------------------------------------------------------------
// This script performs "gap filling" on a multi-band MapBiomas classification image
// where each year is stored as a band named: classification_YYYY.
//
// It applies two passes:
// 1) Forward fill (1985 -> 2024):
//    - For each year band, fill masked pixels using the previous year's values.
// 2) Backward fill (2024 -> 1985):
//    - For each year band, fill remaining masked pixels using the next year's values.
//      This helps correct gaps especially near the end of the time series.
//
// After gap filling, it adds connectivity diagnostics:
// - For each year band, compute connectedPixelCount(100, false) and store as connect_YYYY.
//   This is useful for QA and later spatial filtering (e.g., removing small isolated patches).
//
// Output:
// - Exports the filled multi-band image (filtered2) to an Earth Engine Asset.
// - Adds outline of regions to the map for context.
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Configuration / versioning
// -----------------------------------------------------------------------------
var version = '9'; 
var col = '5'
var years = '85-24' 

//NO modificar
// (EN) Input multi-band classification image. Expected bands:
// classification_1985, classification_1986, ..., classification_2024.
var image = ee.Image(
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/MOSAICOS/Mosaicos_ConFiltro/clasificacion-1985-2023-10multifiltro'
)
// ee.Image('projects/MapBiomas_Pampa/WORKSPACE/COLLECTION4/URUGUAY/MOSAICOS/clasificacion-1985-2023-1sin_filtro')

//('projects/MapBiomas_Pampa/WORKSPACE/COLLECTION' + col +'/URUGUAY/MOSAICOS/clasificacion-1985-2023-'+ version + 'sin_filtro')
print(image, 'image')

// (EN) Output directory (Asset folder) for the exported gap-filled image.
var dirout = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/classificationC5/'

// (EN) Region boundaries used as export region and for visualization.
var regioesCollection = ee.FeatureCollection(
  'projects/mapbiomas-uruguay/assets/LAND-COVER/ANCILLARY_DATA/C5/regiones_buffer_uy_ext'
)

// (EN) Output naming convention.
var versionOut =  'col' + col + '-v' + version + '-gap-' + years + '-mosaic';

// (EN) Palette module for map visualization.
var palettes = require('users/mapbiomas/modules:Palettes.js');


// -----------------------------------------------------------------------------
// PASS 1: Forward fill (1985 -> 2024)
// -----------------------------------------------------------------------------
// (EN) Years to fill in chronological order. The iteration starts from 1986 and uses
// classification_1985 as the initial "previous" band.
// For each current year band:
// - currentImage = currentImage.unmask(previousYearBand)
// This fills NoData pixels using the previous year's class value.
var bandNames = ee.List([
    'classification_1986',
    'classification_1987',
    'classification_1988',
    'classification_1989',
    'classification_1990',
    'classification_1991',
    'classification_1992',
    'classification_1993',
    'classification_1994',
    'classification_1995',
    'classification_1996',
    'classification_1997',
    'classification_1998',
    'classification_1999',
    'classification_2000',
    'classification_2001',
    'classification_2002',
    'classification_2003',
    'classification_2004',
    'classification_2005',
    'classification_2006',
    'classification_2007',
    'classification_2008',
    'classification_2009',
    'classification_2010',
    'classification_2011',
    'classification_2012',
    'classification_2013',
    'classification_2014',
    'classification_2015',
    'classification_2016',
    'classification_2017',
    'classification_2018',
    'classification_2019',
    'classification_2020',
    'classification_2021',
    'classification_2022', 
    'classification_2023',
    'classification_2024' 
]);

// (EN) Iterate over the band list:
// - previousImage is an Image holding the previously processed band stack.
// - previousImage.select([0]) refers to the first band in that stack (used here as "previous").
// The returned image is currentImage + previousImage (stack grows each iteration).
var filtered = bandNames.iterate(function (bandName, previousImage) {

    // (EN) Current year band.
	var currentImage = image.select(ee.String(bandName));

	previousImage = ee.Image(previousImage);

    // (EN) Fill gaps with previous year's values.
	currentImage = currentImage.unmask(previousImage.select([0]));

    // (EN) Add the filled band to the band stack.
	return currentImage.addBands(previousImage);

},

// (EN) Initialization: start the stack using 1985.
ee.Image(image.select(['classification_1985'])));

filtered = ee.Image(filtered);
print(filtered, 'filtered')


// -----------------------------------------------------------------------------
// PASS 2: Backward fill (2024 -> 1985)
// -----------------------------------------------------------------------------
// Corrige os ultimos anos. Aplica o filtro da frente pra tras
// (EN) Second pass goes backwards through time to fill remaining gaps.
// It starts from classification_2024 and iterates 2023 -> ... -> 1985.
// For each band, unmask using the last band in the accumulated stack,
// which represents the already-processed "next year" in this backward direction.
var bandNames = ee.List([
    'classification_2023',  
    'classification_2022',
    'classification_2021',
    'classification_2020',
    'classification_2019',
    'classification_2018',
    'classification_2017',
    'classification_2016',
    'classification_2015',
    'classification_2014',
    'classification_2013',
    'classification_2012',
    'classification_2011',
    'classification_2010',
    'classification_2009',
    'classification_2008',
    'classification_2007',
    'classification_2006',
    'classification_2005',
    'classification_2004',
    'classification_2003',
    'classification_2002',
    'classification_2001',
    'classification_2000',
    'classification_1999',
    'classification_1998',
    'classification_1997',
    'classification_1996',
    'classification_1995',
    'classification_1994',
    'classification_1993',
    'classification_1992',
    'classification_1991',
    'classification_1990',
    'classification_1989',
    'classification_1988',
    'classification_1987',
    'classification_1986',
    'classification_1985'
]);

var filtered2 = bandNames.iterate(function (bandName, previousImage) {

	var currentImage = filtered.select(ee.String(bandName));

	previousImage = ee.Image(previousImage);

    // (EN) Fill gaps using the last band in the accumulated stack.
	currentImage = currentImage.unmask(
      previousImage.select(previousImage.bandNames().length().subtract(1))
    );

    // (EN) Append this filled band to the stack.
	return previousImage.addBands(currentImage);

}, ee.Image(filtered.select(["classification_2024"])));


filtered2 = ee.Image(filtered2)


// -----------------------------------------------------------------------------
// Visualization / QA layers
// -----------------------------------------------------------------------------
var vis5 = { 'min': 0, 'max': 45,  'palette': palettes.get('classification5')};

// (EN) Compare original vs filled for selected years.
Map.addLayer(image.select('classification_1985'), vis5, 'image');
Map.addLayer(filtered2.select('classification_1985'), vis5, 'filtered');
Map.addLayer(filtered2.select('classification_2022'), vis5, 'filtered2');

// (EN) Store a property tag on the output (note: key is spelled 'vesion' as in original).
filtered2 = filtered2.set('vesion', '1');


// -----------------------------------------------------------------------------
// Add connected pixel count diagnostics (connect_YYYY)
// -----------------------------------------------------------------------------
var anos = [
  '1985','1986','1987','1988','1989','1990','1991','1992','1993','1994','1995','1996','1997','1998','1999',
  '2000','2001','2002','2003','2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014',
  '2015','2016','2017','2018','2019','2020','2021','2022','2023','2024'
]

// (EN) For each year, compute connected component sizes (up to 100 pixels)
// and add it as a band named connect_YYYY.
for (var i_ano=0;i_ano<anos.length; i_ano++){  
  var ano = anos[i_ano]; 
  filtered2 = filtered2.addBands(
    filtered2.select('classification_'+ano)
             .connectedPixelCount(100,false)
             .rename('connect_'+ano)
  )
}

print(filtered2, 'filtered2')


// -----------------------------------------------------------------------------
// Export to Asset
// -----------------------------------------------------------------------------
Export.image.toAsset({
    'image': filtered2,
    'description': versionOut,
    'assetId': dirout + versionOut,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': regioesCollection,
    'scale': 30,
    'maxPixels': 1e13
});


// -----------------------------------------------------------------------------
// Overlay: region outlines for context
// -----------------------------------------------------------------------------
var limite = regioesCollection
var blank = ee.Image(0).mask(0);
var outline = blank.paint(limite, 'AA0000', 2); 
var visPar = {'palette':'000000','opacity': 0.6};
Map.addLayer(outline, visPar, 'regioes', false);
