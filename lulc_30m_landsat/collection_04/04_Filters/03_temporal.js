/*var regions_name= ['cristalino',
'graben_LM',
'Sierras_Este', 
'sedimentaria_gnw',
'basaltica',
'graben_SL',
'sedimentaria_Oeste'] 
*/

//var regiao = 'Sierras_Este';  //var versionIn = 'v_1'; var versionOut = 'v_1_gap';

//var regiao = 'graben_SL';  var versionIn = 'v_1'; var versionOut = 'v_1_gap'
 
//var versionIn = 'v_4_esp'
// ES: Versión que se añadirá a los metadatos y al nombre del asset exportado.
// EN: Version added to metadata and the exported asset name.
var versionOut = 'v_13_temp'

//classes que se aplicam os filtros
//var options = {
//  'classes': [3, 12, 13, 21, 29,33],
//  'classNames': ['forest','campo', 'veg.ñflo', 'agro', 'aflo', 'agua']
//};

//var dirasset = 'projects/mapbiomas-workspace/MOSAICOS/workspace-c3';
//var dirsamples = 'projects/mapbiomas-workspace/AMOSTRAS/col4/PAMPA/samples_PAMPA_'
//var dircol4 = 'projects/mapbiomas-workspace/AMOSTRAS/col4/PAMPA/class_col4'
// ES: Carpeta de salida. Las rutas y versiones originales se conservan sin cambios.
// EN: Output folder. Original paths and versions are preserved without changes.
var dirout = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/WORKSPACE/classificationC6/'
// ES: Carga las regiones vectoriales; esta colección no se utiliza posteriormente en el script.
// EN: Loads vector regions; this collection is not used later in the script.
var regioesCollection = ee.FeatureCollection('projects/mapbiomas-uruguay/assets/LAND-COVER/ANCILLARY_DATA/C5/regiones_buffer_uy_ext')

// ES: Importa las paletas de MapBiomas para visualizar clases.
// EN: Imports MapBiomas palettes for class display.
var palettes = require('users/mapbiomas/modules:Palettes.js');

// ES: Configura la visualización de 2019 con la paleta classification5. No modifica los valores clasificados.
// EN: Configures the 2019 display using the classification5 palette. It does not modify class values.
var vis5 = { 'bands':'classification_2019', 'min': 0, 'max': 45,  'palette': palettes.get('classification5')};

// ES: Carga la clasificación multibanda de entrada. Debe contener classification_1985 a classification_2025.
// EN: Loads the input multiband classification. It must contain classification_1985 through classification_2025.
var image_in = ee.Image('projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-6/WORKSPACE/classificationC6/class_v_13_esp') ;


// ES: Filtro de tres años para una clase valor y un año central ano: detecta A-noA-A y sustituye el año central por A. Los extremos deben coincidir con valor; noA puede ser cualquier otra clase. Devuelve solo la banda del año central.
// EN: Three-year filter for class valor and central year ano: detects A-notA-A and replaces the central year with A. Both endpoints must match valor; notA may be any other class. Returns only the central-year band.
var mask3 = function(valor, ano, imagem){
  var mask = imagem.select('classification_'+ (parseInt(ano) - 1)).eq (valor)
        .and(imagem.select('classification_'+ (ano)              ).neq(valor))
        .and(imagem.select('classification_'+ (parseInt(ano) + 1)).eq (valor))
// ES: Crea la corrección donde se cumple la condición y la superpone con blend a la banda original. Las comparaciones conservan las máscaras de entrada: no se trata de un relleno general de píxeles sin datos.
// EN: Creates the correction where the condition holds and overlays it on the original band using blend. Comparisons retain input masks: this is not general missing-data gap filling.
  var muda_img = imagem.select('classification_'+ (ano)    ).mask(mask.eq(1)).where(mask.eq(1), valor);  
  var img_out = imagem.select('classification_'+ano).blend(muda_img)
  return img_out;
}



