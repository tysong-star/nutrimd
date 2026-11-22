import type { Product, Store, StoreLocation } from "@/lib/types";
import { INGREDIENTS } from "./ingredients";
import { rng } from "@/lib/random";

/**
 * Rețele de magazine. Linkurile online trebuie verificate/actualizate la integrarea reală.
 * `priceFactor` este folosit DOAR pentru generarea prețurilor demo.
 * Pentru a adăuga o rețea nouă: adaug-o aici sau din Admin → Magazine.
 */
export const STORES: Store[] = [
  { id: "linella", name: "Linella", color: "#e11d48", onlineUrl: "https://linella.md", deliveryUrl: "https://linella.md", cities: ["Chișinău", "Bălți", "Cahul", "Orhei", "Ungheni", "Comrat", "Soroca"], priceFactor: 1.0, source: "demo" },
  { id: "nr1", name: "Nr1", color: "#2563eb", onlineUrl: "https://nr1.md", cities: ["Chișinău", "Bălți", "Orhei", "Ungheni", "Soroca"], priceFactor: 0.97, source: "demo" },
  { id: "metro", name: "Metro Cash & Carry", color: "#1e3a8a", onlineUrl: "https://metro.md", deliveryUrl: "https://metro.md", cities: ["Chișinău", "Bălți"], priceFactor: 0.91, source: "demo" },
  { id: "fidesco", name: "Fidesco", color: "#ea580c", onlineUrl: "https://fidesco.md", cities: ["Chișinău", "Bălți", "Cahul", "Comrat"], priceFactor: 1.03, source: "demo" },
  { id: "greenhills", name: "Green Hills", color: "#16a34a", onlineUrl: "https://greenhills.md", cities: ["Chișinău"], priceFactor: 1.09, source: "demo" },
  // Fără prețuri demo: produsele Kaufland vin doar din tabelul Google (prețuri reale).
  { id: "kaufland", name: "Kaufland", color: "#e10915", cities: ["Chișinău"], priceFactor: 1, source: "feed" },
];

export const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Chișinău", lat: 47.0105, lng: 28.8638 },
  { name: "Bălți", lat: 47.7617, lng: 27.9289 },
  { name: "Cahul", lat: 45.9075, lng: 28.1944 },
  { name: "Orhei", lat: 47.3831, lng: 28.8231 },
  { name: "Ungheni", lat: 47.2108, lng: 27.8006 },
  { name: "Comrat", lat: 46.2953, lng: 28.6578 },
  { name: "Soroca", lat: 48.1558, lng: 28.2975 },
];

/** Puncte DEMO (coordonate aproximative generate în jurul centrului orașului). */
export const STORE_LOCATIONS: StoreLocation[] = STORES.filter((s) => s.source === "demo").flatMap((store) =>
  store.cities.flatMap((city) => {
    const c = CITIES.find((x) => x.name === city)!;
    const rand = rng(`${store.id}-${city}`);
    const n = city === "Chișinău" ? (store.id === "metro" ? 2 : 4) : 1;
    return Array.from({ length: n }, (_, i) => ({
      storeId: store.id,
      city,
      label: `${store.name} — ${city} #${i + 1} (demo)`,
      lat: c.lat + (rand() - 0.5) * (city === "Chișinău" ? 0.07 : 0.02),
      lng: c.lng + (rand() - 0.5) * (city === "Chișinău" ? 0.1 : 0.03),
    }));
  }),
);

// ---------- Generare produse demo ----------

const BRANDS = ["Producător local", "Marca magazinului", "Import", "Bio", "Premium"];

