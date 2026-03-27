/*
HOW TO USE (EN)

Purpose
- This script creates a 2x2 grid of synchronized (linked) maps to visually compare
  annual MapBiomas classification layers for selected years over Uruguay Pampa regions.

1) Set the region of interest (zonas)
    var zonas = ee.FeatureCollection("...");

2) Set the classification asset (collection)
- The variable `collection` must be an ee.Image where each year is stored as a band
  named exactly: "classification_<YEAR>" (e.g., "classification_2012").
- Replace the asset path to use a different classification product:
    var collection = ee.Image("YOUR/ASSET/PATH").clip(zonas);

3) Choose the years to display (years)
- Edit the `years` array to control which four years are shown in the 2x2 grid:
    var years = [2012, 2013, 2014, 2015];

Notes / Common issues
*/


// (EN) Version tag (not used downstream in this snippet, but typically kept for consistency).
var version = '4'

// (EN) Region boundaries (buffered eco-regions for Uruguay in the Pampa context).
var zonas = ee.FeatureCollection("projects/MapBiomas_Pampa/ANCILLARY_DATA/RegionesUy_Buf")

// (EN) Multi-band classification image (one band per year: classification_YYYY),
// clipped to the region feature collection.
var collection = ee.Image(
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/MOSAICOS/Mosaicos_ConFiltro/clasificacion-1985-2024-6multifiltro'
).clip(zonas)


//======================================================================
// (EN) Years to visualize in a linked multi-map grid (small multiples).
var years = [
  2012,
  2013,
  2014,
  2015
];

// (EN) MapBiomas palettes module and visualization parameters for classification maps.
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {'min': 0, 'max': 45,  'palette': palettes.get('classification5')};

// (EN) Containers and counters used to build the UI grid.
var maps = [],     // (EN) Array of ui.Map objects that will be linked together.
    map,           // (EN) Temporary ui.Map object created per year.
    mosaic,        // (EN) The yearly classification band image used for display.
    subcollection, // (EN) Selected band for a given year.
    size,          // (EN) Placeholder variable (not assigned in the current script).
    total = 0;     // (EN) Placeholder accumulator (not meaningful unless "size" is defined).

// (EN) Loop over each year, create a map, add layers, and store it in the maps array.
for (var i = 0; i < years.length; i++) {

    // (EN) Select the classification band for the current year (e.g., classification_2012).
    subcollection = collection.select('classification_' + years[i]);

    // (EN) For this script, "mosaic" is just the single-band image.
    // (If this were an ImageCollection, mosaic() would be used; here it’s already an Image.)
    mosaic = subcollection;

    // (EN) Create a new map panel for this year.
    map = ui.Map();
    
    // (EN) Hide all default map controls (zoom buttons, layers panel, etc.)
    // to get a clean grid.
    map.setControlVisibility({'all': false});

    // (EN) Accumulator line (note: "size" is undefined in this snippet).
    total = total + size;

    // (EN) Add a year label on the map (bottom-left).
    map.add(ui.Label(String(years[i]), {
        'position': 'bottom-left',
        'fontWeight': 'bold'
    }));

    // (EN) Add the classification layer for the year.
    map.addLayer(mosaic, vis, String(years[i]));

    // (EN) Add region boundaries as an overlay (transparent fill, only outline visible via style).
    map.addLayer(zonas.style({fillColor: "FF000000"}), {}, 'z');

    // (EN) Store this map in the list of linked maps.
    maps.push(map);
}

// (EN) Add extra empty maps (placeholders). These are linked too,
// but not displayed in the grid below (grid uses only maps[0..3]).
// This pattern is sometimes used for later expansion.
maps.push(ui.Map().setControlVisibility({'all':false}));
maps.push(ui.Map().setControlVisibility({'all':false}));
maps.push(ui.Map().setControlVisibility({'all':false}));
maps.push(ui.Map().setControlVisibility({'all':false}));

// (EN) Link all maps so they share the same center/zoom (synchronized navigation).
var linker = ui.Map.Linker(maps);

// Create a title.
// (EN) Title label (defined but not added to ui.root in the current script).
var title = ui.Label('ImgTools Visualizer | Mosaics of Collection 3.0', {
    stretch: 'horizontal',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '24px',
});

// (EN) Legend label placeholder (defined but not used/added to the UI here).
var legend = ui.Label("Legend", {
    'fontWeight': 'bold',
    'fontSize': '50px'
});

// Create a grid of maps.
// (EN) Layout: 2 rows x 2 columns using the first four maps (2012–2015).
var mapGrid = ui.Panel([
    ui.Panel([maps[0], maps[1]],
            ui.Panel.Layout.Flow('horizontal'), {
                 stretch: 'both'
            }),
    ui.Panel([maps[2], maps[3]],
            ui.Panel.Layout.Flow('horizontal'), {
                 stretch: 'both'
            })
  ],
    ui.Panel.Layout.Flow('vertical'), {
        stretch: 'both'
    }
);

// Add the maps and title to the ui.root.
// (EN) Reset root widgets to only the map grid and set a vertical layout.
// Note: title/legend are not inserted; if desired, they could be added above mapGrid.
ui.root.widgets().reset([mapGrid]);
ui.root.setLayout(ui.Panel.Layout.Flow('vertical'));

// (EN) Center each displayed map on the region extent.
// Because the maps are linked, centering one effectively syncs the view,
// but calling it for all keeps things explicit.
maps[0].centerObject(zonas);
maps[1].centerObject(zonas);
maps[2].centerObject(zonas);
maps[3].centerObject(zonas);
