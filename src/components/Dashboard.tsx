import React, { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { getSpjStatistics } from "../services/api";
import { HeroSection } from "./HeroSection";
import { GamificationOverview } from "./GamificationOverview";
import { useHideScores } from "../utils/prefs";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
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
  Legend,
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
    { label: "Total SPJ", value: stats?.totalSpj || 0, icon: FileText, color: "bg-blue-500", textColor: "text-blue-600" },
    { label: "Selesai", value: stats?.finalizedSpj || 0, icon: CheckCircle2, color: "bg-emerald-500", textColor: "text-emerald-600" },
    { label: "Dalam Proses", value: stats?.inProgressSpj || 0, icon: Clock, color: "bg-amber-500", textColor: "text-amber-600" },
    { label: "Draft", value: stats?.draftSpj || 0, icon: AlertCircle, color: "bg-gray-400", textColor: "text-gray-600" },
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
                <card.icon className={`w-6 h-6 ${card.textColor}`} />
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
            <DollarSign className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Analisis PEPIN Panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-3 border-b border-gray-100 dark:border-slate-700 pb-4 mb-4">
          <div className="p-2 bg-[#32848D]/10 rounded-xl">
            <TrendingUp className="w-5 h-5 text-[#32848D]" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Analisis PEPIN</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">Pemetaan penggunaan anggaran berdasarkan kategori belanja</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 dark:text-slate-500">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
            <p className="text-sm">Menganalisis data...</p>
          </div>
        ) : pieData.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-slate-500">
            <p className="text-sm">Belum ada data SPJ yang dapat dianalisis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Distribusi Persentase</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    paddingAngle={2}
                    label={({ name, value }: any) => `${name || ""}: ${(value || 0).toFixed(1)}%`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={KATEGORI_COLORS[entry.key] || "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, _name: any, props: any) => [
                      `${(value || 0).toFixed(1)}% — Rp ${(props?.payload?.nominal || 0).toLocaleString("id-ID")} (${props?.payload?.count || 0} SPJ)`,
                      props?.payload?.name || "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Nominal per Kategori (Rp)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`} />
                  <Tooltip
                    formatter={(value: any) => [`Rp ${(value || 0).toLocaleString("id-ID")}`, "Nominal"]}
                  />
                  <Bar dataKey="nominal" radius={[8, 8, 0, 0]}>
                    {barData.map((entry) => (
                      <Cell key={entry.key} fill={KATEGORI_COLORS[entry.key] || "#94A3B8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
