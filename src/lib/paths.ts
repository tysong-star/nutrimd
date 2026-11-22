/**
 * Căi compatibile cu găzduirea statică (GitHub Pages într-un subfolder, ex. /nutrimd).
 * `Link` și `router` adaugă singure basePath; aici sunt doar URL-urile „brute”
 * (service worker, iconițe, linkuri de partajare).
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (p: string) => `${BASE}${p}`;
/** URL absolut către o pagină a aplicației (pentru partajare). */
export const absoluteUrl = (p: string) => (typeof window === "undefined" ? p : `${window.location.origin}${BASE}${p}`);
/** Rețetele folosesc parametru în URL (nu rute dinamice), ca să funcționeze și rețetele adăugate din Admin pe un site static. */
export const recipeHref = (id: string) => `/recipe/?id=${encodeURIComponent(id)}`;
export const cookHref = (id: string) => `/recipe/cook/?id=${encodeURIComponent(id)}`;
