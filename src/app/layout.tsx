import { asset } from "@/lib/paths";
import type { Metadata, Viewport } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NutriMD — nutriție sănătoasă în Moldova", template: "%s · NutriMD" },
  description: "Planuri de mese personalizate, rețete și liste de cumpărături cu prețuri din magazinele din Moldova.",
  manifest: asset("/manifest.webmanifest"),
  appleWebApp: { capable: true, title: "NutriMD", statusBarStyle: "default" },
  icons: { icon: asset("/icon.svg"), apple: asset("/apple-touch-icon.png") },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#039855" }, { media: "(prefers-color-scheme: dark)", color: "#020617" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <head>
        {/* Aplică tema înainte de randare, ca să evităm „flash” alb în modul întunecat. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('nutrimd-v1')||'{}').state||{};var t=s.theme||'system';if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');if(s.fontScale)document.documentElement.style.fontSize=(s.fontScale*100)+'%';if(s.lang)document.documentElement.lang=s.lang}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#f7faf7] font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
