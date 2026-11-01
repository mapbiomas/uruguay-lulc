/** 
 * Clasificación MapBiomas Uruguay colección 4
 * Funciones:
 * - Random Forest anual.
 * - Muestras estables anuales.
 * - Función sacar_muestras.
 * - Complementarias internas opcionales.
 * - Complementarias C3 preprocesadas opcionales.
 * - Complementarias C5/fijas preprocesadas opcionales.
 * - Visualización de puntos procesados con paleta de clasificación.
 * - App de visualización con selector de año + serie temporal NDVI.
 * - Panel inspector negro de clasificación.
 * - Visualización de Pastura Estable Regiones 2008.
 * - Diferencia: en la colección anterior, 79, 80 y 83 se remapean a 9.
 */


// -----------------------------------------------------------------------------
// CONFIGURACIÓN PRINCIPAL
// -----------------------------------------------------------------------------

// ES: Configura el bioma, el nombre de ECOZONA y su identificador raster; ambos identificadores deben corresponder a la misma región.
// EN: Sets biome, ECOZONA name, and raster identifier; both identifiers must refer to the same region.
var bioma = 'PAMPAURUGUAY';

var id_zona = 'sedimentaria_Oeste';
var id_zona2 = '7';

// Uruguay zones:
// 1-cristalino
// 2-graben_L
// 3-Sierras_Este
// 4-sedimentaria_gnw
// 5-basaltica
// 6-graben_SL
// 7-sedimentaria_Oeste

var version_clasificacion = '1';
// ES: Versiones para identificar salidas, muestras y mosaicos. version_anterior se calcula pero no se utiliza después.
// EN: Versions identifying outputs, samples, and mosaics. version_anterior is calculated but not used afterward.
var version_anterior = version_clasificacion - 1;

var version_muestras = 'v9';
var version_mosaico = '4';

// ES: Desplazamiento de los porcentajes y límites del cupo solicitado por clase. No garantizan un mínimo de puntos disponibles.
// EN: Percentage offset and limits for requested per-class sample counts. They do not guarantee a minimum number of available points.
var desvio = 0;
var nSamplesMin = 50;
var nSamplesMax = 2000;

// ES: Intervalo inclusivo de clasificación anual y opciones de cálculo de superficie.
// EN: Inclusive annual classification range and area-calculation options.
var year_inicio = 1985;
var year_fin = 2025;

var calcula_area = 0;
var year_calcula_area = '2023';

var clase_diferencia = 9;
var cant_muestras = 1;

// ES: Número de árboles del RF y máximo permitido del atributo outlier. Este script no calcula dicho atributo.
// EN: Number of RF trees and maximum allowed outlier attribute value. This script does not calculate that attribute.
var nro_arboles = 100;
var cant_b_outlier = 20;

// ES: Esta variable no se utiliza para rellenar huecos en el código mostrado.
// EN: This variable is not used to fill gaps in the code shown.
var mosaico_con_huecos = 0;

// ES: Controla el tamaño de las teselas de agregación para gestionar memoria; no cambia la escala de 30 m.
// EN: Controls aggregation tile size to manage memory; it does not change the 30 m scale.
var tileScale_reduceRegions = 16;


// -----------------------------------------------------------------------------
// ACTIVAR / DESACTIVAR FUNCIONES
// -----------------------------------------------------------------------------

// ES: Interruptores: 1 activa y 0 desactiva. Entrenamiento y visualización de complementarias tienen controles independientes.
// EN: Switches: 1 enables and 0 disables. Supplementary-sample training and display have independent controls.
var usar_sacar_muestras = 1;

// Complementarias internas generadas/importadas en el mapa.
var agregar_complementarias_internas = 1;

// Complementarias C3 preprocesadas.
var usar_muestras_C3_entrenamiento = 0;

// Complementarias C5/fijas preprocesadas.
var usar_muestras_fijas_entrenamiento = 1;

// Visualización en mapa.
var mostrar_muestras_C3_mapa = 1;
var mostrar_muestras_fijas_mapa = 1;


// -----------------------------------------------------------------------------
// RUTAS DE ASSETS
// -----------------------------------------------------------------------------

var folder_C3_pred =
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/SAMPLES/C3_PREDICTORS_RF_ANUAL/v1/';

// ES: Carpetas y prefijos de tablas preprocesadas por zona y año, con etiquetas y predictores ya extraídos.
// EN: Folders and prefixes for preprocessed tables by zone and year, with labels and previously extracted predictors.
var prefijo_C3_pred = 'C3_predictors_z';

var folder_complementarias_fijas =
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/SAMPLES/C3_PREDICTORS_RF_ANUAL/v4/';

var prefijo_complementarias_fijas = 'complementarias_C5_z';


// -----------------------------------------------------------------------------
// ASSETS SEGÚN BIOMA
// -----------------------------------------------------------------------------

if (bioma == 'PAMPAURUGUAY') {

  var dirsaples = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/SAMPLES/YEAR/' +
                  version_muestras + '/';

  var zonas = ee.FeatureCollection(
    // ES: Carga las muestras anuales, delimita la región vectorial y carga su máscara raster. Las rutas se construyen sin comprobar existencia.
    // EN: Loads annual samples, selects the vector region, and loads its raster mask. Paths are constructed without checking existence.
    'projects/mapbiomas-uruguay/assets/LAND-COVER/ANCILLARY_DATA/C5/regiones_buffer_uy_ext'
  );

  var zonas_ras = 'projects/mapbiomas-uruguay/assets/LAND-COVER/ANCILLARY_DATA/C5/IC_ZonasPampaUru/';

  var output = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/WORKSPACE/classificationC6/';

  var id_zona_prop = 'ECOZONA';

  var myRegion = zonas.filterMetadata(id_zona_prop, 'equals', id_zona);

  var limite = ee.Image(
    zonas_ras + 'ZonasPampa_URU_C3_CONbuffer_raster_z' + id_zona2
  );

}


// -----------------------------------------------------------------------------
// MÓDULOS EXTERNOS
// -----------------------------------------------------------------------------

var target = 'reference';

// Esta variable debe existir como import en el script.
// ES: La variable region debe estar importada previamente. El objetivo del entrenamiento es la propiedad reference.
// EN: The region variable must be imported beforehand. The training target is the reference property.
region = region.filter(ee.Filter.eq('biome', bioma));


// -----------------------------------------------------------------------------
// MOSAICOS
// -----------------------------------------------------------------------------