// ES: Detecta A-noA-noA-A. Aunque construye correcciones desde dos años, blend superpone imágenes de una banda y devuelve una sola banda del año ano; no actualiza dos bandas anuales independientes. Esta función no se ejecuta en el flujo activo.
// EN: Detects A-notA-notA-A. Although it builds corrections from two years, blend overlays single-band images and returns only one band for year ano; it does not update two separate annual bands. This function is not called in the active workflow.
var mask4 = function(valor, ano, imagem){
  var mask = imagem.select('classification_'+ (parseInt(ano) - 1)).eq (valor)
        .and(imagem.select('classification_'+ (ano)              ).neq(valor))
        .and(imagem.select('classification_'+ (parseInt(ano) + 1)).neq(valor))
        .and(imagem.select('classification_'+ (parseInt(ano) + 2)).eq (valor))
  var muda_img  = imagem.select('classification_'+ (ano)              ).mask(mask.eq(1)).where(mask.eq(1), valor);  
  var muda_img1 = imagem.select('classification_'+ (parseInt(ano) + 1)).mask(mask.eq(1)).where(mask.eq(1), valor); 
  var img_out = imagem.select('classification_'+ano).blend(muda_img).blend(muda_img1)
  return img_out;
}

// ES: Detecta A-noA-noA-noA-A. Las tres correcciones se superponen en una única banda de salida; no reemplazan tres bandas anuales independientes. Esta función no se ejecuta en el flujo activo.
// EN: Detects A-notA-notA-notA-A. The three corrections are overlaid into a single output band; they do not replace three separate annual bands. This function is not called in the active workflow.
var mask5 = function(valor, ano, imagem){
  var mask = imagem.select('classification_'+ (parseInt(ano) - 1)).eq (valor)
        .and(imagem.select('classification_'+ (ano)              ).neq(valor))
        .and(imagem.select('classification_'+ (parseInt(ano) + 1)).neq(valor))
        .and(imagem.select('classification_'+ (parseInt(ano) + 2)).neq(valor))
        .and(imagem.select('classification_'+ (parseInt(ano) + 3)).eq (valor))
  var muda_img  = imagem.select('classification_'+ (ano)              ).mask(mask.eq(1)).where(mask.eq(1), valor);  
  var muda_img1 = imagem.select('classification_'+ (parseInt(ano) + 1)).mask(mask.eq(1)).where(mask.eq(1), valor);  
  var muda_img2 = imagem.select('classification_'+ (parseInt(ano) + 2)).mask(mask.eq(1)).where(mask.eq(1), valor);  
  var img_out = imagem.select('classification_'+ano).blend(muda_img).blend(muda_img1).blend(muda_img2)
  return img_out;
}

// ES: Años centrales procesables según la longitud de ventana: 1986–2024 para tres años, 1986–2023 para cuatro y 1986–2022 para cinco. Evitan solicitar años fuera de 1985–2025.
// EN: Processable central years by window length: 1986–2024 for three years, 1986–2023 for four, and 1986–2022 for five. They avoid requesting years outside 1985–2025.
var anos3 = ['1986','1987','1988','1989','1990','1991','1992','1993','1994','1995','1996','1997','1998','1999','2000','2001','2002','2003','2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024'];
var anos4 = ['1986','1987','1988','1989','1990','1991','1992','1993','1994','1995','1996','1997','1998','1999','2000','2001','2002','2003','2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023'];
var anos5 = ['1986','1987','1988','1989','1990','1991','1992','1993','1994','1995','1996','1997','1998','1999','2000','2001','2002','2003','2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022'];

// ES: Reconstruye la serie aplicando mask5 a cada año de anos5. Conserva 1985 y 2023–2025. Cada llamada lee la misma imagen de entrada, no las bandas recién corregidas. Definida, pero no utilizada en el flujo activo.
// EN: Rebuilds the series by applying mask5 to each year in anos5. Preserves 1985 and 2023–2025. Each call reads the same input image, not newly corrected bands. Defined but unused in the active workflow.
var window5years = function(imagem, valor){
   var img_out = imagem.select('classification_1985')
   for (var i_ano=0;i_ano<anos5.length; i_ano++){  
     var ano = anos5[i_ano];  
     img_out = img_out.addBands(mask5(valor,ano, imagem)) }
     img_out = img_out.addBands(imagem.select('classification_2023'))
     img_out = img_out.addBands(imagem.select('classification_2024'))
     img_out = img_out.addBands(imagem.select('classification_2025'))
   return img_out
}

