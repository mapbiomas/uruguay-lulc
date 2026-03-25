//
// Asset paths (inputs)
// -------------------
// - assetMosaics: main (new) mosaics collection
// - assetMosaicsL7: additional mosaics generated specifically for Landsat 7
// - assetMosaicsOld: older mosaics collection (legacy reference)
//
// - assetScenes: auxiliary "landsat-mask" collection used to visualize scene/tile coverage
// - assetGrids: vector grid (cartas/tiles) used to identify grid_name at click time
//
var assetMosaics = 'projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics';
var assetMosaicsL7 = 'projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics-landsat-7';
var assetMosaicsOld = 'projects/MapBiomas_Pampa/MOSAICS/mosaics_c4';

var assetScenes = 'projects/mapbiomas-workspace/AUXILIAR/landsat-mask';
var assetGrids = 'projects/MapBiomas_Pampa/ANCILLARY_DATA/CartasPampaTrinacional_col2';
//var assetBiomes = 'projects/mapbiomas-workspace/AUXILIAR/biomas-raster-41';

//
// Analysis parameters
// -------------------
// - year: target year to visualize/filter mosaics
// - biomeName: biome/region label used to filter mosaics
//
var year = 2024;
//var biomeName = 'PAMPAARGENTINA';
var biomeName = 'PAMPAURUGUAY';

//
// Load collections from assets
// ---------------------------
// These are server-side collections (Earth Engine).
//
var collectionMosaics = ee.ImageCollection(assetMosaics);
var collectionMosaicsL7 = ee.ImageCollection(assetMosaicsL7);
var collectionMosaicsOld = ee.ImageCollection(assetMosaicsOld);

//
// Merge mosaics so the working collection includes Landsat 7 mosaics as well.
// NOTE: Here the code merges the *string* assetMosaicsL7 instead of collectionMosaicsL7.
// (Keeping it unchanged as requested; the intention seems to be merging Landsat 7 mosaics.)
//
collectionMosaics = collectionMosaics.merge(assetMosaicsL7)

//
// Version selector used to filter mosaics/scenes by metadata property "version".
//
var version = '4'

//
// Load the Landsat tile/scene mask collection, filtered to a specific version.
// This is used later only as a visualization overlay (sum of tiles).
//
var collectionScenes = ee.ImageCollection(assetScenes)
    .filterMetadata('version', 'equals', version);

//
// Load the grids FeatureCollection (cartas/tiles).
// Used for map overlay and for retrieving the grid_name at click locations.
//
var collectionGrids = ee.FeatureCollection(assetGrids);

//var biomes = ee.Image(assetBiomes);

//
// Filter mosaics to the selected biome and version.
// This produces the working mosaic collection for the chosen biome.
//
var biomeCollection = collectionMosaics
    .filterMetadata('biome', 'equals', biomeName)
    .filterMetadata('version', 'equals', version);

//
// Print a histogram of available mosaics per year for the selected biome+version.
// Useful as a quick completeness check.
//
print(
    'Mosaicos novos por ano:',
    biomeCollection.aggregate_histogram('year')
);

//
// Filter the biome mosaics to the selected year (and optionally a single grid tile).
//
biomeCollection = biomeCollection
    .filterMetadata('year', 'equals', year)
    //.filterMetadata('grid_name', 'equals', 'SH-21-Y-B');

print(biomeCollection)

//
// (Optional / commented out) Example of filtering ONLY Landsat 7 mosaics for the same year+biome+version.
//
/*
var biomeCollectionL7 = collectionMosaicsL7
    .filterMetadata('year', 'equals', year)
    .filterMetadata('biome', 'equals', biomeName)
    .filterMetadata('version', 'equals', version);
*/

//
// Old (legacy) mosaics use a different biome naming convention.
// This block maps the "new" biomeName to the older collection's biome attribute.
//
if (biomeName == 'PAMPAARGENTINA'){
  var biomeName_c1 = 'PampaArgentina'
}
if (biomeName == 'PAMPAURUGUAY'){
  var biomeName_c1 = 'PampaUruguay'
}

