import React, { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { getSpjStatistics, getKegiatanList, getJenisBelanjaList, getKodeRekeningList, createSpjPackage } from "../services/api";
import { Kegiatan, JenisBelanja, KodeRekening } from "../types";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  DollarSign, 
  Plus,
  PieChart,
  BarChart3,
  RefreshCw,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface DashboardProps {
  user: UserProfile;
  onCreateSpj: () => void;
}

interface SpjStats {
  totalSpj: number;
  finalizedSpj: number;
  inProgressSpj: number;
  draftSpj: number;
  totalNominal: number;
  byKategori: Record<string, { count: number; totalNominal: number; percentage: number }>;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onCreateSpj }) => {
  const [stats, setStats] = useState<SpjStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getSpjStatistics(user);
      setStats(data);
      
      // Simple AI-style analysis based on kategori
      generateAIAnalysis(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
    setLoading(false);
  };

  const generateAIAnalysis = (data: SpjStats) => {
    if (!data || data.totalSpj === 0) {
      setAiAnalysis("Belum ada data SPJ yang dapat dianalisis. Buat paket SPJ pertama untuk memulai tracking anggaran.");
      return;
    }

    const kategoriLabels: Record<string, string> = {
      "MAKAN_MINUM": "Makanan & Minuman",
      "HONOR": "Honor/Pembayaran Jasa",
      "ATK": "Alat Tulis Kantor",
      "TRANSPORT": "Transportasi",
      "LAINNYA": "Lainnya"
    };

    const lines: string[] = [];
    lines.push(`**Ringkasan Anggaran SPJ:**`);
    lines.push(`Total ${data.totalSpj} paket SPJ dengan nilai **Rp ${data.totalNominal.toLocaleString("id-ID")}**.`);
    
    if (data.finalizedSpj > 0) {
      lines.push(`${data.finalizedSpj} paket telah difinalisasi dan selesai dipertanggungjawabkan.`);
    }
    
    if (data.inProgressSpj > 0) {
      lines.push(`${data.inProgressSpj} paket masih dalam proses penyelesaian dokumen.`);
    }

    lines.push("");
    lines.push("**Distribusi Penggunaan Anggaran per Kategori:**");

    const sortedKategori = Object.entries(data.byKategori)
      .sort((a, b) => b[1].percentage - a[1].percentage);

    sortedKategori.forEach(([kat, val]) => {
      const label = kategoriLabels[kat] || kat;
      const bar = "█".repeat(Math.round(val.percentage / 5));
      lines.push(`• **${label}**: ${val.percentage.toFixed(1)}% (Rp ${val.totalNominal.toLocaleString("id-ID")}) ${bar}`);
    });

    // AI-style recommendations
    lines.push("");
    lines.push("**💡 Rekomendasi:**");
    
    if (data.draftSpj > 0) {
      lines.push(`• Terdapat ${data.draftSpj} SPJ dalam status draft. Segera lengkapi dokumen untuk menghindari penumpukan tugas.`);
    }
    
    if (data.byKategori["MAKAN_MINUM"] && data.byKategori["MAKAN_MINUM"].percentage > 50) {
      lines.push(`• Pengeluaran untuk Makanan & Minuman mendominasi (${data.byKategori["MAKAN_MINUM"].percentage.toFixed(1)}%). Pertimbangkan efisiensi dengan menggabungkan beberapa rapat dalam satu waktu.`);
    }

    setAiAnalysis(lines.join("\n"));
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const statCards = [
    {
      label: "Total SPJ",
      value: stats?.totalSpj || 0,
      icon: FileText,
      color: "bg-blue-500",
      textColor: "text-blue-600"
    },
    {
      label: "Selesai",
      value: stats?.finalizedSpj || 0,
      icon: CheckCircle2,
      color: "bg-emerald-500",
      textColor: "text-emerald-600"
    },
    {
      label: "Dalam Proses",
      value: stats?.inProgressSpj || 0,
      icon: Clock,
      color: "bg-amber-500",
      textColor: "text-amber-600"
    },
    {
      label: "Draft",
      value: stats?.draftSpj || 0,
      icon: AlertCircle,
      color: "bg-gray-400",
      textColor: "text-gray-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Ringkasan SPJ</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user.jawatanName} — Analisis penggunaan anggaran otomatis
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onCreateSpj}
            className="px-5 py-2.5 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Buat SPJ Baru</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${card.color} bg-opacity-10`}>
                <card.icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
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

      {/* AI Analysis Panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3 border-b pb-4 mb-4">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Analisis Penggunaan Anggaran (AI)</h2>
            <p className="text-xs text-gray-500">Klasifikasi otomatis berdasarkan data SPJ terinput</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
            <p className="text-sm">Menganalisis data...</p>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
            {aiAnalysis}
          </div>
        )}
      </div>

      {/* Kategori Breakdown Chart */}
      {stats && Object.keys(stats.byKategori).length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 border-b pb-4 mb-4">
            <div className="p-2 bg-blue-100 rounded-xl">
              <PieChart className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="font-bold text-gray-900">Distribusi Kategori Pengeluaran</h2>
          </div>

          <div className="space-y-3">
            {Object.entries(stats.byKategori)
              .sort((a, b) => b[1].percentage - a[1].percentage)
              .map(([kat, val]) => {
                const colors: Record<string, string> = {
                  "MAKAN_MINUM": "bg-blue-500",
                  "HONOR": "bg-purple-500",
                  "ATK": "bg-green-500",
                  "TRANSPORT": "bg-orange-500",
                  "LAINNYA": "bg-gray-400"
                };
                
                return (
                  <div key={kat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{kat.replace(/_/g, " ")}</span>
                      <span className="text-gray-500">{val.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full ${colors[kat] || "bg-gray-400"}`}
                        style={{ width: `${Math.min(val.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400">
                      Rp {val.totalNominal.toLocaleString("id-ID")} ({val.count} SPJ)
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
