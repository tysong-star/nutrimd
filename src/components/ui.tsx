"use client";
/**
 * Componente UI în stil Apple: suprafețe albe pe fundal gri deschis, fără chenare,
 * colțuri mari, un singur accent (verde iOS), liste grupate ca în Setări.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import Link from "next/link";
import { IconChevron, IconClose } from "./icons";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger" | "plain";
export function Button({ variant = "primary", size = "md", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" && "min-h-[34px] px-3.5 text-[15px]",
        size === "md" && "min-h-[44px] px-5 text-[17px]",
        size === "lg" && "min-h-[52px] px-6 text-[17px]",
        variant === "primary" && "bg-brand-500 text-white hover:bg-brand-600",
        variant === "secondary" && "bg-black/[0.05] text-ink hover:bg-black/[0.08] dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
        variant === "ghost" && "text-brand-700 hover:bg-black/[0.04] dark:text-brand-400 dark:hover:bg-white/10",
        variant === "plain" && "text-ink-2 hover:bg-black/[0.04] dark:text-[#98989d] dark:hover:bg-white/10",
        variant === "danger" && "bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400",
        className,
      )}
    />
  );
}

export function IconButton({ label, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button {...props} aria-label={label} title={label}
      className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-ink transition hover:bg-black/[0.08] active:scale-95 dark:bg-white/10 dark:text-white", className)}>
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx("rounded-2xl bg-white p-4 shadow-card dark:bg-[#1c1c1e] dark:shadow-none", className)}>{children}</div>;
}

/** Titlu mare de pagină (stil iOS „Large Title”). */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3 pt-2">
      <div className="min-w-0">
        {subtitle && <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-2 dark:text-[#98989d]">{subtitle}</p>}
        <h1 className="truncate text-[34px] font-bold leading-tight tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-7 flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-[22px] font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/** Listă grupată (ca în Setări). */
export function ListGroup({ title, footer, children, className }: { title?: string; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("mb-6", className)}>
      {title && <h3 className="mb-1.5 px-4 text-[13px] font-medium uppercase tracking-wide text-ink-2 dark:text-[#98989d]">{title}</h3>}
      <div className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl bg-white shadow-card dark:divide-white/10 dark:bg-[#1c1c1e] dark:shadow-none">{children}</div>
      {footer && <p className="mt-1.5 px-4 text-[13px] text-ink-2 dark:text-[#98989d]">{footer}</p>}
    </section>
  );
}

export function ListRow({ left, title, subtitle, right, href, onClick, chevron, className }: {
  left?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; href?: string; onClick?: () => void; chevron?: boolean; className?: string;
}) {
  const inner = (
    <>
      {left && <div className="shrink-0">{left}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] leading-snug">{title}</div>
        {subtitle && <div className="truncate text-[13px] text-ink-2 dark:text-[#98989d]">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-[15px] text-ink-2 dark:text-[#98989d]">{right}</div>}
      {(chevron || href) && <IconChevron className="shrink-0 text-ink-3" />}
    </>
  );
  const cls = cx("flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left", (href || onClick) && "active:bg-black/[0.04] dark:active:bg-white/5", className);
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/** Control segmentat iOS. */
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div role="tablist" className={cx("flex rounded-[10px] bg-black/[0.06] p-0.5 dark:bg-white/10", className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx("min-h-[34px] flex-1 rounded-[8px] px-3 text-[14px] font-semibold transition", value === o.value ? "bg-white shadow-sm dark:bg-[#636366]" : "text-ink-2 dark:text-[#98989d]")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cx("min-h-[36px] shrink-0 rounded-full px-4 text-[15px] font-medium transition",
        active ? "bg-ink text-white dark:bg-white dark:text-black" : "bg-black/[0.05] text-ink hover:bg-black/[0.08] dark:bg-white/10 dark:text-white", className)}>
      {children}
    </button>
  );
}

export function Tag({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "warm" | "red" | "slate" | "blue" }) {
  const tones = {
    green: "text-brand-700 dark:text-brand-400",
    warm: "text-amber-700 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    slate: "text-ink-2 dark:text-[#98989d]",
    blue: "text-sky-700 dark:text-sky-400",
  };
  return <span className={cx("inline-flex items-center gap-1 text-[13px] font-semibold", tones[tone])}>{children}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-ink-2 dark:text-[#98989d]">{label}</span>
      {children}
      {hint && <span className="mt-1 block px-1 text-xs text-ink-2">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full min-h-[44px] rounded-xl border-0 bg-black/[0.05] px-3.5 text-[17px] text-ink placeholder:text-ink-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:bg-white/10 dark:text-white dark:focus:bg-white/15 disabled:opacity-60";
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "appearance-none pr-8", props.className)} />;
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 text-5xl opacity-80" aria-hidden>{emoji}</div>
      <h3 className="text-[20px] font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-[15px] text-ink-2 dark:text-[#98989d]">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/10", className)} />;
}

/** Foaie care urcă de jos (iOS sheet) — pe desktop, fereastră centrată. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="animate-sheet max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[22px] bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-[#1c1c1e] sm:rounded-[22px]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/15 sm:hidden dark:bg-white/20" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-bold">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="h-8 w-8"><IconClose width={16} height={16} /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Listă de acțiuni pentru meniul „⋯”. */
export function ActionList({ actions }: { actions: { label: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }[] }) {
  return (
    <div className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl bg-white dark:divide-white/10 dark:bg-[#2c2c2e]">
      {actions.map((a, i) => (
        <button key={i} onClick={a.onClick} disabled={a.disabled}
          className={cx("flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[17px] active:bg-black/[0.04] disabled:opacity-40", a.danger ? "text-red-600" : "text-ink dark:text-white")}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
      <span className="text-[17px]">{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={cx("relative h-[31px] w-[51px] shrink-0 rounded-full transition", checked ? "bg-brand-500" : "bg-black/[0.09] dark:bg-white/20")}>
        <span className={cx("absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-[2px]")} />
      </button>
    </label>
  );
}

/** Bifă rotundă (stil Memento/Reminders). */
export function RoundCheck({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange}
      className={cx("flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 transition", checked ? "border-brand-500 bg-brand-500 text-white" : "border-black/20 dark:border-white/30")}>
      {checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
    </button>
  );
}
