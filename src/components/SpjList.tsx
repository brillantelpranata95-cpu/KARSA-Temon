import React, { useEffect, useState } from "react";
import { UserProfile, SpjItem, Kegiatan, KodeRekening } from "../types";
import {
  getSpjList,
  getKegiatanList,
  getKodeRekeningList,
  getJawatanList,
  createSpjPackage,
  reopenSpj,
  deleteSpj,
  archiveSpj,
  getArchivedSpjList,
  requestNewKegiatan,
  requestNewKodeRekening,
  getSpjDocuments,
} from "../services/api";
import { formatDateDDMMYYYY } from "../utils/date";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Trash2,
  ArrowRight,
  Archive,
  Package,
  Download,
} from "lucide-react";

interface SpjListProps {
  user: UserProfile;
  onSelectSpj: (spjId: string, viewMode: "preview" | "edit") => void;
}

export const SpjList: React.FC<SpjListProps> = ({ user, onSelectSpj }) => {
  const [spjs, setSpjs] = useState<SpjItem[]>([]);
  const [archivedSpjs, setArchivedSpjs] = useState<SpjItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [rekList, setRekList] = useState<KodeRekening[]>([]);
  const [jawatanList, setJawatanList] = useState<{ id: string; nama: string }[]>([]);

  const [selectedKegiatanId, setSelectedKegiatanId] = useState("");
  const [selectedRekId, setSelectedRekId] = useState("");
  const [judulAktivitas, setJudulAktivitas] = useState("");
  const [jumlahPeserta, setJumlahPeserta] = useState<number>(20);
  const [tanggalSpj, setTanggalSpj] = useState(() => new Date().toISOString().split("T")[0]);
  const [adminOverrideJawatanId, setAdminOverrideJawatanId] = useState("");

  const [creating, setCreating] = useState(false);
  const [reopenSpjId, setReopenSpjId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [deleteSpjId, setDeleteSpjId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archiveSpjId, setArchiveSpjId] = useState<string | null>(null);

  // Request modals
  const [isRequestKegiatanOpen, setIsRequestKegiatanOpen] = useState(false);
  const [isRequestRekOpen, setIsRequestRekOpen] = useState(false);
  const [reqKegKode, setReqKegKode] = useState("");
  const [reqKegNama, setReqKegNama] = useState("");
  const [reqRekKode, setReqRekKode] = useState("");
  const [reqRekNama, setReqRekNama] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [spjData, archivedData, kData, rData, jawatanData] = await Promise.all([
        getSpjList(user),
        getArchivedSpjList(user),
        getKegiatanList(user.role === "ADMIN" ? undefined : user.jawatanId),
        getKodeRekeningList(),
        getJawatanList(),
      ]);
      setSpjs(spjData);
      setArchivedSpjs(archivedData);
      setKegiatanList(kData);
      setRekList(rData);
      setJawatanList(jawatanData);

      if (kData.length > 0) setSelectedKegiatanId(kData[0].id);
      if (rData.length > 0) setSelectedRekId(rData[0].id);
    } catch (e) {
      console.error("Gagal memuat data SPJ:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpj = async (e: React.FormEvent) => {
    e.preventDefault();
    const k = kegiatanList.find((x) => x.id === selectedKegiatanId);
    const r = rekList.find((x) => x.id === selectedRekId);

    if (!k || !r) {
      alert("Mohon lengkapi pilihan Kegiatan dan Kode Rekening.");
      return;
    }

    setCreating(true);
    try {
      let targetJawatanId = user.jawatanId;
      let targetJawatanName = user.jawatanName;

      if (user.role === "ADMIN" && adminOverrideJawatanId) {
        const found = jawatanList.find((jw) => jw.id === adminOverrideJawatanId);
        if (found) {
          targetJawatanId = found.id;
          targetJawatanName = found.nama;
        }
      }

      await createSpjPackage({
        user,
        kegiatan: k,
        jenisBelanja: { id: "", kode: "", nama: "", isActive: true },
        kodeRekening: r,
        tanggal: tanggalSpj,
        judulAktivitas,
        jumlahPeserta,
        targetJawatanId,
        targetJawatanName,
      });
      setIsModalOpen(false);
      setJudulAktivitas("");
      setJumlahPeserta(20);
      loadData();
    } catch (err: any) {
      alert("Gagal membuat Paket SPJ: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenSpjId || !reopenReason) return;
    try {
      await reopenSpj(reopenSpjId, reopenReason, user);
      setReopenSpjId(null);
      setReopenReason("");
      loadData();
    } catch (err: any) {
      alert("Gagal reopening SPJ: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteSpjId) return;
    setDeleting(true);
    try {
      await deleteSpj(deleteSpjId, user);
      setDeleteSpjId(null);
      loadData();
    } catch (err: any) {
      alert("Gagal menghapus SPJ: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveSpjId) return;
    try {
      await archiveSpj(archiveSpjId, user);
      setArchiveSpjId(null);
      loadData();
    } catch (err: any) {
      alert("Gagal mengarsipkan SPJ: " + err.message);
    }
  };

  const handleDownloadPdf = async (spjId: string) => {
    alert("Fitur download PDF akan segera tersedia. Untuk saat ini, gunakan fitur Print dari halaman Preview.");
  };

  const handleRequestKegiatanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqKegKode || !reqKegNama) return;
    setSubmittingReq(true);
    try {
      await requestNewKegiatan(
        { kodeKegiatan: reqKegKode, namaKegiatan: reqKegNama, tahunAnggaran: new Date().getFullYear() },
        user
      );
      alert("Pengajuan Kode Kegiatan berhasil dikirim. Menunggu persetujuan Admin.");
      setIsRequestKegiatanOpen(false);
      setReqKegKode("");
      setReqKegNama("");
    } catch (err: any) {
      alert("Gagal mengirim pengajuan: " + err.message);
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleRequestRekSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqRekKode || !reqRekNama) return;
    setSubmittingReq(true);
    try {
      await requestNewKodeRekening(
        { kode: reqRekKode, nama: reqRekNama, tahunAnggaran: new Date().getFullYear() },
        user
      );
      alert("Pengajuan Kode Rekening berhasil dikirim. Menunggu persetujuan Admin.");
      setIsRequestRekOpen(false);
      setReqRekKode("");
      setReqRekNama("");
    } catch (err: any) {
      alert("Gagal mengirim pengajuan: " + err.message);
    } finally {
      setSubmittingReq(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#32848D]" />
            Daftar Paket SPJ {user.role === "ADMIN" ? "Seluruh Jawatan" : user.jawatanName}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Kelola dan monitor berkas SPJ secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className={`px-4 py-2.5 rounded-2xl font-semibold text-sm flex items-center space-x-2 transition ${
              showArchive
                ? "bg-[#32848D] text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200"
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Arsip ({archivedSpjs.length})</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-2xl shadow-md transition inline-flex items-center space-x-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Paket SPJ Baru</span>
          </button>
        </div>
      </div>

      {/* ARCHIVE BOX */}
      {showArchive && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-200 dark:border-amber-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200">Box Arsip SPJ</h2>
            </div>
            <span className="text-xs font-semibold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-full">
              {archivedSpjs.length} SPJ Diarsipkan
            </span>
          </div>

          {archivedSpjs.length === 0 ? (
            <div className="text-center py-8 text-amber-600 dark:text-amber-400 text-sm">
              Belum ada SPJ yang diarsipkan.
            </div>
          ) : (
            <div className="space-y-2">
              {archivedSpjs.map((spj) => (
                <div
                  key={spj.id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-100 dark:border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{spj.nomorSpj}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama} — {formatDateDDMMYYYY(spj.tanggal)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownloadPdf(spj.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#32848D] bg-[#32848D]/10 hover:bg-[#32848D]/20 rounded-lg inline-flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => onSelectSpj(spj.id, "preview")}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TABLE LIST */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 dark:text-slate-500">Memuat data SPJ...</div>
        ) : spjs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Belum ada dokumen SPJ yang dibuat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-300 text-xs font-semibold border-b border-gray-100 dark:border-slate-700">
                  <th className="p-4">TANGGAL</th>
                  <th className="p-4">JAWATAN</th>
                  <th className="p-4">KEGIATAN & REKENING</th>
                  <th className="p-4">JUDUL AKTIVITAS</th>
                  <th className="p-4">PROGRESS</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-xs">
                {spjs.map((spj) => (
                  <tr key={spj.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="p-4 font-mono font-medium text-gray-700 dark:text-slate-300">
                      {formatDateDDMMYYYY(spj.tanggal)}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-100 dark:border-emerald-800/50">
                        {spj.jawatanName}
                      </span>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <p className="font-bold text-gray-900 dark:text-white">{spj.masterSnapshot.kegiatan.nama}</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        [{spj.masterSnapshot.kodeRekening.kode}] {spj.masterSnapshot.kodeRekening.nama}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-800 dark:text-slate-200">
                        {spj.sharedData?.judulAktivitas || "Rapat / Kegiatan"}
                      </p>
                      {spj.sharedData?.jumlahPeserta && (
                        <p className="text-[11px] text-gray-400">{spj.sharedData.jumlahPeserta} Peserta</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${spj.progress === 100 ? "bg-emerald-500" : "bg-[#32848D]"}`}
                            style={{ width: `${spj.progress}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-gray-700 dark:text-slate-200">{spj.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {spj.status === "FINALIZED" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Final
                        </span>
                      ) : spj.status === "COMPLETE" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-800">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Lengkap
                        </span>
                      ) : spj.status === "IN_PROGRESS" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5 mr-1" /> Proses
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-700">
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
                      ) : (
                        <button
                          onClick={() => setArchiveSpjId(spj.id)}
                          className="px-3 py-1.5 text-xs font-medium text-[#32848D] bg-[#32848D]/10 hover:bg-[#32848D]/20 rounded-lg inline-flex items-center space-x-1"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Arsipkan</span>
                        </button>
                      )}

                      {spj.status === "FINALIZED" && user.role === "ADMIN" && (
                        <button
                          onClick={() => setReopenSpjId(spj.id)}
                          className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg inline-flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reopen</span>
                        </button>
                      )}

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
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-3">
              Buat Paket SPJ Baru
            </h2>
            <form onSubmit={handleCreateSpj} className="space-y-4 text-sm">
              {user.role === "ADMIN" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Buat SPJ untuk Jawatan (Admin Override)
                  </label>
                  <select
                    value={adminOverrideJawatanId}
                    onChange={(e) => setAdminOverrideJawatanId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                  >
                    <option value="">— Gunakan Jawatan Saya ({user.jawatanName}) —</option>
                    {jawatanList.map((jw) => (
                      <option key={jw.id} value={jw.id}>
                        {jw.nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">Pilih Kegiatan</label>
                  <button
                    type="button"
                    onClick={() => setIsRequestKegiatanOpen(true)}
                    className="text-[11px] text-[#32848D] font-semibold hover:underline"
                  >
                    + Ajukan Kegiatan Baru
                  </button>
                </div>
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">Kode Rekening</label>
                  <button
                    type="button"
                    onClick={() => setIsRequestRekOpen(true)}
                    className="text-[11px] text-[#32848D] font-semibold hover:underline"
                  >
                    + Ajukan Rekening Baru
                  </button>
                </div>
                <select
                  value={selectedRekId}
                  onChange={(e) => setSelectedRekId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                >
                  {rekList.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.kode}] {r.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid 12: Judul Aktivitas (span 9), Jumlah Peserta (span 3) */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-9">
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
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Peserta</label>
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
                <p className="text-xs text-gray-400 mt-1">Format tersimpan: {formatDateDDMMYYYY(tanggalSpj)}</p>
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

      {/* MODAL ARCHIVE SPJ */}
      {archiveSpjId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#32848D] flex items-center gap-2">
              <Archive className="w-5 h-5" /> Arsipkan SPJ
            </h3>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              SPJ yang diarsipkan akan dipindahkan ke Box Arsip dan dapat diunduh dalam format PDF.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setArchiveSpjId(null)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleArchive}
                className="px-4 py-2 bg-[#32848D] text-white rounded-xl font-semibold hover:bg-[#276972]"
              >
                Arsipkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REOPEN SPJ */}
      {reopenSpjId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-amber-600 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" /> Konfirmasi Reopen SPJ
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Mengizinkan perbaikan dokumen SPJ yang sudah difinalisasi. Alasan reopening wajib dicatat ke Audit Log.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Alasan Reopen</label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Contoh: Perbaikan nominal kuitansi Bend 26..."
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white h-24"
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
                onClick={handleReopen}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700"
              >
                Reopen SPJ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE SPJ */}
      {deleteSpjId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Hapus Paket SPJ
            </h3>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus paket SPJ ini beserta seluruh dokumennya? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteSpjId(null)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              >
                {deleting ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REQUEST KEGIATAN BARU */}
      {isRequestKegiatanOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Ajukan Kode Kegiatan Baru</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Kode kegiatan ini akan otomatis terafiliasi dengan jawatan Anda ({user.jawatanName}) dan membutuhkan persetujuan Admin.
            </p>
            <form onSubmit={handleRequestKegiatanSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Kode Kegiatan</label>
                <input
                  type="text"
                  placeholder="Contoh: 1.02.01.2.02"
                  value={reqKegKode}
                  onChange={(e) => setReqKegKode(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Kegiatan</label>
                <input
                  type="text"
                  placeholder="Contoh: PENYELENGGARAAN URUSAN SOSIAL KAPANEWON"
                  value={reqKegNama}
                  onChange={(e) => setReqKegNama(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestKegiatanOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-4 py-2 bg-[#32848D] text-white rounded-xl font-semibold hover:bg-[#276972]"
                >
                  {submittingReq ? "Mengirim..." : "Kirim Pengajuan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REQUEST KODE REKENING BARU */}
      {isRequestRekOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Ajukan Kode Rekening Baru</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Kode rekening baru membutuhkan persetujuan Admin sebelum dapat digunakan.
            </p>
            <form onSubmit={handleRequestRekSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Kode Rekening</label>
                <input
                  type="text"
                  placeholder="Contoh: 5.1.02.01.01.0024"
                  value={reqRekKode}
                  onChange={(e) => setReqRekKode(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Rekening</label>
                <input
                  type="text"
                  placeholder="Contoh: Belanja Makan dan Minum Rapat"
                  value={reqRekNama}
                  onChange={(e) => setReqRekNama(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestRekOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-4 py-2 bg-[#32848D] text-white rounded-xl font-semibold hover:bg-[#276972]"
                >
                  {submittingReq ? "Mengirim..." : "Kirim Pengajuan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