// ES: Reconstruye la serie aplicando mask4 a los años de anos4 y conserva 1985 y 2024–2025. Dentro de esta pasada las condiciones se evalúan sobre la imagen de entrada. No se invoca en el flujo activo.
// EN: Rebuilds the series by applying mask4 to years in anos4 and preserves 1985 and 2024–2025. Within this pass, conditions are evaluated on the input image. Not called in the active workflow.
var window4years = function(imagem, valor){
   var img_out = imagem.select('classification_1985')
   for (var i_ano=0;i_ano<anos4.length; i_ano++){  
     var ano = anos4[i_ano];  
     img_out = img_out.addBands(mask4(valor,ano, imagem)) }
     img_out = img_out.addBands(imagem.select('classification_2024'))
     img_out = img_out.addBands(imagem.select('classification_2025'))
   return img_out
}

// ES: Reconstruye las 41 bandas aplicando mask3 a 1986–2024 y conservando los extremos 1985 y 2025. Cada año se evalúa sobre imagem, sin realimentación entre años dentro de esta llamada.
// EN: Rebuilds all 41 bands by applying mask3 to 1986–2024 and preserving endpoints 1985 and 2025. Each year is evaluated against imagem, without feedback between years within this call.
var window3years = function(imagem, valor){
   var img_out = imagem.select('classification_1985')
   for (var i_ano=0;i_ano<anos3.length; i_ano++){  
     var ano = anos3[i_ano];   
     img_out = img_out.addBands(mask3(valor,ano, imagem)) }
     img_out = img_out.addBands(imagem.select('classification_2025'))
   return img_out
}

// ES: Ordena explícitamente la serie original de 1985 a 2025. El comentario histórico siguiente menciona 2018, pero la última banda agregada es 2025.
// EN: Explicitly orders the original series from 1985 to 2025. The following historical comment mentions 2018, but the last appended band is 2025.
//put "classification_2018 in the end of bands after gap fill
var original = image_in.select('classification_1985')
for (var i_ano=0;i_ano<anos3.length; i_ano++){  
  var ano = anos3[i_ano]; 
  original = original.addBands(image_in.select('classification_'+ano)) 
}
original = original.addBands(image_in.select('classification_2025'))

// ES: Inicializa la imagen de trabajo a partir de la serie ordenada; original se conserva para comparación visual.
// EN: Initializes the working image from the ordered series; original is retained for visual comparison.
var filtered = original

//var ordem_exec = [33, 29, 12, 13,  3,  4, 21]; var versionOut = '2'
//var ordem_exec = [33, 29, 12, 13,  4,  3, 21]; var versionOut = '3'
//var ordem_exec = [33, 29,  3, 21, 12, 13,  4]; var versionOut = '4'
//var ordem_exec = [33, 21,  3, 29, 12, 13,  4]; var versionOut = '5'

// ES: Regla del primer año: si 1985 no es valor, pero 1986 y 1987 sí, sustituye 1985 por valor. Reconstruye la serie conservando 1986–2025. Puede eliminar una transición real al inicio de la serie.
// EN: First-year rule: if 1985 differs from valor but both 1986 and 1987 match it, replaces 1985 with valor. Rebuilds the series preserving 1986–2025. It may remove a real transition at the start of the series.
var mask3first = function(valor, imagem){
  var mask = imagem.select('classification_1985').neq (valor)
        .and(imagem.select('classification_1986').eq(valor))
        .and(imagem.select('classification_1987').eq (valor))
  var muda_img = imagem.select('classification_1985').mask(mask.eq(1)).where(mask.eq(1), valor);  
  var img_out = imagem.select('classification_1985').blend(muda_img)
  img_out = img_out.addBands([ 
                               imagem.select('classification_1986'),
                              imagem.select('classification_1987'),
                              imagem.select('classification_1988'),
                              imagem.select('classification_1989'),
                              imagem.select('classification_1990'),
                              imagem.select('classification_1991'),
                              imagem.select('classification_1992'),
                              imagem.select('classification_1993'),
                              imagem.select('classification_1994'),
                              imagem.select('classification_1995'),
                              imagem.select('classification_1996'),
                              imagem.select('classification_1997'),
                              imagem.select('classification_1998'),
                              imagem.select('classification_1999'),
                              imagem.select('classification_2000'),
                              imagem.select('classification_2001'),
                              imagem.select('classification_2002'),
                              imagem.select('classification_2003'),
                              imagem.select('classification_2004'),
                              imagem.select('classification_2005'),
                              imagem.select('classification_2006'),
                              imagem.select('classification_2007'),
                              imagem.select('classification_2008'),
                              imagem.select('classification_2009'),
                              imagem.select('classification_2010'),
                              imagem.select('classification_2011'),
                              imagem.select('classification_2012'),
                              imagem.select('classification_2013'),
                              imagem.select('classification_2014'),
                              imagem.select('classification_2015'),
                              imagem.select('classification_2016'),
                              imagem.select('classification_2017'),
                              imagem.select('classification_2018'),
                              imagem.select('classification_2019'),
                              imagem.select('classification_2020'),
                              imagem.select('classification_2021'),
                              imagem.select('classification_2022'),
                              imagem.select('classification_2023'),
                              imagem.select('classification_2024'),
                              imagem.select('classification_2025')
                              ])
  return img_out;
}

