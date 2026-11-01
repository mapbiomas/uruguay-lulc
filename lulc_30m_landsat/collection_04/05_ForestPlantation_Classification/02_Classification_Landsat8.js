// ES: CLASIFICACIÓN FORESTAL L8: entrena con 2020 y clasifica 2025 usando el mismo sensor.
// ES: Requiere region y las colecciones BosqueNativo, dunnii, globulus, grandis, nativo, pinus y otros, cada una con propiedad numérica class.
// ES: year controla el año destino y la exportación; el entrenamiento permanece fijo en 2020.
// EN: L8 FOREST CLASSIFICATION: trains on 2020 and classifies 2025 using the same sensor. 
// EN: Requires region and the BosqueNativo, dunnii, globulus, grandis, nativo, pinus and otros collections, each with a numeric class property.
// EN: year controls the target year and export; training remains fixed at 2020.
var year = 2025

// ES: Carga la clasificación multianual usada para delimitar las clases forestales 3 y 9.
// EN: Loads the multiyear classification used to delineate forest classes 3 and 9.
var mb = ee.Image("projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/WORKSPACE/classificationC6/_class_v_15_temp")

// ES: Selecciona la banda del año destino y, por separado, la banda base de 2020.
// EN: Selects the target-year band and, separately, the 2020 base band.
var mbparaclasif = mb.select("classification_"+year)
var mbbase = mb.select("classification_2020")

// ES: Muestra el ámbito externo. Las llamadas posteriores a region.geometry() requieren un objeto compatible, como FeatureCollection.
// EN: Displays the external study area. Later region.geometry() calls require a compatible object, such as a FeatureCollection.
Map.addLayer(region, null, "Uy")

////// MASCARA MAPBIOMAS ////// 
// ES: Máscara del año destino: incluye 3 o 9; selfMask oculta los ceros. Fuera de ella no habrá clasificación final, no equivale a clase no bosque.
// EN: Target-year mask: includes 3 or 9; selfMask hides zeros. Outside it the final classification is masked, not assigned to the non-forest class.
var mapbiomas3 = mbparaclasif.eq(3);
var mapbiomas9 = mbparaclasif.eq(9);
var masc = mapbiomas3.or(mapbiomas9).selfMask().clip(region);
Map.addLayer(masc, null ,'Mascara forestal')
 
// ES: Importa la paleta MapBiomas. vis5 solo se usaría en una capa actualmente comentada.
// EN: Imports the MapBiomas palette. vis5 would only be used in a currently commented layer.
var palettess = require('users/mapbiomas/modules:Palettes.js');
var vis5 = { 'bands':'classification_'+year, 'min': 0, 'max': 45,  'palette': palettess.get('classification5')};
//Map.addLayer(mascara, vis5, 'Mapbiomas LULC', false);

// ES: Máscara forestal de 2020: se aplica a la visualización L8, pero no al stack de entrenamiento ni a sampleRegions.
// EN: 2020 forest mask: applied to L8 display, but not to the training stack or sampleRegions.
var mapbiomas_3base = mbbase.eq(3);
var mapbiomas_9base = mbbase.eq(9);
var mascara = mapbiomas_3base.or(mapbiomas_9base).selfMask().clip(region);

//Map.centerObject(zona, 8) 
// ES: Cambia el mapa base de la interfaz; no modifica los datos analizados.
// EN: Changes the interface basemap; does not modify analyzed data.
Map.setOptions('SATELLITE')

// ES: Periodo de entrenamiento fijo. filterDate excluye la fecha final: 2020-12-31 queda fuera del intervalo.
// EN: Fixed training period. filterDate excludes the end date: 2020-12-31 is outside the interval.
var startDate = '2020-01-01';
var endDate = '2020-12-31';

