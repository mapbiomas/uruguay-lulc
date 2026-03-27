// (EN) Select the class codes to inspect changes/differences between two classification maps.

//Seteo de clases: dos clases que se quieren visualizar en las capas de diferencias.
// (EN) Class setup: two classes that will be highlighted in the “difference” layers.
//Referencia de los códigos de clases:
// (EN) Class code reference:
//3  Bosque_cerrado //4  Bosque_abierto //9  Plantaciones_forestales
//11 Area_humeda_natural //12 Pastizal //15 Pastura //18 Agricultura
//22 Area_no_vegetada //33 Cuerpos_de_agua

var version = '41'   // (EN) Version tag used to build the asset path for a given classification product.

var classe = 18      // (EN) Primary class to compute difference map (e.g., 18 = Agriculture).
var classe2 = 11     // (EN) Secondary class to compute difference map (e.g., 11 = Wetlands).

//Seteo de los años que se quieren visualizar
// (EN) Years to display as comparison snapshots (each year will add mosaic + classification + difference layers).
var ano1 = 1985
var ano2 = 1995
var ano3 = 2005
var ano4 = 2022

//Prender o apagar el gráfico negro de clases en función del tiempo
// (EN) Toggle the interactive time-series “class inspector” chart (0 = off, 1 = on).
var ver_grafico = 1

//***********************************************************************************
//A partir de acá no cambiar
// (EN) From here down: core configuration & assets (do not edit unless you know what you’re doing).

var version_clasif = '4' // (EN) Reference “filter version” label used in layer naming.
var col = 5              // (EN) Current collection number being evaluated (e.g., 5).
var year_inicio = 1985
var year_fin = 2024
var version_multifiltro = '5' + 'multifiltro'  // (EN) Label for multi-filter classification version (string used in titles).
var version_filtro = version_clasif + 'con filtro' // (EN) Label for “with filter” version (string used in titles).

var col_anterior = col -1  // (EN) Previous collection number used for comparisons.

//assetId1 Col4
// (EN) Reference classification map from Collection 4 (baseline / previous collection).
var assetId1 = ee.Image('projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-4/WORKSPACE/Col4_MapBiomasPamapa_classification_final')

//assetId2 Col 5 v4 filtrada
// (EN) Target classification map: Collection 5 (filtered) for a given version.
var assetId2 =  ee.Image('projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/classificationC5/_class_v_'+version+'_temp')

//assetId3 Col 5 v6 multifiltro
// (EN) Alternative classification map: Collection 5 (multi-filter) integration product.
var assetId3 = ee.Image('projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/MOSAICOS/Mosaicos_ConFiltro/clasificacion-1985-2024-6multifiltro') 
// ee.Image('projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/MOSAICOS/Mosaicos_SinFiltro/clasificacion-1985-2024-'+version+'sin_filtro')

// (EN) Study extent / mask area (buffered regions).
var limite = ee.FeatureCollection("projects/MapBiomas_Pampa/ANCILLARY_DATA/C3/regionesUy_buffer")

var bioma = 'PAMPAURUGUAY'
var version_mosaico = '4' //versão dos mosaicos da col 2
//var dirasset =  'projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics'; //dir de los mosaicos landsat

// -----------------------------------------------------------------------------
// Visualization parameters and helpers
// -----------------------------------------------------------------------------

// (EN) MapBiomas classification palette for visualization.
var palette = require('users/mapbiomas/modules:Palettes.js').get('classification5');
var vis = {'min': 0, 'max': 45,  'palette': palette};

// (EN) Difference-map function: returns an image with {0..3} codes indicating loss/gain/keep etc.
var diferenca = require('users/schirmbeckj/PampaTriNacional:Utils/Passo100_Mapa_Diferencas_Classe_v02.js').diferenca