// ES: Aplica la regla inicial secuencialmente a 33, 22, 3, 18, 15, 12, 11 y 9. Algunos comentarios originales de clases están desactualizados: los códigos numéricos controlan el procesamiento.
// EN: Sequentially applies the initial-year rule to 33, 22, 3, 18, 15, 12, 11, and 9. Some original class comments are outdated: numeric codes control processing.
//ordem de execução inicial
//var ordem_exec = [33, 22, 2, 21, 12, 11, 9]
filtered = mask3first(33, filtered)// agua
filtered = mask3first(22, filtered)//  A rochoso
filtered = mask3first(3, filtered)// não veg
filtered = mask3first(18, filtered)// mosaico
filtered = mask3first(15, filtered)// mosaico
filtered = mask3first(12, filtered)// umido 
filtered = mask3first(11, filtered)// floresta
filtered = mask3first(9, filtered)// campo

//print(filtered)

// ES: Regla del último año: cuando 2023 y 2024 son valor y 2025 no, sustituye 2025 por valor; conserva 1985–2024. Puede suprimir cambios reales recientes, por lo que esta regla requiere validación temática.
// EN: Last-year rule: when 2023 and 2024 match valor but 2025 does not, replaces 2025 with valor; preserves 1985–2024. It may suppress real recent changes, so this rule requires thematic validation.
var mask3last = function(valor, imagem){
  var mask = imagem.select('classification_2023').eq (valor)
        .and(imagem.select('classification_2024').eq(valor))
        .and(imagem.select('classification_2025').neq (valor))
  var muda_img = imagem.select('classification_2025').mask(mask.eq(1)).where(mask.eq(1), valor);  
  var img_out = imagem.select('classification_1985')
  img_out = img_out.addBands([
    imagem.select('classification_1986'),
                              imagem.select('classification_1987'),
                              imagem.select('classification_1988'),
                              imagem.select('classification_1989'),
                              imagem.select('classification_1990'),
                              imagem.select('classification_1991'),
                              imagem.select('classification_1992'),
                              imagem.select('classification_1993'),
                              imagem.select('classification_1994'),
                              imagem.select('classification_1995'),
                              imagem.select('classification_1996'),
                              imagem.select('classification_1997'),
                              imagem.select('classification_1998'),
                              imagem.select('classification_1999'),
                              imagem.select('classification_2000'),
                              imagem.select('classification_2001'),
                              imagem.select('classification_2002'),
                              imagem.select('classification_2003'),
                              imagem.select('classification_2004'),
                              imagem.select('classification_2005'),
                              imagem.select('classification_2006'),
                              imagem.select('classification_2007'),
                              imagem.select('classification_2008'),
                              imagem.select('classification_2009'),
                              imagem.select('classification_2010'),
                              imagem.select('classification_2011'),
                              imagem.select('classification_2012'),
                              imagem.select('classification_2013'),
                              imagem.select('classification_2014'),
                              imagem.select('classification_2015'),
                              imagem.select('classification_2016'),
                              imagem.select('classification_2017'),
                              imagem.select('classification_2018'),
                              imagem.select('classification_2019'),
                              imagem.select('classification_2020'),
                              imagem.select('classification_2021'),
                              imagem.select('classification_2022'),
                              imagem.select('classification_2023'),
                              imagem.select('classification_2024')
                              ,])
  var img_out = img_out.addBands(imagem.select('classification_2025').blend(muda_img))
  return img_out;
}

