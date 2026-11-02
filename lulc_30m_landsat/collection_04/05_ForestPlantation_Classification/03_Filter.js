// Filtro temporal de clasificaciones anuales de forestaciones

// ES: Carga el límite de Uruguay utilizado para visualizar, recortar y delimitar la exportación.
// EN: Loads the Uruguay boundary used for display, clipping and export extent.
var region = ee.FeatureCollection("users/fgallego/Contorno_Uy");
Map.setOptions('SATELLITE');

// ES: Año de visualización. No limita el filtrado: siempre se procesa 1985–2025.
// EN: Display year. Does not limit filtering: 1985–2025 is always processed.
var anio = 2023;

// ES: Carga dos colecciones de mosaicos Landsat, utilizadas solo como contexto visual. merge reúne imágenes; no combina píxeles todavía.
// EN: Loads two Landsat mosaic collections, used only for visual context. merge combines collections, not pixels yet.
var dirasset =  ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics');
var dirasset7 = ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/PAMPA/mosaics-landsat-7');
var mosaicos = dirasset.merge(dirasset7);

// ES: Composición SWIR1–NIR–rojo y ajustes de visualización; no intervienen en los filtros.
// EN: SWIR1–NIR–red composition and display adjustments; not involved in filtering.
var RGBvis = {
        bands: ['swir1_median', 'nir_median', 'red_median'],
        gain: [0.08, 0.06, 0.2],
        gamma: 0.85
    };
    
// ES: Filtra año, versión como cadena y ámbito. mosaic prioriza los últimos píxeles válidos según el orden de la colección; no calcula una media.
// EN: Filters year, version as a string, and extent. mosaic prioritizes last valid pixels in collection order; it does not compute a mean.
var mosaico = mosaicos
             .filter(ee.Filter.eq('year', anio))
             .filter(ee.Filter.eq('version', "4"))
             .filterBounds(region)
             .mosaic()
             .clip(region);
Map.addLayer(mosaico, RGBvis, 'mosaico_'+anio, false);  

// ES: Correspondencia asumida: 1 bosque nativo, 2 Eucalyptus, 3 Pinus, 4 no bosque. Verificar que los assets anuales utilicen esos códigos.
// EN: Assumed mapping: 1 native forest, 2 Eucalyptus, 3 Pinus, 4 non-forest. Check that annual assets use these codes.
var palette = [
  '6ec185', //Bosque nativo (1) -
  'c6863e', //Eucalyptus (2) -
  'a76b67', //Pinus (3)-
  'dde2ac', //No bosque (4)-
 ];  
 

// ES: Crea listas JavaScript locales para los años y los nombres finales de banda.
// EN: Creates local JavaScript lists for years and final band names.
var years_client = [];
var bandNames_client = [];

// ES: Genera 41 años consecutivos e inclusivos, con nombres clasif_1985 a clasif_2025.
// EN: Generates 41 consecutive inclusive years, named clasif_1985 through clasif_2025.
for (var y = 1985; y <= 2025; y++) {
  years_client.push(y);
  bandNames_client.push('clasif_' + y);
}

// ES: Carga ForestalYYYY para cada año. Cada asset debe existir y tener una sola banda para rename(bandName). No se calculan aquí clasificaciones faltantes.
// EN: Loads ForestalYYYY for each year. Every asset must exist and contain one band for rename(bandName). Missing classifications are not computed here.
var imageList = years_client.map(function(y) {
  var id = "projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/WORKSPACE/MOSAICOS/Forestaciones/Forestal" + y;
  var bandName = 'clasif_' + y;
  return ee.Image(id).rename(bandName);
});

// ES: Convierte la lista ordenada de imágenes anuales en una colección.
// EN: Converts the ordered annual-image list into a collection.
var images = ee.ImageCollection(imageList);

// ES: Apila las imágenes y reemplaza los nombres generados por toBands por los 41 nombres anuales. La correspondencia depende del orden de la colección.
// EN: Stacks images and replaces toBands-generated names with the 41 annual names. Correspondence depends on collection order.
var rename = images.toBands().rename(bandNames_client);
print('Bands', rename.bandNames());

// ES: Máscara por banda de valores >=1: incluye también 4 (no bosque). El nombre maskforest no implica que seleccione solo bosque.
// EN: Per-band mask for values >=1: also includes 4 (non-forest). The name maskforest does not mean it selects only forest.
var maskforest = rename.gte(1);
Map.addLayer(rename.clip(region), null, "1985-2025", false);

