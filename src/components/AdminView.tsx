import React, { useEffect, useState } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile, AuditLogItem, Jawatan } from "../types";
import {
  getAllUsers,
  updateUserAccess,
  getJawatanList,
  createJawatan,
  updateJawatan,
  deleteJawatan,
} from "../services/api";
import {
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  Edit,
  Plus,
  Trash2,
  Save,
  Building2,
  UserCheck,
  Layers,
  Database,
} from "lucide-react";

interface AdminViewProps {
  user: UserProfile;
  activeTab: "master" | "audit";
}

export const AdminView: React.FC<AdminViewProps> = ({ user, activeTab }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [jawatanList, setJawatanList] = useState<Jawatan[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [targetJawatanId, setTargetJawatanId] = useState("");
  const [targetRole, setTargetRole] = useState<"ADMIN" | "USER">("USER");
  const [targetIsActive, setTargetIsActive] = useState(true);

  // Edit Jawatan Modal State
  const [editingJawatan, setEditingJawatan] = useState<Jawatan | null>(null);
  const [isJawatanModalOpen, setIsJawatanModalOpen] = useState(false);
  const [jawatanForm, setJawatanForm] = useState({
    id: "",
    kode: "",
    nama: "",
    description: "",
    isActive: true,
  });

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "auditLogs"), limit(50)));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogItem));
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
    setTargetJawatanId(u.jawatanId || "unassigned");
    setTargetRole(u.role || "USER");
    setTargetIsActive(u.isActive !== false);
  };

  const handleSaveUserAccess = async () => {
    if (!editingUser) return;
    const selectedJ = jawatanList.find((j) => j.id === targetJawatanId);
    const jawatanName = selectedJ
      ? selectedJ.nama
      : targetJawatanId === "kapanewon-temon"
      ? "Administrasi Kapanewon Temon"
      : "Belum ditetapkan";
    try {
      await updateUserAccess(
        editingUser.uid,
        { role: targetRole, jawatanId: targetJawatanId, jawatanName, isActive: targetIsActive },
        user
      );
      setEditingUser(null);
      await fetchMasterData();
      alert(`Akses pengguna ${editingUser.email} berhasil diperbarui.`);
    } catch (e) {
      console.error("Failed to update user access:", e);
      alert("Gagal memperbarui akses pengguna.");
    }
  };

  const handleOpenCreateJawatan = () => {
    setEditingJawatan(null);
    setJawatanForm({ id: "", kode: "", nama: "", description: "", isActive: true });
    setIsJawatanModalOpen(true);
  };

  const handleOpenEditJawatan = (j: Jawatan) => {
    setEditingJawatan(j);
    setJawatanForm({ id: j.id, kode: j.kode, nama: j.nama, description: j.description || "", isActive: j.isActive });
    setIsJawatanModalOpen(true);
  };

  const handleSaveJawatan = async () => {
    if (!jawatanForm.kode.trim() || !jawatanForm.nama.trim()) {
      alert("Kode dan Nama Jawatan wajib diisi.");
      return;
    }
    try {
      const jawatanId = jawatanForm.id || `jawatan-${jawatanForm.kode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const payload = {
        id: jawatanId,
        kode: jawatanForm.kode.trim().toUpperCase(),
        nama: jawatanForm.nama.trim(),
        description: jawatanForm.description.trim(),
        isActive: jawatanForm.isActive,
      };
      if (editingJawatan) {
        await updateJawatan(jawatanId, payload, user);
      } else {
        await createJawatan(payload, user);
      }
      setIsJawatanModalOpen(false);
      await fetchMasterData();
      alert("Data jawatan berhasil disimpan.");
    } catch (e) {
      console.error("Failed to save jawatan:", e);
      alert("Gagal menyimpan data jawatan.");
    }
  };

  const handleDeleteJawatan = async (j: Jawatan) => {
    if (!confirm(`Yakin hapus jawatan "${j.nama}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deleteJawatan(j.id, user);
      await fetchMasterData();
      alert("Jawatan berhasil dihapus.");
    } catch (e) {
      console.error("Failed to delete jawatan:", e);
      alert("Gagal menghapus jawatan.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {activeTab === "master" ? "Manajemen Akses Pengguna & Master Data" : "Audit Trail Sistem KARSA"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {activeTab === "master"
              ? "Kelola penugasan Jawatan dan hak akses pengguna oleh Administrator (temonkec@gmail.com)"
              : "Riwayat aktivitas finalisasi, reopening, dan perubahan data penting"}
          </p>
        </div>
        <button
          onClick={activeTab === "audit" ? fetchAuditLogs : fetchMasterData}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* AUDIT TAB */}
      {activeTab === "audit" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Memuat log audit...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Belum ada catatan audit.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase">
                    <th className="p-4">Aksi</th>
                    <th className="p-4">Pengguna</th>
                    <th className="p-4">Entitas</th>
                    <th className="p-4">Alasan / Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="p-4 font-bold text-[#32848D] font-mono text-xs">{log.action}</td>
                      <td className="p-4 text-gray-800 dark:text-slate-200">{log.actorEmail}</td>
                      <td className="p-4 text-gray-600 dark:text-slate-400 text-xs font-mono">
                        {log.entityType} ({log.entityId})
                      </td>
                      <td className="p-4 text-gray-500 dark:text-slate-500 text-xs">
                        {log.reason || (log.newValue ? JSON.stringify(log.newValue) : "-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MASTER TAB */}
      {activeTab === "master" && (
        <div className="space-y-6">
          {/* Users Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-[#32848D]" />
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Daftar Pengguna & Penugasan Jawatan</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Atur hak akses login tiap akun jawatan</p>
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
                    <tr className="bg-gray-50 dark:bg-slate-700/50 border-b text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase">
                      <th className="p-4">Nama & Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Jawatan</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {usersList.map((u) => (
                      <tr key={u.uid} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30">
                        <td className="p-4">
                          <p className="font-semibold text-gray-900 dark:text-white">{u.displayName}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">{u.email}</p>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                              u.role === "ADMIN" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-gray-800 dark:text-slate-200">
                          {u.jawatanName || u.jawatanId || "Belum ditetapkan"}
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

          {/* Jawatan Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-[#32848D]" />
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Daftar Unit Jawatan</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">CRUD unit jawatan kecamatan</p>
                </div>
              </div>
              <button
                onClick={handleOpenCreateJawatan}
                className="px-4 py-2 bg-[#32848D] hover:bg-[#276972] text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jawatan</span>
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400">Memuat data jawatan...</div>
            ) : jawatanList.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Belum ada jawatan terdaftar.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 border-b text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase">
                      <th className="p-4">Kode</th>
                      <th className="p-4">Nama Jawatan</th>
                      <th className="p-4">Deskripsi</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {jawatanList.map((j) => (
                      <tr key={j.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30">
                        <td className="p-4 font-mono font-bold text-[#32848D]">{j.kode}</td>
                        <td className="p-4 font-semibold text-gray-900 dark:text-white">{j.nama}</td>
                        <td className="p-4 text-gray-600 dark:text-slate-400 text-xs">{j.description || "-"}</td>
                        <td className="p-4 text-center">
                          {j.isActive !== false ? (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditJawatan(j)}
                            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteJawatan(j)}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Master Template Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center space-x-3 text-[#619892]">
                <Layers className="w-6 h-6" />
                <h2 className="font-bold text-lg text-gray-900 dark:text-white">Master Template SPJ</h2>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
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
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center space-x-3 text-[#32848D]">
                <Database className="w-6 h-6" />
                <h2 className="font-bold text-lg text-gray-900 dark:text-white">Informasi Sistem</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Admin dapat membuat SPJ dari seluruh data jawatan. Setiap SPJ yang sudah terbuat dapat dihapus oleh admin dari daftar SPJ.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit User */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg border-b pb-3">
              <UserCheck className="w-5 h-5" />
              <span>Atur Akses & Jawatan Pengguna</span>
            </div>
            <div className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl">
              <p className="font-semibold text-gray-900 dark:text-white">{editingUser.displayName}</p>
              <p className="font-mono text-gray-500 dark:text-slate-400">{editingUser.email}</p>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Pilih Jawatan</label>
                <select
                  value={targetJawatanId}
                  onChange={(e) => setTargetJawatanId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
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
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Peran (Role)</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as "ADMIN" | "USER")}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="USER">USER (Pengelola SPJ Jawatan)</option>
                  <option value="ADMIN">ADMIN (Administrator Kapanewon)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Status Akun</label>
                <select
                  value={targetIsActive ? "active" : "inactive"}
                  onChange={(e) => setTargetIsActive(e.target.value === "active")}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
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
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium text-sm"
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

      {/* Modal Create/Edit Jawatan */}
      {isJawatanModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg border-b pb-3">
              <Building2 className="w-5 h-5" />
              <span>{editingJawatan ? "Edit Jawatan" : "Tambah Jawatan Baru"}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Kode Jawatan</label>
                <input
                  type="text"
                  value={jawatanForm.kode}
                  onChange={(e) => setJawatanForm({ ...jawatanForm, kode: e.target.value })}
                  placeholder="JTN-XXX"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Jawatan</label>
                <input
                  type="text"
                  value={jawatanForm.nama}
                  onChange={(e) => setJawatanForm({ ...jawatanForm, nama: e.target.value })}
                  placeholder="Jawatan Sosial"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Deskripsi</label>
                <textarea
                  value={jawatanForm.description}
                  onChange={(e) => setJawatanForm({ ...jawatanForm, description: e.target.value })}
                  placeholder="Deskripsi singkat unit jawatan"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white h-20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={jawatanForm.isActive ? "active" : "inactive"}
                  onChange={(e) => setJawatanForm({ ...jawatanForm, isActive: e.target.value === "active" })}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsJawatanModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveJawatan}
                className="px-5 py-2 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm shadow-sm"
              >
                <Save className="w-4 h-4 inline mr-1" />
                Simpan Jawatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
