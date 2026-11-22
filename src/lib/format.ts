import type { Lang } from "./types";

const locale = (lang: Lang) => (lang === "ro" ? "ro-MD" : "ru-MD");

/** Monedă MDL: „123,45 lei” / „123,45 лей”. */
export function mdl(amount: number, lang: Lang, digits = 2) {
  const n = new Intl.NumberFormat(locale(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
  return `${n} ${lang === "ro" ? "lei" : "лей"}`;
}

export function num(n: number, lang: Lang, digits = 0) {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: digits }).format(n);
}

/** Dată locală zz.ll.aaaa */
export function dateShort(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locale(lang), { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso.length === 10 ? iso + "T12:00:00" : iso));
}

export function dateLong(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locale(lang), { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso + "T12:00:00"));
}

export function weekdayShort(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locale(lang), { weekday: "short", day: "numeric" }).format(new Date(iso + "T12:00:00"));
}