// ES: Filtro ESPACIAL de moda, independiente para cada banda anual; radio 1.5 y núcleo cuadrado. updateMask reaplica la máscara anual original >=1.
// EN: SPATIAL mode filter, independently applied to each annual band; radius 1.5 and square kernel. updateMask reapplies the original annual >=1 mask.
var ClasiFin = rename.focalMode({
  radius: 1.5,
  kernelType: 'square',
}).updateMask(maskforest);

// ES: Rellena píxeles enmascarados con 4 dentro de la huella retenida y recorta a Uruguay. Esto convierte ausencia de datos en no bosque; no demuestra ausencia real de bosque.
// EN: Fills masked pixels with 4 within the retained footprint and clips to Uruguay. This converts missing data to non-forest; it does not establish actual forest absence.
var ClasiFin_unmask = ClasiFin.unmask(4).clip(region);

// ES: Cuenta años con clase distinta de 4; es una cantidad de años, no un porcentaje ni una probabilidad. Si existen códigos inesperados, también cuentan.
// EN: Counts years with classes other than 4; a year count, not a percentage or probability. Unexpected codes, if present, also count.
var is_not_4 = ClasiFin_unmask.neq(4);
var freq = is_not_4.reduce(ee.Reducer.sum()).rename("freqForBq");

// ES: Conserva píxeles con al menos un año distinto de 4. Fuera de ese dominio la salida permanece enmascarada, aunque se haya rellenado previamente con 4.
// EN: Retains pixels with at least one year other than 4. Outside this domain output remains masked, even though pixels were previously filled with 4.
var masklenioso = freq.gte(1);
var clasif_lenio = ClasiFin_unmask.updateMask(masklenioso);

// ES: Función de sustitución temporal: valor es la clase destino; gap_size es el número de años interiores. No rellena automáticamente datos nulos.
// ES: Modos de extremo: 1 exige valor; 2 acepta valor o 4; 3 exige 4. Los extremos no se modifican.
// EN: Temporal replacement function: valor is the target class; gap_size is the number of interior years. Does not automatically fill null data.
// EN: Endpoint modes: 1 requires valor; 2 accepts valor or 4; 3 requires 4. Endpoints are not modified.
var apply_gap_filter = function(image, valor, gap_size, left_mode, right_mode) {
// ES: Limita los inicios para que el extremo derecho no supere 2025; una ventana contiene gap_size + 2 años en total.
// EN: Limits start years so the right endpoint does not exceed 2025; a window contains gap_size + 2 years in total.
    var start_years = ee.List.sequence(1985, 2025 - gap_size - 1);
    
// ES: Recorre inicios cronológicamente con estado acumulado: cada ventana recibe las modificaciones de las anteriores. Los resultados dependen del orden.
// EN: Iterates start years chronologically with accumulated state: each window receives earlier changes. Results depend on order.
    return ee.Image(start_years.iterate(function(ano, state) {
        state = ee.Image(state);
        ano = ee.Number(ano);
        
// ES: Construye los nombres de las bandas extremas separadas por gap_size años interiores.
// EN: Builds endpoint band names separated by gap_size interior years.
        var b_start = ee.String('clasif_').cat(ano.format('%d'));
        var b_end = ee.String('clasif_').cat(ano.add(gap_size + 1).format('%d'));
        
        var img_start = state.select(b_start);
        var img_end = state.select(b_end);
        
// ES: Evalúa la condición del extremo izquierdo según left_mode.
// EN: Evaluates the left endpoint condition according to left_mode.
        var c_start = img_start.eq(valor);
        if (left_mode === 2) { c_start = img_start.eq(4).or(img_start.eq(valor)); }
        else if (left_mode === 3) { c_start = img_start.eq(4); }
        
// ES: Evalúa la condición del extremo derecho según right_mode.
// EN: Evaluates the right endpoint condition according to right_mode.
        var c_end = img_end.eq(valor);
        if (right_mode === 2) { c_end = img_end.eq(4).or(img_end.eq(valor)); }
        else if (right_mode === 3) { c_end = img_end.eq(4); }
        
        var mask = c_start.and(c_end);
        
// ES: Exige que TODOS los años interiores sean distintos de valor y de 4. Pueden contener distintas clases entre sí.
// ES: Si valor=4, ambas comparaciones son equivalentes y se permite convertir una secuencia forestal a no bosque.
// EN: Requires ALL interior years to differ from valor and from 4. Their classes may differ from one another.
// EN: If valor=4, both comparisons are equivalent and a forest sequence can be converted to non-forest.
        var middle_years = ee.List.sequence(1, gap_size);
        var middle_mask = ee.Image(middle_years.iterate(function(offset, m) {
            var img_mid = state.select(ee.String('clasif_').cat(ano.add(offset).format('%d')));
            return ee.Image(m).and(img_mid.neq(valor)).and(img_mid.neq(4));
        }, ee.Image(1)));
        
// ES: Combina las condiciones de ambos extremos y de todos los años interiores por píxel.
// EN: Combines conditions for both endpoints and all interior years per pixel.
        mask = mask.and(middle_mask);
        
// ES: Reemplaza únicamente los años interiores donde se cumple la máscara; addBands con overwrite=true conserva nombres y reemplaza las bandas existentes.
// EN: Replaces only interior years where the mask holds; addBands with overwrite=true retains names and replaces existing bands.
        var replaced = ee.Image(middle_years.iterate(function(offset, st) {
            st = ee.Image(st);
            var b_mid = ee.String('clasif_').cat(ano.add(offset).format('%d'));
            var img_mid = st.select(b_mid);
            return st.addBands(img_mid.where(mask, valor), null, true);
        }, state));
        
        return replaced;
    }, image));
};

