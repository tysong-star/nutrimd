/**
 * NutriMD — backend Google Sheets (Apps Script).
 *
 * Instalare (detalii în GHID-GOOGLE-SHEETS.md):
 *   1. Creează un Google Sheet nou → Extensii → Apps Script → lipește acest fișier.
 *   2. Rulează o dată funcția `setup` (creează foile și generează codul secret).
 *   3. Implementare → Implementare nouă → Aplicație web:
 *        Execută ca: Eu  ·  Cine are acces: Oricine
 *   4. Copiază URL-ul (/exec) și codul secret din foaia „Config” în aplicație (Profil → Google Sheets).
 *
 * Foi:
 *   Preturi    — prețurile produselor, editate de voi (aceleași coloane ca importul CSV)
 *   Lista      — lista de cumpărături comună (se poate bifa și direct în tabel)
 *   Cheltuieli — cumpărăturile înregistrate din aplicație
 *   Config     — codul secret
 */

/**
 * Opțional: ID-ul tabelului (pentru un script „standalone”, nelegat de tabel) și un cod secret fix.
 * Dacă sunt goale, se folosesc tabelul-părinte și codul generat de `setup`.
 */
var SPREADSHEET_ID = '';
var FIXED_TOKEN = '';

function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function token_() {
  return PropertiesService.getScriptProperties().getProperty('TOKEN') || FIXED_TOKEN;
}

var SHEETS = {
  Preturi: ['store_id', 'ean', 'ingredient_id', 'name', 'brand', 'pack_size', 'pack_label', 'price', 'promo_price', 'promo_until', 'in_stock', 'by_weight', 'updated_at'],
  Lista: ['id', 'produs', 'cantitate', 'unitate', 'raion', 'bifat', 'cine', 'actualizat'],
  Cheltuieli: ['data', 'suma', 'magazin', 'cine'],
};

/** Rulează o singură dată: creează foile și codul secret. */
function setup() {
  var ss = ss_();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(SHEETS[name]);
      sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold').setBackground('#d1fadf');
      sh.setFrozenRows(1);
    }
  });
  // Atenție: NU pre-inserăm căsuțe pe tot tabelul — o căsuță goală conține FALSE și
  // ar muta getLastRow()/appendRow după rândul 1000. Căsuța se pune rând cu rând.

  var cfg = ss.getSheetByName('Config') || ss.insertSheet('Config');
  var token = token_();
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    PropertiesService.getScriptProperties().setProperty('TOKEN', token);
  }
  cfg.clear();
  cfg.getRange('A1:B3').setValues([
    ['Cod secret (copiază în aplicație)', token],
    ['URL', 'Implementare → Gestionează implementările → copiază URL-ul aplicației web'],
    ['Notă', 'Nu publica codul. Dacă îl schimbi: șterge proprietatea TOKEN din Setările proiectului și rulează setup din nou.'],
  ]);
  cfg.autoResizeColumns(1, 2);
  var sheet1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Foaie1');
  if (sheet1 && sheet1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sheet1);
  try { SpreadsheetApp.getUi().alert('NutriMD e gata. Codul secret: ' + token); } catch (e) { Logger.log('Cod secret: ' + token); }
}

// ---------------------------------------------------------------- HTTP

function doGet(e) {
  return handle_(e.parameter || {});
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, error: 'json invalid' }); }
  return handle_(body);
}

