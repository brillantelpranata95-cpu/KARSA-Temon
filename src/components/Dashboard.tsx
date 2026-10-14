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
  Sector,
  LabelList,
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

/**
 * Warna ketiga (lebih pekat) — melengkapi gradien 3 tingkat di diagram.
 * Dengan tiga stop (terang → dasar → pekat) tiap irisan/batang punya kedalaman
 * warna, bukan sekadar blok datar.
 */
const KATEGORI_GELAP: Record<string, string> = {
  MAKAN_MINUM: "#1F5A61",
  HONOR: "#5B21B6",
  ATK: "#047857",
  TRANSPORT: "#B45309",
  LAINNYA: "#475569",
};

/** Format rupiah ringkas untuk label di dalam diagram (mis. "Rp 12,3 jt"). */
function rupiahRingkas(n: number): string {
  const angka = n || 0;
  if (angka >= 1_000_000_000) return `Rp ${(angka / 1_000_000_000).toFixed(1)} M`;
  if (angka >= 1_000_000) return `Rp ${(angka / 1_000_000).toFixed(1)} jt`;
  if (angka >= 1_000) return `Rp ${(angka / 1_000).toFixed(0)} rb`;
  return `Rp ${angka}`;
}

/**
 * Recharts 3 mengganti API sorotan diagram lingkaran: `activeIndex` DIHAPUS dan
 * `activeShape` sudah deprecated. Cara yang benar adalah prop `shape`, yang
 * menerima `isActive` (ditentukan otomatis dari hover Tooltip).
 *
 * `entri` dikirim pemanggil karena fungsi tingkat-modul tidak bisa membaca `pieData`.
 */
function sektorIrisan(props: any, entri: { key: string } | undefined) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, cornerRadius, isActive } = props;
  const isi = entri?.key ? `url(#pepin-pie-${entri.key})` : "#94A3B8";
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={isActive ? outerRadius + 8 : outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={cornerRadius ?? 8}
        fill={isi}
      />
      {isActive && (
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 13}
          outerRadius={outerRadius + 17}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={isi}
          opacity={0.5}
        />
      )}
    </g>
  );
}