// ES: Corrige solo 1985 si no es valor ni 4 y tanto 1986 como 1987 son valor. No cambia 1985 cuando es no bosque.
// EN: Corrects only 1985 if it is neither valor nor 4 and both 1986 and 1987 equal valor. Does not change 1985 when non-forest.
var apply_mask_first = function(image, valor) {
    var c85 = image.select('clasif_1985');
    var c86 = image.select('clasif_1986');
    var c87 = image.select('clasif_1987');
    var mask = c85.neq(valor).and(c85.neq(4)).and(c86.eq(valor)).and(c87.eq(valor));
    return image.addBands(c85.where(mask, valor), null, true);
};

// ES: Corrige solo 2025 si 2023 y 2024 son valor y 2025 no es valor ni 4. No cambia 2025 cuando es no bosque.
// EN: Corrects only 2025 if 2023 and 2024 equal valor and 2025 is neither valor nor 4. Does not change 2025 when non-forest.
var apply_mask_last = function(image, valor) {
    var c23 = image.select('clasif_2023');
    var c24 = image.select('clasif_2024');
    var c25 = image.select('clasif_2025');
    var mask = c23.eq(valor).and(c24.eq(valor)).and(c25.neq(valor)).and(c25.neq(4));
    return image.addBands(c25.where(mask, valor), null, true);
};

// ES: Inicializa la serie a partir del suavizado espacial, relleno con 4 y máscara de presencia leñosa. Las siguientes etapas se aplican secuencialmente.
// EN: Initializes the series from spatial smoothing, filling with 4 and woody-presence masking. Following stages are applied sequentially.
var filtered = clasif_lenio;

// ES: ETAPA 1: clases 3, luego 2, luego 4. Para cada clase procesa huecos de 4, 3, 2 y 1 años con extremos iguales a la clase.
// ES: La quinta llamada acepta valor a la izquierda y 4 a la derecha para un año interior. Con valor=4 repite la condición de extremos del caso anterior.
// EN: STAGE 1: class 3, then 2, then 4. For each class, processes 4-, 3-, 2- and 1-year gaps with endpoints matching that class.
// EN: The fifth call accepts valor on the left and 4 on the right for one interior year. For valor=4, its endpoint condition repeats the preceding case.
var ordem_exec_middle = [3, 2, 4];
ordem_exec_middle.forEach(function(id_class) {
    filtered = apply_gap_filter(filtered, id_class, 4, 1, 1); 
    filtered = apply_gap_filter(filtered, id_class, 3, 1, 1); 
    filtered = apply_gap_filter(filtered, id_class, 2, 1, 1); 
    filtered = apply_gap_filter(filtered, id_class, 1, 1, 1); 
    filtered = apply_gap_filter(filtered, id_class, 1, 1, 3); 
});

// ES: ETAPA 2: convierte a Pinus (3) secuencias interiores de hasta 11 años, con 3 o 4 a la izquierda y 3 a la derecha.
// ES: Puede transformar bosque nativo o Eucalyptus, pero no años interiores de clase 4. Una regla tan extensa requiere validación temporal independiente.
// EN: STAGE 2: converts interior sequences of up to 11 years to Pinus (3), with 3 or 4 on the left and 3 on the right.
// EN: May transform native forest or Eucalyptus, but not interior class-4 years. Such a long rule requires independent temporal validation.
var ordem_exec_middle2 = [3];
ordem_exec_middle2.forEach(function(id_class) {
    for (var gap = 11; gap >= 1; gap--) { 
        filtered = apply_gap_filter(filtered, id_class, gap, 2, 1); 
    }
});

