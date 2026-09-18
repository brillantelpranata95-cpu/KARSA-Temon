import React, { useEffect, useState } from "react";
import { UserProfile, SpjItem, SpjDocumentItem, OfficialPerson } from "../types";
import { db } from "../config/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  getSpjById,
  getSpjDocuments,
  saveSpjDocumentData,
  finalizeSpj,
  getNotulisOptions,
  saveNotulisOption,
  getOfficialsList,
  savePemimpinRapatOption,
  createAttendanceSession,
  getActiveAttendanceSession,
} from "../services/api";
import { terbilangRupiah } from "../utils/format";
import { formatDateDDMMYYYY, getNamaHariCapitalized, getNamaHari, toDateInputValue, sortDates } from "../utils/date";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  Save,
  Link as LinkIcon,
  Printer,
  ShieldCheck,
  QrCode,
  ExternalLink,
  Plus,
  X,
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

  // Officials options (auto-sourced from admin settings + user-added entries)
  const [notulisOptions, setNotulisOptions] = useState<OfficialPerson[]>([]);
  const [pemimpinOptions, setPemimpinOptions] = useState<OfficialPerson[]>([]);
  const [showNewNotulis, setShowNewNotulis] = useState(false);
  const [newNotulisNama, setNewNotulisNama] = useState("");
  const [newNotulisNip, setNewNotulisNip] = useState("");
  const [showNewPemimpin, setShowNewPemimpin] = useState(false);
  const [newPemimpinNama, setNewPemimpinNama] = useState("");
  const [newPemimpinNip, setNewPemimpinNip] = useState("");
  const [newPemimpinPangkat, setNewPemimpinPangkat] = useState("");

  // QR Code State — the QR itself is displayed on a dedicated full-screen page
  // (/qr-display/:spjId) opened in a new tab so it can be scanned from afar.
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [qrRemaining, setQrRemaining] = useState<number>(0);
  const [qrGenerating, setQrGenerating] = useState(false);
  // Attendance rows captured via QR — synced live so the daftar hadir fills itself
  const [qrAttendance, setQrAttendance] = useState<Array<{ id: string; nama: string; jabatan: string; ttdImage?: string }>>([]);

  // Countdown for the active QR session (30 minutes TTL)
  useEffect(() => {
    if (!qrExpiresAt) return;
    const tick = () => {
      const left = qrExpiresAt - Date.now();
      setQrRemaining(left > 0 ? left : 0);
      if (left <= 0) setQrExpiresAt(null);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [qrExpiresAt]);

  const formatQrRemaining = (ms: number): string => {
    if (ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const generateQRCode = async () => {
    if (!spj) return;
    setQrGenerating(true);
    // Open the tab synchronously on the click so browsers never treat it as a
    // popup. The QR display page owns the 30-minute session lifecycle; here we
    // only open it and then read back the active session for the countdown.
    window.open(`${window.location.origin}/qr-display/${spjId}`, "_blank", "noopener,noreferrer");
    try {
      // Give the new tab a moment to create the session, then mirror it here.
      await new Promise((r) => setTimeout(r, 1500));
      const active = await getActiveAttendanceSession(spjId);
      if (active) setQrExpiresAt(active.expiresAtMs);
    } catch (e) {
      console.error("QR session mirror error:", e);
    }
    setQrGenerating(false);
  };

  // Live-sync attendance captured through the QR page into this wizard
  useEffect(() => {
    if (!spjId) return;
    const unsub = onSnapshot(collection(db, "spj", spjId, "attendance"), (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as any;
        return { id: d.id, nama: data.nama || "", jabatan: data.jabatan || "", ttdImage: data.ttdImage || "" };
      });
      setQrAttendance(rows);
    });
    return () => unsub();
  }, [spjId]);

  const loadSpjData = async () => {
    try {
      const [s, docs] = await Promise.all([getSpjById(spjId), getSpjDocuments(spjId)]);
      setSpj(s);
      setDocuments(docs);

      // Load officials options for dropdowns (cross-jawatan)
      try {
        const [notulisList, pemimpinList, activeSession] = await Promise.all([
          getNotulisOptions(user.jawatanId),
          getOfficialsList("PEMIMPIN_RAPAT"),
          getActiveAttendanceSession(spjId),
        ]);
        setNotulisOptions(notulisList);
        setPemimpinOptions(pemimpinList);
        if (activeSession) setQrExpiresAt(activeSession.expiresAtMs);
      } catch (e) {
        console.warn("Failed to load officials:", e);
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
                    Formulir {activeDoc.documentTypeCode.replace(/_/g, " ")}
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
                      value={formData.nominal ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        handleFormChange("nominal", raw === "" ? "" : Math.max(0, Number(raw) || 0));
                      }}
                      placeholder="0"
                      className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 font-bold text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 capitalize font-medium">
                      {terbilangRupiah(Number(formData.nominal || 0))}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                    <p className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Rincian Pajak (Opsional)</p>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { key: "phr", label: "PPh 21 / PHR" },
                        { key: "pph", label: "PPh" },
                        { key: "ppn", label: "PPN" },
                      ].map(({ key, label }) => (
                        <label key={key} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                          {label}
                          <input
                            type="number"
                            min="0"
                            value={formData[key] ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              handleFormChange(key, raw === "" ? "" : Math.max(0, Number(raw) || 0));
                            }}
                            placeholder="0"
                            className="mt-1 w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 font-normal text-gray-900 dark:text-white"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Penerima — diisi manual (bukan PPTK) */}
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                    <p className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Penerima Pembayaran</p>
                    <p className="text-[11px] text-gray-400 mb-2 italic">Diisi manual — boleh dikosongkan bila penerima berbeda atau belum ditentukan.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Penerima</label>
                        <input
                          type="text"
                          value={formData.penerima || ""}
                          onChange={(e) => handleFormChange("penerima", e.target.value)}
                          placeholder="(kosongkan bila perlu)"
                          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">NIP Penerima</label>
                        <input
                          type="text"
                          value={formData.penerimaNip || ""}
                          onChange={(e) => handleFormChange("penerimaNip", e.target.value)}
                          placeholder="(kosongkan bila perlu)"
                          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Pemimpin Rapat</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={formData.pemimpinRapat || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__NEW__") {
                              setShowNewPemimpin(true);
                              return;
                            }
                            handleFormChange("pemimpinRapat", val);
                            const picked = pemimpinOptions.find((p) => p.nama === val);
                            if (picked) {
                              handleFormChange("pemimpinRapatNip", picked.nip || "");
                              handleFormChange("pemimpinRapatPangkat", picked.pangkat || "");
                            }
                          }}
                          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                        >
                          <option value="">— Pilih Pemimpin Rapat —</option>
                          {pemimpinOptions.map((p) => (
                            <option key={p.id} value={p.nama}>
                              {p.nama}
                            </option>
                          ))}
                          <option value="__NEW__">+ Tambah Pemimpin Rapat Baru</option>
                        </select>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Pilihan tersimpan otomatis & dapat dipakai lintas jawatan.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Notulis</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={formData.notulis || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__NEW__") {
                              setShowNewNotulis(true);
                              return;
                            }
                            handleFormChange("notulis", val);
                            const picked = notulisOptions.find((p) => p.nama === val);
                            if (picked) {
                              handleFormChange("notulisNip", picked.nip || "");
                            }
                          }}
                          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                        >
                          <option value="">— Pilih Notulis —</option>
                          {notulisOptions.map((p) => (
                            <option key={p.id} value={p.nama}>
                              {p.nama}
                            </option>
                          ))}
                          <option value="__NEW__">+ Tambah Notulis Baru</option>
                        </select>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Setiap jawatan dapat memiliki notulis sendiri.
                      </p>
                    </div>
                  </div>

                  {/* Inline add-new Pemimpin Rapat */}
                  {showNewPemimpin && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Tambah Pemimpin Rapat Baru</p>
                        <button type="button" onClick={() => setShowNewPemimpin(false)} className="text-amber-600 hover:text-amber-800">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={newPemimpinNama}
                          onChange={(e) => setNewPemimpinNama(e.target.value)}
                          placeholder="Nama lengkap & gelar"
                          className="border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={newPemimpinNip}
                          onChange={(e) => setNewPemimpinNip(e.target.value)}
                          placeholder="NIP (opsional)"
                          className="border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={newPemimpinPangkat}
                          onChange={(e) => setNewPemimpinPangkat(e.target.value)}
                          placeholder="Pangkat / Gol (opsional)"
                          className="border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newPemimpinNama.trim()) {
                            alert("Nama pemimpin rapat wajib diisi.");
                            return;
                          }
                          try {
                            await savePemimpinRapatOption(
                              { nama: newPemimpinNama, nip: newPemimpinNip, pangkat: newPemimpinPangkat },
                              user
                            );
                            const refreshed = await getOfficialsList("PEMIMPIN_RAPAT");
                            setPemimpinOptions(refreshed);
                            handleFormChange("pemimpinRapat", newPemimpinNama.trim());
                            handleFormChange("pemimpinRapatNip", newPemimpinNip.trim());
                            handleFormChange("pemimpinRapatPangkat", newPemimpinPangkat.trim());
                            setNewPemimpinNama("");
                            setNewPemimpinNip("");
                            setNewPemimpinPangkat("");
                            setShowNewPemimpin(false);
                          } catch (e) {
                            console.error(e);
                            alert("Gagal menyimpan pemimpin rapat.");
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Simpan & Pakai
                      </button>
                    </div>
                  )}

                  {/* Inline add-new Notulis */}
                  {showNewNotulis && (
                    <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-teal-900 dark:text-teal-200">Tambah Notulis Baru</p>
                        <button type="button" onClick={() => setShowNewNotulis(false)} className="text-teal-600 hover:text-teal-800">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newNotulisNama}
                          onChange={(e) => setNewNotulisNama(e.target.value)}
                          placeholder="Nama lengkap & gelar"
                          className="border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={newNotulisNip}
                          onChange={(e) => setNewNotulisNip(e.target.value)}
                          placeholder="NIP (opsional)"
                          className="border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newNotulisNama.trim()) {
                            alert("Nama notulis wajib diisi.");
                            return;
                          }
                          try {
                            await saveNotulisOption(
                              { nama: newNotulisNama, nip: newNotulisNip, jawatanId: user.jawatanId },
                              user
                            );
                            const refreshed = await getNotulisOptions(user.jawatanId);
                            setNotulisOptions(refreshed);
                            handleFormChange("notulis", newNotulisNama.trim());
                            handleFormChange("notulisNip", newNotulisNip.trim());
                            setNewNotulisNama("");
                            setNewNotulisNip("");
                            setShowNewNotulis(false);
                          } catch (e) {
                            console.error(e);
                            alert("Gagal menyimpan notulis.");
                          }
                        }}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Simpan & Pakai
                      </button>
                    </div>
                  )}

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
                        disabled={qrGenerating}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5 disabled:opacity-60"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{qrGenerating ? "Membuat..." : qrExpiresAt ? "Buka QR Lagi (30 mnt)" : "Buat QR Absensi"}</span>
                      </button>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                      Klik tombol di atas — QR besar akan terbuka di <strong>tab baru</strong> sehingga bisa dipindai dari jauh.
                      Peserta scan → isi nama + tanda tangan digital → data <strong>otomatis muncul real-time</strong> di daftar hadir.
                      QR hanya berlaku 30 menit, setelah itu sesi & datanya dihapus permanen.
                    </p>
                    {qrExpiresAt && qrRemaining > 0 && (
                      <div className="mb-3 flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-3 py-2 border border-blue-200 dark:border-blue-800">
                        <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                          QR aktif — kedaluwarsa dalam
                        </span>
                        <span className={`text-sm font-mono font-bold ${qrRemaining < 5 * 60 * 1000 ? "text-red-600" : "text-emerald-600"}`}>
                          {formatQrRemaining(qrRemaining)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5 border border-blue-200 dark:border-blue-800">
                      <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                        Peserta sudah absen via QR
                      </span>
                      <span className="text-lg font-mono font-extrabold text-[#32848D]">{qrAttendance.length}</span>
                    </div>
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
                          {(() => {
                            const pList = formData.peserta || [];
                            // QR attendance rows come first (real-time), then manual rows
                            const qrRows = qrAttendance;
                            const qrNames = new Set(qrRows.map((r) => r.nama.trim().toLowerCase()));
                            const manualRows = pList.filter(
                              (p: any) => p?.nama && !qrNames.has(String(p.nama).trim().toLowerCase())
                            );
                            const merged = [
                              ...qrRows.map((r) => ({ nama: r.nama, jabatan: r.jabatan || "", ttdImage: r.ttdImage })),
                              ...manualRows.map((p: any) => ({ nama: p.nama, jabatan: p.jabatan || "", ttdImage: p.ttdImage || "" })),
                            ];
                            const totalRows = Math.max(
                              spj.sharedData?.jumlahPeserta || 15,
                              merged.length
                            );

                            return Array.from({ length: totalRows }).map((_, idx) => {
                              const current = merged[idx];

                              // Row filled by QR attendance — show name + signature image
                              if (current && current.ttdImage) {
                                return (
                                  <tr key={`qr-${idx}`} className="bg-emerald-50/60 dark:bg-emerald-900/20">
                                    <td className="p-2 text-center border-r font-bold text-emerald-700">{idx + 1}</td>
                                    <td className="p-2 border-r font-semibold text-gray-900 dark:text-white">
                                      {current.nama}
                                      <span className="ml-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-full">
                                        QR
                                      </span>
                                    </td>
                                    <td className="p-2 border-r text-gray-500">{current.jabatan || "—"}</td>
                                    <td className="p-1 text-center">
                                      <img src={current.ttdImage} alt="ttd" className="h-9 mx-auto object-contain" />
                                    </td>
                                  </tr>
                                );
                              }

                              // Manual row — editable inputs
                              return (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                                  <td className="p-2 text-center border-r font-bold text-gray-500">{idx + 1}</td>
                                  <td className="p-1 border-r">
                                    <input
                                      type="text"
                                      value={current?.nama || ""}
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
                                      value={current?.jabatan || ""}
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
                            });
                          })()}
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

              {/* ================= FORM EDITOR SURAT PERINTAH ================= */}
              {activeDoc.documentTypeCode === "SURAT_PERINTAH" && (
                <div className="space-y-4 text-sm">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      Tautan Surat Perintah Google Drive (Wajib)
                    </label>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      Surat Perintah sudah dibuat di luar web app ini. Cukup paste link Google Drive untuk verifikasi & cetak.
                    </p>
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="w-4 h-4 text-indigo-600" />
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full border border-indigo-300 dark:border-indigo-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    {externalUrl && (
                      <div className="mt-2 p-2 bg-white dark:bg-slate-700 rounded-lg border border-indigo-200 dark:border-slate-600">
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Preview:</p>
                        <iframe
                          src={externalUrl.replace("/view?usp=drive_fs", "/preview").replace("/edit", "/preview")}
                          className="w-full h-64 rounded-lg border-0"
                          title="Surat Perintah Preview"
                        ></iframe>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= FORM EDITOR SPJ AKTIVITAS LAPANGAN ================= */}
              {activeDoc.documentTypeCode === "SPJ_AKTIVITAS_LAPANGAN" && (
                <div className="space-y-4 text-sm">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl">
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-200 mb-1">Formulir Laporan Aktivitas Lapangan</h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Isi data pelaksanaan tugas lapangan. Data otomatis dipakai pada cetakan Laporan Hasil Pelaksanaan Tugas.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Maksud dan Tujuan Perjalanan Dinas</label>
                    <input
                      type="text"
                      value={formData.maksudTujuan || ""}
                      onChange={(e) => handleFormChange("maksudTujuan", e.target.value)}
                      placeholder={`Contoh: ${spj.sharedData?.judulAktivitas || "Aktivitas Lapangan"}`}
                      className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Tempat Tujuan</label>
                      <input
                        type="text"
                        value={formData.tempatTujuan || ""}
                        onChange={(e) => handleFormChange("tempatTujuan", e.target.value)}
                        placeholder="Contoh: Kapanewon Temon"
                        className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Lamanya Pelaksanaan Tugas (hari)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.lamaHari ?? 1}
                        onChange={(e) => {
                          const hari = Math.max(1, Number(e.target.value) || 1);
                          handleFormChange("lamaHari", hari);
                          handleFormChange("lamaTugas", `${hari} (hari)`);
                          // Reset the date list when switching back to a single day
                          if (hari <= 1) {
                            handleFormChange("tanggalPelaksanaanList", []);
                          }
                        }}
                        className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Isi 1 untuk kegiatan sehari.</p>
                    </div>
                  </div>

                  {/* Tanggal: single date when 1 day, multi-select when > 1 day */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Tanggal Pelaksanaan {(formData.lamaHari || 1) > 1 ? "(Pilih beberapa tanggal)" : ""}
                    </label>

                    {(formData.lamaHari || 1) <= 1 ? (
                      <>
                        <input
                          type="date"
                          value={formData.tanggalPelaksanaan || spj.tanggal}
                          onChange={(e) => handleFormChange("tanggalPelaksanaan", e.target.value)}
                          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                        />
                      </>
                    ) : (
                      <div className="space-y-2">
                        {(formData.tanggalPelaksanaanList && formData.tanggalPelaksanaanList.length > 0) && (
                          <div className="flex flex-wrap gap-2">
                            {formData.tanggalPelaksanaanList.map((d: string, i: number) => (
                              <span
                                key={`${d}-${i}`}
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800"
                              >
                                <span>{formatDateDDMMYYYY(d)}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = formData.tanggalPelaksanaanList.filter((_: string, idx: number) => idx !== i);
                                    handleFormChange("tanggalPelaksanaanList", next);
                                  }}
                                  className="text-emerald-600 hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            id="multi-date-input"
                            className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById("multi-date-input") as HTMLInputElement | null;
                              const val = el?.value;
                              if (!val) {
                                alert("Pilih tanggal terlebih dahulu.");
                                return;
                              }
                              const current: string[] = formData.tanggalPelaksanaanList || [];
                              if (current.includes(val)) {
                                alert("Tanggal ini sudah ditambahkan.");
                                return;
                              }
                              handleFormChange("tanggalPelaksanaanList", [...current, val].sort());
                              if (el) el.value = "";
                            }}
                            className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Tambahkan satu tanggal per hari pelaksanaan. Total {formData.tanggalPelaksanaanList?.length || 0} dari {formData.lamaHari} hari.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Kesimpulan (Hasil Pelaksanaan Tugas)
                    </label>
                    <textarea
                      value={formData.kesimpulanHasil || ""}
                      onChange={(e) => handleFormChange("kesimpulanHasil", e.target.value)}
                      placeholder={`1. Kegiatan dibuka pukul 08.30 WIB dengan registrasi peserta;\n2. Kegiatan dimulai pukul 09.00 WIB dengan pembukaan dari MC;\n3. Sambutan dan pembukaan secara resmi oleh Panewu Kapanewon Temon;\n4. Pelaksanaan tugas lapangan berjalan tertib dan lancar;\n5. Kegiatan selesai pukul 12.30 WIB.`}
                      className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white h-32"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Pembuat Laporan</label>
                    <input
                      type="text"
                      value={formData.pembuatLaporan || ""}
                      onChange={(e) => handleFormChange("pembuatLaporan", e.target.value)}
                      placeholder={spj.userName || "Nama Pembuat Laporan"}
                      className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
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
