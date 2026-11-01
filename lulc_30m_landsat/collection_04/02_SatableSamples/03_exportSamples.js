// ES: Define la versión de las muestras de entrada y de las tablas de salida.
// EN: Defines the version of the input samples and output tables.
var versao = 'v9'

// ES: Versión de los mosaicos que se seleccionarán mediante sus metadatos.
// EN: Mosaic version to select using image metadata.
var version_mosaic = '4'

// ES: Colección utilizada para construir las rutas de entrada y salida.
// EN: Collection used to construct input and output paths.
var col ='6'

// ES: Carpeta de assets donde se exportarán las muestras con atributos por año.
// EN: Asset folder where samples with annual attributes will be exported.
var dirout = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-'+col+'/SAMPLES/YEAR/';

// ES: Rutas de las dos colecciones de mosaicos utilizadas como predictores.
// EN: Paths to the two mosaic collections used as predictors.
var dirasset =  'projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics';
var dirasset7 = 'projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics-landsat-7';

// ES: Carga las regiones. Su geometría conjunta delimita las bandas auxiliares
//     y se utiliza para filtrar espacialmente los mosaicos de años anteriores.
// EN: Loads the regions. Their combined geometry bounds auxiliary bands
//     and is used to spatially filter mosaics from previous years.
var regions = ee.FeatureCollection('projects/mapbiomas-uruguay/assets/LAND-COVER/ANCILLARY_DATA/C5/regiones_buffer_uy_ext')


// ES: Selecciona el período de las muestras y los años que se procesarán.
//     "sufix" identifica el asset de puntos; "anos" controla el bucle anual.
// EN: Selects the sample period and the years to process.
//     "sufix" identifies the point asset; "anos" controls the annual loop.
var sufix = '_85_89', anos = [1985,1986,1987,1988,1989];
//var sufix = '_90_94', anos = [1990,1991,1992,1993,1994];
//var sufix = '_95_99' , anos = [1995,1996,1997,1998,1999];
//var sufix = '_00_04' , anos = [2000,2001,2002,2003,2004]; 
//var sufix = '_05_09', anos = [2005,2006,2007,2008,2009];
//var sufix = '_10_14', anos = [2010,2011,2012,2013,2014];
//var sufix = '_15_19' , anos = [2015,2016,2017,2018,2019];

// ES: En esta opción desactivada, el sufijo indica 2020–2023,
//     pero la lista incluye años hasta 2025.
// EN: In this disabled option, the suffix indicates 2020–2023,
//     but the list includes years through 2025.
//var sufix = '_20_23' , anos = [2020,2021,2022,2023,2024,2025]; 



// ES: Obtiene la geometría conjunta de las regiones.
// EN: Retrieves the combined geometry of the regions.
var limite = regions.geometry()

// ES: Valor del metadato "biome" utilizado para seleccionar los mosaicos.
// EN: Value of the "biome" metadata field used to select mosaics.
var biome = 'PAMPAURUGUAY'

// ES: Ruta alternativa de puntos, actualmente desactivada.
// EN: Alternative point path, currently disabled.
//var pts = ee.FeatureCollection('projects/MapBiomas_Pampa/SAMPLES/C2/URUGUAY/samples_C2_PAMPAURUGUAY_v01')

// ES: Carga los puntos de clases persistentes del período seleccionado.
//     Se reutilizan estos mismos puntos para extraer predictores de cada año.
// EN: Loads persistent-class points for the selected period.
//     The same points are reused to extract predictors for each year.
var pts = ee.FeatureCollection('projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-'+col+'/SAMPLES/PUNTOS/samples_C'+col+'_PAMPAURUGUAY'+ sufix + '_' + versao)

// ES: Agrega los puntos al mapa como una capa inicialmente oculta.
// EN: Adds the points to the map as an initially hidden layer.
Map.addLayer(pts, {}, 'pontos', false)

