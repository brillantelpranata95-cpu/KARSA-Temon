import React, { useEffect, useState } from "react";
import { UserProfile, SpjItem, SpjDocumentItem } from "../types";
import { getSpjById, getSpjDocuments, saveSpjDocumentData, finalizeSpj, updateSpjSharedData } from "../services/api";
import { terbilangRupiah } from "../utils/format";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Save,
  Link as LinkIcon,
  Plus,
  Trash2,
  Printer,
  ShieldCheck,
  UserCheck
} from "lucide-react";

interface SpjWizardProps {
  user: UserProfile;
  spjId: string;
  onBack: () => void;
  onPreview: () => void;
}

export const SpjWizard: React.FC<SpjWizardProps> = ({ user, spjId, onBack, onPreview }) => {
  const [spj, setSpj] = useState<SpjItem | null>(null);
  const [documents, setDocuments] = useState<SpjDocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Form State for Active Document
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [externalUrl, setExternalUrl] = useState<string>("");

  // PPTK Settings State
  const [isPptkModalOpen, setIsPptkModalOpen] = useState(false);
  const [pptkNama, setPptkNama] = useState("");
  const [pptkNip, setPptkNip] = useState("");
  const [pptkPangkat, setPptkPangkat] = useState("");

  const loadSpjData = async () => {
    try {
      const [s, docs] = await Promise.all([getSpjById(spjId), getSpjDocuments(spjId)]);
      setSpj(s);
      setDocuments(docs);

      if (s?.sharedData) {
        setPptkNama(s.sharedData.pptkNama || "SURADIMAN, S.I.P., M.M.");
        setPptkNip(s.sharedData.pptkNip || "19730101 199303 1 008");
        setPptkPangkat(s.sharedData.pptkPangkat || "Pembina; IV/a");
      }

      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
        setFormData(docs[0].data || {});
        setExternalUrl(docs[0].externalUrl || "");
      }
    } catch (err) {
      console.error("Error loading SPJ details:", err);
    }
  };

  useEffect(() => {
    loadSpjData();
  }, [spjId]);

  const activeDoc = documents.find(d => d.id === selectedDocId);

  const handleSelectDoc = (docItem: SpjDocumentItem) => {
    setSelectedDocId(docItem.id);
    setFormData(docItem.data || {});
    setExternalUrl(docItem.externalUrl || "");
  };

  const handleFormChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveDoc = async (status: "DRAFT" | "IN_PROGRESS" | "COMPLETED") => {
    if (!selectedDocId) return;
    setSaving(true);
    setSaveMessage("Menyimpan...");

    try {
      await saveSpjDocumentData(selectedDocId, formData, status, externalUrl);
      setSaveMessage("Tersimpan!");
      setTimeout(() => setSaveMessage(null), 2000);
      await loadSpjData();
    } catch (err) {
      console.error("Save error:", err);
      setSaveMessage("Gagal menyimpan.");
    }
    setSaving(false);
  };

  const handleFinalize = async () => {
    if (!spj) return;
    if (spj.progress < 100) {
      alert("Seluruh dokumen wajib harus berstatus SELESAI sebelum finalisasi.");
      return;
    }
    if (confirm("Apakah Anda yakin ingin memfinalisasi SPJ ini? Setelah finalisasi data menjadi read-only.")) {
      await finalizeSpj(spj.id, user);
      await loadSpjData();
    }
  };

  const handleSavePptk = async () => {
    if (!spj) return;
    try {
      await updateSpjSharedData(spj.id, {
        pptkNama: pptkNama.trim(),
        pptkNip: pptkNip.trim(),
        pptkPangkat: pptkPangkat.trim()
      });
      setIsPptkModalOpen(false);
      await loadSpjData();
      alert("Penandatangan PPTK berhasil diperbarui!");
    } catch (err) {
      console.error("Failed to update PPTK:", err);
      alert("Gagal memperbarui PPTK.");
    }
  };

  if (!spj) {
    return <div className="p-8 text-center text-gray-500">Memuat SPJ...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gray-900">{spj.nomorSpj}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {spj.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{spj.masterSnapshot.kegiatan.nama}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsPptkModalOpen(true)}
            className="px-4 py-2 bg-[#F6FAF5] hover:bg-[#CBDCA5]/40 text-[#32848D] border border-[#32848D]/20 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            <span>Atur PPTK</span>
          </button>

          <button
            onClick={onPreview}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Preview</span>
          </button>

          {spj.status !== "FINALIZED" && (
            <button
              onClick={handleFinalize}
              disabled={spj.progress < 100}
              className={`px-5 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-all ${
                spj.progress === 100
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Finalisasi SPJ</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Checklist + Editor */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Sidebar Checklist */}
        <div className="md:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 h-fit">
          <div>
            <h2 className="text-base font-bold text-gray-900">Checklist Kelengkapan</h2>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">Progress Pertanggungjawaban</span>
              <span className="text-xs font-bold text-blue-600">{spj.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  spj.progress === 100 ? "bg-emerald-500" : "bg-blue-600"
                }`}
                style={{ width: `${spj.progress}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {documents.map((docItem) => {
              const isActive = docItem.id === selectedDocId;
              const isCompleted = docItem.status === "COMPLETED";

              return (
                <button
                  key={docItem.id}
                  onClick={() => handleSelectDoc(docItem)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isActive
                      ? "border-blue-600 bg-blue-50/50 shadow-sm"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0"></div>
                    )}
                    <div className="truncate">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {docItem.documentTypeCode.replace("_", " ")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {isCompleted ? "Selesai" : "Belum Lengkap"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Editor */}
        <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          {activeDoc ? (
            <>
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Formulir {activeDoc.documentTypeCode.replace("_", " ")}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Isi data sesuai petunjuk master template Kapanewon Temon
                  </p>
                </div>
                {saveMessage && (
                  <span className="text-xs font-semibold text-emerald-600 animate-pulse">
                    {saveMessage}
                  </span>
                )}
              </div>

              {/* ================= FORM EDITOR BEND 26 ================= */}
              {activeDoc.documentTypeCode === "BEND_26" && (
                <div className="space-y-4 text-sm">
                  <div className="rounded-xl border border-[#32848D]/15 bg-[#F6FAF5] p-4 text-sm leading-6 text-slate-700">
                    <p>{spj.sharedData?.judulAktivitas || "Judul aktivitas"} sebanyak {spj.sharedData?.jumlahPeserta || 0} peserta pada tanggal {spj.tanggal}</p>
                    <p>{spj.masterSnapshot.kodeRekening.nama}</p>
                    <p className="font-semibold">{spj.masterSnapshot.kegiatan.nama.toUpperCase()}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nominal (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.nominal ?? 0}
                      onChange={(e) => handleFormChange("nominal", Math.max(0, Number(e.target.value) || 0))}
                      className="w-full border border-gray-300 rounded-xl p-2.5 font-bold"
                    />
                    <p className="mt-1 text-xs text-slate-500">{terbilangRupiah(Number(formData.nominal || 0))}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {["phr", "pph", "ppn"].map((pajak) => (
                      <label key={pajak} className="block text-xs font-semibold uppercase text-gray-700">
                        Pajak {pajak}
                        <input
                          type="number"
                          min="0"
                          value={formData[pajak] ?? 0}
                          onChange={(e) => handleFormChange(pajak, Math.max(0, Number(e.target.value) || 0))}
                          className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 font-normal"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ================= FORM EDITOR NOTULEN ================= */}
              {activeDoc.documentTypeCode === "NOTULENSI_RAPAT" && (
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Acara Rapat</label>
                    <input
                      type="text"
                      value={formData.acara || "Rapat Koordinasi Pentas Seni Non-Rekognisi"}
                      onChange={(e) => handleFormChange("acara", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Hari / Tanggal</label>
                      <input
                        type="text"
                        value={formData.hariTanggal || "Rabu, 05 Agustus 2026"}
                        onChange={(e) => handleFormChange("hariTanggal", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl p-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Pukul</label>
                      <input
                        type="text"
                        value={formData.pukul || "09.00 WIB s.d. 11.30 WIB"}
                        onChange={(e) => handleFormChange("pukul", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl p-2.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Keputusan Rapat</label>
                    <textarea
                      value={
                        formData.keputusanRapat ||
                        `1. Rapat dibuka pukul 09.00 WIB oleh Pimpinan Rapat.\n2. Pembukaan oleh Panewu Temon.\n3. Diskusi teknis pelaksanaan pentas seni.`
                      }
                      onChange={(e) => handleFormChange("keputusanRapat", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 h-36"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* ================= FORM EDITOR SURAT UNDANGAN ================= */}
              {activeDoc.documentTypeCode === "SURAT_UNDANGAN" && (
                <div className="space-y-4 text-sm">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                      Tautan Dokumen External Google Drive (Wajib)
                    </label>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Surat undangan sudah dibuat di luar web app ini. Cukup tautkan link Google Drive untuk verifikasi & cetak.
                    </p>
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="w-4 h-4 text-blue-600" />
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... atau https://drive.google.com/document/d/..."
                        className="w-full border border-blue-300 dark:border-blue-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    {externalUrl && (
                      <div className="mt-2 p-2 bg-white dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Preview:</p>
                        <iframe
                          src={externalUrl.replace("/view?usp=drive_fs", "/preview").replace("/edit", "/preview")}
                          className="w-full h-64 rounded-lg border-0"
                          title="Surat Undangan Preview"
                        ></iframe>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Save Controls */}
              {spj.status !== "FINALIZED" && (
                <div className="flex justify-end space-x-3 border-t pt-4">
                  <button
                    onClick={() => handleSaveDoc("IN_PROGRESS")}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm"
                  >
                    Simpan Draf
                  </button>
                  <button
                    onClick={() => handleSaveDoc("COMPLETED")}
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center space-x-2 shadow-sm"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Tandai Selesai & Simpan</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-400">Pilih dokumen dari checklist di sebelah kiri</div>
          )}
        </div>
      </div>

      {/* Modal Edit PPTK Penandatangan */}
      {isPptkModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg border-b pb-3">
              <UserCheck className="w-5 h-5" />
              <span>Pengaturan Penandatangan PPTK</span>
            </div>
            <p className="text-xs text-gray-500">
              Atur nama, NIP, dan pangkat/jabatan PPTK yang akan mencetak di seluruh dokumen SPJ ini.
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama PPTK</label>
                <input
                  type="text"
                  value={pptkNama}
                  onChange={(e) => setPptkNama(e.target.value)}
                  placeholder="SURADIMAN, S.I.P., M.M."
                  className="w-full border border-gray-300 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">NIP PPTK</label>
                <input
                  type="text"
                  value={pptkNip}
                  onChange={(e) => setPptkNip(e.target.value)}
                  placeholder="19730101 199303 1 008"
                  className="w-full border border-gray-300 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pangkat / Golongan PPTK</label>
                <input
                  type="text"
                  value={pptkPangkat}
                  onChange={(e) => setPptkPangkat(e.target.value)}
                  placeholder="Pembina; IV/a"
                  className="w-full border border-gray-300 rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsPptkModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePptk}
                className="px-5 py-2 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm shadow-sm"
              >
                Simpan Penandatangan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
