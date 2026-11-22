"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode, type SVGProps } from "react";
import { IconBook, IconCalendar, IconCart, IconHome, IconPerson } from "./icons";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { cx, Skeleton } from "./ui";
import { useReminders } from "@/lib/reminders";
import { asset } from "@/lib/paths";
import { sheetsReady, syncPrices } from "@/lib/sheets";
import { buildCatalog } from "@/lib/catalog";

// 5 tab-uri, ca în aplicațiile iOS. „Progres” se deschide din Acasă.
const NAV: { href: string; key: TKey; Icon: (p: SVGProps<SVGSVGElement>) => React.ReactElement }[] = [
  { href: "/", key: "nav.home", Icon: IconHome },
  { href: "/plan", key: "nav.plan", Icon: IconCalendar },
  { href: "/recipes", key: "nav.recipes", Icon: IconBook },
  { href: "/shopping", key: "nav.shopping", Icon: IconCart },
  { href: "/profile", key: "nav.profile", Icon: IconPerson },
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
    <div className="flex rounded-[10px] bg-black/[0.06] p-0.5 text-[13px] font-semibold dark:bg-white/10" role="group" aria-label="Limba / Язык">
      {(["ro", "ru"] as const).map((l) => (
        <button key={l} onClick={() => set({ lang: l })} aria-pressed={lang === l}
          className={cx("min-h-[30px] min-w-[44px] rounded-[8px] px-2 uppercase", lang === l ? "bg-white shadow-sm dark:bg-[#636366]" : "text-ink-2")}>
          {l}
        </button>
      ))}
    </div>
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
  const active = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/progress") : pathname.startsWith(href) || (href === "/recipes" && pathname.startsWith("/recipe")));

  return (
    <>
      <ThemeAndScale />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-2">Skip</a>
      {!immersive && (
        <header className="no-print sticky top-0 z-30 hidden border-b border-black/[0.06] bg-surface/80 backdrop-blur-xl dark:border-white/10 dark:bg-black/70 md:block">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
            <Link href="/" className="text-[17px] font-semibold tracking-tight">NutriMD</Link>
            <nav className="flex gap-1" aria-label="Main">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={cx("rounded-full px-3.5 py-1.5 text-[15px]", active(n.href) ? "bg-black/[0.06] font-semibold dark:bg-white/10" : "text-ink-2 hover:text-ink dark:text-[#98989d] dark:hover:text-white")}>
                  {t(n.key)}
                </Link>
              ))}
              {hydrated && isAdmin && <Link href="/admin" className={cx("rounded-full px-3.5 py-1.5 text-[15px]", active("/admin") ? "bg-black/[0.06] font-semibold" : "text-ink-2")}>{t("nav.admin")}</Link>}
            </nav>
          </div>
        </header>
      )}
      {!online && <div className="no-print bg-amber-100 px-4 py-2 text-center text-[13px] font-medium text-amber-900">{t("err.offline")}</div>}
      <main id="main" className={cx(!immersive && "mx-auto max-w-5xl px-4 pb-28 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6 md:pb-12 md:pt-6")}>
        {hydrated ? children : (
          <div className="space-y-4 pt-6" aria-busy="true">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-2 gap-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
          </div>
        )}
      </main>
      {!immersive && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.08] bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/85 md:hidden" aria-label="Main">
          <div className="grid grid-cols-5">
            {NAV.map(({ href, key, Icon }) => (
              <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
                className={cx("flex min-h-[54px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium", active(href) ? "text-brand-600 dark:text-brand-400" : "text-ink-3")}>
                <Icon width={25} height={25} strokeWidth={active(href) ? 2.1 : 1.7} />
                {t(key)}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