// ES: Muestra un punto de ejemplo y la cantidad total de puntos.
// EN: Displays an example point and the total point count.
print('pontos',pts.first())
print(pts.size())
//var pts_reg = pts.filterMetadata('ID', 'equals', 1)
//print('pontos regiao',pts_reg)

// ES: Importa las paletas de MapBiomas; no se utilizan posteriormente.
// EN: Imports MapBiomas palettes; they are not used afterward.
var palettes = require('users/mapbiomas/modules:Palettes.js');

// ES: Lista ordenada de bandas predictoras que se seleccionarán del mosaico.
//     Incluye bandas espectrales, índices, estadísticas, textura y variables
//     auxiliares. Latitud, longitud, amplitud multianual de NDVI y pendiente
//     se incorporan explícitamente más adelante.
// EN: Ordered list of predictor bands to select from the mosaic.
//     Includes spectral bands, indices, statistics, texture, and auxiliary
//     variables. Latitude, longitude, multiyear NDVI amplitude, and slope
//     are explicitly added later.
//nomes bandas
{var bandNames = ee.List([
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
'latitude', //calculada no script
'longitude', //calculada no script
'ndfi_median',
'ndfi_median_dry',
'ndfi_median_wet',
'ndvi_median',
'ndvi_median_dry',
'ndvi_median_wet',
'ndvi_amp_3y', //calculada no script
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


// ES: Nombres abreviados correspondientes, posición por posición,
//     a "bandNames". Se utilizarán como nombres de los atributos extraídos.
//     La cantidad y el orden deben coincidir entre ambas listas.
// EN: Abbreviated names corresponding, position by position,
//     to "bandNames". They will become the extracted attribute names.
//     Both lists must have matching lengths and order.
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
'lat', //calculada no script
'long', //calculada no script
'ndfi_m',
'ndfi_m_d',
'ndfi_m_w',
'ndvi_m',
'ndvi_m_d',
'ndvi_m_w',
'ndvi_a_3y', //calculada no script
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
])}

// ES: Carga la banda de elevación "AVE" del modelo ALOS AW3D30.
// EN: Loads the "AVE" elevation band from the ALOS AW3D30 model.
var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");

// ES: Calcula la pendiente en grados a partir de la elevación.
// EN: Calculates slope in degrees from elevation.
var slope = ee.Terrain.slope(terrain)

// ES: Define un vecindario cuadrado de radio cinco píxeles.
//     Solo aparece en un cálculo de entropía que está desactivado.
// EN: Defines a square neighborhood with a five-pixel radius.
//     It is only referenced in a disabled entropy calculation.
var square = ee.Kernel.square({radius: 5});

// ES: Lista de valores de "ECOZONA" que se procesarán.
//     Los puntos con otros valores no se incorporan a las salidas.
// EN: List of "ECOZONA" values to process.
//     Points with other values are not included in the outputs.
var regions_name= ['cristalino','graben_LM','Sierras_Este', 'sedimentaria_gnw','basaltica','graben_SL','sedimentaria_Oeste'] 

// ES: Genera bandas de longitud y latitud en grados y las recorta al ámbito.
// EN: Generates longitude and latitude bands in degrees and clips them to the area.
var ll = ee.Image.pixelLonLat().clip(limite)
    
// ES: Invierte el signo de las coordenadas, multiplica por 100 y convierte
//     a enteros de 16 bits. Son predictores transformados, no coordenadas
//     geográficas originales; la conversión elimina la parte decimal.
// EN: Reverses coordinate signs, multiplies by 100, and converts to
//     16-bit integers. These are transformed predictors, not original
//     geographic coordinates; conversion removes the fractional part.
var long = ll.select('longitude').add(0).multiply(-1).multiply(100).toInt16()
var lati = ll.select('latitude').add(0).multiply(-1).multiply(100).toInt16()

// ES: Filtra la colección principal por territorio y versión del mosaico.
// EN: Filters the main collection by territory and mosaic version.
var mosaicos1 = ee.ImageCollection(dirasset)
                  .filterMetadata('biome', 'equals', biome)
                  .filterMetadata('version', 'equals', version_mosaic)
