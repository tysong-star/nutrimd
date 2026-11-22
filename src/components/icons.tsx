/** Iconițe liniare în stilul SF Symbols (SVG inline, moștenesc culoarea textului). */
import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p,
});

export const IconHome = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></svg>;
export const IconCalendar = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>;
export const IconBook = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 21H20v-3" /><path d="M9 8h7" /></svg>;
export const IconCart = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h8.6a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6" /><circle cx="9.5" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>;
export const IconPerson = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.2-4 4.2-6 8-6s6.8 2 8 6" /></svg>;
export const IconChart = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 20h16" /><path d="M7 16v-4M12 16V7M17 16v-7" /></svg>;
export const IconChevron = (p: SVGProps<SVGSVGElement>) => <svg {...base({ width: 16, height: 16, ...p })}><path d="m9 6 6 6-6 6" /></svg>;
export const IconBack = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m15 5-7 7 7 7" /></svg>;
export const IconPlus = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const IconMore = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="5.5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18.5" cy="12" r="1.3" fill="currentColor" /></svg>;
export const IconSearch = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
export const IconFilter = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
export const IconHeart = ({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) => <svg {...base(p)} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" /></svg>;
export const IconCheck = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const IconShare = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 15V3M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg>;
export const IconClose = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconFlame = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.8 3.2-5.8 3.6-9.8 2.2 1.4 3.4 3.4 3.6 5.4.8-.7 1.3-1.8 1.4-3 2.4 1.9 4.4 4.6 4.4 7.4 0 3.6-2.6 6.2-6.5 6.2z" /></svg>;
export const IconClock = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
