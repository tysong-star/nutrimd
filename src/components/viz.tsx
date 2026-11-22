"use client";
/** Vizualizări ușoare în SVG (fără dependențe): inele de progres, bare, grafic liniar, coloane. */
import { cx } from "./ui";

export function Ring({ value, max, label, sub, color = "#039855", size = 88, warnOver = false }: { value: number; max: number; label: string; sub?: string; color?: string; size?: number; warnOver?: boolean }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  // Depășirea e semnalată doar unde contează (calorii, grăsimi), nu la proteine/fibre.
  const over = warnOver && max > 0 && value > max * 1.1;
  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${label}: ${Math.round(value)} / ${Math.round(max)}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} fill="none" className="stroke-black/[0.06] dark:stroke-white/10" />
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} fill="none" stroke={over ? "#e04f16" : color} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .6s" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
          <div className="text-sm font-bold tabular-nums">{Math.round(value)}</div>
          <div className="text-[10px] text-ink-2 tabular-nums">/ {Math.round(max)}</div>
        </div>
      </div>
      <div className="mt-1 text-xs font-semibold">{label}</div>
      {sub && <div className="text-[11px] text-ink-2">{sub}</div>}
    </div>
  );
}

export function Bar({ value, max, label, unit, color = "bg-brand-500/100", warnOver = false }: { value: number; max: number; label: string; unit: string; color?: string; warnOver?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{label}</span><span className="tabular-nums text-ink-2">{Math.round(value)} / {Math.round(max)} {unit}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(max)} aria-label={label}>
        <div className={cx("h-full rounded-full transition-all", warnOver && value > max * 1.1 ? "bg-coral-500" : color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LineChart({ points, height = 160, unit = "", target }: { points: { x: string; y: number }[]; height?: number; unit?: string; target?: number }) {
  if (points.length < 2) return null;
  const W = 600, H = height, P = 28;
  const ys = points.map((p) => p.y).concat(target ? [target] : []);
  const min = Math.min(...ys) - 1, max = Math.max(...ys) + 1;
  const sx = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const sy = (y: number) => H - P - ((y - min) / (max - min || 1)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(i)},${sy(p.y)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${points.at(-1)?.y} ${unit}`}>
      {target && <line x1={P} x2={W - P} y1={sy(target)} y2={sy(target)} strokeDasharray="6 6" className="stroke-amber-500" strokeWidth={1.5} />}
      <path d={`${d} L${sx(points.length - 1)},${H - P} L${sx(0)},${H - P} Z`} className="fill-brand-500/10" />
      <path d={d} fill="none" className="stroke-brand-600" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={sx(i)} cy={sy(p.y)} r={4} className="fill-white stroke-brand-600" strokeWidth={2}><title>{`${p.x}: ${p.y} ${unit}`}</title></circle>
          {(i === 0 || i === points.length - 1 || points.length <= 8) && <text x={sx(i)} y={H - 8} textAnchor="middle" className="fill-ink-2 text-[11px]">{p.x}</text>}
        </g>
      ))}
      <text x={sx(points.length - 1)} y={sy(points.at(-1)!.y) - 10} textAnchor="end" className="fill-ink text-[12px] font-semibold dark:fill-white">{points.at(-1)!.y} {unit}</text>
    </svg>
  );
}

export function Columns({ data, height = 160, target, unit = "" }: { data: { x: string; y: number; tone?: string }[]; height?: number; target?: number; unit?: string }) {
  const W = 600, H = height, P = 24;
  const max = Math.max(1, ...data.map((d) => d.y), target ?? 0) * 1.1;
  const bw = (W - 2 * P) / Math.max(1, data.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {data.map((d, i) => {
        const h = (d.y / max) * (H - 2 * P);
        return (
          <g key={i}>
            <rect x={P + i * bw + bw * 0.18} y={H - P - h} width={bw * 0.64} height={h} rx={4} className={d.tone ?? "fill-brand-500"}><title>{`${d.x}: ${Math.round(d.y)} ${unit}`}</title></rect>
            <text x={P + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="fill-ink-2 text-[11px]">{d.x}</text>
          </g>
        );
      })}
      {target && <line x1={P} x2={W - P} y1={H - P - (target / max) * (H - 2 * P)} y2={H - P - (target / max) * (H - 2 * P)} strokeDasharray="6 6" className="stroke-amber-500" strokeWidth={1.5} />}
    </svg>
  );
}
