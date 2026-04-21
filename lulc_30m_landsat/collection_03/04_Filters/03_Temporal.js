// -----------------------------------------------------------------------------
// Temporal consistency filters for an annual classification stack (EN)
// -----------------------------------------------------------------------------
// This script applies temporal rules to a multi-band classification image where
// each year is a band named: classification_YYYY.
//
// Main steps:
// 1) Build a clean chronological band stack (1985 → 2024).
// 2) Fix potential “first-year” issues (1985) using 1986–1987 persistence.
// 3) Apply an “end-year” rule (as implemented) for selected classes.
// 4) Apply temporal window filters (3/4/5-year) to reduce short-term spikes.
// 5) Export the final filtered stack as an Asset.
//
// NOTE:
// - This script assumes `geometryPampa` exists in your environment (used in export).
// - `mask4` is a special custom rule (it mostly uses fixed class logic, not `valor`).
//   Kept exactly as-is to preserve original behavior.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Output naming / paths
// -----------------------------------------------------------------------------
var versionOut = 'v_41_temp_Clase12';

var dirout = 'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/classificationC5/';

// (Optional context only; not used directly in processing/export here)
var regioesCollection = ee.FeatureCollection('projects/MapBiomas_Pampa/WORKSPACE/Uruguay/RegionesUy');

// -----------------------------------------------------------------------------
// Visualization helpers
// -----------------------------------------------------------------------------
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis5 = { bands: 'classification_2019', min: 0, max: 45, palette: palettes.get('classification5') };

// -----------------------------------------------------------------------------
// Input: multi-band classification image to be filtered
// -----------------------------------------------------------------------------
var image_in = ee.Image(
  'projects/mapbiomas-uruguay/assets/LAND-COVER/COLLECTION-5/WORKSPACE/classificationC5/class_v_4_esp'
);

// -----------------------------------------------------------------------------
// Temporal mask rules (kept logically identical to your original)
// -----------------------------------------------------------------------------

// (EN) mask3:
// If (year-1 == valor) AND (year != valor) AND (year+1 == valor) → set year = valor
var mask3 = function(valor, ano, imagem) {
  var mask = imagem.select('classification_' + (parseInt(ano) - 1)).eq(valor)
    .and(imagem.select('classification_' + ano).neq(valor))
    .and(imagem.select('classification_' + (parseInt(ano) + 1)).eq(valor));

  var muda_img = imagem.select('classification_' + ano)
    .mask(mask.eq(1))
    .where(mask.eq(1), valor);

  var img_out = imagem.select('classification_' + ano).blend(muda_img);
  return img_out;
};

// (EN) mask4 (custom rule):
// This function implements a special “forestry-like” correction pattern:
// - Endpoints (prev and next2) must be one of {15, 18, 9}
// - Intermediate years (curr and next) must be class 12
// - Then it replaces the intermediate years with the prev value
//
// IMPORTANT: This function does not behave like a generic "valor" window rule.
// It is preserved as provided.
var mask4 = function(valor, ano, imagem) {
  var prev  = imagem.select('classification_' + (parseInt(ano) - 1));
  var curr  = imagem.select('classification_' + ano);
  var next  = imagem.select('classification_' + (parseInt(ano) + 1));
  var next2 = imagem.select('classification_' + (parseInt(ano) + 2));

  // Valid endpoints: 15, 18, or 9
  var puntasValidasPrev  = prev.eq(15).or(prev.eq(18)).or(prev.eq(9));
  var puntasValidasNext2 = next2.eq(15).or(next2.eq(18)).or(next2.eq(9));

  // Intermediate two years must be class 12
  var intermedios12 = curr.eq(12).and(next.eq(12));

  // Correction mask
  var mask = puntasValidasPrev.and(puntasValidasNext2).and(intermedios12);

  // Replace intermediate years with the endpoint value (prev)
  var muda_img  = curr.mask(mask.eq(1)).where(mask.eq(1), prev);
  var muda_img1 = next.mask(mask.eq(1)).where(mask.eq(1), prev);

  // Blend results (kept as original)
  var img_out = curr.blend(muda_img).blend(muda_img1);
  return img_out;
};

// (EN) mask5:
// If year-1 == valor and next 3 years are != valor, but year+3 == valor,
// replace year, year+1, year+2 with valor.
var mask5 = function(valor, ano, imagem) {
  var mask = imagem.select('classification_' + (parseInt(ano) - 1)).eq(valor)
    .and(imagem.select('classification_' + ano).neq(valor))
    .and(imagem.select('classification_' + (parseInt(ano) + 1)).neq(valor))
    .and(imagem.select('classification_' + (parseInt(ano) + 2)).neq(valor))
    .and(imagem.select('classification_' + (parseInt(ano) + 3)).eq(valor));

  var muda_img  = imagem.select('classification_' + ano).mask(mask.eq(1)).where(mask.eq(1), valor);
  var muda_img1 = imagem.select('classification_' + (parseInt(ano) + 1)).mask(mask.eq(1)).where(mask.eq(1), valor);
  var muda_img2 = imagem.select('classification_' + (parseInt(ano) + 2)).mask(mask.eq(1)).where(mask.eq(1), valor);

  var img_out = imagem.select('classification_' + ano)
    .blend(muda_img)
    .blend(muda_img1)
    .blend(muda_img2);

  return img_out;
};

// -----------------------------------------------------------------------------
// Year lists used by each temporal window (avoid out-of-range access)
// -----------------------------------------------------------------------------
var anos3 = []; // supports ano+1 up to 2024  → iterate 1986..2023
for (var y3 = 1986; y3 <= 2023; y3++) anos3.push(String(y3));