/** Ambalaje tipice în funcție de ingredient. Returnează [cantitate, etichetă]. */
function packOptions(ing: (typeof INGREDIENTS)[number]): [number, string][] {
  if (ing.unit === "pcs") {
    if (ing.id === "eggs") return [[10, "10 buc"], [30, "30 buc"]];
    return [[1, "1 buc"], [3, "3 buc"]];
  }
  const u = ing.unit === "ml" ? "ml" : "g";
  const big = ing.unit === "ml" ? "l" : "kg";
  switch (ing.aisle) {
    case "spices":
      return ing.unit === "ml" ? [[150, "150 ml"], [500, "500 ml"]] : [[50, "50 g"], [200, "200 g"]];
    case "vegetables":
    case "fruits":
      return ing.refPricePerKg > 70 ? [[100, `100 ${u}`], [250, `250 ${u}`]] : [[1000, `1 ${big} (la cântar)`], [2000, `2 ${big} (plasă)`]];
    case "meat":
    case "fish":
      return ing.refPricePerKg > 200 ? [[250, "250 g"], [500, "500 g"]] : [[500, "500 g"], [1000, "1 kg"]];
    case "oils":
    case "drinks":
      return [[1000, `1 ${big}`], [500, `500 ${u}`]];
    case "dairy":
      if (ing.unit === "ml") return [[1000, "1 l"], [500, "500 ml"]];
      return ing.refPricePerKg >= 300 ? [[100, `100 ${u}`], [200, `200 ${u}`]] : [[200, `200 ${u}`], [400, `400 ${u}`]];
    case "canned":
      return ing.refPricePerKg >= 150 ? [[160, `160 ${u}`], [400, `400 ${u}`]] : [[400, `400 ${u}`], [800, `800 ${u}`]];
    case "nuts":
      return [[100, `100 ${u}`], [250, `250 ${u}`]];
    default:
      // Produse scumpe (cacao, miere, proteină) se vând în ambalaje mici.
      if (ing.refPricePerKg >= 150) return [[100, `100 ${u}`], [250, `250 ${u}`]];
      if (ing.refPricePerKg >= 60) return [[250, `250 ${u}`], [500, `500 ${u}`]];
      return [[500, `500 ${u}`], [1000, `1 ${big}`]];
  }
}

function ean13(seed: string): string {
  const rand = rng(seed);
  let digits = "484"; // prefix GS1 Moldova
  while (digits.length < 12) digits += Math.floor(rand() * 10);
  const sum = digits.split("").reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return digits + ((10 - (sum % 10)) % 10);
}

const BASE_DATE = new Date("2026-11-20T08:00:00Z");

export function generateDemoProducts(stores: Store[] = STORES.filter((s) => s.source === "demo")): Product[] {
  const out: Product[] = [];
  for (const store of stores) {
    for (const ing of INGREDIENTS) {
      const rand = rng(`${store.id}:${ing.id}`);
      // Rețelele mai mici nu au tot sortimentul.
      if (store.id === "greenhills" && rand() < 0.15) continue;
      if (store.id === "fidesco" && rand() < 0.1) continue;
      const options = packOptions(ing);
      const variants = store.id === "metro" ? options.slice(1).concat(options.slice(0, 1)) : options;
      const count = rand() < 0.55 ? 2 : 1;
      for (let v = 0; v < count; v++) {
        const [packSize, packLabel] = variants[v];
        const grams = ing.unit === "pcs" ? packSize * (ing.gramsPerUnit ?? 100) : packSize;
        const bulkDiscount = v === 1 && packSize > variants[0][0] ? 0.93 : 1;
        const jitter = 0.88 + rand() * 0.24;
        // Varianta de bază e mereu un brand obișnuit; a doua poate fi Bio/Premium.
        const brand = v === 0 ? BRANDS[Math.floor(rand() * 3)] : BRANDS[Math.floor(rand() * BRANDS.length)];
        const premium = brand === "Premium" || brand === "Bio" ? 1.25 : 1;
        let price = (ing.refPricePerKg * grams) / 1000 * store.priceFactor * jitter * bulkDiscount * premium;
        price = Math.max(2.5, Math.round(price * 10) / 10 - 0.01);
        const promo = rand() < 0.12;
        const updated = new Date(BASE_DATE.getTime() - Math.floor(rand() * 4) * 86400000);
        out.push({
          id: `${store.id}-${ing.id}-${v}`,
          storeId: store.id,
          ingredientId: ing.id,
          name: `${ing.name.ro}${brand === "Bio" ? " Bio" : ""}`,
          brand,
          packSize,
          packLabel,
          price: Number(price.toFixed(2)),
          promoPrice: promo ? Number((price * (0.7 + rand() * 0.15)).toFixed(2)) : undefined,
          promoUntil: promo ? new Date(updated.getTime() + 7 * 86400000).toISOString() : undefined,
          inStock: rand() > 0.04,
          byWeight: packLabel.includes("cântar") || undefined,
          ean: ean13(`${store.id}:${ing.id}:${v}`),
          emoji: ing.emoji,
          updatedAt: updated.toISOString(),
        });
      }
    }
  }
  return out;
}

export const DEMO_PRODUCTS = generateDemoProducts();
