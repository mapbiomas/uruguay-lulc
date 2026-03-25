/**
 * @name mapbiomas-mosaic-toolkit-grids
 *  
 * @author
 *  1. João Siqueira  
 *  2. Marcos Rosa
 *  3. Mapbiomas Team
 *  4. Juliano Schirmbeck / Santiago Banchero
 * 
 * @version
 *  1.0.0 | 2020-02-04 | First release.
 *  1.1.0 | 2020-05-08 | Update thumbnails and improve mosaic logic.
 *  1.1.1 | 2021-02-01 | Fix minor bugs.
 *  1.1.2 | 2021-02-11 | Use grids.
 *  1.1.3
 *  1.1.4 |2022-02-18| atualizadas areas Chaco, PampaTri, AFTri
 *                      mascara de nuvens somente com bitquality
 *                      não aplica marcara da regiao
 *                      efetua buffer de -5000 por carta
 */

/**
 * External modules used by this app:
 * - bns: band name mapping/standardization for Landsat sensors
 * - csm: cloud and shadow masking utilities
 * - col: collection builder/filtering wrapper (Landsat)
 * - dtp: set band data types to MapBiomas conventions
 * - ind: spectral index calculators (NDVI, NDWI, EVI2, etc.)
 * - mis: miscellaneous helpers (slope, texture/entropy, etc.)
 * - mos: mosaic builder (median/percentiles logic)
 * - sma: SMA unmixing + derived indices (NDFI, etc.)
 */
var bns = require('users/schirmbeckj/PampaTriNacional:Colecion_02/util/BandNames_v02.js');
var csm = require('users/schirmbeckj/PampaTriNacional:Colecion_02/util/CloudAndShadowMasking_v02.js');
var col = require('users/schirmbeckj/PampaTriNacional:Colecion_02/util/Collection_v02.js');
var dtp = require('users/schirmbeckj/PampaTriNacional:Colecion_02/util/DataType_v02.js');
var ind = require('users/mapbiomas/mapbiomas-mosaics:modules/SpectralIndexes.js');
var mis = require('users/mapbiomas/mapbiomas-mosaics:modules/Miscellaneous.js');
var mos = require('users/schirmbeckj/PampaTriNacional:Colecion_02/util/Mosaic_v02.js');
var sma = require('users/mapbiomas/mapbiomas-mosaics:modules/SmaAndNdfi.js');

/**
 * List of projects available in the UI dropdown.
 * Each entry defines:
 * - outputAsset: destination Asset folder for mosaics
 * - outputAssetBlackList: destination Asset folder for BlackList exports
 * - regionsAsset: raster asset storing region masks/IDs
 * - landsatMaskAsset: auxiliary collection used only for scene visualization overlay
 * - grids: vector asset with grid tiles ("cartas") and attribute 'grid_name'
 * - regionsList: allowed region IDs (strings) shown in the UI selector
 */
var projectInfo = [
    {
        label: 'Atlantic Forest Trinacional Col 2',
        value: {
            projectName: 'mapbiomas-af-trinacional',
            outputAsset: 'projects/mapbiomas_af_trinacional/MOSAICS/workspace-c2',
            outputAssetBlackList: 'projects/mapbiomas_af_trinacional/MOSAICS/workspace-c2/BlackList',
            regionsAsset: 'projects/mapbiomas_af_trinacional/ANCILLARY_DATA/RASTER/regions',
            landsatMaskAsset: 'projects/mapbiomas-workspace/AUXILIAR/landsat-mask',
            grids: 'projects/mapbiomas_af_trinacional/ANCILLARY_DATA/VECTOR/Cartas_BA_col2_v2',
            regionsList: [
                'AFTN',
            ]
        }
    },
    {
        label: 'Brazil',
        value: {
            projectName: 'mapbiomas-brazil',
            outputAsset: 'projects/nexgenmap/MapBiomas2/LANDSAT/mosaics-revised',
            regionsAsset: 'projects/mapbiomas-workspace/AUXILIAR/RASTER/regions',
            landsatMaskAsset: 'projects/mapbiomas-workspace/AUXILIAR/landsat-mask',
            regionsList: [
                'AMAZONIA',
                'CAATINGA',
                'CERRADO',
                'MATAATLANTICA',
                'PAMPA',
                'PANTANAL'
            ]
        }
    },
    {
        label: 'Indonesia',
        value: {
            projectName: 'mapbiomas-indonesia',
            outputAsset: 'projects/mapbiomas-indonesia/MOSAICS/workspace-c1',
            regionsAsset: 'projects/mapbiomas-indonesia/ANCILLARY_DATA/RASTER/regions',
            landsatMaskAsset: 'projects/mapbiomas-workspace/AUXILIAR/landsat-mask',
            regionsList: [
                'REGION-100',
                'REGION-200',
                'REGION-300',
                'REGION-400',
                'REGION-500'
            ]
        }
    },
    {
        label: 'Pampa Trinacional',
        value: {
            projectName: 'mapbiomas-pampa-trinacional',
            outputAsset: 'projects/MapBiomas_Pampa/MOSAICS/mosaics_c2',
            outputAssetBlackList: 'projects/MapBiomas_Pampa/MOSAICS/BlackList',
            regionsAsset: 'projects/mapbiomas-workspace/AUXILIAR/RASTER/regions',
            landsatMaskAsset: 'projects/mapbiomas-workspace/AUXILIAR/landsat-mask',
            grids: 'projects/MapBiomas_Pampa/ANCILLARY_DATA/CartasPampaTrinacional_col2', // Banchero
            
            regionsList: [
                'PAMPA-ARGENTINA-2',
                'PAMPA-BRASIL-2',
                'PAMPA-URUGUAY-2',
            ]
        }
    },
    {
        label: 'Chaco',
        value: {
            projectName: 'mapbiomas-pampa-trinacional',//'mapbiomas-chaco',
            outputAsset: 'projects/mapbiomas-chaco/COLECCION-3/MOSAICS/workspace-c3',
            regionsAsset: 'projects/mapbiomas-chaco/COLECCION-3/ANCILLARY_DATA/RASTER/regions',
            landsatMaskAsset: 'projects/mapbiomas-chaco/DATOS_AUXILIARES/landsat-mask',
            outputAssetBlackList: 'projects/mapbiomas-chaco/COLECCION-3/MOSAICS/BlackList',
            grids: 'projects/mapbiomas-chaco/BASE/cartas-chaco-col-3', // Banchero
            regionsList: [
                'chaco',
            ]
        }
    }
];

