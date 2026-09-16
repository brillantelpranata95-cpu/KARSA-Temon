import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile, AuditLogItem } from "../types";
import { ShieldCheck, Database, Layers, UserCheck, RefreshCw } from "lucide-react";

interface AdminViewProps {
  user: UserProfile;
  activeTab: "master" | "audit";
}

export const AdminView: React.FC<AdminViewProps> = ({ user, activeTab }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "auditLogs"), limit(50)));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogItem));
      setLogs(data);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {activeTab === "master" ? "Manajemen Master Data & Konfigurasi" : "Audit Trail Sistem KARSA"}
          </h1>
          <p className="text-sm text-gray-500">
            {activeTab === "master"
              ? "Konfigurasi Jawatan, Kegiatan, Kode Rekening, dan Template SPJ"
              : "Riwayat aktivitas finalisasi, reopening, dan perubahan data penting"}
          </p>
        </div>
        {activeTab === "audit" && (
          <button
            onClick={fetchAuditLogs}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Audit Log</span>
          </button>
        )}
      </div>

      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Memuat log audit...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Belum ada catatan audit.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  <th className="p-4">Aksi</th>
                  <th className="p-4">Pengguna</th>
                  <th className="p-4">Entitas</th>
                  <th className="p-4">Alasan / Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-blue-600 font-mono text-xs">{log.action}</td>
                    <td className="p-4 text-gray-800">{log.actorEmail}</td>
                    <td className="p-4 text-gray-600 text-xs font-mono">{log.entityType} ({log.entityId})</td>
                    <td className="p-4 text-gray-500 text-xs">{log.reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "master" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-3 text-blue-600">
              <Database className="w-6 h-6" />
              <h2 className="font-bold text-lg text-gray-900">Jawatan & User Access</h2>
            </div>
            <p className="text-xs text-gray-500">
              Sistem telah terkonfigurasi dengan isolasi data antar Jawatan (Jawatan Sosial, Praja, Kemakmuran, Pelayanan Umum).
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-3 text-emerald-600">
              <Layers className="w-6 h-6" />
              <h2 className="font-bold text-lg text-gray-900">Master Template SPJ</h2>
            </div>
            <p className="text-xs text-gray-500">
              Template Bend 26, Notulen, SPJ Aktivitas Lapangan, dan Daftar Hadir aktif versi 1.0.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
