/**
 * Calendarul posturilor ortodoxe (stil nou pentru sărbătorile fixe, Pascalia pe stil vechi —
 * cum o urmează Biserica Ortodoxă a Moldovei). Simplificat: marcăm zilele de post
 * în care NU se consumă carne, lactate și ouă. Zilele cu dezlegare la pește sunt semnalate.
 */

const DAY = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

/** Paștele ortodox (algoritmul Meeus pentru calendarul iulian + 13 zile, valabil 1900–2099). */
export function orthodoxEaster(year: number): Date {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return new Date(utc(year, month, day).getTime() + 13 * DAY);
}

export interface FastInfo { fasting: boolean; fishAllowed?: boolean; name?: { ro: string; ru: string } }

const cache = new Map<number, Map<string, FastInfo>>();

function buildYear(year: number): Map<string, FastInfo> {
  const map = new Map<string, FastInfo>();
  const easter = orthodoxEaster(year);
  const add = (from: Date, to: Date, name: FastInfo["name"]) => {
    for (let t = from.getTime(); t <= to.getTime(); t += DAY) map.set(iso(new Date(t)), { fasting: true, name });
  };
  const free = (from: Date, to: Date) => {
    for (let t = from.getTime(); t <= to.getTime(); t += DAY) map.set(iso(new Date(t)), { fasting: false });
  };

  // Miercuri și vineri (se suprascriu apoi de săptămânile fără post).
  for (let t = utc(year, 1, 1).getTime(); t <= utc(year, 12, 31).getTime(); t += DAY) {
    const wd = new Date(t).getUTCDay();
    if (wd === 3 || wd === 5) map.set(iso(new Date(t)), { fasting: true, name: { ro: "Miercuri/vineri", ru: "Среда/пятница" } });
  }

  // Postul Mare: de la Lunea Curată (Paști − 48) până în Sâmbăta Mare.
  add(new Date(easter.getTime() - 48 * DAY), new Date(easter.getTime() - DAY), { ro: "Postul Mare", ru: "Великий пост" });
  // Postul Sf. Apostoli: lunea după Duminica Tuturor Sfinților (Paști + 57) până la 11 iulie.
  const apStart = new Date(easter.getTime() + 57 * DAY);
  const apEnd = utc(year, 7, 11);
  if (apStart <= apEnd) add(apStart, apEnd, { ro: "Postul Sf. Apostoli", ru: "Петров пост" });
  // Postul Adormirii: 14–27 august.
  add(utc(year, 8, 14), utc(year, 8, 27), { ro: "Postul Adormirii Maicii Domnului", ru: "Успенский пост" });
  // Postul Crăciunului: 28 noiembrie – 6 ianuarie (stil vechi → 7 ian Crăciun).
  add(utc(year, 11, 28), utc(year, 12, 31), { ro: "Postul Crăciunului", ru: "Рождественский пост" });
  add(utc(year, 1, 1), utc(year, 1, 6), { ro: "Postul Crăciunului", ru: "Рождественский пост" });
  // Zile de post unice.
  const single: [number, number, string, string][] = [[1, 18, "Ajunul Bobotezei", "Крещенский сочельник"], [9, 11, "Tăierea capului Sf. Ioan", "Усекновение главы Иоанна"], [9, 27, "Înălțarea Sfintei Cruci", "Воздвижение Креста"]];
  for (const [m, d, ro, ru] of single) map.set(iso(utc(year, m, d)), { fasting: true, name: { ro, ru } });

  // Perioade fără post (harți).
  free(utc(year, 1, 7), utc(year, 1, 17)); // Crăciun – Bobotează
  free(easter, new Date(easter.getTime() + 6 * DAY)); // Săptămâna Luminată
  free(new Date(easter.getTime() + 49 * DAY), new Date(easter.getTime() + 56 * DAY)); // după Rusalii
  free(new Date(easter.getTime() - 69 * DAY), new Date(easter.getTime() - 63 * DAY)); // Vameșul și Fariseul
  // Săptămâna brânzei: fără carne, dar lactate/ouă permise -> pentru plan nu o tratăm ca post vegan.
  free(new Date(easter.getTime() - 55 * DAY), new Date(easter.getTime() - 49 * DAY));

  // Dezlegare la pește: Bunavestire (7 aprilie), Florii (Paști − 7).
  for (const d of [utc(year, 4, 7), new Date(easter.getTime() - 7 * DAY)]) {
    const k = iso(d);
    const cur = map.get(k);
    if (cur?.fasting) map.set(k, { ...cur, fishAllowed: true });
  }
  return map;
}

export function fastInfo(dateIso: string): FastInfo {
  const year = Number(dateIso.slice(0, 4));
  if (!cache.has(year)) cache.set(year, buildYear(year));
  return cache.get(year)!.get(dateIso) ?? { fasting: false };
}