/**
 * Main application object
 * - options: global state / settings used across the pipeline and UI
 * - init/loadFeatures/...: processing pipeline to build and export mosaics
 * - ui: all UI widgets and callbacks
 */
var App = {

    options: {

        /**
         * Date ranges used by the app:
         * - amp: full-year window used to fetch/filter scenes (annual "amplitude")
         * - med: sub-window used for mosaic statistics (median/percentiles) within a year
         */
        dates: {
            amp: {
                t0: '2010-01-01',
                t1: '2010-12-31'
            },
            med: {
                t0: '2010-05-01',
                t1: '2010-10-30'
            },

        },
        
        // Starting month for the 'med' mosaic window (UI-controlled)
        montht0: '01',
        
        // Ending month for the 'med' mosaic window (UI-controlled)
        montht1: '12',

        // Will hold the processed ImageCollection (after masks + indices)
        collection: null,

        // Will hold the final mosaic image (after mosaicking + band typing)
        mosaic: null,

        // Output version tag (used in asset name)
        version: 8,

        // Grid tile name (must match 'grid_name' attribute in the grids FeatureCollection)
        gridName: 'SH-21-Y-B',

        // Max cloud cover filter used when requesting Landsat scenes
        cloudCover: 90,

        // Region raster (selected region mask/ID image)
        region: null,

        // Landsat mask collection (aux visualization layer in map)
        landsatMask: null,

        // Selected region id string (from UI list)
        regionId: null,

        // Buffer applied when clipping/exporting grid geometry
        buffer: 100,

        assets: {
            // Path to the grid vector asset; set when a project/region is selected
            // 'grids': 'projects/MapBiomas_Pampa/ANCILLARY_DATA/CartasPampaTrinacional_col2',
            //'grids': 'projects/mapbiomas-chaco/BASE/cartas-chaco-col-3',
            grids: null  // Banchero
        },
        
        // Selected project configuration object (from projectInfo list)
        projectInfo: null,

        // List of scene IDs to exclude (system:index); updated by UI checkboxes
        blackList: [],

        // List of scene IDs to include; updated by UI checkboxes
        imageList: [],

        // UI containers for thumbnails (each holds a thumbnail + checkbox)
        thumbnailList: [],

        /**
         * Thumbnail UI style/config:
         * - width: image width used for thumbnails
         * - border/colors/labelStyle: cosmetics
         */
        thumbnail: {
            width: 200,
            borderStyle: '4px solid rgba(97, 97, 97, 0.05)',

            colors: {
                cyan: '#24C1E0',
                background: '#eb9834',
                gray: '#F8F9FA'
            },

            labelStyle: {
                fontWeight: '50',
                textAlign: 'center',
                fontSize: '11px',
                backgroundColor: '#f2f2f2',
                stretch: 'horizontal',
            },

        },

        // Selected collection label (e.g., 'Landsat-8 SR') from the UI
        collectionid: '',

        /**
         * Mapping from UI label -> one or more EE collection IDs.
         * If two IDs were provided, the second would be used as a secondary mosaic to fill gaps.
         */
        collectionIds: {
            'Landsat-4 SR': [
                'LANDSAT/LT04/C01/T1_SR'
            ],
            'Landsat-5 SR': [
                //'LANDSAT/LT05/C01/T1_SR'
                'LANDSAT/LT05/C02/T1_L2'
            ],
            'Landsat-7 SR': [
                //LANDSAT/LE07/C01/T1_SR'
                'LANDSAT/LE07/C02/T1_L2'
            ],
            'Landsat-8 SR': [
                //'LANDSAT/LC08/C01/T1_SR'
                'LANDSAT/LC08/C02/T1_L2'
            ],
            // 'Landsat-5 SR [+L7]': [
            //     'LANDSAT/LT05/C01/T1_SR',
            //     'LANDSAT/LE07/C01/T1_SR'
            // ],
            // 'Landsat-7 SR [+L5]': [
            //     'LANDSAT/LE07/C01/T1_SR',
            //     'LANDSAT/LT05/C01/T1_SR'
            // ],

        },

        /**
         * SMA endmembers per sensor/collection label.
         * Endmembers define the spectral signatures used by SMA unmixing.
         */
        endmembers: {
            'Landsat-4 SR': sma.endmembers['landsat-4'],
            'Landsat-5 SR': sma.endmembers['landsat-5'],
            'Landsat-7 SR': sma.endmembers['landsat-7'],
            'Landsat-8 SR': sma.endmembers['landsat-8'],
            'Landsat-5 SR [+L7]': sma.endmembers['landsat-5'],
            'Landsat-7 SR [+L5]': sma.endmembers['landsat-7'],
        },

        /**
         * QA band + bitmask configuration per collection label.
         * Currently using QA_PIXEL and bit 2^3 (as configured in the masking module).
         */
        bqaValue: {
            'Landsat-4 SR': ['QA_PIXEL', Math.pow(2, 3)],
            'Landsat-5 SR': ['QA_PIXEL', Math.pow(2, 3)],
            'Landsat-7 SR': ['QA_PIXEL', Math.pow(2, 3)],
            'Landsat-8 SR': ['QA_PIXEL', Math.pow(2, 3)],
            'Landsat-5 SR [+L7]': ['QA_PIXEL', Math.pow(2, 3)],
            'Landsat-7 SR [+L5]': ['QA_PIXEL', Math.pow(2, 3)],
        },

        /**
         * Mapping from EE collection ID -> short sensor key used by bns.get(...)
         */
        bandIds: {
            'LANDSAT/LT04/C01/T1_SR': 'l4',
            'LANDSAT/LT05/C02/T1_L2': 'l5',
            'LANDSAT/LE07/C02/T1_L2': 'l7',
            'LANDSAT/LC08/C02/T1_L2': 'l8',
        },

        /**
         * Last day of each month used to assemble med.t1 date string.
         * (Note: Feb is fixed at 28 here; leap years are not handled.)
         */
        lastMonthDay: {
            '01': '31',
            '02': '28',
            '03': '31',
            '04': '30',
            '05': '31',
            '06': '30',
            '07': '31',
            '08': '31',
            '09': '30',
            '10': '31',
            '11': '30',
            '12': '31'
        },

        /**
         * Visualization parameters for thumbnails and map.
         * Using SWIR1/NIR/RED as a standard false-color composite.
         */
        visParams: {
            bands: 'swir1,nir,red',
            gain: [0.08, 0.06, 0.2],   
            gamma: 0.85
        },

    },

    /**
     * App entry point: initializes UI.
     * (FeatureCollection grids are loaded after region selection, because the grids asset depends on the project.)
     */
    init: function () {

        App.ui.init();
        //App.loadFeatures(); // Banchero

    },

    /**
     * Loads the grids FeatureCollection from App.options.assets.grids into App.options.features.
     * This is required before calling getGeometries().
     */
    loadFeatures: function () {

        App.options.features = ee.FeatureCollection(App.options.assets.grids);

    },

    /**
     * Applies scaling factors for Landsat Collection 2 Level-2 products:
     * - Optical SR bands: scale + offset then *10000 (to preserve integer storage)
     * - Thermal band: depends on sensor (TM/ETM use ST_B6, OLI/TIRS use ST_B10)
     * Returns an int16 image preserving key properties.
     */
    applyScaleFactors : function (image) {
      var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2).multiply(10000);
      var thermalBand = 
          ee.Algorithms.If(
          ee.String(image.get('SENSOR_ID')).compareTo('TM').eq(0), 
              image.select('ST_B6').multiply(0.00341802).add(149.0).multiply(10),  //Op1
              ee.Algorithms.If(ee.String(image.get('SENSOR_ID')).compareTo('ETM').eq(0), 
                  image.select('ST_B6').multiply(0.00341802).add(149.0).multiply(10),  // Op2
                  image.select('ST_B10').multiply(0.00341802).add(149.0).multiply(10))) // Op3
          
      return image.addBands(opticalBands, null, true)
           .addBands(thermalBand, null, true).int16()
           .copyProperties(image)
           .copyProperties(image,['system:time_start'])
           .copyProperties(image,['system:index'])
           .copyProperties(image,['system:footprint'])
    },  

    /**
     * Builds cloud/shadow masks using csm.getMasks and applies them to the collection.
     * Current configuration uses ONLY QA-based cloud and shadow masks:
     * - cloudBQA=true, shadowBQA=true
     * Then masks pixels where (cloudBQAMask OR shadowBQAMask) is non-zero.
     */
    applyCloudAndSahdowMask: function (collection) {

        var collectionWithMasks = csm.getMasks({
            'collection': collection,
            'cloudBQA': true,    // cloud mask using pixel QA
            'cloudScore': false,  // cloud mas using simple cloud score
            'shadowBQA': true,   // cloud shadow mask using pixel QA
            'shadowTdom': false,  // cloud shadow using tdom
            'zScoreThresh': -1,
            'shadowSumThresh': 4000,
            'dilatePixels': 4,
            'cloudHeights': [200, 700, 1200, 1700, 2200, 2700, 3200, 3700, 4200, 4700],
            'cloudBand': 'cloudBQAMask' //'cloudScoreMask' or 'cloudBQAMask'
        });

        // Remove clouds/shadows by masking out pixels flagged by any QA masks
        var collectionWithoutClouds = collectionWithMasks.map(
            function (image) {
                return image.mask(
                    image.select([
                        'cloudBQAMask',
                        //'cloudScoreMask',
                        'shadowBQAMask',
                        //'shadowTdomMask'
                    ]).reduce(ee.Reducer.anyNonZero()).eq(0)
                );
                
            }
        );

        return collectionWithoutClouds;
    },

    /**
     * Masks an image using the selected region raster (>=0) and applies selfMask().
     * NOTE: this is not currently applied in the pipeline (the call is commented out later).
     */
    applyRegionMask: function (image) {

        return image.mask(App.options.region.gte(0)).selfMask();
    },

    /**
     * Gets the geometry of the selected grid tile by filtering grids (features) on 'grid_name'.
     * Stores result in App.options.geometry.
     */
    getGeometries: function () {

        App.options.geometry = App.options.features
            .filterMetadata('grid_name', 'equals', App.options.gridName)
            .geometry();

    },

    /**
     * Adds metadata to the mosaic image for traceability (year, region, collection, etc.).
     * - black_list and image_list are stored as comma-separated strings.
     */
    setProperties: function (mosaic) {

        return mosaic
            .set('year', App.options.year)
            .set('region', App.options.regionId)
            .set('collection_id', App.options.collectionid)
            .set('grid_name', App.options.gridName)
            .set('cloudCover', App.options.cloudCover)
            .set('black_list', App.options.blackList.join(','))
            .set('image_list', App.options.imageList.join(','));
    },
   
    /**
     * Full preprocessing pipeline for a Landsat collection ID:
     * 1) Build a query object (geometry + annual dates + cloud cover)
     * 2) Fetch band name mapping (sensor-specific)
     * 3) Retrieve the collection (col.getCollection)
     * 4) Apply Collection 2 scale factors
     * 5) Select/rename bands + remove scenes listed in blackList (system:index)
     * 6) Apply cloud/shadow masking
     * 7) Keep only spectral base bands
     * 8) Apply per-scene inward buffer (-5000) on each scene footprint to avoid edge artifacts
     * 9) Apply SMA fractions + derived SMA indices
     * 10) Compute additional spectral indices
     * Returns a processed ImageCollection ready for mosaicking.
     */
    processCollection: function (collectionid) {

        // Base spectral bands used downstream (after renaming)
        var spectralBands = ['blue', 'red', 'green', 'nir', 'swir1', 'swir2'];

        // Parameters used by col.getCollection
        var objLandsat = {
            'collectionid': collectionid,
            'geometry': App.options.geometry,
            'dateStart': App.options.dates.amp.t0,
            'dateEnd': App.options.dates.amp.t1,
            'cloudCover': App.options.cloudCover,
        };

        // Retrieve mapping: original band names -> standardized names
        var bands = bns.get(App.options.bandIds[collectionid]);

        // Fetch the raw collection from the helper module
        var collection = col.getCollection(objLandsat)
        
        // Debug: print first image BEFORE scaling
        print('antes',collection.first())
        
        // Apply scaling factors for C2 L2
        collection = collection.map(App.applyScaleFactors)

        // Debug: print first image AFTER scaling
        print('depois',collection.first())

        // Select/rename bands and remove scenes listed in blackList
        collection = collection.select(bands.bandNames, bands.newNames)
            .filter(ee.Filter.inList('system:index', App.options.blackList).not());

        // Apply cloud/shadow mask and keep only the spectral bands
        collection = App.applyCloudAndSahdowMask(collection)
            .select(spectralBands);

        // Optional: apply region mask (currently disabled)
        //collection = collection.map(App.applyRegionMask);
        
       // Apply an inward buffer to each scene footprint: buffer(-5000)
       // This removes pixels near the edges of each scene footprint.
       collection = collection.map(function (image) {
          return image.mask(ee.Image(1).clip(image.geometry().buffer(-5000))).selfMask();
       }),

        
        // Apply SMA: adds fraction bands based on the selected endmembers
        collection = collection.map(
            function (image) {
                return sma.getFractions(image,
                    App.options.endmembers[App.options.collectionid]);
            }
        );

        // Compute SMA-derived indices (NDFI, SEFI, WEFI, FNS)
        collection = collection
            .map(sma.getNDFI)
            .map(sma.getSEFI)
            .map(sma.getWEFI)
            .map(sma.getFNS);

        // Compute spectral indices (vegetation, water, cover, etc.)
        collection = collection
            .map(ind.getCAI)
            .map(ind.getEVI2)
            .map(ind.getGCVI)
            .map(ind.getHallCover)
            .map(ind.getHallHeigth)
            .map(ind.getNDVI)
            .map(ind.getNDWI)
            .map(ind.getPRI)
            .map(ind.getSAVI);

        return collection;
    },

    /**
     * Builds the mosaic image from the processed collection:
     * 1) Process primary collection
     * 2) Build mosaic using mos.getMosaic within the med date window
     * 3) If secondary collection exists, build secondary mosaic and unmask gaps
     * 4) Add extra bands (slope, entropy)
     * 5) Set band types according to projectName conventions
     * 6) Attach properties and clip to buffered grid bounds
     */
    makeMosaic: function () {

        // Process the primary collection (first entry)
        App.options.collection = App.processCollection(
            App.options.collectionIds[App.options.collectionid][0]);

        // Build a mosaic for the med window using NDVI as reference and dry/wet percentiles
        var mosaic = mos.getMosaic({
            'collection': App.options.collection,
            'dateStart': App.options.dates.med.t0,
            'dateEnd': App.options.dates.med.t1,
            'bandReference': 'ndvi',
            'percentileDry': 25,
            'percentileWet': 75,
        });

        // Debug: print the mosaic object (bands, properties)
        print(mosaic);

        // Fill NoData of primary mosaic with a secondary mosaic, if configured
        if (App.options.collectionIds[App.options.collectionid].length == 2) {
            var collection = App.processCollection(
                App.options.collectionIds[App.options.collectionid][1]);

            var secondaryMosaic = mos.getMosaic({
                'collection': collection,
                'dateStart': App.options.dates.med.t0,
                'dateEnd': App.options.dates.med.t1,
                'bandReference': 'ndvi',
                'percentileDry': 25,
                'percentileWet': 75,
            });

            // Unmask gaps using the secondary mosaic
            mosaic = mosaic.unmask(secondaryMosaic);

            // Merge collections so the image gallery includes both sources
            App.options.collection = App.options.collection.merge(collection);
        }

        // Add terrain slope band
        mosaic = mis.getSlope(mosaic);

        // Add texture/entropy band
        mosaic = mis.getEntropyG(mosaic);

        // Enforce band data types required by the project
        App.options.mosaic = dtp.setBandTypes(mosaic, App.options.projectInfo.projectName);

        // Attach metadata and clip mosaic to buffered grid bounding geometry
        App.options.mosaic = App.setProperties(App.options.mosaic)
            .clip(
                App.options.geometry
                    .buffer(App.options.buffer)
                    .bounds()
            );

    },

    /**
     * Exports the mosaic to an Earth Engine Asset.
     * Asset name convention: regionId-gridName-year-version
     */
    exportMosaic: function () {

        var name = [
            App.options.regionId,
            App.options.gridName,
            App.options.dates.med.t0.split('-')[0],
            App.options.version
        ].join('-');

        Export.image.toAsset({
            "image": App.options.mosaic,
            "description": name,
            "assetId": App.options.projectInfo.outputAsset + '/' + name,
            "region": App.options.geometry.buffer(App.options.buffer).bounds(),
            "scale": 30,
            "maxPixels": 1e13
        });

    },

    /**
     * Exports the current blackList as a FeatureCollection to an Asset.
     * Each scene ID becomes a Feature with properties; geometry is a dummy point [0,0].
     * This is intended as metadata storage, not spatial data.
     */
    exportBlackList: function(){
      var bl_export = ee.List(App.options.blackList).map(function(i){
        return ee.Feature(ee.Geometry.Point([0,0]),{}).set({
          regionID: App.options.regionId,
          name: i,
          year: App.options.dates.med.t0.split('-')[0],
          grid_name: App.options.gridName
          
        })
      })
      
      var name = [
            App.options.regionId,
            App.options.gridName,
            App.options.dates.med.t0.split('-')[0],
            App.options.version
        ].join('-');
      
      // Debug: print the list of features before export
      print(bl_export)
      
      Export.table.toAsset({
            "collection": ee.FeatureCollection(bl_export),
            "description": name,
            "assetId": App.options.projectInfo.outputAssetBlackList + '/' + name,
            
        });
      
    },

    /**
     * UI namespace: contains UI initialization, panel building, and all callbacks.
     */
    ui: {

        /**
         * Initializes the UI form layout.
         */
        init: function () {

            App.ui.form.init();

        },

        /**
         * Resets dynamic lists and clears the map.
         * Used before running a new search/mosaic cycle.
         */
        reset: function () {

            App.options.blackList = [];
            App.options.imageList = [];

            App.ui.form.map.clear();
        },

        /**
         * Rebuilds the Region selector based on the selected project configuration.
         * On region change:
         * - sets regionId
         * - loads region raster (regionsAsset/regionId)
         * - loads landsatMask collection (aux visualization)
         * - sets grids asset path and loads features (grids)
         */
        updateRegionList: function () {

            App.ui.form.panelFilterContainer.remove(App.ui.form.selectRegion);

            App.options.region = null;

            App.ui.form.selectRegion = ui.Select({
                'items': ['None'].concat(App.options.projectInfo.regionsList),
                'onChange': function (region) {
                    App.options.regionId = region;
                    App.options.region = ee.Image(
                    App.options.projectInfo.regionsAsset + '/' + App.options.regionId);
                    App.options.landsatMask = ee.ImageCollection(App.options.projectInfo.landsatMaskAsset);
                    
                    App.options.assets.grids = App.options.projectInfo.grids // Banchero
                    App.loadFeatures(); // Banchero

                },
                'placeholder': 'Select a region',
                'style': {
                    'stretch': 'horizontal',
                }
            });

            App.ui.form.panelFilterContainer.insert(5, App.ui.form.selectRegion);
        },

        /**
         * Updates amp and med date windows based on year + selected months.
         * - amp: whole year
         * - med: year-montht0-01 to year-montht1-lastDay
         */
        getDates: function () {

            App.options.dates.amp.t0 = App.options.year + '-01-01';
            App.options.dates.amp.t1 = App.options.year + '-12-31';

            App.options.dates.med.t0 = App.options.year + '-' + App.options.montht0 + '-01'// + App.options.lastMonthDay[App.options.montht0];
            //App.options.dates.med.t0 = App.options.year + '-' + App.options.montht0  + App.options.lastMonthDay[App.options.montht0]
            App.options.dates.med.t1 = App.options.year + '-' + App.options.montht1 + '-' + App.options.lastMonthDay[App.options.montht1];

        },

        /**
         * Adds the current mosaic and helper layers to the map:
         * - Mosaic RGB visualization
         * - Grid outline
         * - Scene density overlay (landsatMask.sum)
         * Centers the map over the grid geometry.
         */
        addMosaicToMap: function () {

            App.ui.form.map.clear();

            App.ui.form.map.addLayer(App.options.mosaic, {
                'bands': 'swir1_median,nir_median,red_median',
                'gain': App.options.visParams.gain,
                'gamma': App.options.visParams.gamma
            }, 'Mosaic');

            App.ui.form.map.addLayer(
                ee.FeatureCollection(App.options.geometry).style({
                    'color': 'ff0000',
                    'fillColor': 'ff000000',
                }),
                {
                    'opacity': 0.7,
                }, 'Grid',
                false
            );

            App.ui.form.map.addLayer(App.options.landsatMask.sum(), {
                'min': 0,
                'max': 4,
                'palette': 'ffcccc,ff0000',
                'opacity': 0.2
            }, 'Scenes',
                false
            );

            App.ui.form.map.centerObject(App.options.geometry, 9);

            print("blackList: ", App.options.blackList);
        },

        /**
         * Main UI action: run the full flow to:
         * - reset state
         * - compute dates
         * - get selected grid geometry
         * - build mosaic
         * - build thumbnails selector (scene gallery)
         * - render mosaic and overlays to map
         */
        findImages: function () {

            App.ui.reset();

            App.ui.getDates();

            App.getGeometries();

            // App.getCollectionCloudMask();

            App.makeMosaic();

            App.ui.loadImagesSelector();

            App.ui.addMosaicToMap();

        },

        /**
         * Marks all thumbnails as selected (i.e., include all scenes).
         */
        selectAll: function () {

            App.options.thumbnailList.forEach(
                function (thumbnailContainer) {
                    thumbnailContainer.checkbox.setValue(true, App.ui.updateImageList);
                }
            );

            print("blackList:", App.options.blackList);

        },

        /**
         * Unmarks all thumbnails (i.e., exclude all scenes).
         */
        unselectAll: function () {

            App.options.thumbnailList.forEach(
                function (thumbnailContainer) {
                    thumbnailContainer.checkbox.setValue(false, App.ui.updateImageList);
                }
            );

            print("blackList:", App.options.blackList);
        },

        /**
         * Checkbox callback:
         * - If checked: remove from blackList, add to imageList
         * - If unchecked: remove from imageList, add to blackList
         */
        updateImageList: function (checked, checkbox) {

            var fun = function (imageName) {
                return imageName !== checkbox.imageName;
            };

            if (checked) {
                App.options.blackList = App.options.blackList.filter(fun);
                App.options.imageList.push(checkbox.imageName);
            } else {
                App.options.imageList = App.options.imageList.filter(fun);
                App.options.blackList.push(checkbox.imageName);
            }

        },

        /**
         * Creates a panel with a horizontal flow layout and wrapping enabled.
         * Used to display thumbnails as a grid.
         */
        makeThumbnailGrid: function () {
            return ui.Panel({
                layout: ui.Panel.Layout.flow('horizontal', true),
                style: {
                    stretch: 'vertical',
                    // backgroundColor: App.options.thumbnail.colors.background,
                }
            });
        },

        /**
         * Creates a thumbnail container:
         * - Looks up the image in the processed collection by 'image_id'
         * - Renders a ui.Thumbnail for quick preview
         * - Adds a checkbox labeled with the scene id
         */
        makeThumbnail: function (obj) {

            var thumbnailContainer = ui.Panel({
                "layout": ui.Panel.Layout.flow('vertical'),
                "style": {
                    // backgroundColor: App.options.thumbnail.colors.background,
                    border: App.options.thumbnail.borderStyle,
                    padding: '4px',
                    margin: '5px',
                    width: App.options.thumbnail.width + 35 + 'px',
                },
            });

            var image = ee.Image(App.options.collection
                .filterMetadata('image_id', 'equals', obj.imageName).first());

            var thumbnail = ui.Thumbnail({
                "image": image.visualize(App.options.visParams),
                "params": {
                    "dimensions": App.options.thumbnail.width,
                    "format": 'png'
                },
                "style": {
                    "width": App.options.thumbnail.width + 'px',
                    "maxHeight": App.options.thumbnail.width + 25 + 'px',
                    "backgroundColor": App.options.thumbnail.colors.background,
                }
            });

            thumbnailContainer.add(thumbnail);

            // Checkbox determines whether the scene is included/excluded for mosaicking
            var checkbox = ui.Checkbox({
                "label": obj.imageName,
                "value": true,
                "onChange": App.ui.updateImageList,
                // "disabled": false,
                "style": App.options.thumbnail.labelStyle
            });

            checkbox.imageName = obj.imageName;

            thumbnailContainer.add(checkbox);

            // Store checkbox handle to allow selectAll/unselectAll actions
            thumbnailContainer.checkbox = checkbox;

            return thumbnailContainer;
        },

        /**
         * Builds the image selector panel (gallery):
         * - Collects all 'image_id' values from the collection in the med date window
         * - Evaluates to client-side list to create UI thumbnails
         * - Populates panelImagePicker with thumbnails
         */
        loadImagesSelector: function () {

            var thumbnailGrid = App.ui.makeThumbnailGrid();

            App.options.imageList = ee.List(
                App.options.collection
                    .filterDate(App.options.dates.med.t0, App.options.dates.med.t1)
                    .reduceColumns(ee.Reducer.toList(), ['image_id'])
                    .get('list'));

            App.options.thumbnailList = [];

            App.ui.loadingMsg.show();

            App.options.imageList.evaluate(
                function (imageList) {

                    imageList.forEach(
                        function (imageName) {

                            var thumbnail = App.ui.makeThumbnail({
                                'imageName': imageName,
                            });

                            App.options.thumbnailList.push(thumbnail);

                            thumbnailGrid.add(thumbnail);
                        }
                    );

                    // Note: after evaluate(), App.options.imageList becomes a JS array (client-side)
                    App.options.imageList = imageList;

                    App.ui.loadingMsg.destroy();
                }
            );

            App.ui.form.panelImagePicker.clear();

            App.ui.form.panelImagePicker.add(thumbnailGrid);
        },

        /**
         * Helper to show/hide a "Loading..." message while thumbnails are being built.
         */
        loadingMsg: {

            show: function () {
                App.ui.form.panelImagePickerContainer.add(App.ui.form.msgBox);
            },

            destroy: function () {
                App.ui.form.panelImagePickerContainer.remove(App.ui.form.msgBox);
            }

        },


        form: {

            /**
             * Builds and assembles the full UI layout:
             * - Filter panel (left)
             * - Image gallery panel (middle)
             * - Map + controls panel (right)
             */
            init: function () {

                App.ui.form.panelFilterContainer.add(App.ui.form.labelTitleFilter);
                App.ui.form.panelFilterContainer.add(App.ui.form.panelDiv1);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelProject);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectProject);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelRegion);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectRegion);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelCollection);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectCollection);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelDates);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectYear);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectMontht0);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectMontht1);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelCloudCover);
                App.ui.form.panelFilterContainer.add(App.ui.form.textCloudCover);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelGridName);
                App.ui.form.panelFilterContainer.add(App.ui.form.textGridName);
                App.ui.form.panelFilterContainer.add(App.ui.form.buttonFind);

                App.ui.form.panelImagePickerContainer.add(App.ui.form.labelTitle);
                App.ui.form.panelImagePickerContainer.add(App.ui.form.panelDiv2);
                App.ui.form.panelImagePickerContainer.add(App.ui.form.panelImagePicker);

                App.ui.form.panelMapContainer.add(App.ui.form.panelControl);
                App.ui.form.panelMapContainer.add(App.ui.form.map);

                App.ui.form.panelControl.add(App.ui.form.buttonSelectAll);
                App.ui.form.panelControl.add(App.ui.form.buttonUnselectAll);
                App.ui.form.panelControl.add(App.ui.form.buttonMakeMosaic);
                App.ui.form.panelControl.add(App.ui.form.buttonExportMosaic);
                App.ui.form.panelControl.add(App.ui.form.buttonExportBlackList); // SB

                App.ui.form.panelMain.add(App.ui.form.panelFilterContainer);
                App.ui.form.panelMain.add(App.ui.form.panelDiv3);
                App.ui.form.panelMain.add(App.ui.form.panelImagePickerContainer);
                App.ui.form.panelMain.add(App.ui.form.panelMapContainer);

                // Replace the root UI with the assembled main panel
                ui.root.widgets().reset([App.ui.form.panelMain]);
            },

            // Main horizontal container: Filter | Gallery | Map
            panelMain: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'both'
                }
            }),

            // Gallery container (thumbnails)
            panelImagePickerContainer: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'both'
                }
            }),

            // Map container (map + button bar)
            panelMapContainer: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'both'
                }
            }),

            // Filter container (inputs)
            panelFilterContainer: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'vertical',
                }
            }),

            // Panel where thumbnails are placed
            panelImagePicker: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'both',
                }
            }),

            // Button bar above the map
            panelControl: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            // UI separators (visual dividers)
            panelDiv1: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'horizontal',
                    'border': '1px solid rgba(97, 97, 97, 0.05)',
                }
            }),

            panelDiv2: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'horizontal',
                    'border': '1px solid rgba(97, 97, 97, 0.05)',
                }
            }),

            panelDiv3: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'vertical',
                    'border': '1px solid rgba(97, 97, 97, 0.05)',
                }
            }),

            /**
             * Collection selector: updates App.options.collectionid.
             * This label is later used to map to actual EE collection IDs via collectionIds.
             */
            selectCollection: ui.Select({
                'items': [
                    'Landsat-4 SR',
                    'Landsat-5 SR',
                    'Landsat-7 SR',
                    'Landsat-8 SR',
                    // 'Landsat-5 SR [+L7]',
                    // 'Landsat-7 SR [+L5]',
                ],
                'placeholder': 'Collection',
                'onChange': function (collectionid) {
                    App.options.collectionid = collectionid;
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            /**
             * Year selector: updates App.options.year (used by getDates()).
             */
            selectYear: ui.Select({
                'items': [
                    '1985', '1986', '1987', '1988',
                    '1989', '1990', '1991', '1992',
                    '1993', '1994', '1995', '1996',
                    '1997', '1998', '1999', '2000',
                    '2001', '2002', '2003', '2004',
                    '2005', '2006', '2007', '2008',
                    '2009', '2010', '2011', '2012',
                    '2013', '2014', '2015', '2016',
                    '2017', '2018', '2019', '2020',
                    '2021', '2022', '2023', '2024',
                    '2025'
                ],
                'placeholder': 'Year',
                'onChange': function (year) {
                    App.options.year = year;
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            /**
             * Month selector (start): updates montht0 used by getDates().
             */
            selectMontht0: ui.Select({
                'items': [
                    '01', '02', '03', '04',
                    '05', '06', '07', '08',
                    '09', '10', '11', '12',
                ],
                'placeholder': 'Month t0',
                'onChange': function (month) {
                    App.options.montht0 = month;
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            /**
             * Month selector (end): updates montht1 used by getDates().
             */
            selectMontht1: ui.Select({
                'items': [
                    '01', '02', '03', '04',
                    '05', '06', '07', '08',
                    '09', '10', '11', '12',
                ],
                'placeholder': 'Month t1',
                'onChange': function (month) {
                    App.options.montht1 = month;
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            /**
             * Button: runs the full discovery/mosaic flow (findImages()).
             */
            buttonFind: ui.Button({
                'label': 'Find images',
                'onClick': function () {
                    App.ui.findImages();
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            /**
             * Button: selects all scenes in the gallery.
             */
            buttonSelectAll: ui.Button({
                'label': 'Select all',
                'onClick': function () {
                    App.ui.selectAll();
                },
                'style': {
                    'stretch': 'vertical',
                    'width': '100px'
                }
            }),

            /**
             * Button: deselects all scenes in the gallery.
             */
            buttonUnselectAll: ui.Button({
                'label': 'Unselect all',
                'onClick': function () {
                    App.ui.unselectAll();
                },
                'style': {
                    'stretch': 'vertical',
                    'width': '100px'
                }
            }),

            /**
             * Button: rebuild mosaic with current blackList/imageList configuration and show on map.
             */
            buttonMakeMosaic: ui.Button({
                'label': 'Mosaic',
                'onClick': function () {
                    App.makeMosaic();
                    App.ui.addMosaicToMap();
                },
                'style': {
                    'stretch': 'vertical',
                    'width': '100px'
                }
            }),

            /**
             * Button: rebuild mosaic and export it to Asset.
             */
            buttonExportMosaic: ui.Button({
                'label': 'Export',
                'onClick': function () {
                    App.makeMosaic();
                    App.exportMosaic();
                },
                'style': {
                    'stretch': 'vertical',
                    'width': '100px'
                }
            }),
            
            /**
             * Button: export BlackList table to Asset (metadata).
             */
            buttonExportBlackList: ui.Button({ // SB
                'label': 'Export BL',
                'onClick': function () {
                    App.exportBlackList();
                },
                'style': {
                    'stretch': 'vertical',
                    'width': '100px'
                }
            }),

            // UI titles
            labelTitleFilter: ui.Label({
                "value": "Filter",
                "style": {
                    "fontSize": "24px",
                    "fontWeight": "bold",
                    // 'border': '1px solid #cccccc',
                    'stretch': 'horizontal',
                    // 'padding': '4px'
                }
            }),

            labelTitle: ui.Label({
                "value": "Image Galery",
                "style": {
                    "fontSize": "24px",
                    "fontWeight": "bold",
                    // 'border': '1px solid #cccccc',
                    'stretch': 'horizontal',
                    // 'padding': '4px'
                }
            }),

            // Labels for inputs
            labelProject: ui.Label({
                "value": "Project:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            labelRegion: ui.Label({
                "value": "Region:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            labelDates: ui.Label({
                "value": "Date range:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            // NOTE: labelDatesMedian exists but is not currently used/added to the panel
            labelDatesMedian: ui.Label({
                "value": "Median date range:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            labelCollection: ui.Label({
                "value": "Collection id:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            labelCloudCover: ui.Label({
                "value": "Cloud Cover:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            /**
             * Cloud cover textbox: parses numeric input and updates App.options.cloudCover.
             */
            textCloudCover: ui.Textbox({
                'placeholder': '90',
                'onChange': function (text) {
                    App.options.cloudCover = parseFloat(text);
                    print(App.options.cloudCover);
                },
            }),

            labelGridName: ui.Label({
                "value": "Grid Name:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            /**
             * Grid name textbox: updates App.options.gridName (used by getGeometries()).
             */
            textGridName: ui.Textbox({
                'placeholder': 'SH-21-Y-B',
                'onChange': function (text) {
                    App.options.gridName = text;
                },
            }),

            /**
             * Project selector:
             * - Stores the selected project object in App.options.projectInfo
             * - Rebuilds Region selector according to the project's regionsList
             */
            selectProject: ui.Select({
                'items': projectInfo,
                'onChange': function (item) {
                    App.options.projectInfo = item;
                    App.ui.updateRegionList();
                },
                'placeholder': 'Select a project',
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            /**
             * Placeholder region selector.
             * It gets replaced by updateRegionList() after selecting a project.
             */
            selectRegion: ui.Select({
                'items': ['None'],
                'onChange': function (region) {
                },
                'placeholder': 'Select a region',
                'style': {
                    'stretch': 'horizontal',
                    // 'width': '150px'
                }
            }),

            /**
             * Main map widget.
             */
            map: ui.Map({
                'style': {
                    'stretch': 'both'
                }
            }),

            /**
             * Small floating "Loading..." panel shown while building thumbnails client-side.
             */
            msgBox: ui.Panel(
                {
                    'widgets': [
                        ui.Label('Loading...')
                    ],
                    'layout': ui.Panel.Layout.flow('horizontal'),
                    'style': {
                        'position': 'top-left'
                    }
                }
            )
        }
    }
};

/**
 * Boot the application (build UI).
 */
App.init();