// Applies scaling factors.
// ES: Convierte reflectancia y temperatura usando sus factores y offsets. Las bandas térmicas se descartan luego al seleccionar los predictores.
// EN: Converts reflectance and temperature using their scale factors and offsets. Thermal bands are later discarded when selecting predictors.
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// ES: REVISAR: en QA_PIXEL de Collection 2, bit 3 = nube, bit 4 = sombra y bit 5 = nieve.
// ES: Tampoco aplica una máscara explícita de saturación QA_RADSAT, nube dilatada ni cirrus de L8.
// ES: Fuente: https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2
// EN: REVIEW: in Collection 2 QA_PIXEL, bit 3 = cloud, bit 4 = shadow and bit 5 = snow. 
// EN: No explicit QA_RADSAT saturation, dilated-cloud or L8 cirrus mask is applied either. Original logic is retained.
function maskL8srClouds(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 3);
  var cloudsBitMask = (1 << 5);
  // Get the pixel QA band.
  var qa = image.select('QA_PIXEL');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}

//print('L8 composite 2019',composite);
// ES: Selecciona Landsat 8 Collection 2 Level 2; filtra espacio y fechas y aplica escalado y máscara a cada escena.
// EN: Selects Landsat 8 Collection 2 Level 2; filters space and dates and applies scaling and masking to each scene.
var dataset = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
var l8FiltMasked = dataset.filterBounds(region)
               .filterDate(startDate,endDate)
               .map(applyScaleFactors)
               .map(maskL8srClouds)  

print('L8 SR collection filtered and masked', l8FiltMasked);

// ES: Falso color NIR–SWIR1–verde; min/max controlan únicamente la representación.
// EN: NIR–SWIR1–green false color; min/max control display only.
var visualization = {
  bands: ['SR_B5', 'SR_B6', 'SR_B3'],
  min: 0.0,
  max: 0.5,
};

// ES: Mediana temporal por banda para visualización; el stack predictivo se calcula después a partir de todas las escenas.
// EN: Per-band temporal median for display; the predictor stack is calculated later from all scenes.
var l8compositeMasked = l8FiltMasked.median().clip(region);
Map.addLayer(l8compositeMasked.updateMask(mascara), visualization, 'L8 2020 composite masked');

/////////// INDICES ESPECTRALES ///////////
// ES: Calcula cinco índices por escena y conserva seis bandas ópticas. Los nombres espectrales siguen la convención de Landsat 8.
// EN: Computes five indices per scene and retains six optical bands. Spectral names follow the Landsat 8 convention.
var indicesSpectrales = function(image){
// ES: NDVI: contraste normalizado entre infrarrojo cercano y rojo.
// EN: NDVI: normalized contrast between near-infrared and red.
var ndvi = image.expression("(nir - red) / (nir + red)", {
    nir: image.select("SR_B5"),
    red: image.select("SR_B4")
  }).rename("ndvi")
  
// ES: EVI: usa NIR, rojo y azul; b8 es solo un nombre interno para SR_B5, no la banda pancromática.
// EN: EVI: uses NIR, red and blue; b8 is only an internal name for SR_B5, not the panchromatic band.
var evi = image.expression ('2.5 * ((b8-b4) / ((b8 +6 * b4 -7.5* b2)+1))',{
      'b8':image.select('SR_B5'),
      'b4':image.select('SR_B4'),
      'b2':image.select('SR_B2')
  }).rename("evi")
  
// ES: MSAVI2: índice ajustado al suelo. La raíz exige un radicando no negativo; aquí no se añade control explícito.
// EN: MSAVI2: soil-adjusted index. The square root requires a nonnegative radicand; no explicit check is added here.
var msavi = image.expression('(2 *NIR + 1 - ((2 * NIR + 1)**2 - 8 *(NIR - RED))**0.5)/2',{
     'NIR': image.select('SR_B5'),
     'RED': image.select('SR_B4'),
}).rename('msavi');

// ES: NDWI verde–NIR. normalizedDifference enmascara píxeles si alguna entrada es negativa, algo posible tras el escalado.
// EN: Green–NIR NDWI. normalizedDifference masks pixels if either input is negative, which can occur after scaling.
var ndwi = image.normalizedDifference(['SR_B3', 'SR_B5']).rename('ndwi');

// ES: NBR: contraste NIR–SWIR2, usado aquí como predictor, sin umbral de área quemada.
// EN: NBR: NIR–SWIR2 contrast, used here as a predictor without a burned-area threshold.
var nbr = image.expression("(nir - swir) / (nir + swir)", {
    nir: image.select("SR_B5"),
    swir: image.select("SR_B7")
  }).rename("nbr")

return image.select('SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7').addBands(ndvi).addBands(evi).addBands(msavi).addBands(ndwi).addBands(nbr)
}

