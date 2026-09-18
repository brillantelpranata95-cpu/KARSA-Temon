import React, { useEffect, useState, useRef } from "react";
import { UserProfile, SpjItem, SpjDocumentItem } from "../types";
import { getSpjById, getSpjDocuments, saveSpjDocumentData, finalizeSpj, updateSpjSharedData } from "../services/api";
import { terbilangRupiah } from "../utils/format";
import { formatDateDDMMYYYY, getNamaHariCapitalized, getNamaHari } from "../utils/date";
import QRCode from "qrcode";
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
  UserCheck,
  Users,
  QrCode,
  Download,
  ExternalLink
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

  // QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrLink, setQrLink] = useState<string>("");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const generateQRCode = async () => {
    if (!spj) return;
    const attendanceUrl = `${window.location.origin}/absen/${spjId}`;
    setQrLink(attendanceUrl);
    try {
      const dataUrl = await QRCode.toDataURL(attendanceUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error("QR generation error:", e);
      alert("Gagal membuat QR code.");
    }
  };

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
                  <div className="rounded-xl border border-[#32848D]/15 bg-[#F6FAF5] dark:bg-slate-700/50 p-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    <p>{spj.sharedData?.judulAktivitas || "Judul aktivitas"} sebanyak {spj.sharedData?.jumlahPeserta || 0} peserta pada tanggal {formatDateDDMMYYYY(spj.tanggal)}</p>
                    <p>{spj.masterSnapshot.kodeRekening.nama}</p>
                    <p className="font-semibold">{spj.masterSnapshot.kegiatan.nama.toUpperCase()}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nominal (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.nominal ?? 0}
                      onChange={(e) => handleFormChange("nominal", Math.max(0, Number(e.target.value) || 0))}
                      className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 font-bold text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 capitalize font-medium">{terbilangRupiah(Number(formData.nominal || 0))}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {["phr", "pph", "ppn"].map((pajak) => (
                      <label key={pajak} className="block text-xs font-semibold uppercase text-gray-700 dark:text-slate-300">
                        Pajak {pajak}
                        <input
                          type="number"
                          min="0"
                          value={formData[pajak] ?? 0}
                          onChange={(e) => handleFormChange(pajak, Math.max(0, Number(e.target.value) || 0))}
                          className="mt-1 w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 font-normal text-gray-900 dark:text-white"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ================= FORM EDITOR NOTULEN ================= */}
              {activeDoc.documentTypeCode === "NOTULENSI_RAPAT" && (
                <div className="space-y-4 text-sm">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                    Acara dan Hari/Tanggal diisi otomatis dari paket SPJ. Poin 1 dan poin penutup keputusan rapat diformat secara baku secara otomatis.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Acara Rapat (Otomatis)</label>
                      <input
                        type="text"
                        value={spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama}
                        readOnly
                        className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5 text-gray-600 dark:text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Hari / Tanggal (Otomatis)</label>
                      <input
                        type="text"
                        value={`${getNamaHariCapitalized(spj.tanggal)}, ${formatDateDDMMYYYY(spj.tanggal)}`}
                        readOnly
                        className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5 text-gray-600 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Jam Mulai Rapat</label>
                      <input
                        type="text"
                        value={formData.jamMulai || "09.00"}
                        onChange={(e) => {
                          const jMulai = e.target.value;
                          handleFormChange("jamMulai", jMulai);
                          // rebuild keputusan
                          const jSelesai = formData.jamSelesai || "11.30";
                          const tengah = formData.poinTengah || "Pembukaan oleh Panewu Temon.\nDiskusi teknis pelaksanaan kegiatan.";
                          const lines = tengah.split("\n").filter((l: string) => l.trim().length > 0);
                          let idx = 1;
                          const result = [];
                          result.push(`${idx++}. Kegiatan rapat koordinasi dimulai pada pukul ${jMulai} WIB dibuka dengan doa bersama oleh pemimpin rapat;`);
                          lines.forEach((line: string) => {
                            const clean = line.replace(/^\d+\.\s*/, "").trim();
                            if (clean) result.push(`${idx++}. ${clean}${clean.endsWith(";") || clean.endsWith(".") ? "" : ";"}`);
                          });
                          result.push(`${idx}. Kegiatan rapat koordinasi diakhiri pada pukul ${jSelesai} WIB ditutup dengan doa bersama oleh pemimpin rapat.`);
                          handleFormChange("keputusanRapat", result.join("\n"));
                        }}
                        placeholder="09.00"
                        className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Jam Selesai Rapat</label>
                      <input
                        type="text"
                        value={formData.jamSelesai || "11.30"}
                        onChange={(e) => {
                          const jSelesai = e.target.value;
                          handleFormChange("jamSelesai", jSelesai);
                          const jMulai = formData.jamMulai || "09.00";
                          const tengah = formData.poinTengah || "Pembukaan oleh Panewu Temon.\nDiskusi teknis pelaksanaan kegiatan.";
                          const lines = tengah.split("\n").filter((l: string) => l.trim().length > 0);
                          let idx = 1;
                          const result = [];
                          result.push(`${idx++}. Kegiatan rapat koordinasi dimulai pada pukul ${jMulai} WIB dibuka dengan doa bersama oleh pemimpin rapat;`);
                          lines.forEach((line: string) => {
                            const clean = line.replace(/^\d+\.\s*/, "").trim();
                            if (clean) result.push(`${idx++}. ${clean}${clean.endsWith(";") || clean.endsWith(".") ? "" : ";"}`);
                          });
                          result.push(`${idx}. Kegiatan rapat koordinasi diakhiri pada pukul ${jSelesai} WIB ditutup dengan doa bersama oleh pemimpin rapat.`);
                          handleFormChange("keputusanRapat", result.join("\n"));
                        }}
                        placeholder="11.30"
                        className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Poin-Poin Isi Keputusan Rapat (Tengah)
                    </label>
                    <textarea
                      value={formData.poinTengah || "Pembukaan dari Panewu Temon.\nDiskusi teknis pelaksanaan kegiatan."}
                      onChange={(e) => {
                        const tengah = e.target.value;
                        handleFormChange("poinTengah", tengah);
                        const jMulai = formData.jamMulai || "09.00";
                        const jSelesai = formData.jamSelesai || "11.30";
                        const lines = tengah.split("\n").filter((l: string) => l.trim().length > 0);
                        let idx = 1;
                        const result = [];
                        result.push(`${idx++}. Kegiatan rapat koordinasi dimulai pada pukul ${jMulai} WIB dibuka dengan doa bersama oleh pemimpin rapat;`);
                        lines.forEach((line: string) => {
                          const clean = line.replace(/^\d+\.\s*/, "").trim();
                          if (clean) result.push(`${idx++}. ${clean}${clean.endsWith(";") || clean.endsWith(".") ? "" : ";"}`);
                        });
                        result.push(`${idx}. Kegiatan rapat koordinasi diakhiri pada pukul ${jSelesai} WIB ditutup dengan doa bersama oleh pemimpin rapat.`);
                        handleFormChange("keputusanRapat", result.join("\n"));
                      }}
                      placeholder="Masukkan poin-poin rapat (satu per baris)..."
                      className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white h-28 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#32848D] mb-1">
                      Hasil Susunan Teks Keputusan Rapat (Otomatis & Baku)
                    </label>
                    <textarea
                      value={
                        formData.keputusanRapat ||
                        `1. Kegiatan rapat koordinasi dimulai pada pukul 09.00 WIB dibuka dengan doa bersama oleh pemimpin rapat;\n2. Pembukaan dari Panewu Temon;\n3. Diskusi teknis pelaksanaan kegiatan;\n4. Kegiatan rapat koordinasi diakhiri pada pukul 11.30 WIB ditutup dengan doa bersama oleh pemimpin rapat.`
                      }
                      readOnly
                      className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5 font-mono text-xs text-gray-800 dark:text-slate-200 h-32"
                    />
                  </div>
                </div>
              )}

              {/* ================= FORM EDITOR DAFTAR HADIR ================= */}
              {activeDoc.documentTypeCode === "DAFTAR_HADIR" && (
                <div className="space-y-4 text-sm">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-emerald-900 dark:text-emerald-200">Live Preview & Editor Daftar Hadir</h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {spj.sharedData?.jumlahPeserta || 20} Peserta — Metadata rata kiri otomatis dari paket SPJ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const count = spj.sharedData?.jumlahPeserta || 20;
                        const currentPeserta = formData.peserta || [];
                        const updated = Array.from({ length: count }, (_, idx) => ({
                          no: idx + 1,
                          nama: currentPeserta[idx]?.nama || "",
                          jabatan: currentPeserta[idx]?.jabatan || ""
                        }));
                        handleFormChange("peserta", updated);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                    >
                      Reset / Generate Baris ({spj.sharedData?.jumlahPeserta || 20})
                    </button>
                  </div>

                  {/* QR Code Online Attendance Section */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <QrCode className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-blue-900 dark:text-blue-200">Absensi Online via QR Code</h3>
                      </div>
                      <button
                        type="button"
                        onClick={generateQRCode}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Buat QR Absensi</span>
                      </button>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                      Peserta scan QR ini → diarahkan ke halaman input nama + tanda tangan digital → data otomatis masuk ke daftar hadir.
                    </p>
                    {qrDataUrl && (
                      <div className="flex items-start space-x-4">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-200">
                          <img src={qrDataUrl} alt="QR Code Absensi" className="w-32 h-32" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="text-xs">
                            <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Link Absensi:</p>
                            <div className="flex items-center space-x-1">
                              <code className="text-[11px] text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded break-all">{qrLink}</code>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <a
                              href={qrLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center space-x-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Buka Halaman Absensi</span>
                            </a>
                            <a
                              href={qrDataUrl}
                              download={`qr-absensi-${spjId}.png`}
                              className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center space-x-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download QR PNG</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Header Preview in Editor */}
                  <div className="border border-gray-300 dark:border-slate-600 rounded-xl p-4 bg-white dark:bg-slate-800 space-y-3">
                    <div className="flex items-center space-x-3 border-b-2 border-black pb-2">
                      <img src="/kulonprogo-logo.png" alt="Logo Pemkab Kulon Progo" className="w-14 h-14 object-contain shrink-0" />
                      <div className="text-center flex-1 text-xs">
                        <p className="font-bold uppercase text-gray-900 dark:text-white">PEMERINTAH KABUPATEN KULON PROGO</p>
                        <p className="font-extrabold text-sm uppercase text-gray-900 dark:text-white">KAPANEWON TEMON</p>
                        <p className="text-[10px] text-gray-600 dark:text-slate-400">Jalan Raya Wates-Purworejo Km 10,4 Temon Kulon Progo Telp. (0274) 6472581</p>
                      </div>
                    </div>

                    <div className="text-left text-xs space-y-1 text-gray-800 dark:text-slate-200 font-mono">
                      <p><span className="font-semibold inline-block w-24">HARI</span>: {getNamaHari(spj.tanggal)}</p>
                      <p><span className="font-semibold inline-block w-24">TANGGAL</span>: {formatDateDDMMYYYY(spj.tanggal)}</p>
                      <p><span className="font-semibold inline-block w-24">PUKUL</span>: {formData.jam || "09.00 WIB s.d. 11.00 WIB"}</p>
                      <p><span className="font-semibold inline-block w-24">TEMPAT</span>: {formData.tempat || "PENDOPO KAPANEWON TEMON"}</p>
                      <p><span className="font-semibold inline-block w-24">ACARA</span>: {spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama}</p>
                    </div>

                    {/* Interactive Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse border border-gray-300 dark:border-slate-600">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-slate-700 border-b border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300">
                            <th className="p-2 w-10 text-center border-r">NO</th>
                            <th className="p-2 border-r">NAMA PESERTA</th>
                            <th className="p-2 border-r">JABATAN / ALAMAT</th>
                            <th className="p-2 w-32 text-center">TANDA TANGAN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                          {Array.from({ length: spj.sharedData?.jumlahPeserta || formData.peserta?.length || 15 }).map((_, idx) => {
                            const pList = formData.peserta || [];
                            const current = pList[idx] || { nama: "", jabatan: "" };

                            return (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                                <td className="p-2 text-center border-r font-bold text-gray-500">{idx + 1}</td>
                                <td className="p-1 border-r">
                                  <input
                                    type="text"
                                    value={current.nama || ""}
                                    onChange={(e) => {
                                      const updated = [...pList];
                                      while (updated.length <= idx) updated.push({ no: updated.length + 1, nama: "", jabatan: "" });
                                      updated[idx] = { ...updated[idx], nama: e.target.value };
                                      handleFormChange("peserta", updated);
                                    }}
                                    placeholder={`Nama Peserta #${idx + 1}`}
                                    className="w-full bg-transparent p-1 rounded border border-gray-200 dark:border-slate-600 text-xs text-gray-900 dark:text-white"
                                  />
                                </td>
                                <td className="p-1 border-r">
                                  <input
                                    type="text"
                                    value={current.jabatan || ""}
                                    onChange={(e) => {
                                      const updated = [...pList];
                                      while (updated.length <= idx) updated.push({ no: updated.length + 1, nama: "", jabatan: "" });
                                      updated[idx] = { ...updated[idx], jabatan: e.target.value };
                                      handleFormChange("peserta", updated);
                                    }}
                                    placeholder={`Jabatan / Unit`}
                                    className="w-full bg-transparent p-1 rounded border border-gray-200 dark:border-slate-600 text-xs text-gray-900 dark:text-white"
                                  />
                                </td>
                                <td className="p-2 text-xs font-mono text-gray-400">
                                  {idx % 2 === 0 ? `${idx + 1}. ........` : `   ${idx + 1}. ........`}
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
