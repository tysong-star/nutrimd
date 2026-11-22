"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { cx, Skeleton } from "./ui";
import { useReminders } from "@/lib/reminders";
import { asset } from "@/lib/paths";
import { sheetsReady, syncPrices } from "@/lib/sheets";
import { buildCatalog } from "@/lib/catalog";

const NAV: { href: string; key: TKey; icon: string }[] = [
  { href: "/", key: "nav.home", icon: "🏠" },
  { href: "/plan", key: "nav.plan", icon: "📅" },
  { href: "/recipes", key: "nav.recipes", icon: "🍲" },
  { href: "/shopping", key: "nav.shopping", icon: "🛒" },
  { href: "/progress", key: "nav.progress", icon: "📈" },
  { href: "/profile", key: "nav.profile", icon: "👤" },
];

/** Așteaptă rehidratarea stării din localStorage ca să evităm diferențe SSR/client. */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

function ThemeAndScale() {
  const theme = useApp((s) => s.theme);
  const fontScale = useApp((s) => s.fontScale);
  const lang = useApp((s) => s.lang);
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
  }, [fontScale]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

function useServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(asset("/sw.js"), { scope: asset("/") }).catch(() => {});
    }
  }, []);
}

/** Cere service worker-ului să păstreze offline paginile rețetelor favorite. */
function useOfflineFavorites() {
  const favorites = useApp((s) => s.favorites);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      // Pe site-ul static, pagina unei rețete e aceeași pentru toate id-urile (datele sunt în aplicație),
      // deci ajunge să păstrăm paginile o dată; favoritele rămân disponibile offline.
      const pages = ["/", "/recipes/", "/recipe/", "/recipe/cook/", "/plan/", "/shopping/", "/progress/", "/profile/"];
      reg.active?.postMessage({ type: "CACHE_URLS", urls: pages.map(asset), favorites });
    }).catch(() => {});
  }, [favorites]);
}

/** Prețurile din Google Sheets se reîncarcă automat la deschidere, cel mult o dată la 6 ore. */
function useSheetsAutoSync() {
  useEffect(() => {
    const { sheets, admin } = useApp.getState();
    if (!sheetsReady(sheets) || !navigator.onLine) return;
    const last = sheets.lastPriceSync ? new Date(sheets.lastPriceSync).getTime() : 0;
    if (Date.now() - last < 6 * 3600 * 1000) return;
    const base = buildCatalog({ ...admin, productOverrides: {}, customProducts: [] });
    syncPrices(base.products, (id) => base.ingMap[id]?.emoji ?? "🛒").catch(() => {});
  }, []);
}

/**
 * Link de conectare: …/#connect=<base64(JSON {u: url, t: cod})>
 * Deschis o dată pe telefon, salvează conexiunea la Google Sheets și șterge codul din bara de adrese.
 * Fragmentul (#) nu ajunge niciodată la server.
 */
function useConnectLink() {
  useEffect(() => {
    const m = window.location.hash.match(/connect=([^&]+)/);
    if (!m) return;
    try {
      const { u, t } = JSON.parse(atob(decodeURIComponent(m[1]).replace(/-/g, "+").replace(/_/g, "/")));
      const st = useApp.getState();
      const who = st.sheets?.who || st.profile.name || "";
      if (typeof u === "string" && typeof t === "string") {
        st.set({ sheets: { ...st.sheets, url: u, token: t, who: who || "?" } });
        sessionStorage.setItem("nutrimd-connected", "1");
      }
    } catch { /* link invalid */ }
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);
}

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

export function LangSwitch() {
  const lang = useApp((s) => s.lang);
  const set = useApp((s) => s.set);
  return (
    <div className="flex rounded-full border border-slate-300 p-0.5 text-xs font-bold dark:border-slate-700" role="group" aria-label="Limba / Язык">
      {(["ro", "ru"] as const).map((l) => (
        <button key={l} onClick={() => set({ lang: l })} aria-pressed={lang === l}
          className={cx("min-h-[32px] min-w-[40px] rounded-full px-2 uppercase", lang === l ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300")}>
          {l}
        </button>
      ))}
    </div>
  );
}

function ThemeButton() {
  const theme = useApp((s) => s.theme);
  const set = useApp((s) => s.set);
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const icon = theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "🖥️";
  return (
    <button onClick={() => set({ theme: next })} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={`Theme: ${theme}`} title={theme}>
      <span aria-hidden>{icon}</span>
    </button>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { t } = useT();
  const isAdmin = useApp((s) => s.isAdmin);
  const online = useOnline();
  useServiceWorker();
  useOfflineFavorites();
  useReminders();
  useConnectLink();
  useSheetsAutoSync();
  const immersive = pathname.includes("/cook") || pathname.startsWith("/onboarding");
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/recipes" && pathname.startsWith("/recipe")));

  return (
    <>
      <ThemeAndScale />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-2">Skip</a>
      {!immersive && (
        <header className="no-print sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand-700 dark:text-brand-300">
              <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white">🥗</span>
              {t("app.name")}
            </Link>
            <nav className="ml-6 hidden gap-1 md:flex" aria-label="Main">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={cx("rounded-lg px-3 py-2 text-sm font-semibold", active(n.href) ? "bg-brand-50 text-brand-800 dark:bg-brand-900/50 dark:text-brand-100" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>
                  {t(n.key)}
                </Link>
              ))}
              {hydrated && isAdmin && (
                <Link href="/admin" className={cx("rounded-lg px-3 py-2 text-sm font-semibold", active("/admin") ? "bg-amber-100 text-amber-900" : "text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-slate-800")}>{t("nav.admin")}</Link>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-1.5">
              {hydrated && <LangSwitch />}
              {hydrated && <ThemeButton />}
            </div>
          </div>
        </header>
      )}
      {!online && <div className="no-print bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">{t("err.offline")}</div>}
      <main id="main" className={cx(!immersive && "mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-12")}>
        {hydrated ? children : (
          <div className="space-y-4 pt-4" aria-busy="true">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-2 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
          </div>
        )}
      </main>
      {!immersive && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden" aria-label="Main">
          <div className="grid grid-cols-6">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
                className={cx("flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", active(n.href) ? "text-brand-700 dark:text-brand-300" : "text-slate-500")}>
                <span aria-hidden className={cx("text-xl transition", active(n.href) && "scale-110")}>{n.icon}</span>
                {t(n.key)}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