print('mosaicos1',mosaicos1)

// ES: Aplica los mismos filtros a la colección de Landsat 7.
// EN: Applies the same filters to the Landsat 7 collection.
var mosaicos2 = ee.ImageCollection(dirasset7)
                  .filterMetadata('biome', 'equals', biome)
                  .filterMetadata('version', 'equals', version_mosaic)

// ES: Reúne ambas colecciones. merge() no calcula promedios ni compone píxeles;
//     la composición espacial se realiza después mediante mosaic().
// EN: Combines both collections. merge() does not average or composite pixels;
//     spatial compositing is performed later using mosaic().
var mosaicos = mosaicos1.merge(mosaicos2)

print('mosaicos',mosaicos)

// ES: Recorre los años y prepara una tabla de atributos independiente por año.
// EN: Iterates over the years and prepares a separate attribute table per year.
for (var i_ano=0;i_ano<anos.length; i_ano++){
//for (var i_ano=0;i_ano<1; i_ano++){
  var ano = anos[i_ano];
  //print('ano',ano)

    // ES: Selecciona las imágenes del año y las combina espacialmente.
    //     mosaic() prioriza los últimos píxeles válidos según el orden
    //     de la colección; no calcula una media entre imágenes.
    // EN: Selects images for the year and combines them spatially.
    //     mosaic() prioritizes the last valid pixels in collection order;
    //     it does not calculate an average across images.
    var mosaicoTotal = mosaicos.filterMetadata('year', 'equals', (ano))
                        .mosaic()

    // ES: Para 1985 utiliza únicamente las medianas seca y húmeda del año.
    // EN: For 1985, uses only that year's dry and wet medians.
    if (ano == 1985){//usa o valor do ano como apmlitude
      //var amp3anos = max3anos.subtract(min3anos).rename('amp_ndvi_3anos')
      var min3anos = mosaicoTotal.select('ndvi_median_dry')
      //print(min3anos)
      var max3anos = mosaicoTotal.select('ndvi_median_wet')
    }

    // ES: Para 1986 combina el año actual y el anterior: 1985–1986.
    //     Calcula el mínimo de las medianas secas y el máximo de las húmedas.
    // EN: For 1986, combines the current and previous years: 1985–1986.
    //     Calculates the minimum dry median and maximum wet median.
    if (ano == 1986){//usa os 2 anos anteriores como amplitude
      //var amp3anos = max3anos.subtract(min3anos).rename('amp_ndvi_3anos')
      var mosaico1ano_antes = mosaicos
                      .filterMetadata('year', 'equals', ( ano - 1))
                      .filterBounds(limite)
                      .mosaic()
      var min3anos = ee.ImageCollection.fromImages([mosaicoTotal.select('ndvi_median_dry'),
                                                  mosaico1ano_antes.select('ndvi_median_dry')]).min()
      var max3anos = ee.ImageCollection.fromImages([mosaicoTotal.select('ndvi_median_wet'),
                                                  mosaico1ano_antes.select('ndvi_median_wet')]).max()
    }

    if (ano > 1987){

      // ES: Construye el mosaico del año inmediatamente anterior.
      // EN: Builds the mosaic for the immediately preceding year.
      var mosaico1ano_antes = mosaicos
                      .filterMetadata('year', 'equals', ( ano - 1))
                      .filterBounds(limite)
                      .mosaic()

      // ES: Construye el mosaico de dos años antes.
      // EN: Builds the mosaic from two years earlier.
      var mosaico2anos_antes = mosaicos
                      .filterMetadata('year', 'equals', ( ano - 2))
                      .filterBounds(limite)
                      .mosaic()

      // ES: Obtiene el mínimo de las medianas secas de los tres años.
      // EN: Gets the minimum dry median across the three years.
      var min3anos = ee.ImageCollection.fromImages([mosaicoTotal.select('ndvi_median_dry'),
                                                  mosaico1ano_antes.select('ndvi_median_dry'),
                                                  mosaico2anos_antes.select('ndvi_median_dry')]).min()

      // ES: Obtiene el máximo de las medianas húmedas de los tres años.
      // EN: Gets the maximum wet median across the three years.
      var max3anos = ee.ImageCollection.fromImages([mosaicoTotal.select('ndvi_median_wet'),
                                                  mosaico1ano_antes.select('ndvi_median_wet'),
                                                  mosaico2anos_antes.select('ndvi_median_wet')]).max()
    
      
    }

    // ES: Calcula la diferencia entre el máximo húmedo y el mínimo seco.
    //     Mantiene las unidades y el escalado del NDVI de entrada.
    //     No es el rango de todas las observaciones Landsat individuales.
    // EN: Calculates the difference between the wet maximum and dry minimum.
    //     Retains the input NDVI units and scaling.
    //     This is not the range of all individual Landsat observations.
    var amp3anos = max3anos.subtract(min3anos).rename('ndvi_amp_3y')

    // ES: Parámetros de visualización de la amplitud; la capa está desactivada.
    // EN: Amplitude visualization settings; the layer call is disabled.
    var ndvi_color = '0f330f, 005000, 4B9300, 92df42, bff0bf, FFFFFF, eee4c7, ecb168, f90000'
    var visParNDFI_amp = {'min':0, 'max':60, 'palette':ndvi_color};
    //Map.addLayer(amp3anos, visParNDFI_amp, 'amp3anos', true);

    // ES: Agrega la amplitud de NDVI como banda predictora.
    // EN: Adds NDVI amplitude as a predictor band.
    mosaicoTotal = mosaicoTotal.addBands(amp3anos)

    // ES: Agrega las coordenadas transformadas como predictores espaciales.
    // EN: Adds transformed coordinates as spatial predictors.
    mosaicoTotal = mosaicoTotal.addBands(long.rename('longitude'))
    mosaicoTotal = mosaicoTotal.addBands(lati.rename('latitude' ))
    
    // ES: Agrega la pendiente recortada al ámbito y convertida a entero
    //     de 8 bits; esta conversión elimina los decimales de los grados.
    // EN: Adds slope clipped to the area and converted to an 8-bit integer;
    //     this conversion removes fractional degrees.
    mosaicoTotal = mosaicoTotal.addBands(slope.int8().clip(limite),['slope'])
    
    // ES: Cálculo alternativo de textura por entropía, actualmente desactivado.
    // EN: Alternative entropy texture calculation, currently disabled.
    //var entropyG = mosaicoTotal.select('green_median').entropy(square);
    //mosaicoTotal = mosaicoTotal.addBands(entropyG.select([0],['textG']).multiply(100).int16())

    // ES: Muestra el mosaico antes de seleccionar y abreviar sus bandas.
    // EN: Displays the mosaic before selecting and abbreviating its bands.
     print('mosaico longo',mosaicoTotal,ano)

    // ES: Selecciona las bandas requeridas y las renombra según la lista corta.
    //     Todas las bandas solicitadas deben existir en el mosaico.
    // EN: Selects the required bands and renames them using the short-name list.
    //     All requested bands must exist in the mosaic.
    mosaicoTotal = mosaicoTotal.select(bandNames,bandNamesShort)
    //var  mosSHP = mosaicoTotal.rename(bnamesSHP)
    print('mosaico curto',mosaicoTotal,ano)

    // ES: Agrega el mosaico anual como una capa inicialmente oculta.
    // EN: Adds the annual mosaic as an initially hidden layer.
    Map.addLayer(mosaicoTotal, {}, 'mosaico', false)

  // ES: Recorre las regiones para extraer los valores por grupos de puntos.
  // EN: Iterates over regions to extract values for groups of points.
  for (var i_reg=0; i_reg<regions_name.length; i_reg++){
  //var region = 6
    var region = regions_name[i_reg];
    //print(region)
    //var limite = regions.filterMetadata('ECOZONA', 'equals', region)
    //print(limite)
    //Map.addLayer(limite, {}, 'limite region', false)
    
    // ES: Selecciona los puntos por su atributo "ECOZONA".
    //     Este filtro es por propiedad, no una intersección espacial.
    // EN: Selects points by their "ECOZONA" attribute.
    //     This is a property filter, not a spatial intersection.
    var pts_reg = pts.filterMetadata('ECOZONA', 'equals', region)
    //print('n pontos',pts_reg.size())
    
   // ES: Extrae el primer valor válido de cada banda en la geometría de cada
   //     punto, conservando sus atributos originales y agregando predictores.
   //     scale: 30 establece la escala nominal de extracción.
   //     tileScale: 4 reduce el tamaño de las teselas de cálculo para aliviar
   //     el uso de memoria; no modifica la resolución solicitada.
   //     No se eliminan explícitamente los puntos con predictores faltantes.
   // EN: Extracts the first valid value of each band at each point geometry,
   //     retaining original attributes and adding predictor values.
   //     scale: 30 sets the nominal extraction scale.
   //     tileScale: 4 reduces computation tile size to ease memory usage;
   //     it does not change the requested resolution.
   //     Points with missing predictor values are not explicitly removed.
   var training = mosaicoTotal.reduceRegions({
      collection: pts_reg, 
      reducer: ee.Reducer.first().forEachBand(mosaicoTotal), 
      scale: 30, 
      tileScale: 4})
    print(training.first())

// ES: Alternativa de extracción mediante sampleRegions(), desactivada.
// EN: Alternative extraction using sampleRegions(), disabled.
//      var trainingSHP = mosSHP.sampleRegions({
//          'collection': pts_reg,
//          'scale': 30,
//          'tileScale': 4,
//          'geometries': true
//      });

      
    // ES: Para la primera región, inicializa la colección acumulada del año.
    // EN: For the first region, initializes the year's accumulated collection.
    if (i_reg == 0){ 
      var training_reg = training 
      Map.addLayer(training_reg, {}, 'primeira', false)
      //var training_regSHP = trainingSHP 
    }  
    else {

      // ES: Agrega los puntos de las regiones restantes a la colección anual.
      //     merge() no elimina duplicados.
      // EN: Appends points from the remaining regions to the annual collection.
      //     merge() does not remove duplicates.
      training_reg = training_reg.merge(training);
      //print(training_reg.first())
      //training_regSHP = training_regSHP.merge(trainingSHP);
    }
    

    //print('region ' + String(region) + 'tamanho = ' +  String(training.size()))
    
  }    
  
//print('training', training_reg)
//print('training limite',training_reg.limit(1))
//print('training zise',training_reg.size())

// ES: Agrega los puntos con atributos anuales como una capa oculta.
// EN: Adds points with annual attributes as a hidden layer.
Map.addLayer(training_reg, {}, 'resultado final', false)
//print(training_reg.first())

// ES: Crea una tarea de exportación de la tabla anual a un asset.
//     El nombre incluye colección, versión y año.
// EN: Creates an export task for the annual table to an asset.
//     The name includes collection, version, and year.
Export.table.toAsset(training_reg, 
                      'pontos_C'+col+'_' + versao + '_' + ano , 
                       dirout + 'pontos_C'+col+'_' + versao + '_' + ano);

// ES: Crea otra tarea para exportar la misma tabla a Google Drive como SHP.
//     Se genera una tarea a Drive y otra a Asset por cada año.
//     Las tareas deben iniciarse desde la pestaña Tasks de Earth Engine.
// EN: Creates another task to export the same table to Google Drive as SHP.
//     One Drive task and one Asset task are generated for each year.
//     Tasks must be started from the Earth Engine Tasks tab.
Export.table.toDrive({
    collection: training_reg,
    fileFormat: 'SHP', // 'CSV',//KML,
    folder:'amostras_coll'+col+'_shp',
    description: 'pontos_exp1_UY_' + versao + '_' + ano + '_shp'
    })

  
}