// ES: Aplica la regla de 2025 a las ocho clases, después de la corrección de 1985.
// EN: Applies the 2025 rule to the eight classes after correcting 1985.
//executa o ultimo caso
filtered = mask3last(33, filtered)
filtered = mask3last(22, filtered)
filtered = mask3last(3, filtered)
filtered = mask3last(18, filtered)
filtered = mask3last(15, filtered)
filtered = mask3last(12, filtered)
filtered = mask3last(11, filtered)
filtered = mask3last(9, filtered)


// ES: Muestra la imagen tras corregir los extremos, antes del filtro general de tres años.
// EN: Displays the image after endpoint correction, before the general three-year filter.
print(filtered)

// ES: Bloque alternativo desactivado: las instrucciones dentro del comentario no se ejecutan.
// EN: Disabled alternative block: instructions inside the comment are not executed.
//caso para florestacion (2 anos al medio como no vegetada (cualquer una))
/*
 var ordem_exec = [2];
 for (var i_class=0;i_class<ordem_exec.length; i_class++){  
 var id_class = ordem_exec[i_class]; 
  filtered = window4years(filtered, id_class)
  //filtered = window4years(filtered, id_class)
}

*/

// ES: Orden activo del filtro interior. Cada clase recibe el resultado de la anterior, por lo que el orden puede modificar el resultado. Códigos usados: 3 bosque, 9 plantaciones forestales, 11 humedal, 12 pastizal, 15 pastura, 18 agricultura, 22 área no vegetada y 33 agua.
// EN: Active order for the interior filter. Each class receives the previous class result, so order may affect the outcome. Codes used: 3 forest, 9 forest plantation, 11 wetland, 12 grassland, 15 pasture, 18 agriculture, 22 non-vegetated area, and 33 water.
//ordem de execução geral
var ordem_exec = [33, 22,3,18,15,12, 11, 9];

// 33 agua, 9, Plant. Forest., 22 No vegetado, 
//12 Pastizal, 21 agri-pastura, 11 humedal, 2 bosque.

// ES: Bucle activo: ejecuta una pasada de tres años por clase. Las ventanas de cuatro y cinco años del bloque posterior están comentadas.
// EN: Active loop: runs one three-year pass per class. Four- and five-year windows in the following block are commented out.
for (var i_class=0;i_class<ordem_exec.length; i_class++){  
   var id_class = ordem_exec[i_class]; 
   filtered = window3years(filtered, id_class)
}
/*
var ordem_exec = [33, 29, 22, 21, 11, 3, 12];
for (var i_class=0;i_class<ordem_exec.length; i_class++){  
   var id_class = ordem_exec[i_class]; 
   filtered = window5years(filtered, id_class)
   filtered = window4years(filtered, id_class)
}
*/


// ES: Agrega la clasificación original de 2019 para comparar visualmente con la filtrada.
// EN: Adds the original 2019 classification for visual comparison with the filtered result.
Map.addLayer(original, vis5, 'original');

// ES: Agrega la clasificación filtrada de 2019 con los mismos parámetros visuales.
// EN: Adds the filtered 2019 classification with the same display settings.
Map.addLayer(filtered, vis5, 'filtered');


// ES: Asigna la versión a los metadatos de la imagen final.
// EN: Assigns the version to the final image metadata.
filtered = filtered.set('version', versionOut)


// ES: Crea una tarea de exportación del resultado multibanda a 30 m, con pirámides por moda. geometryPampa debe existir como importación o variable externa. La tarea se inicia desde Tasks; aquí no se aplica clip explícito a la imagen.
// EN: Creates an export task for the multiband result at 30 m using mode pyramids. geometryPampa must exist as an import or external variable. Start the task from Tasks; no explicit image clip is applied here.
Export.image.toAsset({
    'image': filtered,
    'description': '_class_' + versionOut,
    'assetId': dirout + '_class_' + versionOut,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': geometryPampa,
    'scale': 30,
    'maxPixels': 1e13
});
