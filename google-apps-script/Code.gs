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
