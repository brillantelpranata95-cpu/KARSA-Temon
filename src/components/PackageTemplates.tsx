import React, { useEffect, useState } from "react";
import { UserProfile, PackageTemplate, DocumentTypeItem, KodeRekening } from "../types";
import {
  getPackageTemplatesList,
  adminCreatePackageTemplate,
  adminUpdatePackageTemplate,
  adminDeletePackageTemplate,
  getDocumentTypesList,
  getKodeRekeningList,
} from "../services/api";
import { FileStack, Plus, Edit, Trash2, Save, RefreshCw, Info, X, Package, Image as ImageIcon } from "lucide-react";

interface PackageTemplatesProps {
  user: UserProfile;
}

interface DocRow {
  documentTypeId: string;
  required: boolean;
  order: number;
}

export const PackageTemplates: React.FC<PackageTemplatesProps> = ({ user }) => {
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [rekList, setRekList] = useState<KodeRekening[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PackageTemplate | null>(null);
  const [formRekId, setFormRekId] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDocs, setFormDocs] = useState<DocRow[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, dList, rList] = await Promise.all([
        getPackageTemplatesList(true),
        getDocumentTypesList(),
        getKodeRekeningList(),
      ]);
      setTemplates(tList);
      setDocTypes(dList);
      setRekList(rList);
    } catch (e) {
      console.error("Failed to load package templates:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Kode rekening that do not yet have a package (available for a new one)
  const usedRekIds = new Set(templates.map((t) => t.kodeRekeningId).filter(Boolean));
  const availableRekList = rekList.filter((r) => !usedRekIds.has(r.id) || r.id === formRekId);

  const openCreate = () => {
    setEditing(null);
    setFormRekId("");
    setFormDesc("");
    // Default: Bend 26 only — the most common requirement
    setFormDocs([{ documentTypeId: "doctype-bend26", required: true, order: 1 }]);
    setIsModalOpen(true);
  };

  const openEdit = (t: PackageTemplate) => {
    setEditing(t);
    setFormRekId(t.kodeRekeningId || "");
    setFormDesc(t.description || "");
    setFormDocs(
      (t.documents || []).slice().sort((a, b) => a.order - b.order).map((d) => ({ ...d }))
    );
    setIsModalOpen(true);
  };

  const toggleDoc = (dtId: string) => {
    setFormDocs((prev) => {
      const exists = prev.find((d) => d.documentTypeId === dtId);
      if (exists) {
        return prev
          .filter((d) => d.documentTypeId !== dtId)
          .map((d, i) => ({ ...d, order: i + 1 }));
      }
      return [...prev, { documentTypeId: dtId, required: true, order: prev.length + 1 }];
    });
  };

  const handleSave = async () => {
    if (!formRekId) {
      alert("Pilih Kode Rekening terlebih dahulu. Paket SPJ mengikuti kode rekening.");
      return;
    }
    if (formDocs.length === 0) {
      alert("Pilih minimal satu dokumen untuk paket ini.");
      return;
    }
    setSaving(true);
    try {
      const normalizedDocs = formDocs.map((d, i) => ({ ...d, order: i + 1 }));
      const rek = rekList.find((r) => r.id === formRekId);

      if (editing) {
        await adminUpdatePackageTemplate(
          editing.id,
          {
            kodeRekeningId: formRekId,
            kodeRekeningKode: rek?.kode || "",
            kodeRekeningNama: rek?.nama || "",
            description: formDesc,
            documents: normalizedDocs,
          },
          user
        );
        alert("Paket SPJ berhasil diperbarui.");
      } else {
        await adminCreatePackageTemplate(
          {
            kodeRekeningId: formRekId,
            kodeRekeningKode: rek?.kode || "",
            kodeRekeningNama: rek?.nama || "",
            description: formDesc,
            documents: normalizedDocs,
          },
          user
        );
        alert("Paket SPJ baru berhasil dibuat. Setiap pengguna yang memilih kode rekening ini akan otomatis mengikuti paket tersebut.");
      }
      setIsModalOpen(false);
      await loadData();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Gagal menyimpan paket SPJ.");
    }
    setSaving(false);
  };

  const handleDelete = async (t: PackageTemplate) => {
    if (!confirm(`Hapus paket untuk rekening "${t.kodeRekeningNama || t.kodeRekeningKode}"? Kode rekening ini akan kembali memakai checklist standar.`)) return;
    try {
      await adminDeletePackageTemplate(t.id, user);
      await loadData();
      alert("Paket SPJ dihapus.");
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus paket SPJ.");
    }
  };

  const handleToggleActive = async (t: PackageTemplate) => {
    try {
      await adminUpdatePackageTemplate(t.id, { isActive: t.isActive === false }, user);
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah status paket.");
    }
  };

  const getDocName = (documentTypeId: string): string => {
    const dt = docTypes.find((d) => d.id === documentTypeId);
    return dt?.name || documentTypeId.replace("doctype-", "").replace(/_/g, " ").toUpperCase();
  };

  const getRekLabel = (t: PackageTemplate): string => {
    if (t.kodeRekeningKode || t.kodeRekeningNama) {
      return `[${t.kodeRekeningKode || "-"}] ${t.kodeRekeningNama || ""}`;
    }
    const r = rekList.find((x) => x.id === t.kodeRekeningId);
    return r ? `[${r.kode}] ${r.nama}` : t.kodeRekeningId || "-";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#32848D]/10 rounded-xl">
            <FileStack className="w-6 h-6 text-[#32848D]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Buat Paket SPJ</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Tentukan dokumen wajib untuk tiap Kode Rekening — pengguna otomatis mengikuti paket ini
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-[#32848D] hover:bg-[#276972] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Paket Baru</span>
          </button>
        </div>
      </div>

      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4 flex items-start space-x-3">
        <Info className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        <div className="text-xs text-violet-900 dark:text-violet-200 space-y-1">
          <p className="font-semibold">Cara kerja:</p>
          <p>
            Pilih satu <strong>Kode Rekening</strong> lalu centang dokumen yang dibutuhkan (misal hanya Bend 26).
            Setiap pengguna yang membuat SPJ dengan kode rekening tersebut otomatis wajib melengkapi tepat dokumen itu.
          </p>
          <p className="font-semibold">Bend 26 diperlakukan sama dengan Bend 26 pada paket yang sudah ada — form nominal, pajak, dan penerima tetap identik.</p>
          <p>
            Centang <strong>Lampiran Foto</strong> bila paket ini juga membutuhkan dokumentasi foto —
            pengguna cukup menempelkan <strong>tautan Google Drive</strong> fotonya dan sistem otomatis mencetaknya.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-gray-200 dark:border-slate-700 text-center text-gray-400">
          Memuat paket SPJ...
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-gray-200 dark:border-slate-700 text-center space-y-3">
          <Package className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
            Belum ada paket SPJ khusus. Paket standar (checklist bawaan per Kode Rekening) tetap tersedia untuk pengguna.
          </p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-[#32848D] hover:bg-[#276972] text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Paket Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono font-bold text-[#32848D]">
                      {t.kodeRekeningKode || "REKENING"}
                    </p>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
                      {t.kodeRekeningNama || getRekLabel(t)}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.isActive === false
                        ? "bg-gray-100 text-gray-600"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {t.isActive === false ? "NONAKTIF" : "AKTIF"}
                  </span>
                </div>
                {t.description && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">{t.description}</p>
                )}
              </div>

              <div className="p-5 flex-1 space-y-2">
                <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">
                  Dokumen Wajib ({t.documents?.length || 0})
                </p>
                <div className="space-y-1.5">
                  {(t.documents || [])
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((d, i) => (
                      <div
                        key={d.documentTypeId}
                        className="flex items-center space-x-2 bg-[#F6FAF5] dark:bg-slate-700/40 rounded-lg px-2.5 py-1.5"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#32848D] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate flex-1">
                          {getDocName(d.documentTypeId)}
                        </span>
                        {!d.required && (
                          <span className="text-[9px] text-gray-400 shrink-0">opsional</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-3 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2">
                <button
                  onClick={() => openEdit(t)}
                  className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center justify-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleToggleActive(t)}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
                  title={t.isActive === false ? "Aktifkan" : "Nonaktifkan"}
                >
                  {t.isActive === false ? "Aktifkan" : "Nonaktifkan"}
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold"
                  title="Hapus paket"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREATE/EDIT PACKAGE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2 text-[#32848D] font-bold text-lg">
                <FileStack className="w-5 h-5" />
                <span>{editing ? "Edit Paket SPJ" : "Buat Paket SPJ Baru"}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Kode Rekening (Paket mengikuti kode rekening ini)
                </label>
                <select
                  value={formRekId}
                  onChange={(e) => setFormRekId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                >
                  <option value="">— Pilih Kode Rekening —</option>
                  {availableRekList.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.kode}] {r.nama}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Kode rekening yang sudah punya paket tidak muncul di sini — pilih Edit pada kartu paket tersebut.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Deskripsi (opsional)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Paket SPJ untuk belanja Alat Tulis Kantor"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">
                  Pilih Dokumen yang Dibutuhkan
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-xl p-3">
                  {docTypes.map((dt) => {
                    const selected = formDocs.find((d) => d.documentTypeId === dt.id);
                    const orderIdx = formDocs.findIndex((d) => d.documentTypeId === dt.id);
                    const needsDriveLink = dt.code === "LAMPIRAN_FOTO";
                    return (
                      <div
                        key={dt.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                          selected
                            ? "bg-[#F6FAF5] dark:bg-slate-700/50 border-[#32848D]/40"
                            : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                        }`}
                      >
                        <label className="flex items-center space-x-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleDoc(dt.id)}
                            className="w-4 h-4 rounded accent-[#32848D] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                              {orderIdx >= 0 && (
                                <span className="inline-flex w-4 h-4 rounded-full bg-[#32848D] text-white text-[9px] font-bold items-center justify-center mr-1.5">
                                  {orderIdx + 1}
                                </span>
                              )}
                              {dt.name}
                              {needsDriveLink && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/40 px-1.5 py-0.5 rounded-full align-middle">
                                  <ImageIcon className="w-2.5 h-2.5" />
                                  LINK DRIVE
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                              {needsDriveLink
                                ? "Pengguna cukup menempelkan tautan Google Drive foto — otomatis dicetak."
                                : dt.description}
                            </p>
                          </div>
                        </label>
                        {selected && (
                          <label className="flex items-center space-x-1.5 text-[10px] text-gray-600 dark:text-slate-300 shrink-0 ml-2">
                            <input
                              type="checkbox"
                              checked={selected.required}
                              onChange={(e) =>
                                setFormDocs((prev) =>
                                  prev.map((d) =>
                                    d.documentTypeId === dt.id ? { ...d, required: e.target.checked } : d
                                  )
                                )
                              }
                              className="w-3.5 h-3.5 rounded accent-[#32848D]"
                            />
                            <span>Wajib</span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Urutan mengikuti urutan centang. Hapus centang untuk mengeluarkan dokumen dari paket.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-[#32848D] hover:bg-[#276972] text-white font-semibold rounded-xl text-sm shadow-sm inline-flex items-center space-x-2 disabled:opacity-60"
              >
                {saving ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editing ? "Simpan Perubahan" : "Buat Paket"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageTemplates;