// ES: ETAPA 3: aplica la corrección del extremo 2025 para 1, 2 y 3. Esta etapa ocurre antes del filtro largo de Eucalyptus.
// EN: STAGE 3: applies the 2025 endpoint correction for 1, 2 and 3. This occurs before the long Eucalyptus filter.
var ordem_exec_last = [1, 2, 3];
ordem_exec_last.forEach(function(id_class) {
    filtered = apply_mask_last(filtered, id_class);
});

// ES: ETAPA 4: convierte a Eucalyptus (2) secuencias interiores de 11 a 1 años, con 2 o 4 a la izquierda y 2 a la derecha. Opera sobre los cambios anteriores.
// EN: STAGE 4: converts interior sequences from 11 down to 1 years to Eucalyptus (2), with 2 or 4 on the left and 2 on the right. Operates on prior changes.
var ordem_exec_middle3 = [2];
ordem_exec_middle3.forEach(function(id_class) {
    for (var gap = 11; gap >= 1; gap--) {
        filtered = apply_gap_filter(filtered, id_class, gap, 2, 1);
    }
});

// ES: ETAPA 5: corrige 1985 para 1, 2 y 3. La clase 1 no tiene un filtro interior propio en esta configuración.
// EN: STAGE 5: corrects 1985 for 1, 2 and 3. Class 1 has no dedicated interior filter in this configuration.
var ordem_exec_first = [1, 2, 3];
ordem_exec_first.forEach(function(id_class) {
    filtered = apply_mask_first(filtered, id_class);
});

// ES: Añade la serie completa oculta y el año seleccionado visible, con la paleta categórica 1–4.
// EN: Adds the complete series hidden and the selected year visible, using the 1–4 categorical palette.
Map.addLayer(filtered, null, "1985-2025 filtered", false);
Map.addLayer(filtered.select('clasif_'+anio), {min: 1, max: 4, palette: palette}, "clasif filtered "+anio);

// ES: Crea la leyenda en la esquina inferior izquierda; no cambia los valores de la clasificación.
// EN: Creates the legend at bottom left; does not change classification values.
var legend = ui.Panel({
  style: { position: 'bottom-left', padding: '10px 15px' }
});

// ES: Título visual. Las etiquetas agrupan bosque nativo, géneros y no bosque; no todas representan especies.
// EN: Display title. Labels group native forest, genera and non-forest; not all represent species.
var legendTitle = ui.Label({
  value: 'Especies',
  style: { fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0', padding: '0' }
});

legend.add(legendTitle);

// ES: Construye cada fila con un color y su etiqueta.
// EN: Builds each row with a color and its label.
var makeRow = function(color, name) {
      var colorBox = ui.Label({
        style: { backgroundColor: '#' + color, padding: '8px', margin: '0 0 4px 0' }
      });
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};

// ES: Vincula los cuatro colores a sus códigos y añade las filas al panel.
// EN: Associates the four colors with their codes and adds the rows to the panel.
var names = ['1)Bosque Nativo','2)Eucalyptus','3)Pinus sp','4)No bosque']; 
for (var i = 0; i < 4; i++) {
  legend.add(makeRow(palette[i], names[i]));
}  
Map.add(legend);

// ES: Crea una tarea para exportar las 41 bandas a 30 m nominales. Iniciarla desde Tasks. No se especifica CRS ni alineación explícita de la grilla.
// ES: La descripción dice 85-24, pero la serie y el assetId abarcan 1985–2025.
// ES: ERROR CONSERVADO: pyramidingPolicy debe ser un diccionario, por ejemplo {".default": "mode"}, no la cadena "mode".
// ES: Fuente: https://developers.google.com/earth-engine/apidocs/export-image-toasset
// EN: Creates a task exporting all 41 bands at nominal 30 m. Start it from Tasks. No CRS or explicit grid alignment is specified.
// EN: The description says 85-24, but the series and assetId cover 1985–2025.
// EN: PRESERVED ERROR: pyramidingPolicy must be a dictionary, such as {".default": "mode"}, not the string "mode".
Export.image.toAsset({
        image: filtered,
        description: "Clasif_forestaciones_uruguay_filtrTemp_85-24",
        assetId: 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/WORKSPACE/MOSAICOS/Forestaciones/Clasif_forestaciones_uruguay_filtrTemp_85-25',
        region: region,
        scale: 30,
        pyramidingPolicy: "mode",
        maxPixels: 1e13
});
