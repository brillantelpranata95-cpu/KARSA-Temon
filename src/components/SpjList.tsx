import React, { useEffect, useState } from "react";
import { UserProfile, SpjItem, Kegiatan, JenisBelanja, KodeRekening } from "../types";
import {
  getSpjList,
  getKegiatanList,
  getJenisBelanjaList,
  getKodeRekeningList,
  createSpjPackage,
  finalizeSpj,
  reopenSpj
} from "../services/api";
import { Plus, FileText, CheckCircle2, Clock, AlertTriangle, ShieldAlert, ArrowRight, Eye, RefreshCw } from "lucide-react";

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
      const [keg, jen, rek] = await Promise.all([
        getKegiatanList(user.jawatanId),
        getJenisBelanjaList(),
        getKodeRekeningList()
      ]);
      setKegiatanList(keg);
      setJenisList(jen);
      setRekList(rek);

      if (keg.length > 0) setSelectedKegiatanId(keg[0].id);
      if (jen.length > 0) setSelectedJenisId(jen[0].id);
      if (rek.length > 0) {
        const initialJenis = jen[0];
        const matchingRek = initialJenis?.kodeRekeningId ? rek.find(r => r.id === initialJenis.kodeRekeningId) : rek[0];
        setSelectedRekId((matchingRek || rek[0]).id);
      }
    } catch (e) {
      console.error("Failed to fetch modal dropdowns:", e);
    }
  };

  const handleCreateSpj = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const kegiatan = kegiatanList.find(k => k.id === selectedKegiatanId);
    const jenisBelanja = jenisList.find(j => j.id === selectedJenisId);
    const kodeRekening = rekList.find(r => r.id === selectedRekId);

    if (!kegiatan || !jenisBelanja || !kodeRekening || !judulAktivitas.trim() || jumlahPeserta < 1) {
      alert("Harap lengkapi kegiatan, jenis belanja, kode rekening, judul aktivitas, dan jumlah peserta.");
      setCreating(false);
      return;
    }

    try {
      const newSpjId = await createSpjPackage({
        user,
        kegiatan,
        jenisBelanja,
        kodeRekening,
        tanggal: tanggalSpj,
        judulAktivitas,
        jumlahPeserta
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

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pengelolaan SPJ Kapanewon</h1>
          <p className="text-sm text-gray-500">
            Daftar paket pertanggungjawaban keuangan & administratif Jawatan
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Buat Paket SPJ Baru</span>
        </button>
      </div>

      {/* SPJ Table List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Memuat daftar SPJ...</div>
        ) : spjList.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-semibold text-gray-800">Belum Ada Paket SPJ</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Anda belum membuat paket pertanggungjawaban SPJ untuk unit kerja ini.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
            >
              + Buat SPJ Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Nomor SPJ</th>
                  <th className="p-4">Kegiatan</th>
                  <th className="p-4">Jenis Belanja</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4 text-center">Progress</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {spjList.map((spj) => (
                  <tr key={spj.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-semibold text-blue-600 font-mono">{spj.nomorSpj}</td>
                    <td className="p-4 text-gray-800 max-w-xs truncate">
                      {spj.masterSnapshot.kegiatan.nama}
                    </td>
                    <td className="p-4 text-gray-600 font-medium">
                      {spj.masterSnapshot.jenisBelanja.nama}
                    </td>
                    <td className="p-4 text-gray-500 text-xs font-mono">{spj.tanggal}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              spj.progress === 100 ? "bg-emerald-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${spj.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700">{spj.progress}%</span>
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
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {spj.status !== "FINALIZED" ? (
                        <button
                          onClick={() => onSelectSpj(spj.id, "edit")}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center space-x-1 shadow-sm"
                        >
                          <span>Kelola / Edit</span>
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
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-3">Buat Paket SPJ Baru</h2>
            <form onSubmit={handleCreateSpj} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Kegiatan</label>
                <select
                  value={selectedKegiatanId}
                  onChange={(e) => setSelectedKegiatanId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
                >
                  {kegiatanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      [{k.kodeKegiatan}] {k.namaKegiatan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kode Rekening</label>
                <select
                  value={selectedRekId}
                  onChange={(e) => {
                    const nextRekId = e.target.value;
                    setSelectedRekId(nextRekId);
                    const linkedJenis = jenisList.find(j => j.kodeRekeningId === nextRekId);
                    if (linkedJenis) setSelectedJenisId(linkedJenis.id);
                  }}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-[#32848D]"
                >
                  {rekList.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.kode}] {r.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Belanja</label>
                <input
                  value={jenisList.find(j => j.id === selectedJenisId)?.nama || "Belum dikonfigurasi untuk kode rekening ini"}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-gray-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Judul Aktivitas</label>
                  <input
                    type="text"
                    value={judulAktivitas}
                    onChange={(e) => setJudulAktivitas(e.target.value)}
                    placeholder="Contoh: Rapat Koordinasi Persiapan Kegiatan"
                    required
                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-[#32848D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jumlah Peserta</label>
                  <input
                    type="number"
                    min="1"
                    value={jumlahPeserta}
                    onChange={(e) => setJumlahPeserta(Math.max(1, Number(e.target.value) || 1))}
                    required
                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-[#32848D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  value={tanggalSpj}
                  onChange={(e) => setTanggalSpj(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-600 font-bold text-lg">
              <ShieldAlert className="w-6 h-6" />
              <span>Konfirmasi Reopen SPJ</span>
            </div>
            <p className="text-xs text-gray-500">
              Mengizinkan perbaikan dokumen SPJ yang sudah difinalisasi. Alasan reopening wajib dicatat ke Audit Log.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Alasan Reopen</label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Contoh: Perbaikan nominal kuitansi Bend 26..."
                className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-amber-500 h-24"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setReopenSpjId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
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
    </div>
  );
};
