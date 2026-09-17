import React, { useEffect, useState } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile, AuditLogItem, Jawatan } from "../types";
import { getAllUsers, updateUserAccess, getJawatanList } from "../services/api";
import { ShieldCheck, Database, Layers, UserCheck, RefreshCw, Users, CheckCircle2, XCircle, Edit } from "lucide-react";

interface AdminViewProps {
  user: UserProfile;
  activeTab: "master" | "audit";
}

export const AdminView: React.FC<AdminViewProps> = ({ user, activeTab }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [jawatanList, setJawatanList] = useState<Jawatan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [targetJawatanId, setTargetJawatanId] = useState("");
  const [targetRole, setTargetRole] = useState<"ADMIN" | "USER">("USER");
  const [targetIsActive, setTargetIsActive] = useState(true);

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

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [uList, jList] = await Promise.all([getAllUsers(), getJawatanList()]);
      setUsersList(uList);
      setJawatanList(jList);
    } catch (e) {
      console.error("Failed to load master data:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    } else if (activeTab === "master") {
      fetchMasterData();
    }
  }, [activeTab]);

  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setTargetJawatanId(u.jawatanId || "jawatan-sosial");
    setTargetRole(u.role || "USER");
    setTargetIsActive(u.isActive !== false);
  };

  const handleSaveUserAccess = async () => {
    if (!editingUser) return;
    const selectedJ = jawatanList.find(j => j.id === targetJawatanId);
    const jawatanName = selectedJ ? selectedJ.nama : (targetJawatanId === "kapanewon-temon" ? "Administrasi Kapanewon Temon" : "Belum ditetapkan");
    try {
      await updateUserAccess(editingUser.uid, {
        role: targetRole,
        jawatanId: targetJawatanId,
        jawatanName,
        isActive: targetIsActive
      }, user);
      setEditingUser(null);
      await fetchMasterData();
      alert(`Akses pengguna ${editingUser.email} berhasil diperbarui.`);
    } catch (e) {
      console.error("Failed to update user access:", e);
      alert("Gagal memperbarui akses pengguna.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {activeTab === "master" ? "Manajemen Akses Pengguna & Master Data" : "Audit Trail Sistem KARSA"}
          </h1>
          <p className="text-sm text-gray-500">
            {activeTab === "master"
              ? "Kelola penugasan Jawatan dan hak akses pengguna oleh Administrator (temonkec@gmail.com)"
              : "Riwayat aktivitas finalisasi, reopening, dan perubahan data penting"}
          </p>
        </div>
        <button
          onClick={activeTab === "audit" ? fetchAuditLogs : fetchMasterData}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center space-x-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Memuat log audit...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Belum ada catatan audit.</div>
          ) : (
            <div className="overflow-x-auto">
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
                      <td className="p-4 font-bold text-[#32848D] font-mono text-xs">{log.action}</td>
                      <td className="p-4 text-gray-800">{log.actorEmail}</td>
                      <td className="p-4 text-gray-600 text-xs font-mono">{log.entityType} ({log.entityId})</td>
                      <td className="p-4 text-gray-500 text-xs">{log.reason || (log.newValue ? JSON.stringify(log.newValue) : "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "master" && (
        <div className="space-y-6">
          {/* User Access Management Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-[#32848D]" />
                <div>
                  <h2 className="font-bold text-gray-900">Daftar Pengguna & Penugasan Jawatan</h2>
                  <p className="text-xs text-gray-500">Atur hak akses login tiap akun jawatan</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400">Memuat data pengguna...</div>
            ) : usersList.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Belum ada pengguna terdaftar.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                      <th className="p-4">Nama & Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Jawatan</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList.map((u) => (
                      <tr key={u.uid} className="hover:bg-gray-50/80">
                        <td className="p-4">
                          <p className="font-semibold text-gray-900">{u.displayName}</p>
                          <p className="text-xs text-gray-500 font-mono">{u.email}</p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            u.role === "ADMIN" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-gray-800">{u.jawatanName || u.jawatanId || "Belum ditetapkan"}</span>
                        </td>
                        <td className="p-4 text-center">
                          {u.isActive !== false ? (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="px-3 py-1.5 bg-[#32848D] hover:bg-[#276972] text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1 shadow-sm"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Ubah Akses</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center space-x-3 text-[#32848D]">
                <Database className="w-6 h-6" />
                <h2 className="font-bold text-lg text-gray-900">Daftar Unit Jawatan</h2>
              </div>
              <ul className="space-y-2 text-xs text-gray-600">
                {jawatanList.map(j => (
                  <li key={j.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">[{j.kode}] {j.nama}</p>
                      <p className="text-gray-500">{j.description || "Unit Kerja Kapanewon Temon"}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">Aktif</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center space-x-3 text-[#619892]">
                <Layers className="w-6 h-6" />
                <h2 className="font-bold text-lg text-gray-900">Master Template SPJ</h2>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Template dokumen resmi Kapanewon Temon yang aktif:
              </p>
              <ul className="space-y-1.5 text-xs text-gray-700">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#32848D]"></span>
                  <span><strong>Bend 26</strong> — Bukti Kas Pengeluaran (Kuitansi Resmi)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#619892]"></span>
                  <span><strong>Daftar Hadir</strong> — Tabel Kehadiran Peserta Otomatis</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#93B39D]"></span>
                  <span><strong>Notulen Rapat</strong> — Catatan & Keputusan Rapat</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#CBDCA5]"></span>
                  <span><strong>SPJ Aktivitas Lapangan</strong> — Laporan Pelaksanaan Tugas</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Akses Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg border-b pb-3">
              <UserCheck className="w-5 h-5" />
              <span>Atur Akses & Jawatan Pengguna</span>
            </div>
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
              <p className="font-semibold text-gray-900">{editingUser.displayName}</p>
              <p className="font-mono text-gray-500">{editingUser.email}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Jawatan</label>
                <select
                  value={targetJawatanId}
                  onChange={(e) => setTargetJawatanId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm"
                >
                  <option value="kapanewon-temon">Administrasi Kapanewon Temon</option>
                  {jawatanList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama}
                    </option>
                  ))}
                  <option value="unassigned">Belum Ditetapkan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Peran (Role)</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as "ADMIN" | "USER")}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm"
                >
                  <option value="USER">USER (Pengelola SPJ Jawatan)</option>
                  <option value="ADMIN">ADMIN (Administrator Kapanewon)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status Akun</label>
                <select
                  value={targetIsActive ? "active" : "inactive"}
                  onChange={(e) => setTargetIsActive(e.target.value === "active")}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm"
                >
                  <option value="active">Aktif (Bisa Login & Mengakses Data)</option>
                  <option value="inactive">Nonaktif (Akses Ditangguhkan)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveUserAccess}
                className="px-5 py-2 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
