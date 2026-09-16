import React, { useEffect, useState } from "react";
import { UserProfile, SpjItem, SpjDocumentItem } from "../types";
import { getSpjById, getSpjDocuments, saveSpjDocumentData, finalizeSpj } from "../services/api";
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
  ShieldCheck
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

  const loadSpjData = async () => {
    try {
      const [s, docs] = await Promise.all([getSpjById(spjId), getSpjDocuments(spjId)]);
      setSpj(s);
      setDocuments(docs);

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
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Terima Dari</label>
                    <input
                      type="text"
                      value={formData.terimaDari || "Bendahara Pengeluaran Kapanewon Temon"}
                      onChange={(e) => handleFormChange("terimaDari", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nominal (Rp)</label>
                      <input
                        type="number"
                        value={formData.nominal || 320000}
                        onChange={(e) => handleFormChange("nominal", Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-xl p-2.5 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Terbilang</label>
                      <input
                        type="text"
                        value={formData.uangSebesar || "Tiga ratus dua puluh ribu rupiah"}
                        onChange={(e) => handleFormChange("uangSebesar", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl p-2.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Untuk Membayar</label>
                    <textarea
                      value={formData.untukMembayar || spj.masterSnapshot.kegiatan.nama}
                      onChange={(e) => handleFormChange("untukMembayar", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 h-20"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Penerima</label>
                      <input
                        type="text"
                        value={formData.penerimaNama || ""}
                        onChange={(e) => handleFormChange("penerimaNama", e.target.value)}
                        placeholder="Contoh: SUYATINI"
                        className="w-full border border-gray-300 rounded-xl p-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Jabatan Penerima</label>
                      <input
                        type="text"
                        value={formData.penerimaJabatan || ""}
                        onChange={(e) => handleFormChange("penerimaJabatan", e.target.value)}
                        placeholder="Contoh: Pengelola Catering"
                        className="w-full border border-gray-300 rounded-xl p-2.5"
                      />
                    </div>
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
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-blue-900">
                      Tautan Dokumen External Google Drive (Optional)
                    </label>
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="w-4 h-4 text-blue-600" />
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full border border-blue-300 rounded-lg p-2 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tujuan Undangan</label>
                    <input
                      type="text"
                      value={formData.tujuanUndangan || "Bapak/Ibu Kepala Sekolah Penampil"}
                      onChange={(e) => handleFormChange("tujuanUndangan", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5"
                    />
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
    </div>
  );
};
