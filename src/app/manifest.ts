import { asset } from "@/lib/paths";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NutriMD — nutriție sănătoasă",
    short_name: "NutriMD",
    description: "Planuri de mese, rețete și cumpărături cu prețuri din Moldova",
    start_url: asset("/"),
    scope: asset("/"),
    display: "standalone",
    background_color: "#f7faf7",
    theme_color: "#039855",
    lang: "ro",
    icons: [
      { src: asset("/icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: asset("/icon-maskable.svg"), sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: asset("/apple-touch-icon.png"), sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Plan", url: asset("/plan/") },
      { name: "Cumpărături", url: asset("/shopping/") },
      { name: "Rețete", url: asset("/recipes/") },
    ],
  };
}
