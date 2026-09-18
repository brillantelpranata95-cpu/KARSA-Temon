import React, { useEffect, useState } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile, AuditLogItem, Jawatan, Kegiatan, KodeRekening } from "../types";
import {
  getAllUsers,
  updateUserAccess,
  adminCreateUser,
  adminDeleteUser,
  getJawatanList,
  createJawatan,
  updateJawatan,
  deleteJawatan,
  getKegiatanList,
  getKodeRekeningList,
  adminApproveKegiatan,
  adminRejectKegiatan,
  adminApproveKodeRekening,
  adminRejectKodeRekening,
  adminCreateKegiatan,
  adminCreateKodeRekening,
  adminUpdateKegiatan,
  adminUpdateKodeRekening,
} from "../services/api";
import { formatDateDDMMYYYY } from "../utils/date";
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
  UserPlus,
  Check,
  X,
  Clock,
  BookOpen,
  Tag,
} from "lucide-react";

interface AdminViewProps {
  user: UserProfile;
  activeTab: "master" | "audit";
}

export const AdminView: React.FC<AdminViewProps> = ({ user, activeTab }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [jawatanList, setJawatanList] = useState<Jawatan[]>([]);
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [rekList, setRekList] = useState<KodeRekening[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [targetJawatanId, setTargetJawatanId] = useState("");
  const [targetRole, setTargetRole] = useState<"ADMIN" | "USER">("USER");
  const [targetIsActive, setTargetIsActive] = useState(true);

  // Create User Modal State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDisplayName, setNewUserDisplayName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "USER">("USER");
  const [newUserJawatanId, setNewUserJawatanId] = useState("");

  // Edit/Create Jawatan Modal State
  const [editingJawatan, setEditingJawatan] = useState<Jawatan | null>(null);
  const [isJawatanModalOpen, setIsJawatanModalOpen] = useState(false);
  const [jawatanForm, setJawatanForm] = useState({
    id: "",
    kode: "",
    nama: "",
    description: "",
    isActive: true,
  });

  // Admin Direct Create Kegiatan Modal State
  const [isCreateKegiatanModalOpen, setIsCreateKegiatanModalOpen] = useState(false);
  const [newKegKode, setNewKegKode] = useState("");
  const [newKegNama, setNewKegNama] = useState("");
  const [newKegJawatanId, setNewKegJawatanId] = useState("");
  const [newKegTahun, setNewKegTahun] = useState(2026);

  // Admin Direct Create Rekening Modal State
  const [isCreateRekModalOpen, setIsCreateRekModalOpen] = useState(false);
  const [newRekKode, setNewRekKode] = useState("");
  const [newRekNama, setNewRekNama] = useState("");
  const [newRekKategori, setNewRekKategori] = useState("MAKAN_MINUM");
  const [newRekTahun, setNewRekTahun] = useState(2026);

  // Edit Kegiatan Modal State
  const [editingKegiatan, setEditingKegiatan] = useState<Kegiatan | null>(null);
  const [editKegKode, setEditKegKode] = useState("");
  const [editKegNama, setEditKegNama] = useState("");
  const [editKegJawatanId, setEditKegJawatanId] = useState("");
  const [editKegTahun, setEditKegTahun] = useState(2026);

  // Edit Rekening Modal State
  const [editingRekening, setEditingRekening] = useState<KodeRekening | null>(null);
  const [editRekKode, setEditRekKode] = useState("");
  const [editRekNama, setEditRekNama] = useState("");
  const [editRekKategori, setEditRekKategori] = useState("MAKAN_MINUM");

  // Delete User Modal State
  const [deleteUserUid, setDeleteUserUid] = useState<string | null>(null);

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
      const [uList, jList, kList, rList] = await Promise.all([
        getAllUsers(),
        getJawatanList(),
        getKegiatanList(undefined, true),
        getKodeRekeningList(true),
      ]);
      setUsersList(uList);
      setJawatanList(jList);
      setKegiatanList(kList);
      setRekList(rList);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      alert("Email wajib diisi!");
      return;
    }
    const selectedJ = jawatanList.find((j) => j.id === newUserJawatanId);
    const jawatanName = selectedJ
      ? selectedJ.nama
      : newUserJawatanId === "kapanewon-temon"
      ? "Administrasi Kapanewon Temon"
      : "Belum ditetapkan";

    try {
      await adminCreateUser(
        {
          email: newUserEmail,
          displayName: newUserDisplayName || newUserEmail.split("@")[0],
          role: newUserRole,
          jawatanId: newUserJawatanId || "unassigned",
          jawatanName,
        },
        user
      );
      setIsCreateUserModalOpen(false);
      setNewUserEmail("");
      setNewUserDisplayName("");
      await fetchMasterData();
      alert(`Pengguna ${newUserEmail} berhasil ditambahkan.`);
    } catch (e) {
      console.error("Failed to create user:", e);
      alert("Gagal menambahkan pengguna.");
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

  // Kegiatan Handlers
  const handleApproveKegiatan = async (kegId: string) => {
    try {
      await adminApproveKegiatan(kegId, user);
      await fetchMasterData();
      alert("Kode kegiatan berhasil disetujui!");
    } catch (e) {
      console.error(e);
      alert("Gagal menyetujui kode kegiatan.");
    }
  };

  const handleRejectKegiatan = async (kegId: string) => {
    if (!confirm("Tolak pengajuan kode kegiatan ini?")) return;
    try {
      await adminRejectKegiatan(kegId, user);
      await fetchMasterData();
      alert("Pengajuan kode kegiatan ditolak.");
    } catch (e) {
      console.error(e);
      alert("Gagal menolak kode kegiatan.");
    }
  };

  const handleDirectCreateKegiatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKegKode.trim() || !newKegNama.trim() || !newKegJawatanId) {
      alert("Lengkapi kode, nama, dan jawatan naungan kegiatan!");
      return;
    }
    try {
      await adminCreateKegiatan(
        {
          kodeKegiatan: newKegKode,
          namaKegiatan: newKegNama,
          jawatanId: newKegJawatanId,
          tahunAnggaran: newKegTahun,
        },
        user
      );
      setIsCreateKegiatanModalOpen(false);
      setNewKegKode("");
      setNewKegNama("");
      await fetchMasterData();
      alert("Kode kegiatan berhasil ditambahkan!");
    } catch (e) {
      console.error(e);
      alert("Gagal menambahkan kode kegiatan.");
    }
  };

  // Kode Rekening Handlers
  const handleApproveRekening = async (rekId: string) => {
    try {
      await adminApproveKodeRekening(rekId, user);
      await fetchMasterData();
      alert("Kode rekening berhasil disetujui!");
    } catch (e) {
      console.error(e);
      alert("Gagal menyetujui kode rekening.");
    }
  };

  const handleRejectRekening = async (rekId: string) => {
    if (!confirm("Tolak pengajuan kode rekening ini?")) return;
    try {
      await adminRejectKodeRekening(rekId, user);
      await fetchMasterData();
      alert("Pengajuan kode rekening ditolak.");
    } catch (e) {
      console.error(e);
      alert("Gagal menolak kode rekening.");
    }
  };

  const handleDirectCreateRekening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRekKode.trim() || !newRekNama.trim()) {
      alert("Lengkapi kode dan nama rekening!");
      return;
    }
    try {
      await adminCreateKodeRekening(
        {
          kode: newRekKode,
          nama: newRekNama,
          kategori: newRekKategori,
          tahunAnggaran: newRekTahun,
        },
        user
      );
      setIsCreateRekModalOpen(false);
      setNewRekKode("");
      setNewRekNama("");
      await fetchMasterData();
      alert("Kode rekening berhasil ditambahkan!");
    } catch (e) {
      console.error(e);
      alert("Gagal menambahkan kode rekening.");
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!deleteUserUid) return;
    try {
      await adminDeleteUser(deleteUserUid, user);
      setDeleteUserUid(null);
      await fetchMasterData();
      alert("Pengguna berhasil dihapus.");
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus pengguna.");
    }
  };

  // Edit Kegiatan Handlers
  const handleOpenEditKegiatan = (k: Kegiatan) => {
    setEditingKegiatan(k);
    setEditKegKode(k.kodeKegiatan);
    setEditKegNama(k.namaKegiatan);
    setEditKegJawatanId(k.jawatanId);
    setEditKegTahun(k.tahunAnggaran || 2026);
  };

  const handleSaveEditKegiatan = async () => {
    if (!editingKegiatan) return;
    try {
      await adminUpdateKegiatan(
        editingKegiatan.id,
        { kodeKegiatan: editKegKode, namaKegiatan: editKegNama, jawatanId: editKegJawatanId, tahunAnggaran: editKegTahun },
        user
      );
      setEditingKegiatan(null);
      await fetchMasterData();
      alert("Kode kegiatan berhasil diperbarui!");
    } catch (e) {
      console.error(e);
      alert("Gagal memperbarui kode kegiatan.");
    }
  };

  // Edit Rekening Handlers
  const handleOpenEditRekening = (r: KodeRekening) => {
    setEditingRekening(r);
    setEditRekKode(r.kode);
    setEditRekNama(r.nama);
    setEditRekKategori(r.kategori || "MAKAN_MINUM");
  };

  const handleSaveEditRekening = async () => {
    if (!editingRekening) return;
    try {
      await adminUpdateKodeRekening(
        editingRekening.id,
        { kode: editRekKode, nama: editRekNama, kategori: editRekKategori },
        user
      );
      setEditingRekening(null);
      await fetchMasterData();
      alert("Kode rekening berhasil diperbarui!");
    } catch (e) {
      console.error(e);
      alert("Gagal memperbarui kode rekening.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {activeTab === "master" ? "Manajemen Akses Pengguna & Master Data" : "Audit Trail Sistem KARSA"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {activeTab === "master"
              ? "Kelola pengguna, jawatan, kode kegiatan, dan kode rekening oleh Administrator"
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
        <div className="space-y-8">
          {/* 1. USERS MANAGEMENT TABLE */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-[#32848D]" />
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Daftar Pengguna & Penugasan Jawatan</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Atur hak akses login tiap akun jawatan</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setNewUserEmail("");
                  setNewUserDisplayName("");
                  setNewUserRole("USER");
                  setNewUserJawatanId(jawatanList[0]?.id || "jawatan-sosial");
                  setIsCreateUserModalOpen(true);
                }}
                className="px-4 py-2 bg-[#32848D] hover:bg-[#276972] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pengguna Baru</span>
              </button>
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
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="px-3 py-1.5 bg-[#32848D] hover:bg-[#276972] text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1 shadow-sm"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Ubah Akses</span>
                          </button>
                          <button
                            onClick={() => setDeleteUserUid(u.uid)}
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

          {/* 2. JAWATAN TABLE */}
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

          {/* 3. KODE KEGIATAN TABLE (WITH APPROVALS) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-[#32848D]" />
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Daftar Kode Kegiatan & Pengajuan</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Persetujuan usulan kegiatan baru & penetapan jawatan naungan</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setNewKegKode("");
                  setNewKegNama("");
                  setNewKegJawatanId(jawatanList[0]?.id || "jawatan-sosial");
                  setNewKegTahun(2026);
                  setIsCreateKegiatanModalOpen(true);
                }}
                className="px-4 py-2 bg-[#32848D] hover:bg-[#276972] text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kode Kegiatan</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase">
                    <th className="p-4">Kode Kegiatan</th>
                    <th className="p-4">Nama Kegiatan</th>
                    <th className="p-4">Jawatan Naungan</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {kegiatanList.map((k) => {
                    const jInfo = jawatanList.find((j) => j.id === k.jawatanId);
                    const isPending = k.status === "PENDING_APPROVAL";

                    return (
                      <tr key={k.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30">
                        <td className="p-4 font-mono font-bold text-[#32848D]">{k.kodeKegiatan}</td>
                        <td className="p-4 font-medium text-gray-900 dark:text-white">
                          <p>{k.namaKegiatan}</p>
                          {k.requestedBy && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400">Diajukan oleh: {k.requestedBy}</p>
                          )}
                        </td>
                        <td className="p-4 text-xs text-gray-700 dark:text-slate-300">
                          {jInfo?.nama || k.jawatanId}
                        </td>
                        <td className="p-4 text-center">
                          {isPending ? (
                            <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3 mr-1" /> Menunggu Approval
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Aktif
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApproveKegiatan(k.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>
                              <button
                                onClick={() => handleRejectKegiatan(k.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenEditKegiatan(k)}
                                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleRejectKegiatan(k.id)}
                                className="px-2.5 py-1 text-gray-400 hover:text-red-600 rounded-lg text-xs"
                                title="Hapus Kegiatan"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. KODE REKENING TABLE (WITH APPROVALS) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Tag className="w-5 h-5 text-[#32848D]" />
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Daftar Kode Rekening & Pengajuan</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Persetujuan usulan rekening belanja baru</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setNewRekKode("");
                  setNewRekNama("");
                  setNewRekKategori("MAKAN_MINUM");
                  setNewRekTahun(2026);
                  setIsCreateRekModalOpen(true);
                }}
                className="px-4 py-2 bg-[#32848D] hover:bg-[#276972] text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kode Rekening</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase">
                    <th className="p-4">Kode Rekening</th>
                    <th className="p-4">Nama Rekening</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {rekList.map((r) => {
                    const isPending = r.status === "PENDING_APPROVAL";

                    return (
                      <tr key={r.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30">
                        <td className="p-4 font-mono font-bold text-[#32848D]">{r.kode}</td>
                        <td className="p-4 font-medium text-gray-900 dark:text-white">
                          <p>{r.nama}</p>
                          {r.requestedBy && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400">Diajukan oleh: {r.requestedBy}</p>
                          )}
                        </td>
                        <td className="p-4 text-xs text-gray-600 dark:text-slate-300">
                          <span className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                            {r.kategori || "MAKAN_MINUM"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {isPending ? (
                            <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3 mr-1" /> Menunggu Approval
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Aktif
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApproveRekening(r.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>
                              <button
                                onClick={() => handleRejectRekening(r.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenEditRekening(r)}
                                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleRejectRekening(r.id)}
                                className="px-2.5 py-1 text-gray-400 hover:text-red-600 rounded-lg text-xs"
                                title="Hapus Rekening"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT USER ACCESS */}
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

      {/* MODAL CREATE NEW USER (ADMIN) */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg border-b pb-3">
              <UserPlus className="w-5 h-5" />
              <span>Tambah Pengguna Baru</span>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Email Pengguna (Google Account)</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={newUserDisplayName}
                  onChange={(e) => setNewUserDisplayName(e.target.value)}
                  placeholder="Nama Pegawai / Penanggungjawab"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Peran (Role)</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as "ADMIN" | "USER")}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="USER">USER (Hanya Akses SPJ Sesuai Jawatannya)</option>
                  <option value="ADMIN">ADMIN (Hak Akses Penuh Seperti temonkec@gmail.com)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Pilih Jawatan</label>
                <select
                  value={newUserJawatanId}
                  onChange={(e) => setNewUserJawatanId(e.target.value)}
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

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm shadow-sm"
                >
                  Tambah Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREATE/EDIT JAWATAN */}
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

      {/* MODAL ADMIN DIRECT CREATE KEGIATAN */}
      {isCreateKegiatanModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg border-b pb-3">
              <BookOpen className="w-5 h-5" />
              <span>Tambah Kode Kegiatan Baru</span>
            </div>
            <form onSubmit={handleDirectCreateKegiatan} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nomor Kode Kegiatan</label>
                <input
                  type="text"
                  required
                  value={newKegKode}
                  onChange={(e) => setNewKegKode(e.target.value)}
                  placeholder="contoh: 7.01.02.2.01.0003"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Kegiatan</label>
                <input
                  type="text"
                  required
                  value={newKegNama}
                  onChange={(e) => setNewKegNama(e.target.value)}
                  placeholder="Nama kegiatan resmi DPA"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Jawatan Yang Menaungi</label>
                <select
                  value={newKegJawatanId}
                  onChange={(e) => setNewKegJawatanId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                >
                  {jawatanList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Tahun Anggaran</label>
                <input
                  type="number"
                  value={newKegTahun}
                  onChange={(e) => setNewKegTahun(Number(e.target.value) || 2026)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateKegiatanModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm shadow-sm"
                >
                  Simpan Kegiatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN DIRECT CREATE REKENING */}
      {isCreateRekModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg border-b pb-3">
              <Tag className="w-5 h-5" />
              <span>Tambah Kode Rekening Baru</span>
            </div>
            <form onSubmit={handleDirectCreateRekening} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nomor Kode Rekening</label>
                <input
                  type="text"
                  required
                  value={newRekKode}
                  onChange={(e) => setNewRekKode(e.target.value)}
                  placeholder="contoh: 5.1.02.01.01.0024"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Rekening Belanja</label>
                <input
                  type="text"
                  required
                  value={newRekNama}
                  onChange={(e) => setNewRekNama(e.target.value)}
                  placeholder="Belanja Alat Tulis Kantor"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Kategori Pengeluaran</label>
                <select
                  value={newRekKategori}
                  onChange={(e) => setNewRekKategori(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="MAKAN_MINUM">Makanan dan Minuman</option>
                  <option value="HONOR">Honorarium / Jasa</option>
                  <option value="ATK">Alat Tulis Kantor (ATK)</option>
                  <option value="TRANSPORT">Perjalanan Dinas / Transport</option>
                  <option value="LAINNYA">Lain-Lain</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateRekModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm shadow-sm"
                >
                  Simpan Rekening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteUserUid && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-red-600 font-bold text-lg border-b pb-3">
              <Trash2 className="w-5 h-5" />
              <span>Hapus Pengguna</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan. Pengguna akan kehilangan akses ke aplikasi.
            </p>
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                onClick={() => setDeleteUserUid(null)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm shadow-sm"
              >
                Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Kegiatan Modal */}
      {editingKegiatan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg border-b pb-3">
              <Edit className="w-5 h-5" />
              <span>Edit Kode Kegiatan</span>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nomor Kode Kegiatan</label>
                <input
                  type="text"
                  value={editKegKode}
                  onChange={(e) => setEditKegKode(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Kegiatan</label>
                <input
                  type="text"
                  value={editKegNama}
                  onChange={(e) => setEditKegNama(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Jawatan Naungan</label>
                <select
                  value={editKegJawatanId}
                  onChange={(e) => setEditKegJawatanId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                >
                  {jawatanList.map((j) => (
                    <option key={j.id} value={j.id}>{j.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Tahun Anggaran</label>
                <input
                  type="number"
                  value={editKegTahun}
                  onChange={(e) => setEditKegTahun(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                onClick={() => setEditingKegiatan(null)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEditKegiatan}
                className="px-5 py-2 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rekening Modal */}
      {editingRekening && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg border-b pb-3">
              <Edit className="w-5 h-5" />
              <span>Edit Kode Rekening</span>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nomor Kode Rekening</label>
                <input
                  type="text"
                  value={editRekKode}
                  onChange={(e) => setEditRekKode(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Rekening Belanja</label>
                <input
                  type="text"
                  value={editRekNama}
                  onChange={(e) => setEditRekNama(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Kategori Pengeluaran</label>
                <select
                  value={editRekKategori}
                  onChange={(e) => setEditRekKategori(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="MAKAN_MINUM">Makanan dan Minuman</option>
                  <option value="HONOR">Honorarium / Jasa</option>
                  <option value="ATK">Alat Tulis Kantor (ATK)</option>
                  <option value="TRANSPORT">Perjalanan Dinas / Transport</option>
                  <option value="LAINNYA">Lain-Lain</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                onClick={() => setEditingRekening(null)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEditRekening}
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