function handle_(req) {
  var token = token_();
  if (!token || req.token !== token) return json_({ ok: false, error: 'cod secret greșit' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    switch (req.action) {
      case 'ping': return json_({ ok: true, sheet: ss_().getName() });
      case 'prices': return json_({ ok: true, rows: readRows_('Preturi') });
      case 'seedPrices': return json_(seedPrices_(req.rows || [], !!req.replace));
      case 'list': return json_({ ok: true, rows: readRows_('Lista') });
      case 'mergeList': return json_(mergeList_(req.items || [], req.who || ''));
      case 'check': return json_(check_(req.id, !!req.checked, req.who || ''));
      case 'addItem': return json_(mergeList_([{ id: 'manual-' + Date.now(), produs: req.name, cantitate: '', unitate: '', raion: 'other' }], req.who || ''));
      case 'clearChecked': return json_(clearChecked_());
      case 'spend': appendRow_('Cheltuieli', [req.date, Number(req.amount) || 0, req.store || '', req.who || '']); return json_({ ok: true });
      case 'spending': return json_({ ok: true, rows: readRows_('Cheltuieli') });
      case 'crocoStatus': return json_({ ok: true, rows: ss_().getSheetByName('Croco') ? readRows_('Croco').length : 0 });
      default: return json_({ ok: false, error: 'acțiune necunoscută' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- Operații

function seedPrices_(rows, replace) {
  var sh = sheet_('Preturi');
  var headers = SHEETS.Preturi;
  var existing = readRows_('Preturi');
  var keys = {};
  existing.forEach(function (r) { keys[r.store_id + ':' + r.ean] = true; });
  if (replace && sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  var now = new Date().toISOString();
  var values = rows
    .filter(function (r) { return replace || !keys[r.store_id + ':' + r.ean]; })
    .map(function (r) { return headers.map(function (h) { return h === 'updated_at' ? (r[h] || now) : (r[h] === undefined || r[h] === null ? '' : r[h]); }); });
  if (values.length) {
    var start = sh.getLastRow() + 1;
    // EAN ca text (înainte de scriere), ca Google Sheets să nu-l transforme în număr științific
    sh.getRange(start, 2, values.length, 1).setNumberFormat('@');
    sh.getRange(start, 1, values.length, headers.length).setValues(values);
  }
  return { ok: true, added: values.length };
}

function mergeList_(items, who) {
  var sh = sheet_('Lista');
  var rows = readRows_('Lista');
  var now = new Date().toISOString();
  var added = 0, updated = 0;
  items.forEach(function (it) {
    var idx = -1;
    for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(it.id) && !isTrue_(rows[i].bifat)) { idx = i; break; }
    if (idx >= 0 && it.cantitate !== '' && rows[idx].unitate === it.unitate) {
      var qty = Number(rows[idx].cantitate || 0) + Number(it.cantitate || 0);
      sh.getRange(idx + 2, 3).setValue(Math.round(qty * 100) / 100);
      sh.getRange(idx + 2, 7, 1, 2).setValues([[mergeWho_(rows[idx].cine, who), now]]);
      rows[idx].cantitate = qty;
      updated++;
    } else {
      sh.appendRow([it.id, it.produs, it.cantitate, it.unitate, it.raion, false, who, now]);
      sh.getRange(sh.getLastRow(), 6).insertCheckboxes().setValue(false);
      rows.push({ id: it.id, produs: it.produs, cantitate: it.cantitate, unitate: it.unitate, raion: it.raion, bifat: false, cine: who });
      added++;
    }
  });
  return { ok: true, added: added, updated: updated };
}

function check_(id, checked, who) {
  var sh = sheet_('Lista');
  var rows = readRows_('Lista');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(id)) {
      sh.getRange(i + 2, 6).setValue(checked);
      sh.getRange(i + 2, 8).setValue(new Date().toISOString());
      return { ok: true };
    }
  }
  return { ok: false, error: 'produsul nu e în listă' };
}

function clearChecked_() {
  var sh = sheet_('Lista');
  var rows = readRows_('Lista');
  var removed = 0;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (isTrue_(rows[i].bifat)) { sh.deleteRow(i + 2); removed++; }
  }
  return { ok: true, removed: removed };
}

// ---------------------------------------------------------------- Utilitare

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Lipsește foaia „' + name + '”. Rulează funcția setup.');
  return sh;
}

function readRows_(name) {
  var sh = sheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  return values.slice(1)
    .filter(function (r) { return r.some(function (c) { return c !== '' && c !== false; }); })
    .map(function (r) {
      var o = {};
      headers.forEach(function (h, j) { o[h] = r[j] instanceof Date ? r[j].toISOString() : r[j]; });
      return o;
    });
}

function appendRow_(name, row) {
  sheet_(name).appendRow(row);
}

function isTrue_(v) {
  return v === true || String(v).toLowerCase() === 'true' || v === 1 || v === '1';
}

function mergeWho_(a, b) {
  var set = String(a || '').split(',').map(function (s) { return s.trim(); }).filter(String);
  if (b && set.indexOf(b) < 0) set.push(b);
  return set.join(', ');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ======================================================================
// Prețuri din cataloagele de pe croco.md (rulează zilnic, din contul tău)
// ======================================================================
// Croco.md permite programelor obișnuite să-i citească paginile (robots.txt: User-agent: *).
// Scriptul se prezintă onest, citește doar categoriile alimentare, cu pauză între cereri, o dată pe zi.
// Rezultat: foaia „Croco” (toate produsele găsite) + rândurile potrivite cu ingredientele aplicației în „Preturi”.

var CROCO_SUBCATEGORIES = [1, 2, 4, 5, 6, 7, 8, 10, 13, 14, 15, 16, 26, 29, 47];
var CROCO_MAX_PAGES = 15;
var CROCO_UA = 'NutriMD/1.0 (aplicatie personala de planificare a meselor; o actualizare pe zi)';
var PRETURI_EXTRA = ['image', 'sursa', 'url', 'store_name'];

/** Rulează o dată ca să pornești actualizarea automată zilnică (în jurul orei 6:00). */
function porneste_actualizarea_zilnica() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'actualizeazaCroco') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('actualizeazaCroco').timeBased().everyDays(1).atHour(6).create();
  actualizeazaCroco();
}

/** Descarcă produsele din categoriile alimentare și actualizează tabelul. */
function actualizeazaCroco() {
  var start = Date.now();
  var all = [];
  for (var i = 0; i < CROCO_SUBCATEGORIES.length; i++) {
    var sid = CROCO_SUBCATEGORIES[i];
    var seen = {};
    for (var page = 1; page <= CROCO_MAX_PAGES; page++) {
      if (Date.now() - start > 300000) break; // limita Apps Script: 6 minute
      var res = UrlFetchApp.fetch('https://croco.md/ro/produse-subcategory/' + sid + '?page=' + page, {
        muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': CROCO_UA, 'Accept-Language': 'ro' },
      });
      if (res.getResponseCode() !== 200) break;
      var fresh = parseCroco_(res.getContentText()).filter(function (p) { if (seen[p.key]) return false; seen[p.key] = 1; return true; });
      if (!fresh.length) break;
      all = all.concat(fresh);
      Utilities.sleep(800);
    }
  }
  scrieCroco_(all);
  return all.length;
}

/** Extrage cardurile de produs din HTML-ul unei pagini Croco. */
function parseCroco_(html) {
  var out = [];
  var re = /<a href="(https:\/\/croco\.md\/ro\/catalog\/[^"]+)"[^>]*data-product-viewer-trigger[^>]*>([\s\S]*?)<\/a>/g;
  var m;
  while ((m = re.exec(html))) {
    var body = m[2];
    var name = /<p class="line-clamp-2[^"]*">\s*([\s\S]*?)\s*<\/p>/.exec(body);
    var price = /text-brand-green">\s*([\d.,]+)\s*lei/.exec(body);
    if (!name || !price) continue;
    var old = /line-through">\s*([\d.,]+)/.exec(body);
    var store = /<span class="absolute right-2[^>]*>\s*<img[^>]+alt="([^"]*)"/.exec(body);
    var img = /<img src="([^"]+)"/.exec(body);
    var exp = /Expiră\s+(?:în\s+(\d+)\s+zile|(azi)|(mâine))/.exec(body);
    var days = exp ? (exp[1] ? Number(exp[1]) : exp[2] ? 0 : 1) : null;
    var n = decodeHtml_(name[1]);
    var s = store ? decodeHtml_(store[1]) : '';
    out.push({
      key: s + '|' + n, name: n, store: s, url: m[1],
      price: Number(price[1].replace(',', '.')), old: old ? Number(old[1].replace(',', '.')) : null,
      image: img && /^https?:/.test(img[1]) ? img[1] : '', days: days,
    });
  }
  return out;
}