// ES: Aplica los índices a cada escena antes de resumir temporalmente; no calcula índices sobre una mediana de reflectancias.
// EN: Applies indices to each scene before temporal summarization; does not compute indices from median reflectances.
var indices = l8FiltMasked.map(indicesSpectrales)

// ES: Produce mínimo, máximo, mediana, media, varianza y desviación estándar por banda: 11 bandas × 6 estadísticas = 66 predictores espectrales.
// EN: Produces minimum, maximum, median, mean, variance and standard deviation per band: 11 bands × 6 statistics = 66 spectral predictors.
var reducers = ee.Reducer.minMax()
      .combine(ee.Reducer.median(), null, true)
      .combine(ee.Reducer.mean(), null, true)
      .combine(ee.Reducer.variance(), null, true)
      .combine(ee.Reducer.stdDev(), null, true)

// ES: Reduce la colección sobre el tiempo. La cantidad de observaciones válidas puede variar entre píxeles y bandas; no se impone un mínimo.
// EN: Reduces the collection over time. Valid observation counts may differ across pixels and bands; no minimum is imposed.
var composite = indices.reduce(reducers)//.select('B1','B2','B3','B4','B5','B6','B7','msavi','evi','ndvi','nbr')
print('composite: ', composite)

// ES: Paleta para mostrar la mediana NDVI; el rango visual 0–1 no recorta los valores del predictor.
// EN: Palette for displaying median NDVI; the 0–1 display range does not clip predictor values.
var ndvi_pal = {
  min: 0.0,
  max: 1.0,
  palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901',
    '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01',
    '012E01', '011D01', '011301'
  ],
};

Map.addLayer(composite.select('ndvi_median'), ndvi_pal, 'NDVI', false);

////SRTM - MODELO DIGITAL DE ELEVACIÓN (30 M)////
// ES: Carga elevación SRTM en metros como predictor topográfico estático para ambos años.
// EN: Loads SRTM elevation in meters as a static topographic predictor for both years.
var SRTM = ee.Image("USGS/SRTMGL1_003")
//elevación
var DEM = SRTM.clip(region);
//Map.addLayer(DEM, vis_dem,'DEM',false)
//calculo de pendiente
// ES: Calcula pendiente en grados. Recortar el DEM antes de derivarla puede generar ausencia de datos en los bordes.
// EN: Calculates slope in degrees. Clipping the DEM before deriving slope may create missing edge values.
var Pendiente = ee.Terrain.slope(DEM);
//Map.addLayer(Pendiente, vis_pend,'Pendiente',false)

/////////// STACK ///////////
// ES: Combina 66 predictores espectrales con elevación y pendiente: 68 bandas esperadas, si las entradas están disponibles.
// EN: Combines 66 spectral predictors with elevation and slope: 68 expected bands, if inputs are available.
var stack = ee.Image.cat(composite, DEM, Pendiente)
var bandNames = stack.bandNames();
print('Band names: ', bandNames); 

//Add a Random Column
// ES: Extrae píxeles de las siete colecciones y conserva class. El comentario original sobre columna aleatoria no corresponde: no se crea ninguna.
// ES: Con polígonos, se muestrean los píxeles contenidos; zonas grandes pueden dominar el entrenamiento. Se omiten muestras con alguna banda enmascarada.
// ES: tileScale reduce el tamaño de tesela de cálculo; no cambia la escala de 30 m. No hay separación entrenamiento/validación.
// EN: Extracts pixels from the seven collections and retains class. The original random-column comment does not match: no random column is created.
// EN: For polygons, contained pixels are sampled; large areas may dominate training. Samples with any masked band are omitted.
// EN: tileScale reduces computation tile size; does not change the 30 m scale. There is no training/validation split.
var sample = stack.sampleRegions({
  collection : BosqueNativo.merge(dunnii).merge(globulus).merge(grandis).merge(nativo).merge(pinus).merge(otros),//.merge(salix)
  properties: ['class'],
  scale: 30,
  geometries: true,
  tileScale: 16
});

