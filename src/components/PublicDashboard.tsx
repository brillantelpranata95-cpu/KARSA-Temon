import React, { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { ArrowRight, FileCheck2, Layers3, ShieldCheck, Sparkles } from "lucide-react";

interface PublicStats {
  finalized: number;
  complete: number;
  total: number;
}

interface PublicDashboardProps {
  loading: boolean;
  onLogin: () => Promise<void>;
}

const getPublicStats = async (): Promise<PublicStats> => {
  const [finalized, complete, total] = await Promise.all([
    getCountFromServer(query(collection(db, "spj"), where("status", "==", "FINALIZED"))),
    getCountFromServer(query(collection(db, "spj"), where("status", "==", "COMPLETE"))),
    getCountFromServer(collection(db, "spj"))
  ]);

  return {
    finalized: finalized.data().count,
    complete: complete.data().count,
    total: total.data().count
  };
};

export const PublicDashboard: React.FC<PublicDashboardProps> = ({ loading, onLogin }) => {
  const [stats, setStats] = useState<PublicStats>({ finalized: 0, complete: 0, total: 0 });

  useEffect(() => {
    getPublicStats()
      .then(setStats)
      .catch((error) => console.warn("Public stats unavailable:", error));
  }, []);

  const selesai = stats.finalized + stats.complete;

  return (
    <main className="min-h-screen overflow-hidden bg-[#070b18] text-white">
      <section className="relative min-h-screen px-6 py-8 md:px-12 flex items-center">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-blue-500 blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-0 h-96 w-96 rounded-full bg-cyan-400 blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-violet-500 blur-3xl opacity-40" />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,.18),transparent_28%),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[length:100%_100%,64px_64px,64px_64px]" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-100 shadow-2xl backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-cyan-200" />
              Sistem Pertanggungjawaban Kapanewon Temon
            </div>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-5xl font-black tracking-tight md:text-7xl lg:text-8xl">
                KARSA Temon
                <span className="block bg-gradient-to-r from-cyan-200 via-white to-blue-300 bg-clip-text text-transparent">
                  SPJ rapi, cepat, dan siap cetak.
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
                Dashboard publik untuk memantau progres penyelesaian SPJ, dengan mesin dokumen Bend 26, daftar hadir, notulen, dan laporan aktivitas lapangan.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onLogin}
                disabled={loading}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-slate-950 shadow-2xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-cyan-50 disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? "Menyiapkan login..." : "Masuk Dashboard Internal"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
              <a
                href="#statistik"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/15"
              >
                Lihat Statistik Publik
              </a>
            </div>
          </div>

          <div className="relative min-h-[520px] perspective-distant">
            <div className="absolute inset-x-6 top-0 rounded-[2.5rem] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl transform-gpu rotate-[-3deg] transition duration-500 hover:rotate-0">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[.32em] text-cyan-200">Agregat SPJ</p>
                  <h2 className="mt-1 text-2xl font-black">Status Penyelesaian</h2>
                </div>
                <img src="https://koboyo.com/icons/svg/account-statement.svg" alt="SPJ icon" className="h-14 w-14 invert" />
              </div>

              <div id="statistik" className="mt-8 grid gap-4">
                <div className="rounded-3xl bg-gradient-to-br from-cyan-300 to-blue-500 p-6 text-slate-950 shadow-2xl shadow-blue-500/30">
                  <p className="text-sm font-bold uppercase tracking-[.25em] opacity-70">SPJ Selesai</p>
                  <div className="mt-3 flex items-end justify-between">
                    <strong className="text-7xl font-black tabular-nums">{selesai}</strong>
                    <FileCheck2 className="mb-2 h-12 w-12" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">Finalized + lengkap berdasarkan data Firestore.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <ShieldCheck className="mb-4 h-7 w-7 text-emerald-300" />
                    <p className="text-3xl font-black tabular-nums">{stats.finalized}</p>
                    <p className="text-xs text-slate-300">Sudah final</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <Layers3 className="mb-4 h-7 w-7 text-blue-200" />
                    <p className="text-3xl font-black tabular-nums">{stats.total}</p>
                    <p className="text-xs text-slate-300">Total paket SPJ</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-3 left-0 right-12 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl transform-gpu rotate-[4deg]">
              <p className="text-sm font-bold text-cyan-100">Template resmi aktif</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">Bend 26 • Notulen • Daftar Hadir • SPJ Aktivitas Lapangan • Surat Undangan</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