function decodeHtml_(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function plain_(s) {
  // elimină diacriticele: ă→a, ș→s, ț→t, î→i (inclusiv variantele cu sedilă ş/ţ)
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u015f/g, 's').replace(/\u0163/g, 't');
}

/** Reguli: [ingredient, se potrivește, exclude]. Ordinea contează (cele specifice întâi). */
var CROCO_RULES = [
  ['sweet_potato', /cartof\w* dulc|batat/], ['potato', /\bcartof/, /dulc|chips|pai|piure|prajit|congel|fri|snack/],
  ['green_onion', /ceapa verde/], ['onion', /\bceapa\b/, /prajit|praf|chips|crocant/],
  ['garlic', /\busturoi\b/, /praf|sos|granul|uscat/], ['carrot', /\bmorcov/, /suc|coreean|salat|piure/],
  ['beet', /sfecl/, /suc|salat|zahar/], ['sauerkraut', /varza murat/],
  ['cabbage', /\bvarza\b/, /murat|calit|salat|rosie|chinez|bruxelles|sarmal/],
  ['canned_tomato', /(rosii|tomate) (decojite|in suc|tocate|cuburi)/], ['tomato_paste', /past[ae] de tomate|bulion\b/],
  ['tomato', /\brosii\b|\btomate\b/, /past|suc|sos|ketchup|conserv|uscat|marinat|murat/],
  ['cucumber', /castrave/, /murat|marinat|conserv/], ['bell_pepper', /ardei/, /iute|boia|praf|umplut|conserv|marinat|copt|chili/],
  ['eggplant', /vinet/, /salat|icre|caviar|conserv|zacusca/], ['zucchini', /dovlecel/, /icre|caviar|conserv|chips/],
  ['pumpkin', /\bdovleac/, /seminte|ulei|suc/], ['broccoli', /broccoli/], ['cauliflower', /conopid/],
  ['spinach', /spanac/], ['lettuce', /salata (verde|iceberg|romana|frunze)|\biceberg\b/],
  ['mushrooms', /ciuperc|champignon/, /conserv|marinat|sos|supa|pate/], ['dill', /\bmarar\b/], ['parsley', /patrunjel/],
  ['celery', /telina/, /sare/], ['avocado', /avocado/, /ulei|sos/], ['green_beans', /fasole verde|pastai/],
  ['green_peas', /mazare/, /conserv|chips/], ['corn', /porumb dulce|porumb.*conserv/],
  ['apple', /\bmer[ei]\b/, /suc|chips|piure|uscat|otet|placint/], ['banana', /banan/, /chips|piure|suc|baton/],
  ['lemon', /\blama/, /suc|sos|ceai|bautur/], ['orange', /portocal/, /suc|nectar|gem|ceai|bautur/],
  ['berries', /fructe de padure|\bafine|zmeur/, /gem|ceai|suc|iaurt|ciocolat/], ['plums_dried', /prune uscat/], ['raisins', /stafid/],
  ['eggs', /\boua\b/, /ciocolat|kinder|surpriz/],
  ['oat_milk', /(bautura|lapte).*ovaz/], ['coconut_milk', /lapte de cocos/],
  ['milk', /\blapte\b/, /praf|condens|ciocolat|soia|migdal|batut|copii|bebe|vegetal|cocos|ovaz|baton|crem/],
  ['kefir', /chefir|kefir/], ['greek_yogurt', /iaurt grecesc/], ['soy_yogurt', /iaurt.*soia/],
  ['cottage_cheese', /branza de vaci|\bcas\b/, /desert|glazur|cascaval|baton/],
  ['feta', /\bfeta\b/], ['parmesan', /parmez|parmigian|grana padano/], ['mozzarella', /mozzarel/],
  ['sheep_cheese', /branza de oi|telemea|brinza|bryndza/], ['hard_cheese', /cascaval/, /afumat|topit/],
  ['sour_cream', /smantan/, /sos|inghetat/], ['peanut_butter', /(unt|pasta) de arahide/], ['butter', /\bunt\b/, /cacao|arahide/],
  ['chicken_breast', /(piept|file|fileu) de pui/], ['chicken_thigh', /pulp\w* de pui|copan/], ['chicken_whole', /pui intreg|carcasa de pui|\bgaina\b/],
  ['turkey', /curcan/, /salam|parizer|crenvurst|sunca|carnat/], ['minced_meat', /carne tocat|tocatura/],
  ['beef', /\bvita\b/, /mici|carnat|salam|tocat|crenvurst|parizer|conserv|sunca|bulion|pate|porc/],
  ['pork_lean', /(muschi|cotlet|file) de porc/, /afumat|marinat/],
  ['salmon', /somon/, /afumat|sarat|icre|conserv|pate/], ['cod', /\bcod\b|merluciu|\bhek\b|\bhake\b/],
  ['mackerel', /scrumbie|macrou/, /conserv|afumat|sarat/], ['tuna_can', /\bton\b/], ['shrimp', /crevet/],
  ['cornmeal', /malai|faina de porumb/], ['brown_rice', /orez (brun|integral)/], ['rice_noodles', /taitei de orez/],
  ['rice', /\borez\b/, /brun|integral|lapte|taitei|faina|biscuit|vafe|napolitan|chips/], ['buckwheat', /hrisc/],
  ['oats', /fulgi de ovaz|\bovaz\b/, /lapte|bautura|biscuit|baton/], ['quinoa', /quinoa/], ['bulgur', /bulgur/],
  ['pasta_wholegrain', /\bpaste\b|spaghet|penne|fusilli|macaroan|farfalle/, /de tomate|de dinti|pasta de/],
  ['gf_flour', /faina fara gluten/], ['flour', /\bfaina\b/, /porumb|orez|ovaz|fara gluten/],
  ['wholegrain_bread', /paine integral/], ['lavash', /lavas|lipie/],
  ['white_beans', /fasole alba/], ['red_lentils', /\blinte/], ['chickpeas', /\bnaut/], ['tofu', /tofu/], ['soy_sauce', /sos de soia/],
  ['walnuts', /\bnuci\b|miez de nuc/, /cocos|caju|ciocolat/], ['almonds', /migdal/, /lapte|bautura|ciocolat/], ['tahini', /tahini/],
  ['sunflower_seeds', /seminte de floarea/], ['pumpkin_seeds', /seminte de dovleac/], ['chia', /\bchia\b/], ['sesame', /\bsusan\b/],
  ['sunflower_oil', /ulei de floarea/], ['olive_oil', /ulei de masline/], ['salt', /\bsare\b/, /alune|biscuit|snack|chips|telina/],
  ['black_pepper', /piper negru/], ['paprika', /\bboia\b/], ['cumin', /chimion|\bcumin/], ['curry', /\bcurry\b/],
  ['bay_leaf', /dafin/], ['mustard', /mustar/], ['vinegar', /\botet\b/], ['honey', /\bmiere\b/, /turta|biscuit/],
  ['maple_syrup', /sirop de artar/], ['sugar', /\bzahar\b/, /fara zahar|vanil/], ['cocoa', /cacao/, /ciocolat|baton|biscuit|unt/],
  ['baking_powder', /praf de copt/], ['vegetable_broth', /supa.*legum|bulion de legume/], ['ginger', /ghimbir/], ['olives', /masline/, /ulei/],
];

