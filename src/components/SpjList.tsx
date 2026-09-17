import React, { useEffect, useState } from "react";
import { UserProfile, SpjItem, Kegiatan, JenisBelanja, KodeRekening } from "../types";
import {
  getSpjList,
  getKegiatanList,
  getJenisBelanjaList,
  getKodeRekeningList,
  createSpjPackage,
  finalizeSpj,
  reopenSpj,
  deleteSpj,
} from "../services/api";
import {
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Eye,
  RefreshCw,
  Trash2,
} from "lucide-react";

// Format date to dd-mm-yyyy
const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

interface SpjListProps {
  user: UserProfile;
  onSelectSpj: (spjId: string, mode: "edit" | "preview") => void;
}

export const SpjList: React.FC<SpjListProps> = ({ user, onSelectSpj }) => {
  const [spjList, setSpjList] = useState<SpjItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Create SPJ state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [jenisList, setJenisList] = useState<JenisBelanja[]>([]);
  const [rekList, setRekList] = useState<KodeRekening[]>([]);

  const [selectedKegiatanId, setSelectedKegiatanId] = useState("");
  const [selectedJenisId, setSelectedJenisId] = useState("");
  const [selectedRekId, setSelectedRekId] = useState("");
  const [tanggalSpj, setTanggalSpj] = useState(new Date().toISOString().split("T")[0]);
  const [judulAktivitas, setJudulAktivitas] = useState("");
  const [jumlahPeserta, setJumlahPeserta] = useState(20);
  const [creating, setCreating] = useState(false);

  // Admin Reopen State
  const [reopenSpjId, setReopenSpjId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  // Admin Delete State
  const [deleteSpjId, setDeleteSpjId] = useState<string | null>(null);

  // Admin: override jawatan for SPJ creation
  const [adminOverrideJawatanId, setAdminOverrideJawatanId] = useState<string>("");
  const [adminKegiatanList, setAdminKegiatanList] = useState<Kegiatan[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSpjList(user);
      setSpjList(data);
    } catch (err) {
      console.error("Failed to load SPJ list:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleOpenCreateModal = async () => {
    setIsModalOpen(true);
    try {
      // Admin can see all kegiatan; user sees their jawatan's
      const kegQueryJawatan = user.role === "ADMIN" && adminOverrideJawatanId ? adminOverrideJawatanId : user.jawatanId;
      const [keg, jen, rek] = await Promise.all([
        getKegiatanList(kegQueryJawatan),
        getJenisBelanjaList(),
        getKodeRekeningList(),
      ]);
      setKegiatanList(keg);
      setJenisList(jen);
      setRekList(rek);

      if (keg.length > 0) setSelectedKegiatanId(keg[0].id);
      if (jen.length > 0) setSelectedJenisId(jen[0].id);
      if (rek.length > 0) {
        const initialJenis = jen[0];
        const matchingRek = initialJenis?.kodeRekeningId ? rek.find((r) => r.id === initialJenis.kodeRekeningId) : rek[0];
        setSelectedRekId((matchingRek || rek[0]).id);
      }
    } catch (e) {
      console.error("Failed to fetch modal dropdowns:", e);
    }
  };

  // Admin: load kegiatan for a selected jawatan override
  const handleAdminJawatanChange = async (jawatanId: string) => {
    setAdminOverrideJawatanId(jawatanId);
    if (jawatanId) {
      const keg = await getKegiatanList(jawatanId);
      setAdminKegiatanList(keg);
      setKegiatanList(keg);
      if (keg.length > 0) setSelectedKegiatanId(keg[0].id);
    }
  };

  const handleCreateSpj = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const kegiatan = kegiatanList.find((k) => k.id === selectedKegiatanId);
    const jenisBelanja = jenisList.find((j) => j.id === selectedJenisId);
    const kodeRekening = rekList.find((r) => r.id === selectedRekId);

    if (!kegiatan || !jenisBelanja || !kodeRekening || !judulAktivitas.trim() || jumlahPeserta < 1) {
      alert("Harap lengkapi kegiatan, jenis belanja, kode rekening, judul aktivitas, dan jumlah peserta.");
      setCreating(false);
      return;
    }

    try {
      // Admin override: if admin selected a different jawatan, use that
      const userForSpj = user.role === "ADMIN" && adminOverrideJawatanId
        ? {
            ...user,
            jawatanId: adminOverrideJawatanId,
            jawatanName: adminKegiatanList.find((k) => k.jawatanId === adminOverrideJawatanId)
              ? adminOverrideJawatanId
              : adminOverrideJawatanId,
          }
        : user;

      const newSpjId = await createSpjPackage({
        user: userForSpj,
        kegiatan,
        jenisBelanja,
        kodeRekening,
        tanggal: tanggalSpj,
        judulAktivitas,
        jumlahPeserta,
      });

      setIsModalOpen(false);
      setCreating(false);
      onSelectSpj(newSpjId, "edit");
    } catch (err) {
      console.error("Failed to create SPJ:", err);
      alert("Gagal membuat SPJ baru.");
      setCreating(false);
    }
  };

  const handleReopenSubmit = async () => {
    if (!reopenSpjId || !reopenReason.trim()) {
      alert("Alasan reopen wajib diisi!");
      return;
    }
    try {
      await reopenSpj(reopenSpjId, reopenReason, user);
      setReopenSpjId(null);
      setReopenReason("");
      loadData();
    } catch (e) {
      console.error("Failed to reopen SPJ:", e);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteSpjId) return;
    try {
      await deleteSpj(deleteSpjId, user);
      setDeleteSpjId(null);
      loadData();
    } catch (e) {
      console.error("Failed to delete SPJ:", e);
      alert("Gagal menghapus SPJ.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pengelolaan SPJ Kapanewon</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Daftar paket pertanggungjawaban keuangan & administratif Jawatan
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Buat Paket SPJ Baru</span>
        </button>
      </div>

      {/* SPJ Table List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Memuat daftar SPJ...</div>
        ) : spjList.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200">Belum Ada Paket SPJ</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Anda belum membuat paket pertanggungjawaban SPJ untuk unit kerja ini.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#32848D] text-white text-sm font-medium rounded-xl hover:bg-[#276972]"
            >
              + Buat SPJ Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600 text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                  <th className="p-4">Nomor SPJ</th>
                  <th className="p-4">Kegiatan</th>
                  <th className="p-4">Jenis Belanja</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4 text-center">Progress</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                {spjList.map((spj) => (
                  <tr key={spj.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-semibold text-[#32848D] font-mono">{spj.nomorSpj}</td>
                    <td className="p-4 text-gray-800 dark:text-slate-200 max-w-xs truncate">
                      {spj.masterSnapshot.kegiatan.nama}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-slate-300 font-medium">
                      {spj.masterSnapshot.jenisBelanja.nama}
                    </td>
                    <td className="p-4 text-gray-500 dark:text-slate-400 text-xs font-mono">
                      {formatDate(spj.tanggal)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-16 bg-gray-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              spj.progress === 100 ? "bg-emerald-500" : "bg-[#32848D]"
                            }`}
                            style={{ width: `${spj.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-200">{spj.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {spj.status === "FINALIZED" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Final
                        </span>
                      ) : spj.status === "COMPLETE" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Lengkap
                        </span>
                      ) : spj.status === "IN_PROGRESS" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5 mr-1" /> Proses
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectSpj(spj.id, "preview")}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {spj.status !== "FINALIZED" ? (
                        <button
                          onClick={() => onSelectSpj(spj.id, "edit")}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#32848D] hover:bg-[#276972] rounded-lg inline-flex items-center space-x-1 shadow-sm"
                        >
                          <span>Kelola</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : user.role === "ADMIN" ? (
                        <button
                          onClick={() => setReopenSpjId(spj.id)}
                          className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg inline-flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reopen</span>
                        </button>
                      ) : null}

                      {user.role === "ADMIN" && (
                        <button
                          onClick={() => setDeleteSpjId(spj.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg inline-flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREATE SPJ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-3">
              Buat Paket SPJ Baru
            </h2>
            <form onSubmit={handleCreateSpj} className="space-y-4 text-sm">
              {/* Admin Override: select jawatan */}
              {user.role === "ADMIN" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Buat SPJ untuk Jawatan (Admin Override)
                  </label>
                  <select
                    value={adminOverrideJawatanId}
                    onChange={(e) => handleAdminJawatanChange(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                  >
                    <option value="">— Gunakan Jawatan Saya ({user.jawatanName}) —</option>
                    {/* We'll populate jawatan list dynamically */}
                    <option value="jawatan-sosial">Jawatan Sosial</option>
                    <option value="jawatan-praja">Jawatan Praja</option>
                    <option value="jawatan-kemakmuran">Jawatan Kemakmuran</option>
                    <option value="jawatan-pelayanan">Jawatan Pelayanan Umum</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Pilih Kegiatan</label>
                <select
                  value={selectedKegiatanId}
                  onChange={(e) => setSelectedKegiatanId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                >
                  {kegiatanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      [{k.kodeKegiatan}] {k.namaKegiatan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Kode Rekening</label>
                <select
                  value={selectedRekId}
                  onChange={(e) => {
                    const nextRekId = e.target.value;
                    setSelectedRekId(nextRekId);
                    const linkedJenis = jenisList.find((j) => j.kodeRekeningId === nextRekId);
                    if (linkedJenis) setSelectedJenisId(linkedJenis.id);
                  }}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                >
                  {rekList.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.kode}] {r.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Jenis Belanja</label>
                <input
                  value={jenisList.find((j) => j.id === selectedJenisId)?.nama || "Belum dikonfigurasi untuk kode rekening ini"}
                  readOnly
                  className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5 text-gray-600 dark:text-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Judul Aktivitas</label>
                  <input
                    type="text"
                    value={judulAktivitas}
                    onChange={(e) => setJudulAktivitas(e.target.value)}
                    placeholder="Contoh: Rapat Koordinasi Persiapan Kegiatan"
                    required
                    className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Jumlah Peserta</label>
                  <input
                    type="number"
                    min="1"
                    value={jumlahPeserta}
                    onChange={(e) => setJumlahPeserta(Math.max(1, Number(e.target.value) || 1))}
                    required
                    className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  value={tanggalSpj}
                  onChange={(e) => setTanggalSpj(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Format tersimpan: {formatDate(tanggalSpj)}</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-[#32848D] text-white rounded-xl font-semibold hover:bg-[#276972]"
                >
                  {creating ? "Membuat..." : "Buat Paket SPJ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN REOPEN */}
      {reopenSpjId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-600 font-bold text-lg">
              <ShieldAlert className="w-6 h-6" />
              <span>Konfirmasi Reopen SPJ</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Mengizinkan perbaikan dokumen SPJ yang sudah difinalisasi. Alasan reopening wajib dicatat ke Audit Log.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Alasan Reopen</label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Contoh: Perbaikan nominal kuitansi Bend 26..."
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2 text-sm text-gray-900 dark:text-white h-24"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setReopenSpjId(null)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleReopenSubmit}
                className="px-5 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700"
              >
                Reopen SPJ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADMIN DELETE */}
      {deleteSpjId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-red-600 font-bold text-lg">
              <Trash2 className="w-6 h-6" />
              <span>Konfirmasi Hapus SPJ</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Tindakan ini akan menghapus paket SPJ beserta seluruh dokumen terkait secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteSpjId(null)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="px-5 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