var anos4 = []; // supports ano+2 up to 2024  → iterate 1986..2022
for (var y4 = 1986; y4 <= 2022; y4++) anos4.push(String(y4));

var anos5 = []; // supports ano+3 up to 2024  → iterate 1986..2021
for (var y5 = 1986; y5 <= 2021; y5++) anos5.push(String(y5));

// -----------------------------------------------------------------------------
// Window application helpers (kept consistent with your original outputs)
// -----------------------------------------------------------------------------
var window5years = function(imagem, valor) {
  var img_out = imagem.select('classification_1985');
  for (var i = 0; i < anos5.length; i++) {
    img_out = img_out.addBands(mask5(valor, anos5[i], imagem));
  }
  img_out = img_out.addBands(imagem.select('classification_2022'));
  img_out = img_out.addBands(imagem.select('classification_2023'));
  img_out = img_out.addBands(imagem.select('classification_2024'));
  return img_out;
};

var window4years = function(imagem, valor) {
  var img_out = imagem.select('classification_1985');
  for (var i = 0; i < anos4.length; i++) {
    img_out = img_out.addBands(mask4(valor, anos4[i], imagem));
  }
  img_out = img_out.addBands(imagem.select('classification_2023'));
  img_out = img_out.addBands(imagem.select('classification_2024'));
  return img_out;
};

var window3years = function(imagem, valor) {
  var img_out = imagem.select('classification_1985');
  for (var i = 0; i < anos3.length; i++) {
    img_out = img_out.addBands(mask3(valor, anos3[i], imagem));
  }
  img_out = img_out.addBands(imagem.select('classification_2024'));
  return img_out;
};

// -----------------------------------------------------------------------------
// Build the "original" chronological band stack (1985 → 2024)
// -----------------------------------------------------------------------------
var original = image_in.select('classification_1985');
for (var iy = 0; iy < anos3.length; iy++) {
  original = original.addBands(image_in.select('classification_' + anos3[iy]));
}
original = original.addBands(image_in.select('classification_2024'));

// Working image
var filtered = original;

// -----------------------------------------------------------------------------
// Boundary fix: first year (1985) correction
// -----------------------------------------------------------------------------

// (EN) If 1985 != valor but 1986 == valor AND 1987 == valor → set 1985 = valor
// Then rebuild the full band stack in order.
var mask3first = function(valor, imagem) {
  var mask = imagem.select('classification_1985').neq(valor)
    .and(imagem.select('classification_1986').eq(valor))
    .and(imagem.select('classification_1987').eq(valor));

  var corrected1985 = imagem.select('classification_1985')
    .mask(mask.eq(1))
    .where(mask.eq(1), valor);

  var out = imagem.select('classification_1985').blend(corrected1985);

  // Append the rest of the years unchanged (1986..2024)
  for (var y = 1986; y <= 2024; y++) {
    out = out.addBands(imagem.select('classification_' + y));
  }
  return out;
};

// Apply first-year fixes (order preserved)
filtered = mask3first(33, filtered); // water
filtered = mask3first(22, filtered);
filtered = mask3first(3,  filtered);
filtered = mask3first(18, filtered);
filtered = mask3first(15, filtered);
filtered = mask3first(12, filtered);
filtered = mask3first(11, filtered);
filtered = mask3first(9,  filtered);

// -----------------------------------------------------------------------------
// Boundary fix: last years (as implemented in the original script)
// -----------------------------------------------------------------------------

// (EN) This is preserved as-is (including its conditions).
// It attempts to correct 2023/2024 based on a pattern involving 2022/2023/2024.
var mask4last = function(valor, imagem) {
  var mask = imagem.select('classification_2022').eq(valor)
    .and(imagem.select('classification_2023').eq(valor))
    .and(imagem.select('classification_2023').eq(12))
    .and(imagem.select('classification_2024').eq(12));

  var muda_img  = imagem.select('classification_2023').mask(mask.eq(1)).where(mask.eq(1), valor);
  var muda_img2 = imagem.select('classification_2024').mask(mask.eq(1)).where(mask.eq(1), valor);

  var out = imagem.select('classification_1985');
  for (var y = 1986; y <= 2023; y++) {
    out = out.addBands(imagem.select('classification_' + y));
  }

  // Append corrected 2024 (blending the forced values)
  out = out.addBands(imagem.select('classification_2024').blend(muda_img).blend(muda_img2));
  return out;
};

// Apply last-year rule (order preserved)
filtered = mask4last(18, filtered);
filtered = mask4last(15, filtered);
filtered = mask4last(9,  filtered);

print(filtered, 'After boundary fixes');

// -----------------------------------------------------------------------------
// General temporal filtering (execution order preserved)
// -----------------------------------------------------------------------------
var ordem_exec = [18, 15, 9];

// Apply the 4-year window rule for each class in ordem_exec
for (var ic = 0; ic < ordem_exec.length; ic++) {
  filtered = window4years(filtered, ordem_exec[ic]);
}

// -----------------------------------------------------------------------------
// QA visualization: original vs filtered
// -----------------------------------------------------------------------------
Map.addLayer(original, vis5, 'original', false);
Map.addLayer(filtered, vis5, 'filtered', true);

// -----------------------------------------------------------------------------
// Export to Asset
// -----------------------------------------------------------------------------
filtered = filtered.set('version', versionOut);

Export.image.toAsset({
  image: filtered,
  description: '_class_' + versionOut,
  assetId: dirout + '_class_' + versionOut,
  pyramidingPolicy: { '.default': 'mode' },
  region: geometryPampa,
  scale: 30,
  maxPixels: 1e13
});