function matchIngredient_(name) {
  var p = plain_(name);
  for (var i = 0; i < CROCO_RULES.length; i++) {
    var r = CROCO_RULES[i];
    if (r[1].test(p) && !(r[2] && r[2].test(p))) return r[0];
  }
  return null;
}

/** Ambalajul din nume: „500g”, „1 L”, „10 buc”, „kg” (la cântar). → {size, label, byWeight} în g/ml/buc */
function packOf_(name) {
  var p = plain_(name).replace(/,/g, '.');
  var m = /(\d+(?:\.\d+)?)\s*(kg|g|gr|ml|l|buc|bucati)\b/.exec(p);
  if (m) {
    var q = Number(m[1]), u = m[2];
    if (u === 'kg') return { size: q * 1000, label: q + ' kg', byWeight: 0 };
    if (u === 'l') return { size: q * 1000, label: q + ' l', byWeight: 0 };
    if (u === 'buc' || u === 'bucati') return { size: q, label: q + ' buc', byWeight: 0, pcs: true };
    return { size: q, label: q + ' ' + (u === 'ml' ? 'ml' : 'g'), byWeight: 0 };
  }
  if (/\bkg\b|per kg|\/kg/.test(p)) return { size: 1000, label: '1 kg (la cântar)', byWeight: 1 };
  return null;
}