// ES: Une las colecciones y filtra bioma y versión. merge no promedia imágenes; la composición se realiza después con mosaic.
// EN: Merges collections and filters biome and version. merge does not average images; compositing occurs later with mosaic.
var mosaics = ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics')
  .merge(ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics-landsat-7'))
  .filterMetadata('version', 'equals', version_mosaico)
  .filterMetadata('biome', 'equals', bioma);


// -----------------------------------------------------------------------------
// BANDAS PREDICTORAS
// -----------------------------------------------------------------------------

// ES: Predictores originales: bandas, índices, estadísticas y variables espaciales. slope debe existir en el mosaico; aquí no se calcula.
// EN: Original predictors: bands, indices, statistics, and spatial variables. slope must exist in the mosaic; it is not calculated here.
var bandNames = ee.List([
  'evi2_amp','gv_amp','ndfi_amp','ndvi_amp','ndwi_amp','soil_amp','wefi_amp',

  'blue_median','blue_median_dry','blue_median_wet',
  'cai_median','cai_median_dry',
  'cloud_median',
  'evi2_median','evi2_median_dry','evi2_median_wet',
  'gcvi_median','gcvi_median_dry','gcvi_median_wet',
  'green_median','green_median_dry','green_median_wet','green_median_texture',
  'gv_median','gvs_median','gvs_median_dry','gvs_median_wet',
  'hallcover_median',

  'latitude','longitude',

  'ndfi_median','ndfi_median_dry','ndfi_median_wet',
  'ndvi_median','ndvi_median_dry','ndvi_median_wet',

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

  'blue_min','green_min','nir_min','red_min','swir1_min','swir2_min',

  'blue_stdDev','cai_stdDev','cloud_stdDev','evi2_stdDev','gcvi_stdDev',
  'green_stdDev','gv_stdDev','gvs_stdDev','hallcover_stdDev','ndfi_stdDev',
  'ndvi_stdDev','ndwi_stdDev','nir_stdDev','red_stdDev','savi_stdDev',
  'sefi_stdDev','shade_stdDev','soil_stdDev','swir1_stdDev','swir2_stdDev',
  'wefi_stdDev',

  'slope'
]);

// ES: Nombres abreviados correspondientes a bandNames por posición. Las tablas preprocesadas deben usar estos mismos nombres y transformaciones.
// EN: Short names matching bandNames by position. Preprocessed tables must use these same names and transformations.
var bandNamesShort = ee.List([
  'evi2_a','gv_a','ndfi_a','ndvi_a','ndwi_a','soil_a','wefi_a',

  'blue_m','blue_m_d','blue_m_w',
  'cai_m','cai_m_d',
  'cloud_m',
  'evi2_m','evi2_m_d','evi2_m_w',
  'gcvi_m','gcvi_m_d','gcvi_m_w',
  'green_m','green_m_d','green_m_w','green_m_t',
  'gv_m','gvs_m','gvs_m_d','gvs_m_w',
  'hallcov_m',

  'lat','long',

  'ndfi_m','ndfi_m_d','ndfi_m_w',
  'ndvi_m','ndvi_m_d','ndvi_m_w',

  'ndvi_a_3y',

  'ndwi_m','ndwi_m_d','ndwi_m_w',
  'nir_m','nir_m_d','nir_m_w',
  'npv_m',
  'pri_m','pri_m_d','pri_m_w',
  'red_m','red_m_d','red_m_w',
  'savi_m','savi_m_d','savi_m_w',
  'sefi_m','sefi_m_d',
  'shade_m',
  'soil_m',
  'swir1_m','swir1_m_d','swir1_m_w',
  'swir2_m','swir2_m_d','swir2_m_w',
  'wefi_m','wefi_m_w',

  'blue_min','green_min','nir_min','red_min','swir1_min','swir2_min',

  'blue_sD','cai_sD','cloud_sD','evi2_sD','gcvi_sD',
  'green_sD','gv_sD','gvs_sD','hallcov_sD','ndfi_sD',
  'ndvi_sD','ndwi_sD','nir_sD','red_sD','savi_sD',
  'sefi_sD','shade_sD','soil_sD','swir1_sD','swir2_sD','wefi_sD',

  'slope'
]);


// -----------------------------------------------------------------------------
// FUNCIONES AUXILIARES
// -----------------------------------------------------------------------------

// ES: Devuelve el mosaico de un año. mosaic prioriza los últimos píxeles válidos en el orden de la colección; no calcula una mediana.
// EN: Returns a yearly mosaic. mosaic prioritizes the last valid pixels in collection order; it does not calculate a median.
var getRawMosaicForYear = function(year) {
  return mosaics
    .filterMetadata('year', 'equals', year)
    .mosaic();
};


// ES: Prepara los predictores anuales: amplitud de NDVI, coordenadas transformadas y nombres cortos. Devuelve una imagen multibanda.
// EN: Prepares annual predictors: NDVI amplitude, transformed coordinates, and short names. Returns a multiband image.
var prepareInputMosaic = function(year) {

  var input_mosaic = getRawMosaicForYear(year);

  var min3anos;
  var max3anos;

  // ES: 1985 usa un año; 1986 usa el actual y el anterior; desde 1987 usa el actual y los dos anteriores.
  // EN: 1985 uses one year; 1986 uses the current and previous years; from 1987 onward it uses the current and previous two years.
  if (year == 1985) {

    min3anos = input_mosaic.select('ndvi_median_dry');
    max3anos = input_mosaic.select('ndvi_median_wet');

  }

  if (year == 1986) {

    var mosaico1ano_antes = mosaics
      .filterMetadata('year', 'equals', year - 1)
      .filterBounds(myRegion)
      .mosaic();

    min3anos = ee.ImageCollection.fromImages([
      input_mosaic.select('ndvi_median_dry'),
      mosaico1ano_antes.select('ndvi_median_dry')
    ]).min();

    max3anos = ee.ImageCollection.fromImages([
      input_mosaic.select('ndvi_median_wet'),
      mosaico1ano_antes.select('ndvi_median_wet')
    ]).max();

  }

  if (year > 1986) {

    var mosaico1ano_antes = mosaics
      .filterMetadata('year', 'equals', year - 1)
      .filterBounds(myRegion)
      .mosaic();

    var mosaico2anos_antes = mosaics
      .filterMetadata('year', 'equals', year - 2)
      .filterBounds(myRegion)
      .mosaic();

    min3anos = ee.ImageCollection.fromImages([
      input_mosaic.select('ndvi_median_dry'),
      mosaico1ano_antes.select('ndvi_median_dry'),
      mosaico2anos_antes.select('ndvi_median_dry')
    ]).min();

    max3anos = ee.ImageCollection.fromImages([
      input_mosaic.select('ndvi_median_wet'),
      mosaico1ano_antes.select('ndvi_median_wet'),
      mosaico2anos_antes.select('ndvi_median_wet')
    ]).max();
// ES: La amplitud es máximo de medianas húmedas menos mínimo de medianas secas; conserva el escalado de las bandas fuente.
// EN: Amplitude is the maximum wet median minus the minimum dry median; it retains source-band scaling.

  }

  var ndvi_a_3y = max3anos
    .subtract(min3anos)
    .rename('ndvi_amp_3y');
// ES: Genera coordenadas y las transforma a enteros: signo invertido y multiplicación por 100. No son grados originales.
// EN: Generates coordinates and transforms them to integers: reversed sign and multiplication by 100. These are not original degree values.

  var ll = ee.Image.pixelLonLat().clip(myRegion);

  var long = ll
    .select('longitude')
    .add(0)
    .multiply(-1)
    .multiply(100)
    .toInt16();

  var lat = ll
    .select('latitude')
    .add(0)
    .multiply(-1)
    .multiply(100)
    .toInt16();

  input_mosaic = input_mosaic.addBands(long.rename('longitude'));
  input_mosaic = input_mosaic.addBands(lat.rename('latitude'));
  input_mosaic = input_mosaic.addBands(ndvi_a_3y);

  input_mosaic = input_mosaic.select(bandNames, bandNamesShort);

  return input_mosaic;

};


// -----------------------------------------------------------------------------
// FUNCIÓN PARA SACAR MUESTRAS
// -----------------------------------------------------------------------------

// ES: Excluye entidades que intersectan sacar_muestras cuando el interruptor está activo. Devuelve la colección filtrada; aquí se aplica solo a las muestras estables.
// EN: Excludes features intersecting sacar_muestras when enabled. Returns the filtered collection; here it is applied only to stable samples.
var aplicarSacarMuestras = function(fc) {

  fc = ee.FeatureCollection(fc);

  if (usar_sacar_muestras == 1) {

    fc = fc.filter(
      ee.Filter.bounds(sacar_muestras).not()
    );

  }

  return fc;

};


// -----------------------------------------------------------------------------
// COMPLEMENTARIAS
// -----------------------------------------------------------------------------

// ES: Extrae un valor por banda y entidad a 30 m, descarta predictores nulos y etiqueta año y origen. Si se reciben polígonos, first no genera puntos aleatorios dentro de ellos.
// EN: Extracts one value per band and feature at 30 m, removes null predictors, and tags year and source. For polygon inputs, first does not generate random points inside them.
var features_space_complementarias = function(fc, year, input_mosaic) {

  return input_mosaic.reduceRegions({
    collection: ee.FeatureCollection(fc),
    reducer: ee.Reducer.first().forEach(input_mosaic.bandNames()),
    scale: 30,
    tileScale: tileScale_reduceRegions
  })
  .filter(ee.Filter.notNull(input_mosaic.bandNames()))
  // ES: Callback: añade metadatos a cada entidad que conserva todos los predictores.
  // EN: Callback: adds metadata to each feature retaining all predictors.
  .map(function(f) {
    return f
      .set('year', year)
      .set('tipo_muestra', 'complementaria_interna');
  });

};


// ES: Carga complementarias C3 si se necesitan para entrenar o visualizar. Filtra reference nulo y añade metadatos; input_mosaic no se usa ni se recalculan predictores.
// EN: Loads C3 supplementary samples if needed for training or display. Filters null reference values and adds metadata; input_mosaic is unused and predictors are not recalculated.
var getComplementariasC3Optim = function(year, input_mosaic) {

  var fc = ee.FeatureCollection([]);

  if (
    usar_muestras_C3_entrenamiento == 1 ||
    mostrar_muestras_C3_mapa == 1
  ) {

    fc = ee.FeatureCollection(
      folder_C3_pred + prefijo_C3_pred + id_zona2 + '_' + year
    )
    .filter(ee.Filter.notNull(['reference']))
    // ES: Callback: identifica el año y el origen C3 de cada muestra.
    // EN: Callback: identifies each sample year and C3 source.
    .map(function(f) {
      return f
        .set('year', year)
        .set('tipo_muestra', 'complementaria_preprocesada_C3');
    });

  }

  return fc;

};


// ES: Carga complementarias fijas por zona y año si se necesitan. Solo comprueba reference no nulo; no valida aquí la integridad de los predictores.
// EN: Loads fixed supplementary samples by zone and year if needed. Only checks non-null reference; predictor completeness is not validated here.
var getComplementariasFijasPreprocesadas = function(year, input_mosaic) {

  var fc = ee.FeatureCollection([]);

  if (
    usar_muestras_fijas_entrenamiento == 1 ||
    mostrar_muestras_fijas_mapa == 1
  ) {

    fc = ee.FeatureCollection(
      folder_complementarias_fijas +
      prefijo_complementarias_fijas +
      id_zona2 + '_' + year
    )
    .filter(ee.Filter.notNull(['reference']))
    // ES: Callback: etiqueta las muestras como complementarias fijas preprocesadas.
    // EN: Callback: labels samples as preprocessed fixed supplementary samples.
    .map(function(f) {
      return f
        .set('year', year)
        .set('tipo_muestra', 'complementaria_fija_preprocesada');
    });

  }

  return fc;

};


// -----------------------------------------------------------------------------
// PORCENTAJES DE BALANCEO POR BLOQUES DE AÑOS
// -----------------------------------------------------------------------------

// ES: Devuelve porcentajes calculados mediante ecuaciones lineales del año más desvio. Los cuatro bloques repiten los mismos coeficientes; no son superficies medidas por este script.
// EN: Returns percentages calculated from linear equations of year plus desvio. All four blocks repeat the same coefficients; these are not areas measured by this script.
var getPercents = function(year) {

  var p = {};

  if (year >= 1985 && year <= 1994) {

    p.Flo = 87.61295089488 + desvio + year * -0.0391985923923092;
    p.PlF = -827.376677038001 + desvio + year * 0.416805671669443;
    p.Umi = -12.132691565743 + desvio + year * 0.00644681968218659;
    p.Cam = 1051.28483775626 + desvio + year * -0.507262559475718;
    p.Pas = 943.356671862962 + desvio + year * -0.463588421691917;
    p.Agr = -1135.03460029538 + desvio + year * 0.580236938123496;
    p.Anv = -2.72716168142352 + desvio + year * 0.0019205241510123;
    p.Agu = -4.98332993165639 + desvio + year * 0.00463961993259122;

  }

  if (year >= 1995 && year <= 2004) {

    p.Flo = 87.61295089488 + desvio + year * -0.0391985923923092;
    p.PlF = -827.376677038001 + desvio + year * 0.416805671669443;
    p.Umi = -12.132691565743 + desvio + year * 0.00644681968218659;
    p.Cam = 1051.28483775626 + desvio + year * -0.507262559475718;
    p.Pas = 943.356671862962 + desvio + year * -0.463588421691917;
    p.Agr = -1135.03460029538 + desvio + year * 0.580236938123496;
    p.Anv = -2.72716168142352 + desvio + year * 0.0019205241510123;
    p.Agu = -4.98332993165639 + desvio + year * 0.00463961993259122;

  }

  if (year >= 2005 && year <= 2014) {

    p.Flo = 87.61295089488 + desvio + year * -0.0391985923923092;
    p.PlF = -827.376677038001 + desvio + year * 0.416805671669443;
    p.Umi = -12.132691565743 + desvio + year * 0.00644681968218659;
    p.Cam = 1051.28483775626 + desvio + year * -0.507262559475718;
    p.Pas = 943.356671862962 + desvio + year * -0.463588421691917;
    p.Agr = -1135.03460029538 + desvio + year * 0.580236938123496;
    p.Anv = -2.72716168142352 + desvio + year * 0.0019205241510123;
    p.Agu = -4.98332993165639 + desvio + year * 0.00463961993259122;

  }

  if (year >= 2015) {

    p.Flo = 87.61295089488 + desvio + year * -0.0391985923923092;
    p.PlF = -827.376677038001 + desvio + year * 0.416805671669443;
    p.Umi = -12.132691565743 + desvio + year * 0.00644681968218659;
    p.Cam = 1051.28483775626 + desvio + year * -0.507262559475718;
    p.Pas = 943.356671862962 + desvio + year * -0.463588421691917;
    p.Agr = -1135.03460029538 + desvio + year * 0.580236938123496;
    p.Anv = -2.72716168142352 + desvio + year * 0.0019205241510123;
    p.Agu = -4.98332993165639 + desvio + year * 0.00463961993259122;

  }

  return p;

};


// ES: Convierte un porcentaje en un cupo entero, redondeado y acotado entre nSamplesMin y nSamplesMax.
// EN: Converts a percentage into an integer quota, rounded and bounded by nSamplesMin and nSamplesMax.
var nFromPercent = function(percent) {

  return ee.Number(nSamplesMax)
    .multiply(percent)
    .divide(100)
    .round()
    .int16()
    .max(nSamplesMin)
    .min(nSamplesMax);

};


// -----------------------------------------------------------------------------
// MUESTRAS COMPLEMENTARIAS INTERNAS
// -----------------------------------------------------------------------------

// ES: Une las colecciones importadas N2_* y selecciona las que intersectan la región. Se construye incluso con el interruptor de complementarias internas apagado, por lo que las variables deben existir.
// EN: Merges imported N2_* collections and selects features intersecting the region. It is constructed even when internal supplementary samples are disabled, so the variables must exist.
var complementarias_base = N2_Cuerpos_de_agua
  .merge(N2_Area_no_vegetada)
  .merge(N2_Bosque)
  //.merge(N3_Bosque_cerrado)
  //.merge(N3_Bosque_abierto)
  .merge(N2_Plantaciones_forestales)
  .merge(N2_Area_humeda_natural)
  .merge(N2_Pastizal)
  .merge(N2_Pastura)
  .merge(N2_Agricultura)
  //.merge(N2_Agricultura_Pastura)
  //.merge(N3_Cultivos_Arbustivos)
  .filterBounds(myRegion);


// -----------------------------------------------------------------------------
// ACUMULADORES
// -----------------------------------------------------------------------------

// ES: Inicializa acumuladores de bandas clasificadas, conteos y muestras utilizadas. muestras_usadas no tiene una exportación propia en este script.
// EN: Initializes accumulators for classified bands, counts, and samples used. muestras_usadas has no dedicated export in this script.
var clasificacion_completa = null;
var tabla_output = null;
var muestras_usadas = null;


// -----------------------------------------------------------------------------
// BUCLE PRINCIPAL ANUAL
// -----------------------------------------------------------------------------

// ES: Trae la lista de años al cliente; getInfo es síncrono. El map siguiente construye los cálculos de cada año y actualiza acumuladores.
// EN: Fetches the year list to the client; getInfo is synchronous. The following map builds yearly computations and updates accumulators.
var years = ee.List.sequence(year_inicio, year_fin, 1).getInfo();

// ES: Callback anual: calcula cupos, carga muestras, entrena un RF y agrega la clasificación a la serie.
// EN: Annual callback: calculates quotas, loads samples, trains an RF, and appends classification to the series.
years.map(function(year) {

  var p = getPercents(year);

  var n_samples_Flo = nFromPercent(p.Flo);
  var n_samples_PlF = nFromPercent(p.PlF);
  var n_samples_Umi = nFromPercent(p.Umi);
  var n_samples_Cam = nFromPercent(p.Cam);
  var n_samples_Pas = nFromPercent(p.Pas);
  var n_samples_Agr = nFromPercent(p.Agr);
  var n_samples_Anv = nFromPercent(p.Anv);
  var n_samples_Agu = nFromPercent(p.Agu);


  // ---------------------------------------------------------------------------
  // Carga de muestras estables anuales
  // ---------------------------------------------------------------------------

  // ES: Carga la tabla anual y filtra por outlier. Después exige valores no nulos en las propiedades del primer registro; una colección vacía requiere atención.
  // EN: Loads the annual table and filters by outlier. Then requires non-null values for the first record properties; an empty collection needs attention.
  var balanced = ee.FeatureCollection(
    dirsaples + 'pontos_exp1_UY_' + version_muestras + '_' + year
  )
  .filter(ee.Filter.lte('outlier', cant_b_outlier));

  balanced = balanced.filter(
    ee.Filter.notNull(balanced.first().propertyNames())
  );


  // ---------------------------------------------------------------------------
  // Separación por clase y zona
  // ---------------------------------------------------------------------------

  var SS_Flo = balanced.filterMetadata('reference', 'equals', 3)
    .filter(ee.Filter.eq(id_zona_prop, id_zona));

  // ES: Separa las ocho clases admitidas y filtra ECOZONA antes del submuestreo.
  // EN: Separates the eight accepted classes and filters ECOZONA before subsampling.
  var SS_PlF = balanced.filterMetadata('reference', 'equals', 9)
    .filter(ee.Filter.eq(id_zona_prop, id_zona));

  var SS_Umi = balanced.filterMetadata('reference', 'equals', 11)
    .filter(ee.Filter.eq(id_zona_prop, id_zona));

  var SS_Cam = balanced.filterMetadata('reference', 'equals', 12)
    .filter(ee.Filter.eq(id_zona_prop, id_zona));

  var SS_Pas = balanced.filterMetadata('reference', 'equals', 15)
    .filter(ee.Filter.eq(id_zona_prop, id_zona));

  var SS_Agr = balanced.filterMetadata('reference', 'equals', 18)
    .filter(ee.Filter.eq(id_zona_prop, id_zona));

  var SS_Anv = balanced.filterMetadata('reference', 'equals', 22)
    .filter(ee.Filter.eq(id_zona_prop, id_zona));

  var SS_Agu = balanced.filterMetadata('reference', 'equals', 33)
    .filter(ee.Filter.eq(id_zona_prop, id_zona));


  // ---------------------------------------------------------------------------
  // Submuestreo aleatorio anual
  // ---------------------------------------------------------------------------

  var SS_Flo_samples = SS_Flo.randomColumn().sort('random').limit(n_samples_Flo);
  var SS_PlF_samples = SS_PlF.randomColumn().sort('random').limit(n_samples_PlF);
  var SS_Umi_samples = SS_Umi.randomColumn().sort('random').limit(n_samples_Umi);
  var SS_Cam_samples = SS_Cam.randomColumn().sort('random').limit(n_samples_Cam);
  var SS_Pas_samples = SS_Pas.randomColumn().sort('random').limit(n_samples_Pas);
  var SS_Agr_samples = SS_Agr.randomColumn().sort('random').limit(n_samples_Agr);
  // ES: Ordena cada clase por una columna aleatoria y limita su cantidad al cupo. Si faltan puntos, no crea muestras adicionales.
  // EN: Sorts each class by a random column and limits its count to the quota. If points are insufficient, no additional samples are created.
  var SS_Anv_samples = SS_Anv.randomColumn().sort('random').limit(n_samples_Anv);
  var SS_Agu_samples = SS_Agu.randomColumn().sort('random').limit(n_samples_Agu);


  // ---------------------------------------------------------------------------
  // Unión de muestras balanceadas
  // ---------------------------------------------------------------------------

  if (bioma == 'PAMPAURUGUAY') {

    balanced = SS_Flo_samples
      .merge(SS_PlF_samples)
      .merge(SS_Umi_samples)
      .merge(SS_Cam_samples)
      .merge(SS_Pas_samples)
      .merge(SS_Agr_samples)
      .merge(SS_Anv_samples)
      .merge(SS_Agu_samples);

    balanced = balanced
      .filter(ee.Filter.eq(id_zona_prop, id_zona));

    balanced = aplicarSacarMuestras(balanced);

  }


  // ---------------------------------------------------------------------------
  // Mosaico predictor anual
  // ---------------------------------------------------------------------------

  var input_mosaic = prepareInputMosaic(year);


  // ---------------------------------------------------------------------------
  // Complementarias internas
  // ---------------------------------------------------------------------------

  var complementarias = ee.FeatureCollection([]);

  if (agregar_complementarias_internas == 1) {

    complementarias = features_space_complementarias(
      complementarias_base,
      year,
      input_mosaic
    );

  }


  // ---------------------------------------------------------------------------
  // Complementarias C3 preprocesadas
  // ---------------------------------------------------------------------------

  var complementariasNoNulls_import = ee.FeatureCollection([]);

  if (usar_muestras_C3_entrenamiento == 1) {

    complementariasNoNulls_import = getComplementariasC3Optim(
      year,
      input_mosaic
    );

  }


  // ---------------------------------------------------------------------------
  // Complementarias C5/fijas preprocesadas
  // ---------------------------------------------------------------------------

  var complementariasFijasProcesadas = ee.FeatureCollection([]);

  if (usar_muestras_fijas_entrenamiento == 1) {

    complementariasFijasProcesadas = getComplementariasFijasPreprocesadas(
      year,
      input_mosaic
    );

  }


  // ---------------------------------------------------------------------------
  // Ensamble final de entrenamiento anual
  // ---------------------------------------------------------------------------

  // ES: Une muestras estables y complementarias habilitadas, sin eliminar duplicados ni rebalancear después de la unión.
  // EN: Combines stable samples with enabled supplementary samples, without removing duplicates or rebalancing after merging.
  var train = balanced;

  if (agregar_complementarias_internas == 1) {
    train = train.merge(complementarias);
  }

  if (usar_muestras_C3_entrenamiento == 1) {
    train = train.merge(complementariasNoNulls_import);
  }

  if (usar_muestras_fijas_entrenamiento == 1) {
    train = train.merge(complementariasFijasProcesadas);
  }


  // Filtra clases válidas para evitar que se cuele 21 u otras clases.
  var clases_validas = ee.List([3, 9, 11, 12, 15, 18, 22, 33]);

  // ES: Solo conserva las clases enumeradas. No remapea 79, 80 y 83 a 9 en el entrenamiento; esas etiquetas quedan fuera.
  // EN: Keeps only listed classes. Training does not remap 79, 80, and 83 to 9; those labels are excluded.
  train = train.filter(
    ee.Filter.inList('reference', clases_validas)
  );


  // ---------------------------------------------------------------------------
  // Conteo de muestras por clase
  // ---------------------------------------------------------------------------

  var SS_Flo2 = train.filterMetadata('reference', 'equals', 3);
  var SS_PlF2 = train.filterMetadata('reference', 'equals', 9);
  var SS_Umi2 = train.filterMetadata('reference', 'equals', 11);
  var SS_Cam2 = train.filterMetadata('reference', 'equals', 12);
  var SS_Pas2 = train.filterMetadata('reference', 'equals', 15);
  // ES: Cuenta los registros de entrenamiento por clase; estos conteos no son métricas de exactitud.
  // EN: Counts training records per class; these counts are not accuracy metrics.
  var SS_Agr2 = train.filterMetadata('reference', 'equals', 18);
  var SS_Anv2 = train.filterMetadata('reference', 'equals', 22);
  var SS_Agu2 = train.filterMetadata('reference', 'equals', 33);

  var dict = ee.Dictionary();

  if (bioma == 'PAMPAURUGUAY') {

    dict = dict.set('3-Bosque', SS_Flo2.size());
    dict = dict.set('9-PF', SS_PlF2.size());
    dict = dict.set('11-A Hum N', SS_Umi2.size());
    dict = dict.set('12-PASTIZAL', SS_Cam2.size());
    dict = dict.set('15-PASTURAS', SS_Pas2.size());
    dict = dict.set('18-AGR', SS_Agr2.size());
    dict = dict.set('22-ANV', SS_Anv2.size());
    dict = dict.set('33-AGUA', SS_Agu2.size());

  }

  // if (cant_muestras == 1) {
  //   print('Samples per class ' + year, dict);
  // }


  // ---------------------------------------------------------------------------
  // RANDOM FOREST ANUAL
  // ---------------------------------------------------------------------------

  var bands = input_mosaic.bandNames();

  // ES: Entrena un Random Forest independiente por año usando reference y las bandas del mosaico. No incluye una validación independiente del modelo.
  // EN: Trains an independent Random Forest each year using reference and mosaic bands. No independent model validation is included.
  var rf_fit = ee.Classifier
    .smileRandomForest(nro_arboles)
    .train(train, target, bands);

  var clasificacion = input_mosaic.classify(rf_fit);
// ES: Aplica el modelo al mosaico y asigna metadatos de año, zona y versión.
// EN: Applies the model to the mosaic and assigns year, zone, and version metadata.

  clasificacion = clasificacion
    .set('year', year)
    .set('zona', id_zona)
    .set('version', version_clasificacion);


  // ---------------------------------------------------------------------------
  // Tabla de salida
  // ---------------------------------------------------------------------------

  var f_out = ee.Feature(null, dict)
    .set('year', year)
    .set('zona', id_zona)
    .set('version', version_clasificacion);


  // ---------------------------------------------------------------------------
  // Guardar muestras usadas
  // ---------------------------------------------------------------------------

  // ES: Callback: asigna el año numérico a cada muestra utilizada.
  // EN: Callback: assigns the numeric year to each sample used.
  train = train.map(function(feature) {
    return feature.set('year', ee.Number(year));
  });

  var m = ee.FeatureCollection(train);


  // ---------------------------------------------------------------------------
  // Acumuladores multianuales
  // ---------------------------------------------------------------------------

  // ES: Acumula una banda classification_YYYY por año y concatena conteos y muestras anuales.
  // EN: Accumulates one classification_YYYY band per year and concatenates annual counts and samples.
  clasificacion_completa = clasificacion_completa === null
    ? clasificacion.rename('classification_' + year)
    : clasificacion_completa.addBands(
        clasificacion.rename('classification_' + year)
      );

  tabla_output = tabla_output === null
    ? ee.FeatureCollection(f_out)
    : tabla_output.merge(f_out);

  muestras_usadas = muestras_usadas === null
    ? ee.FeatureCollection(m)
    : muestras_usadas.merge(m);

});


// -----------------------------------------------------------------------------
// EXPORTACIÓN DE CLASIFICACIÓN MULTIBANDA
// -----------------------------------------------------------------------------

// ES: Crea una tarea de exportación multibanda a 30 m, enmascarada por limite y con pirámides por moda. La región de exportación es la primera entidad de la zona seleccionada.
// EN: Creates a 30 m multiband export task, masked by limite and using mode pyramids. The export region is the first feature of the selected zone.
Export.image.toAsset({
  image: clasificacion_completa.updateMask(limite),
  description: 'clasificacion-' + year_inicio + '-' + year_fin + '-' +
               id_zona2 + '-' + version_clasificacion,
  assetId: output + 'clasificacion-' + year_inicio + '-' + year_fin + '-' +
           id_zona2 + '-' + version_clasificacion,
  pyramidingPolicy: {'.default': 'mode'},
  region: ee.Feature(
    zonas.filter(ee.Filter.eq(id_zona_prop, id_zona)).first()
  ).geometry(),
  scale: 30,
  maxPixels: 1e13
});


// -----------------------------------------------------------------------------
// EXPORTACIÓN DE TABLA DE MUESTRAS
// -----------------------------------------------------------------------------

// ES: Exporta a Drive un CSV de conteos por clase y año, no las geometrías de las muestras. Las tareas se inician desde Tasks.
// EN: Exports a CSV of counts by class and year to Drive, not sample geometries. Tasks are started from Tasks.
Export.table.toDrive({
  collection: tabla_output,
  description: bioma + '_tabla_output_v' + version_clasificacion + '_z' + id_zona,
  folder: 'Muestras por version y clase c4',
  fileFormat: 'CSV'
});


// -----------------------------------------------------------------------------
// CÁLCULO DE ÁREA OPCIONAL
// -----------------------------------------------------------------------------

if (calcula_area == 1) {

  // ES: Convierte el área de píxel de metros cuadrados a kilómetros cuadrados.
  // EN: Converts pixel area from square meters to square kilometers.
  var pixelArea = ee.Image.pixelArea().divide(1000000);

  // ES: Convierte cada grupo de clase y suma de superficie en una entidad; el punto [0,0] es un marcador, no la ubicación de la clase.
  // EN: Converts each class group and area sum into a feature; point [0,0] is a placeholder, not the class location.
  var convert2featCollection = function(item) {

    item = ee.Dictionary(item);

    var feature = ee.Feature(ee.Geometry.Point([0, 0]))
      .set('classe', item.get('classe'))
      .set('area', item.get('sum'));

    return feature;

  };

  // ES: Suma área por clase en la geometría indicada a escala de 120 m. Esta evaluación no equivale a un conteo exhaustivo de píxeles a 30 m.
  // EN: Sums area by class in the supplied geometry at 120 m scale. This evaluation is not equivalent to exhaustive 30 m pixel counting.
  var calculateArea = function(image, geometry) {

    var reducer = ee.Reducer.sum().group(1, 'classe');

    var areas = pixelArea.addBands(image)
      .reduceRegion({
        reducer: reducer,
        geometry: geometry,
        scale: 120,
        maxPixels: 1e12,
        tileScale: 4
      });

    areas = ee.List(areas.get('groups')).map(convert2featCollection);
    areas = ee.FeatureCollection(areas);

    return areas;

  };

  var areas = calculateArea(
    clasificacion_completa
      .select('classification_' + year_calcula_area)
      .selfMask(),
    myRegion
  )
  // ES: Callback: añade el año como texto a cada resultado de superficie.
  // EN: Callback: adds the year as text to each area result.
  .map(function(feature) {
    return feature.set('year', String(year_calcula_area));
  });

  if (bioma == 'PAMPAURUGUAY') {

    print(
      'Area km2 class 3, year ' + year_calcula_area,
      areas.filterMetadata('classe', 'equals', 3).first().get('area')
    );

    print(
      'Area km2 class 9, year ' + year_calcula_area,
      areas.filterMetadata('classe', 'equals', 9).first().get('area')
    );

    print(
      'Area km2 class 11, year ' + year_calcula_area,
      areas.filterMetadata('classe', 'equals', 11).first().get('area')
    );

    print(
      'Area km2 class 12, year ' + year_calcula_area,
      areas.filterMetadata('classe', 'equals', 12).first().get('area')
    );

    print(
      'Area km2 class 15, year ' + year_calcula_area,
      areas.filterMetadata('classe', 'equals', 15).first().get('area')
    );

    print(
      'Area km2 class 18, year ' + year_calcula_area,
      areas.filterMetadata('classe', 'equals', 18).first().get('area')
    );

    print(
      'Area km2 class 22, year ' + year_calcula_area,
      areas.filterMetadata('classe', 'equals', 22).first().get('area')
    );

    print(
      'Area km2 class 33, year ' + year_calcula_area,
      areas.filterMetadata('classe', 'equals', 33).first().get('area')
    );

  }

}


// ============================================================================
// APP DE VISUALIZACIÓN
// ============================================================================


// -----------------------------------------------------------------------------
// CONFIGURACIÓN DE LA APP
// -----------------------------------------------------------------------------

// ES: Configura la app, el año inicial y el último año comparable con la colección anterior. Estas opciones no cambian el RF.
// EN: Configures the app, initial year, and last year comparable with the previous collection. These options do not change the RF.
var usar_app_visualizacion = 1;

var year_default_app = '' + year_fin;

var usar_diferencia_app = 1;

var anio_max_diferencia_app = 2023;

var clase_diferencia_app = clase_diferencia;


// -----------------------------------------------------------------------------
// CAPAS AUXILIARES PARA VISUALIZACIÓN
// -----------------------------------------------------------------------------

var mostrar_asset_diferencia_mapa = 1;

var mostrar_pastura_estable_2008_mapa = 1;


// -----------------------------------------------------------------------------
// PANEL INSPECTOR DE CLASIFICACIÓN FILTRADA
// -----------------------------------------------------------------------------

var ver_panel_clasificacion_filtrada = 1;

var activar_inspector_clasificacion_default = false;
// ES: Carga módulos externos para gráficos NDVI y colores; su implementación no está incluida en este archivo.
// EN: Loads external modules for NDVI charts and colors; their implementation is not included in this file.


// -----------------------------------------------------------------------------
// MÓDULOS Y VISUALIZACIÓN
// -----------------------------------------------------------------------------

var ts = require('users/santiagobanchero/plots:plots.js');

var palette_app = require('users/mapbiomas/modules:Palettes.js')
  .get('classification5');


// -----------------------------------------------------------------------------
// ESTILIZAR PUNTOS DE MUESTRAS SEGÚN PALETA DE CLASIFICACIÓN
// -----------------------------------------------------------------------------
// Usa el campo reference.
// Para 79, 80 y 83 usa el color de la clase 9, porque son equivalentes
// a plantación forestal en la colección anterior.

// ES: Asigna estilos a las muestras usando reference. Los códigos 79, 80 y 83 reciben el color de 9, pero conservan sus etiquetas originales.
// EN: Assigns styles to samples using reference. Codes 79, 80, and 83 receive the color for 9 but retain their original labels.
var estilizarMuestrasPorClase = function(fc, pointSize) {

  fc = ee.FeatureCollection(fc);

  var paletteList = ee.List(palette_app);

  var clases = ee.List([
    3, 9, 11, 12, 15, 18, 21, 22, 33, 79, 80, 83
  ]);

  var colores = ee.List([
    paletteList.get(3),
    paletteList.get(9),
    paletteList.get(11),
    paletteList.get(12),
    paletteList.get(15),
    paletteList.get(18),
    paletteList.get(21),
    paletteList.get(22),
    paletteList.get(33),
    paletteList.get(9),
    paletteList.get(9),
    paletteList.get(9)
  ]);

  // ES: Callback: transforma los códigos a claves de texto para el diccionario de colores.
  // EN: Callback: transforms codes into text keys for the color dictionary.
  var claves = clases.map(function(c) {
    return ee.Number(c).int().format();
  });

  var dictColores = ee.Dictionary.fromLists(claves, colores);

  // ES: Callback: agrega style a cada entidad; códigos no incluidos reciben blanco.
  // EN: Callback: adds style to each feature; unlisted codes receive white.
  var fcStyled = fc.map(function(f) {

    var refKey = ee.Number(f.get('reference')).int().format();

    var color = ee.String(
      dictColores.get(refKey, 'ffffff')
    );

    return f.set('style', ee.Dictionary({
      color: color,
      fillColor: color,
      pointSize: pointSize,
      pointShape: 'circle',
      width: 1
    }));

  });

  return fcStyled;

};


var vis_class_app = {
  // ES: Configuraciones visuales: clases, composición SWIR1/NIR/rojo y diferencias. No transforman las clases exportadas.
  // EN: Display settings: classes, SWIR1/NIR/red composite, and differences. They do not transform exported classes.
  min: 0,
  max: 45,
  palette: palette_app,
  format: 'png'
};

var RGBvis_app = {
  bands: ['swir1_median', 'nir_median', 'red_median'],
  gain: [0.08, 0.06, 0.2],
  gamma: 0.85
};

var vis_diff_app = {
  min: 1,
  max: 3,
  palette: [
    'ff0000',
    'ffff00',
    '999999'
  ],
  format: 'png'
};


// -----------------------------------------------------------------------------
// CAPA DE REFERENCIA PARA DIFERENCIA
// -----------------------------------------------------------------------------

var ref_diferencia_app = ee.Image(
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/public/mapbiomas_uruguay_collection3'
).clip(myRegion);


// -----------------------------------------------------------------------------
// ASSET PASTURA ESTABLE REGIONES 2008
// -----------------------------------------------------------------------------

var pastura_estable_regiones_2008 = ee.FeatureCollection(
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/SAMPLES/Pastura_Estable_Regiones_2008'
);


// -----------------------------------------------------------------------------
// REMAP DE CLASES EN COLECCIÓN ANTERIOR PARA COMPARACIÓN
// -----------------------------------------------------------------------------

// ES: Remapea únicamente 79, 80 y 83 a 9 en la imagen anterior para comparar y visualizar; conserva otros códigos.
// EN: Remaps only 79, 80, and 83 to 9 in the previous image for comparison and display; preserves other codes.
var remapColeccionAnteriorParaDiferencia = function(img) {

  img = ee.Image(img);

  var img_remap = img
    .where(img.eq(79), 9)
    .where(img.eq(80), 9)
    .where(img.eq(83), 9);

  return img_remap;

};


// -----------------------------------------------------------------------------
// FUNCIÓN DE DIFERENCIA DIRECTA
// -----------------------------------------------------------------------------

// ES: Compara pertenencia a una clase: 1 pérdida, 2 ganancia, 3 coincidencia; enmascara ausencia en ambas. Son discrepancias entre colecciones del mismo año, no cambios temporales comprobados.
// EN: Compares membership in a class: 1 loss, 2 gain, 3 agreement; masks absence in both. These are discrepancies between collections for the same year, not verified temporal changes.
var calcularDiferenciaClase = function(img_ref, img_nueva, clase) {

  var ref_clase = img_ref.eq(clase);
  var nueva_clase = img_nueva.eq(clase);

  var perdida = ref_clase.and(nueva_clase.not());
  var ganancia = ref_clase.not().and(nueva_clase);
  var permanencia = ref_clase.and(nueva_clase);

  var diff = ee.Image(0)
    .where(perdida, 1)
    .where(ganancia, 2)
    .where(permanencia, 3)
    .updateMask(perdida.or(ganancia).or(permanencia))
    .rename('diff_class_' + clase);

  return diff;

};


// ============================================================================
// PANEL INSPECTOR DE CLASIFICACIÓN FILTRADA
// ============================================================================

var legend_clasificacion_filtrada = require(
  'users/schirmbeckj/PampaTriNacional:Colecion_04/legend_Pampa_c4'
).legend;


// ES: Prepara la serie para inspección: aplica la máscara regional y renombra classification_YYYY a YYYY. No ejecuta un filtro temporal adicional.
// EN: Prepares the series for inspection: applies the regional mask and renames classification_YYYY to YYYY. It does not apply an additional temporal filter.
var prepararImagenInspectorClasificacion = function() {

  var image = ee.Image(clasificacion_completa).updateMask(limite);

  var oldBandNames = image.bandNames();

  // ES: Callback: extrae el año a partir del segundo componente del nombre de banda.
  // EN: Callback: extracts the year from the second component of the band name.
  var newBandNames = oldBandNames.map(function(bandName) {

    bandName = ee.String(bandName);

    return ee.String(
      ee.List(bandName.split('_')).get(1)
    );

  });

  return image.select(oldBandNames, newBandNames);

};


var inspectorClasificacionFiltrada = {

  activo: activar_inspector_clasificacion_default,

  image: null,

  chart: null,

  panel: null,

  chk: null,

  // ES: Carga en el inspector la imagen multianual preparada.
  // EN: Loads the prepared multiyear image into the inspector.
  loadData: function() {

    inspectorClasificacionFiltrada.image =
      prepararImagenInspectorClasificacion();

  },

  // ES: Muestrea todas las bandas en el punto a 30 m. Las máscaras pueden producir una colección vacía.
  // EN: Samples all bands at the point at 30 m. Masks may produce an empty collection.
  getSamplePoint: function(point) {

    var fcPoint = ee.FeatureCollection([
      ee.Feature(point)
    ]);

    var sample = inspectorClasificacionFiltrada.image.sampleRegions({
      collection: fcPoint,
      scale: 30,
      geometries: true
    });

    return sample;

  },

  // ES: Actualiza el gráfico a partir de la muestra; evaluate transfiere el resultado de forma asíncrona al cliente.
  // EN: Updates the chart from the sample; evaluate asynchronously transfers the result to the client.
  refreshGraph: function(sample) {

    // ES: Callback asíncrono: comprueba si hay registros y construye la tabla del gráfico. Si no hay muestra, retorna sin limpiar el gráfico anterior.
    // EN: Asynchronous callback: checks for records and builds the chart table. If no sample exists, it returns without clearing the previous chart.
    sample.evaluate(function(featureCollection) {

      if (
        featureCollection === null ||
        featureCollection.features === null ||
        featureCollection.features.length === 0
      ) {
        return;
      }

      var props = featureCollection.features[0].properties;

      // ES: Los callbacks siguientes conservan propiedades con cuatro dígitos y ordenan los años numéricamente.
      // EN: The following callbacks keep four-digit properties and sort years numerically.
      var yearsProps = Object.keys(props)
        .filter(function(k) {
          return /^\d{4}$/.test(k);
        })
        .sort(function(a, b) {
          return parseInt(a, 10) - parseInt(b, 10);
        });

      // ES: Callback: genera una fila por año con código, estilo de punto y texto informativo usando la leyenda.
      // EN: Callback: generates one row per year with class code, point style, and tooltip using the legend.
      var dataTable = yearsProps.map(function(year) {

        var value = props[year];

        if (value === null || value === undefined) {
          value = -1;
        }

        var info = legend_clasificacion_filtrada[value] ||
                   legend_clasificacion_filtrada[String(value)] ||
                   {
                     color: '#ffffff',
                     label: 'Clase ' + String(value)
                   };

        var color = info.color || '#ffffff';
        var name = info.label || ('Clase ' + String(value));

        var style = 'point {size: 5; fill-color: ' +
          color +
          '; opacity: 1}';

        var tooltip = 'Año: ' +
          year +
          ', clase: [' +
          String(value) +
          '] ' +
          name;

        return [
          year,
          value,
          style,
          tooltip
        ];

      });

      var headers = [
        'Año',
        'Clase',
        {
          type: 'string',
          role: 'style'
        },
        {
          type: 'string',
          role: 'tooltip'
        }
      ];

      inspectorClasificacionFiltrada.chart.setDataTable(
        [headers].concat(dataTable)
      );

    });

  },

  // ES: Consulta y actualiza el gráfico solo si el inspector está activo.
  // EN: Queries and updates the chart only when the inspector is enabled.
  inspect: function(point) {

    if (inspectorClasificacionFiltrada.activo !== true) {
      return;
    }

    var sample = inspectorClasificacionFiltrada.getSamplePoint(point);

    inspectorClasificacionFiltrada.refreshGraph(sample);

  },

  // ES: Inicializa datos, gráfico, casilla y panel negro. El eje vertical muestra códigos de clase, no una magnitud continua.
  // EN: Initializes data, chart, checkbox, and dark panel. The vertical axis shows class codes, not a continuous quantity.
  init: function() {

    inspectorClasificacionFiltrada.loadData();

    inspectorClasificacionFiltrada.chart = ui.Chart.array.values({
      array: ee.Array([[-1000]]),
      axis: 0,
      xLabels: ['']
    });

    inspectorClasificacionFiltrada.chart.setOptions({
      title: 'Clasificación',
      legend: 'none',
      chartArea: {
        left: 35,
        right: 5,
        top: 20,
        bottom: 35
      },
      titleTextStyle: {
        color: '#ffffff',
        fontSize: 11,
        bold: true,
        italic: false
      },
      tooltip: {
        textStyle: {
          fontSize: 10
        }
      },
      backgroundColor: '#21242E',
      pointSize: 6,
      crosshair: {
        trigger: 'both',
        orientation: 'vertical',
        focused: {
          color: '#dddddd'
        }
      },
      hAxis: {
        slantedTextAngle: 90,
        slantedText: true,
        textStyle: {
          color: '#ffffff',
          fontSize: 8
        },
        gridlines: {
          color: '#21242E',
          interval: 1
        },
        minorGridlines: {
          color: '#21242E'
        }
      },
      vAxis: {
        title: 'Clase',
        textStyle: {
          color: '#ffffff',
          fontSize: 10
        },
        titleTextStyle: {
          color: '#ffffff',
          fontSize: 10
        },
        viewWindow: {
          max: 50,
          min: 0
        },
        gridlines: {
          color: '#21242E',
          interval: 2
        },
        minorGridlines: {
          color: '#21242E'
        }
      },
      lineWidth: 0,
      height: 160,
      series: {
        0: {
          color: '#21242E'
        }
      }
    });

    inspectorClasificacionFiltrada.chk = ui.Checkbox({
      label: 'Actualizar clasificación',
      value: activar_inspector_clasificacion_default,
      // ES: Callback de la casilla: cambia el estado activo del inspector.
      // EN: Checkbox callback: changes the enabled state of the inspector.
      onChange: function(v) {
        inspectorClasificacionFiltrada.activo = v;
      },
      style: {
        color: '#ffffff',
        backgroundColor: '#21242E',
        padding: '4px'
      }
    });

    var titulo = ui.Label({
      value: 'Inspector de clasificación',
      style: {
        color: '#ffffff',
        backgroundColor: '#21242E',
        fontWeight: 'bold',
        fontSize: '12px',
        margin: '4px 0 4px 0'
      }
    });

    var ayuda = ui.Label({
      value: 'Activar el inspector y hacer clic sobre el mapa.',
      style: {
        color: '#dddddd',
        backgroundColor: '#21242E',
        fontSize: '10px',
        margin: '0 0 4px 0'
      }
    });

    inspectorClasificacionFiltrada.panel = ui.Panel({
      layout: ui.Panel.Layout.Flow('vertical'),
      style: {
        width: '450px',
        position: 'bottom-left',
        margin: '0px',
        padding: '6px',
        backgroundColor: '#21242E'
      }
    });

    inspectorClasificacionFiltrada.panel.add(titulo);
    inspectorClasificacionFiltrada.panel.add(ayuda);
    inspectorClasificacionFiltrada.panel.add(inspectorClasificacionFiltrada.chk);
    inspectorClasificacionFiltrada.panel.add(inspectorClasificacionFiltrada.chart);

    Map.add(inspectorClasificacionFiltrada.panel);

  }

};


// ============================================================================
// OBJETO APP PRINCIPAL
// ============================================================================

// ES: Estado y parámetros de la app. El módulo externo genera la serie Landsat NDVI; el selector anual no limita aquí su intervalo completo.
// EN: App state and parameters. The external module generates the Landsat NDVI series; the annual selector does not restrict its full interval here.
var app = {

  flag_plot_enable: false,

  current_year: null,

  plot: ts.plots.ts_landsat,

  params: {
    start: '1985-01-01',
    end: '2025-12-01',
    geom: null,
    index: 'ndvi',
    cloud_cover: 10,
    options: {
      title: 'Serie temporal NDVI',
      subtitle: '',
      vAxis: {title: 'NDVI'},
      min: -0.2,
      max: 1
    }
  },


  // ---------------------------------------------------------------------------
  // Activar/desactivar serie temporal
  // ---------------------------------------------------------------------------

  // ES: Activa o desactiva la consulta NDVI, vacía el gráfico y actualiza el mensaje de ayuda.
  // EN: Enables or disables NDVI querying, clears the chart, and updates the help message.
  activate_plot: function(v) {
    app.flag_plot_enable = v;
    app.panel_plot.widgets().reset([]);

    if (!v) {
      app.lbl_click.setValue('Activar la consulta NDVI y/o el inspector de clasificación y hacer clic sobre el mapa.');
    } else {
      app.lbl_click.setValue('Hacer clic sobre el mapa para ver la serie temporal NDVI.');
    }
  },


  // ---------------------------------------------------------------------------
  // Click sobre mapa para serie temporal NDVI e inspector de clasificación
  // ---------------------------------------------------------------------------

  // ES: Gestiona clics: crea el punto, consulta los gráficos habilitados y sustituye la última capa por el marcador. Supone que la última capa está reservada a ese punto.
  // EN: Handles clicks: creates the point, queries enabled charts, and replaces the last layer with the marker. Assumes the last layer is reserved for that point.
  on_map_click: function(p) {

    var point = ee.Geometry.Point([p.lon, p.lat]);

    var actualizarPunto = false;

    if (app.flag_plot_enable) {

      app.params.geom = point;

      app.params.options.subtitle =
        'Punto: ' +
        p.lon.toFixed(4) +
        ', ' +
        p.lat.toFixed(4);

      app.panel_plot.widgets().reset([
        app.plot.get(app.params)
      ]);

      actualizarPunto = true;

    }

    if (
      ver_panel_clasificacion_filtrada == 1 &&
      inspectorClasificacionFiltrada.activo === true
    ) {

      inspectorClasificacionFiltrada.inspect(point);

      actualizarPunto = true;

    }

    if (actualizarPunto === true) {

      var inspectLayer = ui.Map.Layer(
        ee.Feature(point, null),
        {
          color: 'yellow'
        },
        'Punto inspeccionado',
        true
      );

      var layers = Map.layers();

      if (layers.length() > 0) {
        layers.set(layers.length() - 1, inspectLayer);
      } else {
        Map.layers().add(inspectLayer);
      }

    }

  },


  // ---------------------------------------------------------------------------
  // Cambio de año
  // ---------------------------------------------------------------------------

  // ES: Reconstruye las capas para el año elegido: RGB, clasificación, comparación, referencias y muestras. No vuelve a entrenar un modelo dentro de esta función.
  // EN: Rebuilds layers for the selected year: RGB, classification, comparison, references, and samples. This function does not retrain a model.
  mosaic_change: function(year) {

    app.current_year = year;

    var yearNumber = parseInt(year, 10);


    // -------------------------------------------------------------------------
    // Mosaico RGB del año seleccionado
    // -------------------------------------------------------------------------

    var input_mosaic = getRawMosaicForYear(yearNumber);

    var mosaic_layer = ui.Map.Layer(
      input_mosaic,
      RGBvis_app,
      'RGB ' + year,
      true
    );


    // -------------------------------------------------------------------------
    // Clasificación anual
    // -------------------------------------------------------------------------

    var clasificacion_anual = ee.Image(clasificacion_completa)
      .select('classification_' + year)
      .updateMask(limite);

    var clasificacion_layer = ui.Map.Layer(
      clasificacion_anual,
      vis_class_app,
      'Clasificación ' + year,
      true
    );


    // -------------------------------------------------------------------------
    // Diferencia por clase
    // -------------------------------------------------------------------------

    var diff_empty = ee.Image(0)
      .rename('diff_class_' + clase_diferencia_app)
      .selfMask();

    var diferencia_layer = ui.Map.Layer(
      diff_empty,
      vis_diff_app,
      'Diferencia clase ' + clase_diferencia_app + ' ' + year,
      // ES: La comparación solo se genera cuando está habilitada y el año no supera el límite disponible.
      // EN: Comparison is generated only when enabled and the year does not exceed the available limit.
      false
    );

    if (
      usar_diferencia_app == 1 &&
      yearNumber <= anio_max_diferencia_app
    ) {

      var ref_anual = ref_diferencia_app
        .select('classification_' + year)
        .updateMask(limite);

      ref_anual = remapColeccionAnteriorParaDiferencia(ref_anual);

      var diff_img = calcularDiferenciaClase(
        ref_anual,
        clasificacion_anual,
        clase_diferencia_app
      );

      diferencia_layer = ui.Map.Layer(
        diff_img,
        vis_diff_app,
        'Diferencia clase ' + clase_diferencia_app + ' ' + year,
        false
      );

    }


    // -------------------------------------------------------------------------
    // Asset de clasificación anterior usado como referencia para diferencia
    // -------------------------------------------------------------------------

    var asset_diferencia_layer = ui.Map.Layer(
      ee.Image(0).selfMask(),
      {},
      'Colección anterior ' + year,
      false
    );

    if (
      mostrar_asset_diferencia_mapa == 1 &&
      yearNumber <= anio_max_diferencia_app
    ) {

      var ref_diferencia_visual = ref_diferencia_app
        .select('classification_' + year)
        .updateMask(limite);

      ref_diferencia_visual =
        remapColeccionAnteriorParaDiferencia(ref_diferencia_visual);

      asset_diferencia_layer = ui.Map.Layer(
        ref_diferencia_visual,
        vis_class_app,
        'Colección anterior ' + year,
        false
      );

    }


    // -------------------------------------------------------------------------
    // Pastura Estable Regiones 2008
    // -------------------------------------------------------------------------

    var pastura_estable_2008_layer = ui.Map.Layer(
      ee.FeatureCollection([]),
      {},
      'Pastura Estable Regiones 2008',
      false
    );

    if (mostrar_pastura_estable_2008_mapa == 1) {
// ES: La referencia de pasturas 2008 es una capa fija; no cambia sus datos con el selector de año.
// EN: The 2008 pasture reference is a fixed layer; the year selector does not change its data.

      pastura_estable_2008_layer = ui.Map.Layer(
        pastura_estable_regiones_2008.style({
          color: '00ff00',
          fillColor: '00ff0033',
          pointSize: 7,
          pointShape: 'circle',
          width: 1
        }),
        {},
        'Pastura Estable Regiones 2008',
        false
      );

    }


    // -------------------------------------------------------------------------
    // Muestras complementarias C5/fijas visibles con paleta de clasificación
    // -------------------------------------------------------------------------

    var muestras_fijas_layer = ui.Map.Layer(
      ee.FeatureCollection([]),
      {},
      'Muestras complementarias C5' + year,
      false
    );

    if (mostrar_muestras_fijas_mapa == 1) {

      var muestras_fijas_fc = getComplementariasFijasPreprocesadas(
        yearNumber,
        input_mosaic
      );

      muestras_fijas_layer = ui.Map.Layer(
        estilizarMuestrasPorClase(muestras_fijas_fc, 7)
          .style({
            styleProperty: 'style'
          }),
        {},
        'Muestras complementarias C5 ' + year,
        false
      );

    }


    // -------------------------------------------------------------------------
    // Muestras complementarias C3 visibles con paleta de clasificación
    // -------------------------------------------------------------------------

    var muestras_c3_layer = ui.Map.Layer(
      ee.FeatureCollection([]),
      {},
      'Muestras complementarias C3 ' + year,
      false
    );

    if (mostrar_muestras_C3_mapa == 1) {

      var muestras_c3_fc = getComplementariasC3Optim(
        yearNumber,
        input_mosaic
      );

      muestras_c3_layer = ui.Map.Layer(
        estilizarMuestrasPorClase(muestras_c3_fc, 7)
          .style({
            styleProperty: 'style'
          }),
        {},
        'Muestras complementarias C3 ' + year,
        false
      );

    }


    // -------------------------------------------------------------------------
    // Punto de inspección inicial
    // -------------------------------------------------------------------------

    var point_init = ui.Map.Layer(
      ee.Feature(ee.Geometry.Point([0, 0]), null),
      {color: 'yellow'},
      'Punto inspeccionado',
      true
    );


    // -------------------------------------------------------------------------
    // Capas finales
    // -------------------------------------------------------------------------

    Map.layers().reset([
      mosaic_layer,
      asset_diferencia_layer,
      clasificacion_layer,
      diferencia_layer,
      // ES: Reemplaza la lista completa de capas y reserva la última para el punto inspeccionado.
      // EN: Replaces the entire layer list and reserves the last layer for the inspected point.
      pastura_estable_2008_layer,
      muestras_fijas_layer,
      muestras_c3_layer,
      point_init
    ]);

  },


  // ---------------------------------------------------------------------------
  // PANEL DERECHO: AÑO + SERIE TEMPORAL NDVI
  // ---------------------------------------------------------------------------

  panel_ndvi: ui.Panel(
    [],
    ui.Panel.Layout.Flow('vertical'),
    {position: 'bottom-right', width: '360px'}
  ),

  panel_plot: ui.Panel(
    [],
    ui.Panel.Layout.Flow('vertical'),
    {stretch: 'both'}
  ),

  lbl_title_ndvi: ui.Label({
    value: 'Visualizador y serie temporal NDVI',
    style: {
      fontWeight: 'bold',
      fontSize: '14px',
      margin: '4px 0 8px 0'
    }
  }),

  lbl_year: ui.Label({
    value: 'Año de visualización',
    style: {
      fontWeight: 'bold',
      fontSize: '12px',
      margin: '4px 0 4px 0'
    }
  }),

  lbl_click: ui.Label({
    value: 'Activar la consulta NDVI y/o el inspector de clasificación y hacer clic sobre el mapa.',
    style: {
      fontSize: '11px',
      margin: '8px 0 8px 0'
    }
  }),

  lst_years: ui.Select(
    // ES: Callback: convierte los años numéricos en etiquetas de texto del selector.
    // EN: Callback: converts numeric years into selector text labels.
    years.map(function(n) {
      return '' + n;
    }),
    'Año...',
    null,
    // ES: Callback del selector: actualiza las capas al cambiar de año.
    // EN: Selector callback: updates layers when the year changes.
    function(v) {
      app.mosaic_change(v);
    },
    false,
    {}
  ),

  chk_plot: ui.Checkbox(
    'Activar consulta NDVI',
    false,
    // ES: Callback de la casilla: activa o desactiva la consulta NDVI.
    // EN: Checkbox callback: enables or disables NDVI querying.
    function(v) {
      app.activate_plot(v);
    },
    false,
    {border: '1px', padding: '5px'}
  ),


  // ---------------------------------------------------------------------------
  // INICIALIZAR APP
  // ---------------------------------------------------------------------------

  // ES: Construye el panel derecho, inicializa el inspector opcional, registra clics y selecciona el año inicial disparando su actualización.
  // EN: Builds the right panel, initializes the optional inspector, registers clicks, and selects the initial year while triggering its update.
  init: function() {

    app.panel_ndvi.add(app.lbl_title_ndvi);
    app.panel_ndvi.add(app.lbl_year);
    app.panel_ndvi.add(app.lst_years);
    app.panel_ndvi.add(app.lbl_click);
    app.panel_ndvi.add(app.chk_plot);
    app.panel_ndvi.add(app.panel_plot);

    Map.add(app.panel_ndvi);

    if (ver_panel_clasificacion_filtrada == 1) {
      inspectorClasificacionFiltrada.init();
    }

    Map.onClick(app.on_map_click);

    app.lst_years.setValue(year_default_app, true);

  }

};


// -----------------------------------------------------------------------------
// INICIAR APP
// -----------------------------------------------------------------------------

if (usar_app_visualizacion == 1) {
  // ES: Inicia la app si está habilitada; el fondo HYBRID se configura independientemente.
  // EN: Starts the app if enabled; the HYBRID basemap is configured independently.
  app.init();
}

Map.setOptions('HYBRID');