// Entrena el clasificador
// ES: Random Forest: 500 árboles, 4 variables por división, mínimo 25 muestras por hoja, fracción de bolsa 0.5, sin límite explícito de nodos y semilla 0.
// ES: Los códigos de salida proceden de class, no del nombre de cada colección. La exactitud no se evalúa aquí.
// EN: Random Forest: 500 trees, 4 variables per split, minimum 25 samples per leaf, bag fraction 0.5, no explicit node limit and seed 0.
// EN: Output codes come from class, not collection names. Accuracy is not evaluated here.
var classifier = ee.Classifier.smileRandomForest(500, 4, 25, 0.5, null ,0).train({
  features: sample,
  classProperty: "class",
  inputProperties: stack.bandNames()
});
  
// ES: REVISAR códigos: hay cuatro colores y se visualiza 1–4, pero el comentario de No bosque indica 5. Verificar los valores reales de class; la leyenda no recodifica la salida.
// EN: REVIEW codes: there are four colors and the display uses 1–4, but the non-forest comment states 5. Check actual class values; the legend does not recode output.
var palette = [
  '6ec185', //Bosque nativo (1) -
  'c6863e', //Eucalyptus (2) -
  'a76b67', //Pinus (3)-
  //'fdc6eb', //Salix y Populus (4)- 
  'dde2ac', //No bosque (5)-
 ]; 

// ES: Módulo externo usado para majority. Su implementación no está incluida: no se puede confirmar aquí el vecindario ni las unidades del parámetro 2.
// EN: External module used for majority. Its implementation is not included: the neighborhood and units of parameter 2 cannot be confirmed here.
var geet = require('users/elacerda/geet:geet'); 

//////////////////////////////////////////////////////////////////

// ES: Define el intervalo del año destino. filterDate excluye el 31 de diciembre porque la fecha final es exclusiva.
// EN: Defines the target-year interval. filterDate excludes December 31 because the end date is exclusive.
var startDate4 = year+'-01-01';
var endDate4 = year+'-12-31';

// ES: Carga solo Landsat 8 del año destino, aplica los mismos factores y máscara que en 2020. No incorpora Landsat 9 ni realiza armonización entre sensores.
// EN: Loads only target-year Landsat 8 and applies the same factors and mask as in 2020. Does not include Landsat 9 or perform cross-sensor harmonization.
var coleccionl8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                 .filterDate(startDate4, endDate4)
                 .filterBounds(region.geometry())
                 .map(applyScaleFactors)
                 .map(maskL8srClouds)

// ES: Reasigna l8compositeMasked a la mediana del año destino; la capa de 2020 ya añadida conserva la imagen que recibió.
// EN: Reassigns l8compositeMasked to the target-year median; the previously added 2020 layer retains the image it received.
var l8compositeMasked = coleccionl8.median().clip(region);

var visualization = {
  bands: ['SR_B5', 'SR_B6', 'SR_B3'],
  min: 0.0,
  max: 0.5,
};

Map.addLayer(l8compositeMasked, visualization, 'L8 composite '+year);

// ES: Calcula los mismos cinco índices por escena en el año destino, y luego las mismas seis estadísticas por banda.
// EN: Computes the same five per-scene indices in the target year, followed by the same six statistics per band.
var indices2 = coleccionl8.map(indicesSpectrales)

var composite2 = indices2.reduce(reducers)
// ES: Añade la misma topografía y restringe la clasificación a la máscara 3/9 del año destino. Esta restricción depende de la exactitud del mapa previo.
// EN: Adds the same topography and restricts classification to the target-year 3/9 mask. This restriction depends on the accuracy of the prior map.
var stack2 = ee.Image.cat(composite2, DEM, Pendiente).updateMask(masc)