function storeId_(storeName) {
  return plain_(storeName).replace(/[^a-z0-9]+/g, '') || 'croco';
}

function eanOf_(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 99999999999;
  return '29' + ('00000000000' + h).slice(-11);
}

function scrieCroco_(products) {
  var ss = ss_();
  var today = new Date();
  // 1) Foaia „Croco”: tot ce s-a găsit, pentru consultare.
  var sh = ss.getSheetByName('Croco') || ss.insertSheet('Croco');
  sh.clear();
  var rows = [['magazin', 'produs', 'pret', 'pret_vechi', 'expira', 'ingredient', 'link', 'imagine', 'actualizat']];
  products.forEach(function (p) {
    var until = p.days === null ? '' : Utilities.formatDate(new Date(today.getTime() + p.days * 864e5), 'Europe/Chisinau', 'yyyy-MM-dd');
    p.until = until;
    p.ingredient = matchIngredient_(p.name);
    rows.push([p.store, p.name, p.price, p.old || '', until, p.ingredient || '', p.url, p.image, today.toISOString()]);
  });
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#d1fadf');
  sh.setFrozenRows(1);

  // 2) „Preturi”: păstrăm rândurile manuale, înlocuim rândurile venite din Croco.
  var pr = sheet_('Preturi');
  var headers = SHEETS.Preturi.concat(PRETURI_EXTRA);
  var existing = readRows_('Preturi').filter(function (r) { return String(r.sursa || '') !== 'croco'; });
  var fresh = [];
  products.forEach(function (p) {
    if (!p.ingredient || !p.store) return;
    var pack = packOf_(p.name);
    if (!pack) return;
    var promo = p.old && p.old > p.price;
    fresh.push({
      store_id: storeId_(p.store), ean: eanOf_(p.store + '|' + p.name), ingredient_id: p.ingredient, name: p.name, brand: '',
      pack_size: pack.size, pack_label: pack.label, price: promo ? p.old : p.price, promo_price: promo ? p.price : '',
      promo_until: promo ? p.until : '', in_stock: 1, by_weight: pack.byWeight, updated_at: today.toISOString(),
      image: p.image, sursa: 'croco', url: p.url, store_name: p.store,
    });
  });
  var values = [headers].concat(existing.concat(fresh).map(function (r) {
    return headers.map(function (h) { var v = r[h]; return v === undefined || v === null ? '' : v; });
  }));
  pr.clearContents();
  pr.getRange(1, 1, values.length, headers.length).setValues(values);
  return { found: products.length, matched: fresh.length };
}
