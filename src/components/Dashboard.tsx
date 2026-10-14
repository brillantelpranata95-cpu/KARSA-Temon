import React, { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { getSpjStatistics } from "../services/api";
import { HeroSection } from "./HeroSection";
import { GamificationOverview } from "./GamificationOverview";
import { useHideScores } from "../utils/prefs";
import { Icon } from "./Icon";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DashboardProps {
  user: UserProfile;
  onCreateSpj?: () => void;
}

interface SpjStats {
  totalSpj: number;
  finalizedSpj: number;
  inProgressSpj: number;
  draftSpj: number;
  totalNominal: number;
  byKategori: Record<string, { count: number; totalNominal: number; percentage: number }>;
}

const KATEGORI_COLORS: Record<string, string> = {
  MAKAN_MINUM: "#32848D",
  HONOR: "#8B5CF6",
  ATK: "#10B981",
  TRANSPORT: "#F59E0B",
  LAINNYA: "#94A3B8",
};

/** Warna kedua untuk gradien — pasangan lebih terang dari KATEGORI_COLORS. */
const KATEGORI_AKSEN: Record<string, string> = {
  MAKAN_MINUM: "#5FB8C2",
  HONOR: "#C4B5FD",
  ATK: "#6EE7B7",
  TRANSPORT: "#FCD34D",
  LAINNYA: "#CBD5E1",
};

const KATEGORI_LABELS: Record<string, string> = {
  MAKAN_MINUM: "Makan & Minum",
  HONOR: "Honor / Jasa",
  ATK: "ATK",
  TRANSPORT: "Transport",
  LAINNYA: "Lainnya",
};

export const Dashboard: React.FC<DashboardProps> = ({ user, onCreateSpj }) => {
  const [stats, setStats] = useState<SpjStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideScores] = useHideScores(user.uid);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getSpjStatistics(user);
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const statCards = [
    { label: "Total SPJ", value: stats?.totalSpj || 0, icon: "file-text", color: "bg-blue-500", textColor: "text-blue-600" },
    { label: "Selesai", value: stats?.finalizedSpj || 0, icon: "circle-check", color: "bg-emerald-500", textColor: "text-emerald-600" },
    { label: "Dalam Proses", value: stats?.inProgressSpj || 0, icon: "clock", color: "bg-amber-500", textColor: "text-amber-600" },
    { label: "Draft", value: stats?.draftSpj || 0, icon: "warning", color: "bg-gray-400", textColor: "text-gray-600" },
  ];

  const pieData = stats
    ? Object.entries(stats.byKategori).map(([key, val]) => ({
        name: KATEGORI_LABELS[key] || key,
        value: val.percentage,
        nominal: val.totalNominal,
        count: val.count,
        key,
      }))
    : [];

  const barData = stats
    ? Object.entries(stats.byKategori).map(([key, val]) => ({
        name: KATEGORI_LABELS[key] || key,
        nominal: val.totalNominal,
        count: val.count,
        key,
      }))
    : [];

  return (
    <div>
      <HeroSection variant="app" name={user.displayName || user.email} />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {!hideScores && <GamificationOverview user={user} />}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Ringkasan SPJ</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {user.jawatanName} — Analisis PEPIN
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${card.color} bg-opacity-10`}>
                <Icon name={card.icon} className={`w-6 h-6 ${card.textColor}`} />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Nominal Card */}
      <div className="bg-gradient-to-br from-[#32848D] to-[#276972] p-6 rounded-2xl text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Total Nilai Anggaran Terpakai</p>
            <p className="text-4xl font-bold mt-2">
              Rp {stats?.totalNominal?.toLocaleString("id-ID") || 0}
            </p>
          </div>
          <div className="p-4 bg-white/20 rounded-2xl">
            <Icon name="dollar-sign" className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Analisis PEPIN Panel */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* Pita aksen berwarna di tepi atas */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#32848D] via-[#8B5CF6] to-[#F59E0B]" />

        <div className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#32848D] to-[#276972] text-white shadow-lg shadow-[#32848D]/30">
                <Icon name="trending-up" className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Analisis PEPIN</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Pemetaan penggunaan anggaran berdasarkan kategori belanja
                </p>
              </div>
            </div>
            {!loading && pieData.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#32848D]/10 to-[#8B5CF6]/10 px-3 py-1.5 text-xs font-semibold text-[#276972] dark:text-[#9ED4DA]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#32848D]" />
                {pieData.length} kategori · {stats?.totalSpj || 0} SPJ
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400 dark:text-slate-500">
              <Icon name="refresh-ccw" className="w-8 h-8 mx-auto animate-spin mb-2" />
              <p className="text-sm">Menganalisis data...</p>
            </div>
          ) : pieData.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-slate-500">
              <p className="text-sm">Belum ada data SPJ yang dapat dianalisis.</p>
            </div>
          ) : (
            <>
              {/* Ringkasan berwarna per kategori */}
              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {pieData.map((entry) => {
                  const warna = KATEGORI_COLORS[entry.key] || "#94A3B8";
                  const aksen = KATEGORI_AKSEN[entry.key] || "#CBD5E1";
                  return (
                    <div
                      key={entry.key}
                      className="rounded-xl border border-gray-100 p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700"
                      style={{ background: `linear-gradient(135deg, ${warna}14, ${aksen}26)` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: warna }} />
                        <span className="truncate text-xs font-semibold text-gray-700 dark:text-slate-200">
                          {entry.name}
                        </span>
                      </div>
                      <p className="mt-2 text-xl font-bold leading-none" style={{ color: warna }}>
                        {(entry.value || 0).toFixed(1)}%
                      </p>
                      <p className="mt-1.5 truncate text-[11px] font-medium text-gray-600 dark:text-slate-300">
                        Rp {(entry.nominal || 0).toLocaleString("id-ID")}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500">{entry.count} SPJ</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Pie Chart */}
                <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white p-4 dark:from-slate-900/40 dark:to-slate-800/40">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-[#32848D] to-[#8B5CF6]" />
                    Distribusi Persentase
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <defs>
                        {pieData.map((entry) => (
                          <linearGradient
                            key={entry.key}
                            id={`pepin-pie-${entry.key}`}
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={KATEGORI_COLORS[entry.key] || "#94A3B8"} />
                            <stop offset="100%" stopColor={KATEGORI_AKSEN[entry.key] || "#CBD5E1"} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={42}
                        paddingAngle={3}
                        label={({ name, value }: any) => `${name || ""}: ${(value || 0).toFixed(1)}%`}
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={`url(#pepin-pie-${entry.key})`}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                        formatter={(value: any, _name: any, props: any) => [
                          `${(value || 0).toFixed(1)}% — Rp ${(props?.payload?.nominal || 0).toLocaleString("id-ID")} (${props?.payload?.count || 0} SPJ)`,
                          props?.payload?.name || "",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white p-4 dark:from-slate-900/40 dark:to-slate-800/40">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#10B981]" />
                    Nominal per Kategori (Rp)
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        {barData.map((entry) => (
                          <linearGradient
                            key={entry.key}
                            id={`pepin-bar-${entry.key}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={KATEGORI_COLORS[entry.key] || "#94A3B8"}
                              stopOpacity={0.95}
                            />
                            <stop
                              offset="100%"
                              stopColor={KATEGORI_COLORS[entry.key] || "#94A3B8"}
                              stopOpacity={0.35}
                            />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="dark:opacity-20" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                        formatter={(value: any) => [`Rp ${(value || 0).toLocaleString("id-ID")}`, "Nominal"]}
                      />
                      <Bar dataKey="nominal" radius={[8, 8, 0, 0]}>
                        {barData.map((entry) => (
                          <Cell key={entry.key} fill={`url(#pepin-bar-${entry.key})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
