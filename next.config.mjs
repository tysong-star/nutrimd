/**
 * Build static (`out/`) — se poate găzdui gratuit pe GitHub Pages / Netlify / orice server de fișiere.
 * NEXT_PUBLIC_BASE_PATH = subfolderul site-ului (ex. "/nutrimd" pe GitHub Pages), gol local.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  reactStrictMode: true,
  images: { unoptimized: true },
};
export default nextConfig;