/** Ikon khas tiap kategori — nama Koboyo (semua sudah ada di public/koboyo/). */
const KATEGORI_IKON: Record<string, string> = {
  MAKAN_MINUM: "package",
  HONOR: "users",
  ATK: "pencil",
  TRANSPORT: "map-pin",
  LAINNYA: "tag",
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
  // Indeks irisan diagram lingkaran yang sedang disorot kursor (null = tidak ada).
  const [pieAktif, setPieAktif] = useState<number | null>(null);

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

  // Badge ikon memakai latar GRADIEN PENUH dengan ikon PUTIH.
  //
  // Sebelumnya memakai `bg-<warna> bg-opacity-10`, tetapi `bg-opacity-*` sudah
  // DIHAPUS di Tailwind v4 (proyek ini v4) sehingga latarnya jadi SOLID dan ikon
  // berwarna senada di atasnya nyaris tak terlihat (biru di atas biru).
  const statCards = [
    { label: "Total SPJ", value: stats?.totalSpj || 0, icon: "file-text", grad: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/40", labelColor: "text-blue-600 dark:text-blue-400" },
    { label: "Selesai", value: stats?.finalizedSpj || 0, icon: "circle-check", grad: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/40", labelColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "Dalam Proses", value: stats?.inProgressSpj || 0, icon: "clock", grad: "from-amber-500 to-orange-600", glow: "shadow-amber-500/40", labelColor: "text-amber-600 dark:text-amber-400" },
    { label: "Draft", value: stats?.draftSpj || 0, icon: "warning", grad: "from-slate-400 to-slate-600", glow: "shadow-slate-400/40", labelColor: "text-slate-600 dark:text-slate-400" },
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

  // Kategori dengan porsi terbesar — dipakai untuk sorotan berwarna.
  const kategoriTeratas = pieData.length
    ? pieData.reduce((a, b) => ((b.value || 0) > (a.value || 0) ? b : a))
    : null;

  // Isi label tengah donat: kategori yang disorot, atau kategori terbesar.
  const sorotPie = pieAktif !== null ? pieData[pieAktif] : kategoriTeratas;

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
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            {/* Pita warna di tepi atas kartu */}
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.grad}`} />
            <div className="flex items-center justify-between gap-3">
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${card.grad} text-white shadow-lg ${card.glow}`}
              >
                <Icon name={card.icon} className="w-6 h-6" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-3xl font-bold leading-none text-gray-900 dark:text-white">{card.value}</p>
                <p className={`mt-1.5 truncate text-xs font-semibold ${card.labelColor}`}>{card.label}</p>
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
        {/* Kepala berwarna solid — bukan sekadar gradien tipis */}
        <div className="bg-gradient-to-r from-[#276972] via-[#32848D] to-[#7C4DBE] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/25 text-white backdrop-blur-sm">
                <Icon name="trending-up" className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">Analisis PEPIN</h2>
                <p className="text-xs text-white/80">
                  Pemetaan penggunaan anggaran berdasarkan kategori belanja
                </p>
              </div>
            </div>
            {!loading && pieData.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FCD34D]" />
                {pieData.length} kategori · {stats?.totalSpj || 0} SPJ
              </span>
            )}
          </div>
        </div>

        <div className="p-6">

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
              {/* Kartu warna SOLID per kategori (bukan sekadar gradien tipis) */}
              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {pieData.map((entry) => {
                  const warna = KATEGORI_COLORS[entry.key] || "#94A3B8";
                  const ikon = KATEGORI_IKON[entry.key] || "tag";
                  return (
                    <div
                      key={entry.key}
                      className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="h-1.5 w-full" style={{ background: warna }} />
                      <div className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
                            style={{ background: warna }}
                          >
                            <Icon name={ikon} className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate text-xs font-semibold text-gray-700 dark:text-slate-200">
                            {entry.name}
                          </span>
                        </div>
                        <p className="mt-2.5 text-2xl font-bold leading-none" style={{ color: warna }}>
                          {(entry.value || 0).toFixed(1)}%
                        </p>
                        <p className="mt-1.5 truncate text-[11px] font-medium text-gray-600 dark:text-slate-300">
                          Rp {(entry.nominal || 0).toLocaleString("id-ID")}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500">{entry.count} SPJ</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sorotan kategori terbesar — blok warna SOLID */}
              {kategoriTeratas && (
                <div
                  className="mb-6 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-white shadow-md"
                  style={{ background: KATEGORI_COLORS[kategoriTeratas.key] || "#94A3B8" }}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/25">
                    <Icon name="trophy" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                      Kategori terbesar
                    </p>
                    <p className="truncate text-sm font-bold">
                      {kategoriTeratas.name} · {(kategoriTeratas.value || 0).toFixed(1)}% · Rp{" "}
                      {(kategoriTeratas.nominal || 0).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Pie Chart */}
                <div className="rounded-xl border-2 border-[#32848D]/25 bg-[#32848D]/5 p-4 dark:border-[#32848D]/40 dark:bg-[#32848D]/10">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#276972] dark:text-[#9ED4DA]">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#32848D] text-white">
                      <Icon name="target" className="h-3.5 w-3.5" />
                    </span>
                    Distribusi Persentase
                  </h3>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={280}>
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
                              <stop offset="0%" stopColor={KATEGORI_AKSEN[entry.key] || "#CBD5E1"} />
                              <stop offset="45%" stopColor={KATEGORI_COLORS[entry.key] || "#94A3B8"} />
                              <stop offset="100%" stopColor={KATEGORI_GELAP[entry.key] || "#475569"} />
                            </linearGradient>
                          ))}
                        </defs>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={92}
                          innerRadius={48}
                          paddingAngle={4}
                          cornerRadius={8}
                          shape={(props: any) => sektorIrisan(props, pieData[props.index])}
                          onMouseEnter={(_: any, index: number) => setPieAktif(index)}
                          onMouseLeave={() => setPieAktif(null)}
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

                    {/* Label tengah donat — ikut berubah saat irisan disorot */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                        {sorotPie ? sorotPie.name : "Total"}
                      </p>
                      <p
                        className="mt-0.5 text-lg font-bold leading-none"
                        style={{
                          color: sorotPie ? KATEGORI_COLORS[sorotPie.key] || "#94A3B8" : undefined,
                        }}
                      >
                        {sorotPie
                          ? `${(sorotPie.value || 0).toFixed(1)}%`
                          : rupiahRingkas(stats?.totalNominal || 0)}
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                        {sorotPie ? rupiahRingkas(sorotPie.nominal || 0) : `${pieData.length} kategori`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4 dark:border-amber-400/40 dark:bg-amber-400/10">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500 text-white">
                      <Icon name="trending-up" className="h-3.5 w-3.5" />
                    </span>
                    Nominal per Kategori (Rp)
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} margin={{ top: 26, right: 10, left: 0, bottom: 0 }}>
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
                            <stop offset="0%" stopColor={KATEGORI_AKSEN[entry.key] || "#CBD5E1"} />
                            <stop offset="45%" stopColor={KATEGORI_COLORS[entry.key] || "#94A3B8"} />
                            <stop offset="100%" stopColor={KATEGORI_GELAP[entry.key] || "#475569"} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#94A3B8"
                        strokeOpacity={0.25}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                        formatter={(value: any) => [`Rp ${(value || 0).toLocaleString("id-ID")}`, "Nominal"]}
                      />
                      <Bar
                        dataKey="nominal"
                        radius={[10, 10, 0, 0]}
                        maxBarSize={56}
                        background={{ fill: "#94A3B8", fillOpacity: 0.12, radius: 10 }}
                      >
                        {barData.map((entry) => (
                          <Cell key={entry.key} fill={`url(#pepin-bar-${entry.key})`} />
                        ))}
                        {/* Label nilai di atas tiap batang, diwarnai sesuai kategori */}
                        <LabelList
                          dataKey="nominal"
                          position="top"
                          content={(props: any) => {
                            const { x, y, width, index } = props;
                            const entry = barData[index];
                            if (!entry) return <g />;
                            return (
                              <text
                                x={x + width / 2}
                                y={y - 8}
                                fill={KATEGORI_COLORS[entry.key] || "#94A3B8"}
                                textAnchor="middle"
                                fontSize={10}
                                fontWeight={700}
                              >
                                {rupiahRingkas(entry.nominal)}
                              </text>
                            );
                          }}
                        />
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