// (EN) Difference layer visualization:
// 0 = white (background), 1 = red (loss), 2 = yellow (gain), 3 = gray (kept) [interpretation depends on module]
var vischange = {"min": 0, "max": 3,
        "palette": "ffffff,ff0000,e6f919,aaaaaa",    //amarelo=e6f919    magenta=bb34c0
        "format": "png"
  }

//adiciona mosaicos para o primeiro e ultimo ano
// (EN) Add Landsat mosaic RGB layers for each selected year (for visual context).

// (EN) RGB visualization presets for mosaics (SWIR1/NIR/RED).
var visParMedian = {'bands':['swir1_median','nir_median','red_median'], 'gain':[0.08, 0.06,0.2],'gamma':0.5 };
var visParMedian2 = {'bands':['nir_median','swir1_median','red_median'], 'gain':[0.06, 0.08,0.2],'gamma':0.5 };

// (EN) Landsat mosaics collection: merges Landsat 5/8 mosaics with Landsat 7 mosaics.
var mosaicos =  ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics')
                 .merge(ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics-landsat-7'))
                 .filterMetadata('version', 'equals', version_mosaico)
                 .filterMetadata('biome', 'equals', bioma)

// -----------------------------------------------------------------------------
// Add mosaic layers for each selected year
// -----------------------------------------------------------------------------

var mosaico = mosaicos.filterMetadata('year', 'equals', ano1).mosaic()
                      .clip(limite)
Map.addLayer(mosaico, visParMedian, 'RGB_Landsat '+ ano1, false) 

var mosaico = mosaicos.filterMetadata('year', 'equals', ano2).mosaic()
                      .clip(limite)
Map.addLayer(mosaico, visParMedian, 'RGB_Landsat '+ ano2, false)

var mosaico = mosaicos.filterMetadata('year', 'equals', ano3).mosaic()
                      .clip(limite)
Map.addLayer(mosaico, visParMedian, 'RGB_Landsat '+ ano3, false)

var mosaico = mosaicos.filterMetadata('year', 'equals', ano4).mosaic()
                      .clip(limite)
Map.addLayer(mosaico, visParMedian, 'RGB_Landsat '+ ano4, false)


// -----------------------------------------------------------------------------
// YEAR 1 COMPARISON (ano1)
// -----------------------------------------------------------------------------

var ano_dif = ano1
// (EN) Visualization settings for the current year band (classification_YYYY).
var vis1 = {'bands': ['classification_'+ ano_dif],'min': 0, 'max': 45,  'palette': palette};

// (EN) Select the “before” and “after” classification images for the chosen year.
// Note: for ano1 you compare assetId2 (filtered C5) vs assetId3 (multifilter C5).
var img_antes  = assetId2.select('classification_'+ ano_dif)
//Remapeo para Chaco
// (EN) Optional remapping step (disabled) for harmonizing class codes across biomes.
//var img_antes = img_antes.remap([3, 9, 11, 12,15, 19, 22, 33], [3, 9, 11, 12,15, 18, 22, 33])

var img_depois = assetId3.select('classification_'+ ano_dif)

//gera mapa de diferença
// (EN) Build difference map for the selected class.
var img_dif = diferenca(img_antes,img_depois,classe)//.clip(limite)

//gera mapa de diferença clase 2
// (EN) Build difference map for the secondary class.
var img_dif2 = diferenca(img_antes,img_depois,classe2)

// (EN) Add baseline and comparison layers to the Map.
Map.addLayer(assetId1.clip(limite), vis1, 'Col' + col_anterior + 'filtrada '+ ano_dif, false);
Map.addLayer(assetId2.clip(limite), vis1, 'Col ' + col + ' v'+ version_filtro + ' ' + ano_dif, false);
Map.addLayer(assetId3.clip(limite), vis1, 'Col ' + col + ' v'+ version_multifiltro + ' ' + ano_dif, false);

// (EN) Add difference layers for both classes.
Map.addLayer(img_dif.clip(limite),vischange,'Difference class ' + String(classe) + ' ' + ano_dif, false)
Map.addLayer(img_dif2.clip(limite),vischange,'Difference class ' + String(classe2) + ' ' + ano_dif, false)


// -----------------------------------------------------------------------------
// YEAR 2 COMPARISON (ano2)
// -----------------------------------------------------------------------------

var ano_dif = ano2//'2000'
var vis1 = {'bands': ['classification_'+ ano_dif],'min': 0, 'max': 45,  'palette': palette};

// (EN) For ano2, "before" is assetId1 (Collection 4) and "after" is assetId3 (C5 multifilter).
var img_antes  = assetId1.select('classification_'+ ano_dif)
//Remapeo para Chaco
//var img_antes = img_antes.remap([3, 9, 11, 12,15, 19, 22, 33], [3, 9, 11, 12,15, 18, 22, 33])
var img_depois = assetId3.select('classification_'+ ano_dif)

var img_dif = diferenca(img_antes,img_depois,classe)//.clip(limite)
var img_dif2 = diferenca(img_antes,img_depois,classe2)

Map.addLayer(assetId1.clip(limite), vis1, 'Col ' + col_anterior + ' '+ ano_dif, false);
Map.addLayer(assetId2.clip(limite), vis1, 'Col ' + col + ' v '+ version_filtro + ' ' + ano_dif, false);
Map.addLayer(assetId3.clip(limite), vis1, 'Col ' + col + ' v '+ version_multifiltro + ' ' + ano_dif, false);
Map.addLayer(img_dif.clip(limite),vischange,'Difference class ' + String(classe) + ' ' + ano_dif, false)
Map.addLayer(img_dif2.clip(limite),vischange,'Difference class ' + String(classe2) + ' ' + ano_dif, false)


// -----------------------------------------------------------------------------
// YEAR 3 COMPARISON (ano3)
// -----------------------------------------------------------------------------

var ano_dif = ano3//'2003'
var vis1 = {'bands': ['classification_'+ ano_dif],'min': 0, 'max': 45,  'palette': palette};

// (EN) For ano3, "before" is assetId2 (filtered C5) and "after" is assetId3 (multifilter C5).
var img_antes  = assetId2.select('classification_'+ ano_dif)
//Remapeo para Chaco
//var img_antes = img_antes.remap([3, 9, 11, 12,15, 19, 22, 33], [3, 9, 11, 12,15, 18, 22, 33])
var img_depois = assetId3.select('classification_'+ ano_dif)

var img_dif = diferenca(img_antes,img_depois,classe)//.clip(limite)
var img_dif2 = diferenca(img_antes,img_depois,classe2)

Map.addLayer(assetId1.clip(limite), vis1, 'Col ' + col_anterior + ' '+ ano_dif, false);
Map.addLayer(assetId2.clip(limite), vis1, 'Col ' + col + ' v'+ version_filtro + ' ' + ano_dif, false);
Map.addLayer(assetId3.clip(limite), vis1, 'Col ' + col + ' v'+ version_multifiltro + ' ' + ano_dif, false);
Map.addLayer(img_dif.clip(limite),vischange,'Difference class ' + String(classe) + ' ' + ano_dif, false)
Map.addLayer(img_dif2.clip(limite),vischange,'Difference class ' + String(classe2) + ' ' + ano_dif, false)


// -----------------------------------------------------------------------------
// YEAR 4 COMPARISON (ano4)
// -----------------------------------------------------------------------------

var ano_dif = ano4//'2020'
var vis1 = {'bands': ['classification_'+ ano_dif],'min': 0, 'max': 45,  'palette': palette};

// (EN) For ano4, "before" is assetId2 (filtered C5) and "after" is assetId3 (multifilter C5).
var img_antes  = assetId2.select('classification_'+ ano_dif)
//Remapeo para Chaco
//var img_antes = img_antes.remap([3, 9, 11, 12,15, 19, 22, 33], [3, 9, 11, 12,15, 18, 22, 33])
var img_depois = assetId3.select('classification_'+ ano_dif)

var img_dif = diferenca(img_antes,img_depois,classe)//.clip(limite)
var img_dif2 = diferenca(img_antes,img_depois,classe2)

Map.addLayer(assetId1.clip(limite), vis1, 'Col ' + col_anterior + ' '+ ano_dif, false);
Map.addLayer(assetId2.clip(limite), vis1, 'Col ' + col + ' v'+ version_filtro + ' ' + ano_dif, false);
Map.addLayer(assetId3.clip(limite), vis1, 'Col ' + col + ' v'+ version_multifiltro + ' ' + ano_dif, false);
Map.addLayer(img_dif.clip(limite),vischange,'Difference class ' + String(classe) + ' ' + ano_dif, false)
Map.addLayer(img_dif2.clip(limite),vischange,'Difference class ' + String(classe2) + ' ' + ano_dif, false)


// -----------------------------------------------------------------------------
// Region outline / map framing
// -----------------------------------------------------------------------------

// (EN) Create an outline layer for the region boundaries (visual reference).
var blank = ee.Image(0).mask(0);
var outline = blank.paint(limite, 'AA0000', 2); 
var visPar = {'palette':'000000','opacity': 0.6};
Map.addLayer(outline, visPar, 'Region boundary')
Map.centerObject(limite)


// -----------------------------------------------------------------------------
// External dataset overlay (MNC verano 2021)
// -----------------------------------------------------------------------------

// MNC verano 2021 
// (EN) Optional overlay: MNC summer 2021 map (external image collection mosaic).
var MAPA2 = ee.ImageCollection("users/deabelle/MNC_verano2021_V1/RF_V1_FT2E_remap_JSS_M_JV_SB")
var mnc2 = MAPA2.mosaic()

// (EN) Palette for the MNC map (class-dependent).
var palette_MNCv = [
  '#ffffff',    '#ffffff'   ,'#ffffff',     '#ffffff',     '#ffffff',    '#955f20',    '#612517','#ffffff','#ffffff','#ffffff', '#0042ff', 
  '#339820'   ,'#a41de2',     '#f022db',    '#fcc1b3',     '#b7b9bd',    '#fbff05',   '#1d1e33' ,'#1e0f6b','#a32102','#000000',   
  '#646b63'   ,'#e6f0c2',     '#612517',    '#94d200',     '#ffffff',     '#FF5050',     '#ffffff',     '#6699FF',     '#ffffff',     '#ffffff',
  '#ffffff', 
 ]

Map.addLayer(mnc2, {min:0, max:31, palette: palette_MNCv}, 'MNC summer 2021', false);


// -----------------------------------------------------------------------------
// Time series inspector tools and legend
// -----------------------------------------------------------------------------

// Ver serie de tiempo
// (EN) Load legend utilities + time-series helper functions for interactive inspection.
var utils = require("users/schirmbeckj/PampaTriNacional:Colecion_04/getlegend_Pampa_c4")
var ts_tools = require("users/schirmbeckj/PampaTriNacional:Utils/time_series.js")

// (EN) Console message describing how to interpret the difference maps.
print(
  'Difference maps. Comparison between Col' + col_anterior + ' and Col' + col + ' (filtered versions).\n' +
  'Red = class loss in Col' + col + '.\n' +
  'Yellow = class gain in Col' + col + '.\n' +
  'Gray = class remains the same.'
)

var palette = require('users/mapbiomas/modules:Palettes.js').get('classification5');


// -----------------------------------------------------------------------------
// OPTIONAL: Interactive "class over time" chart on map click
// -----------------------------------------------------------------------------
if (ver_grafico == 1){

// (EN) Chart object: builds a black background “inspector” plot that shows
// the class value through time for the clicked pixel (band names are years).
var Chart = {

    // (EN) Google Charts options controlling the chart style and axes.
    options: {
        'title': 'Inspector',
        'legend': 'none',
        'chartArea': { left: 30, right: 2 },
        'titleTextStyle': { color: '#ffffff', fontSize: 10, bold: true, italic: false },
        'tooltip': { textStyle: { fontSize: 10 } },
        'backgroundColor': '#21242E',
        'pointSize': 6,
        'crosshair': {
            trigger: 'both',
            orientation: 'vertical',
            focused: { color: '#dddddd' }
        },
        'hAxis': {
            // (EN) X axis shows years (band names remapped from 'classification_YYYY' to 'YYYY').
            slantedTextAngle: 90,
            slantedText: true,
            textStyle: { color: '#ffffff', fontSize: 8, fontName: 'Arial', bold: false, italic: false },
            titleTextStyle: { color: '#ffffff', fontSize: 10, fontName: 'Arial', bold: true, italic: false },
            viewWindow: { max: 39, min: 0 },
            gridlines: { color: '#21242E', interval: 1 },
            minorGridlines: { color: '#21242E' }
        },
        'vAxis': {
            // (EN) Y axis: class numeric code for each year.
            title: 'Class',
            textStyle: { color: '#ffffff', fontSize: 10, bold: false, italic: false },
            titleTextStyle: { color: '#ffffff', fontSize: 10, bold: false, italic: false },
            viewWindow: { max: 50, min: 0 },
            gridlines: { color: '#21242E', interval: 2 },
            minorGridlines: { color: '#21242E' }
        },
        'lineWidth': 0,
        'height': '150px',
        'margin': '0px 0px 0px 0px',
        'series': { 0: { color: '#21242E' } },
    },

    // (EN) Placeholders for UI assets.
    assets: { image: null, imagef: null },

    // (EN) Runtime data (selected image, click point, etc.).
    data: { image: null, imagef: null, point: null },

    // (EN) Legend mapping class codes -> color/label (for tooltips + point style).
    legend: require('users/schirmbeckj/PampaTriNacional:Colecion_04/legend_Pampa_c4').legend
,

    // (EN) Loads the dataset used for the inspector chart.
    // Here it uses assetId2 (Collection 5 filtered).
    loadData: function () {
        Chart.data.image = assetId2;
//        Chart.data.imagef = count_nat;
    },

    // (EN) Entry point to initialize chart.
    init: function () {
        Chart.loadData();
        Chart.ui.init();
    },

    // (EN) Samples the clicked point for all bands in the image.
    getSamplePoint: function (image, points) {
        var sample = image.sampleRegions({
            'collection': points,
            'scale': 30,
            'geometries': true
        });
        return sample;
    },

    ui: {

        // (EN) Initialize UI components and click handlers.
        init: function () {
            Chart.ui.form.init();
            Chart.ui.activateMapOnClick();
        },

        // (EN) On map click: extract classification values through time and refresh the chart.
        activateMapOnClick: function () {

            Map.onClick(function (coords) {
                var point = ee.Geometry.Point(coords.lon, coords.lat);

                // (EN) Get band names (e.g., classification_1985, classification_1986, ...)
                var bandNames = Chart.data.image.bandNames();

                // (EN) Rename bands to the year only (split on "_" and take [1]).
                var newBandNames = bandNames.map(function (bandName) {
                    var name = ee.String(ee.List(ee.String(bandName).split('_')).get(1));
                    return name;
                });

                var image = Chart.data.image.select(bandNames, newBandNames);

                // (EN) Inspect and refresh the chart.
                Chart.ui.inspect(Chart.ui.form.chartInspector, image, point, 1.0);
            });

            // (EN) Change cursor to indicate inspection mode.
            Map.style().set('cursor', 'crosshair');
        },

        // (EN) Converts sampled point data into a Google Chart datatable
        // with point styling and tooltips (color + class name from legend).
        refreshGraph: function (chart, sample, opacity) {

            sample.evaluate(function (featureCollection) {

                if (featureCollection !== null) {

                    var pixels = featureCollection.features.map(function (features) {
                        return features.properties;
                    });

                    var bands = Object.getOwnPropertyNames(pixels[0]);

                    // (EN) Build table rows: [year, classValue]
                    var dataTable = bands.map(function (band) {
                        var value = pixels.map(function (pixel) {
                            return pixel[band];
                        });
                        return [band].concat(value);
                    });

                    // (EN) Add style + tooltip based on legend.
                    dataTable = dataTable.map(function (point) {
                        var color = Chart.legend[point[1]].color;
                        var name = Chart.legend[point[1]].label;
                        var value = String(point[1]);

                        var style = 'point {size: 4; fill-color: ' + color + '; opacity: ' + opacity + '}';
                        var tooltip = 'year: ' + point[0] + ', class: [' + value + '] ' + name;

                        return point.concat(style).concat(tooltip);
                    });

                    // (EN) Header row defines columns + roles.
                    var headers = [
                        'serie',
                        'id',
                        { 'type': 'string', 'role': 'style' },
                        { 'type': 'string', 'role': 'tooltip' }
                    ];

                    dataTable = [headers].concat(dataTable);
                    chart.setDataTable(dataTable);

                }
            });
        },

        // (EN) Adds or updates a point layer on the map to mark the clicked location.
        refreshMap: function () {

            var pointLayer = Map.layers().filter(function (layer) {
                return layer.get('name') === 'Point';
            });

            if (pointLayer.length > 0) {
                Map.remove(pointLayer[0]);
                Map.addLayer(Chart.data.point, { color: 'red' }, 'Point');
            } else {
                Map.addLayer(Chart.data.point, { color: 'red' }, 'Point');
            }

        },

        // (EN) Inspects a clicked point: sample values, update point marker, update chart.
       inspect: function (chart, image, point, opacity) {

           Chart.data.point = Chart.getSamplePoint(image, ee.FeatureCollection(point));
 
           Chart.ui.refreshMap(Chart.data.point);
           Chart.ui.refreshGraph(chart, Chart.data.point, opacity);

       },

        form: {

            // (EN) Build the chart panel and attach it to the map.
            init: function () {

                Chart.ui.form.panelChart.add(Chart.ui.form.chartInspector);

                Chart.options.title = 'Filtered classification';
                Chart.ui.form.chartInspector.setOptions(Chart.options);

                Map.add(Chart.ui.form.panelChart);
            },

            // (EN) Panel styling: bottom-left inspector.
            panelChart: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'width': '450px',
                    'position': 'bottom-left',
                    'margin': '0px 0px 0px 0px',
                    'padding': '0px',
                    'backgroundColor': '#21242E'
                },
            }),

            // (EN) Dummy chart to avoid empty initialization errors.
            chartInspector: ui.Chart([
                ['Serie', ''],
                ['', -1000], // smaller than min to keep it hidden initially
            ]),
        }
    }
};

Chart.init();
}


// -----------------------------------------------------------------------------
// Secondary panel: legend + optional time-series plot using ts_tools
// -----------------------------------------------------------------------------

var panel = null;
var chk_refresh_plot_flag = null;

// (EN) Creates a panel with a checkbox to control whether the time-series plot updates on click.
// When enabled, clicking the map regenerates the plot for the new point.
var get_panel_chart_ts = function(){
  
  Map.onClick(function(point){
    var punto = ee.Geometry.Point([point["lon"], point["lat"]]);
    
    if(chk_refresh_plot_flag.getValue()){
      panel.remove(panel.widgets().get(1))
      panel.insert(1, ts_tools.get_time_serie_plot(punto));
    }
    
  });
  
  chk_refresh_plot_flag = ui.Checkbox("Update time series?")
  
  var panel = ui.Panel({
    widgets: [chk_refresh_plot_flag],
    layout: ui.Panel.Layout.Flow('vertical')
  })
  return panel
}

// (EN) Main UI panel: legend + time series control panel.
panel = ui.Panel({
  widgets: [utils.get_legend("Clases MB Pampa"),
  get_panel_chart_ts()]
  
})
ui.root.add(panel)
