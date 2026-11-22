"use client";
/**
 * Player video cu capitole sincronizate cu pașii rețetei.
 * Suportă: YouTube, Vimeo (embed cu parametru de start) și fișiere video încărcate (MP4/WebM)
 * cu subtitrări WebVTT (accesibilitate). Încărcare leneșă: iframe-ul apare doar la clic.
 */
import { useRef, useState } from "react";
import type { Recipe } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { cx } from "./ui";

function parse(url: string): { kind: "youtube" | "vimeo" | "file"; id?: string } {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: "youtube", id: yt[1] };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "vimeo", id: vm[1] };
  return { kind: "file" };
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function VideoPlayer({ video, steps, activeStep, onChapter }: { video: NonNullable<Recipe["video"]>; steps: Recipe["steps"]; activeStep?: number; onChapter?: (stepIndex: number) => void }) {
  const { t, l } = useT();
  const src = parse(video.url);
  const [start, setStart] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const seek = (sec: number, stepIndex: number) => {
    onChapter?.(stepIndex);
    if (src.kind === "file" && videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play().catch(() => {});
    } else setStart(sec);
  };

  // Sincronizare inversă: la redarea fișierului, evidențiem pasul curent.
  const onTime = () => {
    const tm = videoRef.current?.currentTime ?? 0;
    const ch = [...video.chapters].reverse().find((c) => c.startSec <= tm);
    if (ch && ch.stepIndex !== activeStep) onChapter?.(ch.stepIndex);
  };

  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-2xl bg-black">
        {src.kind === "file" ? (
          <video ref={videoRef} src={video.url} controls preload="none" className="h-full w-full" onTimeUpdate={onTime} crossOrigin="anonymous">
            {video.captionsUrl && <track kind="captions" src={video.captionsUrl} srcLang="ro" label="Română" default />}
          </video>
        ) : start === null ? (
          <button onClick={() => setStart(0)} className="flex h-full w-full items-center justify-center text-white" aria-label="Play video">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-black shadow-lg">▶</span>
          </button>
        ) : (
          <iframe
            key={start}
            className="h-full w-full"
            title="Video"
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            src={src.kind === "youtube"
              ? `https://www.youtube-nocookie.com/embed/${src.id}?start=${start}&autoplay=1&cc_load_policy=1&rel=0`
              : `https://player.vimeo.com/video/${src.id}?autoplay=1#t=${start}s`}
          />
        )}
      </div>
      {video.chapters.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-sm font-semibold">{t("rec.chapters")}</div>
          <ol className="space-y-1">
            {video.chapters.map((c) => (
              <li key={c.stepIndex}>
                <button onClick={() => seek(c.startSec, c.stepIndex)} className={cx("flex min-h-[40px] w-full items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-black/[0.05] dark:hover:bg-white/10", activeStep === c.stepIndex && "bg-brand-500/10 font-semibold dark:bg-brand-900/40")}>
                  <span className="font-mono text-brand-700 dark:text-brand-300">{fmt(c.startSec)}</span>
                  <span className="line-clamp-1">{c.stepIndex + 1}. {l(steps[c.stepIndex]?.text)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
