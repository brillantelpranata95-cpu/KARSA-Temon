import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getDayPart, getGreetingWord, heroAsset, type DayPart } from "../utils/heroTime";

interface HeroSectionProps {
  /** Admin-set display name. Omit on the public (pre-login) dashboard. */
  name?: string;
  /** Public landing = full viewport. Logged-in dashboard = shorter band. */
  variant: "public" | "app";
  loading?: boolean;
  onLogin?: () => Promise<void> | void;
  children?: React.ReactNode;
}

function shouldSkipVideo(): boolean {
  if (typeof window === "undefined") return false;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  return Boolean(reduce || saveData);
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  name,
  variant,
  loading,
  onLogin,
  children,
}) => {
  const [part, setPart] = useState<DayPart>(() => getDayPart());
  const [videoReady, setVideoReady] = useState(false);
  const skipVideo = useMemo(shouldSkipVideo, []);
  const greeting = getGreetingWord();
  const { video, poster } = heroAsset(part);
  const line = name ? `Selamat ${greeting} ${name}` : `Selamat ${greeting}`;

  useEffect(() => {
    const tick = () => {
      const next = getDayPart();
      setPart((prev) => (prev === next ? prev : next));
    };
    const iv = window.setInterval(tick, 60_000);
    return () => window.clearInterval(iv);
  }, []);

  useEffect(() => {
    setVideoReady(false);
  }, [video]);

  const shell =
    variant === "public"
      ? "relative min-h-screen w-full overflow-hidden bg-slate-900"
      : "relative h-[42vh] min-h-[280px] max-h-[520px] w-full overflow-hidden bg-slate-900";

  return (
    <section className={shell} aria-label={line}>
      <img
        src={poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
        decoding="async"
      />
      {!skipVideo && (
        <video
          key={video}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setVideoReady(true)}
        >
          <source src={video} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/25" />

      <div
        className={`relative z-10 flex h-full flex-col ${
          variant === "public"
            ? "mx-auto max-w-5xl justify-center px-6 py-16"
            : "mx-auto max-w-7xl justify-end px-4 pb-10 pt-8 sm:px-6 lg:px-8"
        }`}
      >
        {variant === "public" && (
          <img
            src="/karsa-logo.png"
            alt="KARSA Temon"
            className="mb-6 h-16 w-16 rounded-2xl object-contain shadow-lg"
          />
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
          KARSA TEMON
        </p>
        <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-5xl md:text-6xl">
          {line}
        </h1>
        {variant === "public" && (
          <>
            <p className="mt-3 text-base font-semibold text-[#CBDCA5]">
              Kelola Administrasi dan Rekam SPJ
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">
              Sistem Pengelolaan SPJ Terintegrasi Kecamatan Temon.
            </p>
            {onLogin && (
              <button
                onClick={() => void onLogin()}
                disabled={loading}
                className="mt-8 inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[#32848D] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#F6FAF5] disabled:translate-y-0 disabled:opacity-70"
              >
                {loading ? "Menyiapkan login..." : "Masuk Dashboard Internal"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
        {children}
      </div>
    </section>
  );
};
