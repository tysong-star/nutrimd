/**
 * Citește informațiile publice de pe nr1.md și le salvează în public/data/nr1.json.
 * Rulează zilnic în GitHub Actions înainte de build (vezi .github/workflows/deploy.yml).
 *
 * Ce se preia (doar referințe, nu copii ale conținutului):
 *  - magazinele: adresă, program, coordonate (informație factuală)
 *  - ofertele speciale și broșura de promoții: titlu, imagine de previzualizare, link
 *  - rețetele: titlu, imagine de previzualizare, link (textul rețetei rămâne pe nr1.md)
 *
 * Prețurile Nr1 nu sunt publicate ca text (doar în imaginile ofertelor/broșurilor), deci nu se preiau.
 * Linella.md e protejat de Cloudflare împotriva accesului automat și nu este citit.
 * Respectăm site-ul: 4 cereri pe zi, User-Agent identificabil. Dacă ceva eșuează, se păstrează fișierul anterior.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";

const BASE = "https://nr1.md";
const OUT = new URL("../public/data/nr1.json", import.meta.url);
const UA = "NutriMD/1.0 (aplicatie personala de planificare a meselor; o actualizare pe zi)";

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
const abs = (u) => (u.startsWith("http") ? u.replace(/^http:/, "https:") : BASE + u);

async function get(path) {
  const res = await fetch(BASE + path, { headers: { "User-Agent": UA, "Accept-Language": "ro" } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

/** Titluri scurte: „La supermarketurile Nr1, doar între 21.11 - 23.11” → „Oferte · 21.11 – 23.11”. */
function shortTitle(t) {
  let m = t.match(/doar între\s+(.+)$/i);
  if (m) return `Oferte · ${m[1].replace(/\s*-\s*/, " – ")}`;
  m = t.match(/^Booklet\s+(.+)$/i);
  if (m) return `Catalog promoții · ${m[1].replace(/\s*-\s*/, "–")}`;
  return t.replace(/\s*la Supermarketul Nr1!?/i, "").replace(/!$/, "");
}

/** Elementele de tip listă: <a class="img" href=…><img src=…></a><h4><a …>Titlu</a></h4> */
function listItems(html, section) {
  const out = [];
  const re = new RegExp(`<a[^>]+href="(/ro/${section}/[^"]+)"[^>]*>\\s*<img[^>]+src="([^"]+)"[\\s\\S]*?<h4>\\s*<a[^>]*>([\\s\\S]*?)</a>`, "g");
  for (const m of html.matchAll(re)) out.push({ url: abs(m[1]), image: abs(m[2]), title: shortTitle(decode(m[3].replace(/<[^>]+>/g, ""))) });
  return out;
}

function recipes(html) {
  const out = [];
  const re = /<div class="img"><a href="(\/ro\/recipes\/[^"]+)"><img src="([^"]+)"><\/a><\/div><h4><a[^>]*>([\s\S]*?)<\/a><\/h4>[\s\S]*?<div class="pers">([\s\S]*?)<\/div>/g;
  for (const m of html.matchAll(re)) out.push({ url: abs(m[1]), image: abs(m[2]), title: decode(m[3]), persons: decode(m[4]) });
  return out;
}

function shops(html) {
  const out = [];
  const re = /mapdata\[\d+\]\[0\]=\["([\d.]+),\s*([\d.]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*"([^"]*)"\]/g;
  for (const m of html.matchAll(re)) out.push({ lat: Number(m[1]), lng: Number(m[2]), address: decode(m[3]), url: abs(m[4]), hours: decode(m[5]) });
  return out;
}

async function main() {
  let previous = null;
  try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch { /* prima rulare */ }
  try {
    const [deals, booklets, rec, shopHtml] = await Promise.all([get("/ro/super-deals/"), get("/ro/booklets/"), get("/ro/recipes/"), get("/ro/shops/")]);
    const data = {
      source: BASE,
      updatedAt: new Date().toISOString(),
      offers: listItems(deals, "super-deals").slice(0, 8),
      booklets: listItems(booklets, "booklets").slice(0, 3),
      recipes: recipes(rec),
      shops: shops(shopHtml),
    };
    if (!data.shops.length && !data.offers.length) throw new Error("structura site-ului s-a schimbat — nimic găsit");
    await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
    await writeFile(OUT, JSON.stringify(data, null, 1));
    console.log(`nr1.json: ${data.offers.length} oferte, ${data.booklets.length} broșuri, ${data.recipes.length} rețete, ${data.shops.length} magazine`);
  } catch (e) {
    console.warn("Nu am putut actualiza datele Nr1:", e.message, previous ? "(păstrez versiunea anterioară)" : "");
    if (!previous) {
      await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
      await writeFile(OUT, JSON.stringify({ source: BASE, updatedAt: null, offers: [], booklets: [], recipes: [], shops: [] }));
    }
  }
}

main();