/////////// RESULTADOS CLASIFICACIÓN ///////////
// ES: Aplica el modelo entrenado en 2020 a los predictores de 2025. Es transferencia temporal dentro del mismo sensor; requiere validación independiente de 2025.
// ES: Fenología, disponibilidad de escenas, manejo y edad de las plantaciones pueden cambiar la relación entre predictores y clases. El script no cuantifica esa incertidumbre.
// EN: Applies the 2020-trained model to 2025 predictors. This is temporal transfer within the same sensor; independent 2025 validation is required.
// EN: Phenology, scene availability, management and plantation age may change predictor–class relationships. The script does not quantify that uncertainty.
var result = stack2.classify(classifier)
// ES: Suaviza con la función externa majority. Puede modificar parches pequeños y límites; no implica una mejora de exactitud demostrada.
// EN: Smooths using the external majority function. May modify small patches and boundaries; does not imply a demonstrated accuracy improvement.
var majority = geet.majority(result, 2)
Map.addLayer(majority.clip(region).updateMask(masc), {min:1, max:4, palette: palette}, "mayoria")

//////// DESCARGA ///////
// ES: Prepara la imagen enmascarada y el rectángulo envolvente de exportación; los píxeles fuera de la máscara siguen sin dato.
// EN: Prepares the masked image and export bounding rectangle; pixels outside the mask remain no-data.
var download = majority.updateMask(masc);
var limiteDescarga = region.geometry().bounds();

// ES: Crea una tarea a Asset con escala nominal de 30 m y CRS geográfico. Iniciar desde Tasks; este bloque no descarga a la computadora.
// ES: ERROR CONSERVADO: pyramidingPolicy requiere un diccionario, por ejemplo {".default": "mode"}, no la cadena "MODE".
// ES: Fuente: https://developers.google.com/earth-engine/apidocs/export-image-toasset
// EN: Creates an Asset task with nominal 30 m scale and geographic CRS. Start from Tasks; this block does not download to the computer.
// EN: PRESERVED ERROR: pyramidingPolicy requires a dictionary, such as {".default": "mode"}, not the string "MODE".
Export.image.toAsset({
  image: download, 
  description: 'Forestal'+year, 
  assetId: 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/WORKSPACE/MOSAICOS/Forestaciones/Forestal'+year,
  crs: 'EPSG:4326',
  scale: 30,
  region: limiteDescarga,
  maxPixels: 1e12,
  pyramidingPolicy: "MODE"
});



/////////// LEYENDA ///////////
// set position of panel
// ES: Crea el panel de leyenda abajo a la izquierda; es solo interfaz.
// EN: Creates the legend panel at bottom left; interface only.
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '10px 15px'
  }
});
// Create legend title
// ES: Título de la leyenda. Las categorías mostradas mezclan tipos forestales, géneros y no bosque, no son todas especies.
// EN: Legend title. Displayed categories mix forest types, genera and non-forest; they are not all species.
var legendTitle = ui.Label({
  value: 'Especies',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
// Add the title to the panel
legend.add(legendTitle);
// Creates and styles 1 row of the legend.
// ES: Construye una fila con recuadro de color y etiqueta horizontal.
// EN: Builds one row with a color box and horizontal label.
var makeRow = function(color, name) {
            // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Use padding to give the box height and width.
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
            // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
            // return the panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};

// name of the legend
// ES: Etiquetas vinculadas al orden de colores; deben contrastarse con los códigos class del entrenamiento.
// EN: Labels linked to color order; must be checked against training class codes.
var names = ['Nativo y mezcla de spp','Eucalyptus','Pinus sp','No bosque']; //'Salix y Populus',
// Add color and and names
// ES: Añade exactamente cuatro entradas a la leyenda.
// EN: Adds exactly four entries to the legend.
for (var i = 0; i < 4; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }  
// add legend to map (alternatively you can also print the legend to the console)  
Map.add(legend);


// ES: Bloque desactivado: mostraría importancia de variables de RF. Esa importancia no sustituye una evaluación independiente de exactitud.
// EN: Disabled block: would display RF variable importance. Importance does not replace independent accuracy assessment.
/*
var dict = classifier.explain();
print('Explain:',dict);
var variable_importance = ee.Feature(null, ee.Dictionary(dict).get('importance'));
var chart =
ui.Chart.feature.byProperty(variable_importance)
.setChartType('ColumnChart')
.setOptions({
title: 'Random Forest Variable Importance',
legend: {position: 'none'},
hAxis: {title: 'Bands'},
vAxis: {title: 'Importance'}
});
print(chart);
*/
