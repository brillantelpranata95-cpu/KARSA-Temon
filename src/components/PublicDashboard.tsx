import React, { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { ArrowRight, CheckCircle2, FileText, ShieldCheck } from "lucide-react";

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
    <main className="min-h-screen bg-[#F6FAF5] text-slate-950">
      <header className="border-b border-[#32848D]/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/karsa-logo.png" alt="Logo KARSA Temon" className="h-11 w-11 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-bold tracking-wide text-[#32848D]">KARSA Temon</p>
              <p className="text-xs text-slate-500">Kapanewon Temon · Kulon Progo</p>
            </div>
          </div>
          <button
            onClick={onLogin}
            disabled={loading}
            className="rounded-xl bg-[#32848D] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#276972] disabled:opacity-60"
          >
            {loading ? "Menyiapkan..." : "Masuk Internal"}
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(203,220,165,.45),transparent_30%),radial-gradient(circle_at_12%_25%,rgba(50,132,141,.18),transparent_26%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F6FAF5] to-transparent" />

        <div className="relative mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#32848D]/15 bg-white px-4 py-2 text-sm font-medium text-[#32848D] shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Sistem Pengelolaan SPJ Kapanewon Temon
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 md:text-6xl">
                Pertanggungjawaban kegiatan yang tertib, terukur, dan siap cetak.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                KARSA Temon membantu penyusunan paket SPJ melalui data kegiatan, kode rekening, daftar hadir, Bend 26, notulen, dan laporan aktivitas dalam satu alur kerja yang rapi.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onLogin}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#32848D] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#32848D]/20 transition hover:-translate-y-0.5 hover:bg-[#276972] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? "Menyiapkan login..." : "Masuk Dashboard Internal"}
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#statistik"
                className="inline-flex items-center justify-center rounded-2xl border border-[#32848D]/20 bg-white px-6 py-3.5 text-sm font-bold text-[#32848D] shadow-sm transition hover:bg-[#F6FAF5]"
              >
                Lihat Statistik Publik
              </a>
            </div>
          </div>

          <div id="statistik" className="rounded-[2rem] border border-[#32848D]/12 bg-white p-6 shadow-2xl shadow-[#32848D]/10">
            <div className="flex items-start justify-between border-b border-slate-100 pb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.24em] text-[#619892]">Statistik SPJ</p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-950">Ringkasan Penyelesaian</h2>
              </div>
              <img src="/karsa-logo.png" alt="KARSA Temon" className="h-16 w-16 rounded-2xl object-contain" />
            </div>

            <div className="mt-6 rounded-3xl bg-gradient-to-br from-[#32848D] to-[#93B39D] p-6 text-white">
              <p className="text-sm font-semibold text-white/80">SPJ sudah diselesaikan</p>
              <div className="mt-3 flex items-end justify-between">
                <strong className="text-7xl font-black tabular-nums">{selesai}</strong>
                <CheckCircle2 className="mb-2 h-12 w-12 text-[#CBDCA5]" />
              </div>
              <p className="mt-3 text-sm text-white/85">Status COMPLETE dan FINALIZED.</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-100 bg-[#F6FAF5] p-5">
                <ShieldCheck className="mb-4 h-7 w-7 text-[#32848D]" />
                <p className="text-3xl font-black tabular-nums">{stats.finalized}</p>
                <p className="text-xs text-slate-500">Sudah final</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-[#F6FAF5] p-5">
                <FileText className="mb-4 h-7 w-7 text-[#619892]" />
                <p className="text-3xl font-black tabular-nums">{stats.total}</p>
                <p className="text-xs text-slate-500">Total paket SPJ</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