//
// Filter legacy mosaics by year and biome label (old naming).
// This is useful for visual comparison between legacy and new mosaics.
//
var biomeCollectionOld = collectionMosaicsOld
    .filterMetadata('year', 'equals', year)
    .filterMetadata('biome', 'equals', biomeName_c1);


//
// (Optional / commented out) Add legacy mosaics as a map layer for comparison.
// Note the band naming differs (median_swir1 vs swir1_median) in the commented code below.
//
// Map.addLayer(biomeCollectionOld,
//     {
//         bands: ['median_swir1', 'median_nir', 'median_red'],
//         gain: [0.08, 0.06, 0.2],
//         gamma: 0.85
//     },
//     biomeName + ' OLD ' + String(year) ,0
// );

//
// (Optional / commented out) Add Landsat 7 mosaics as a map layer.
//
// Map.addLayer(biomeCollectionL7,
//     {
//         bands: ['swir1_median', 'nir_median', 'red_median'],
//         gain: [0.08, 0.06, 0.2],
//         gamma: 0.85
//     },
//     biomeName + ' L7 ' + String(year)
// );
//

//
// Add the (new) biome mosaics for the selected year as a map layer.
// Visualization uses SWIR1/NIR/RED (false color) with gain+gamma tuning.
//
Map.addLayer(biomeCollection,
    {
        bands: ['swir1_median', 'nir_median', 'red_median'],
        gain: [0.08, 0.06, 0.2],
        gamma: 0.85
    },
    biomeName + ' ' + String(year)
);

//
// (Optional / commented out) Add the biomes raster layer for reference.
// Useful for context, but not required for mosaic inspection.
//
// Map.addLayer(biomes,
//     {
//         min: 1,
//         max: 6,
//         palette: '#0df2c9,#4EC5F1,#20272F',
//         format: 'png'
//     },
//     'Biomes',
//     false,
//     0.7
// );
//

//
// Add an overlay representing Landsat tile coverage.
// collectionScenes.sum() often indicates the number of available scenes/tiles per pixel.
// Displayed semi-transparent.
//
Map.addLayer(collectionScenes.sum(),
    {
        min: 0,
        max: 4,
        palette: 'ffcccc,ff0000'
    },
    'Landsat tiles',
    false,
    0.3
);

//
// Add grid tiles overlay (vector outlines) for spatial reference.
//
Map.addLayer(collectionGrids,
    {
        color: '0000ff',
    },
    'Grids tiles',
    false,
    0.3
);

//
// Set initial map view (center + zoom).
//
Map.setCenter(-59.093, -33.094, 5);


//
// SB: Mosaic revision panel (UI)
// ------------------------------
// This block creates a small panel on the bottom-right that will display:
// - grid_name of the clicked location
// - selected year
//
var Window = {
  grid_name: ui.Label(),
  year:  ui.Label(),
  // Panel positioned in bottom-right with fixed width
  panel: ui.Panel([],ui.Panel.Layout.Flow("vertical"), {width: "200px", position: "bottom-right"}),
  
  // Initializes the panel by adding labels and attaching it to the Map
  init: function(){
    Window.panel.add(Window.grid_name)
    Window.panel.add(Window.year)

    Map.add(Window.panel);    
  }
}

//
// Create and attach the UI panel to the map.
//
Window.init();

//
// Click handler: when the user clicks on the map,
// - builds a point geometry from click coordinates
// - finds the grid feature intersecting that point
// - reads the "grid_name" attribute
// - updates the panel labels with grid name and current year
//
var show_panel_info = function(p){
  var point = ee.Geometry.Point([p.lon,p.lat])
  var grid_name = collectionGrids.filterBounds(point).first().get("grid_name")
  
  // getInfo() brings server-side value to client-side to display in the UI label
  Window.grid_name.setValue("Grid Name: " + grid_name.getInfo())
  Window.year.setValue("Year: " + year)
    
}

//
// Register click handler on the map.
//
Map.onClick(show_panel_info)
