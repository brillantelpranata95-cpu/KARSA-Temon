import React, { useEffect, useState } from "react";
import { UserProfile, PackageTemplate, ChecklistConfig, DocumentTypeItem, KodeRekening } from "../types";
import {
  getPackageTemplatesList,
  getChecklistConfigList,
  adminCreatePackageTemplate,
  adminUpdatePackageTemplate,
  adminDeletePackageTemplate,
  adminUpdateChecklistConfig,
  getDocumentTypesList,
  getKodeRekeningList,
} from "../services/api";
import { FileStack, Plus, Edit, Trash2, Save, RefreshCw, Info, X, Package, ShieldCheck } from "lucide-react";

interface PackageTemplatesProps {
  user: UserProfile;
}

interface DocRow {
  documentTypeId: string;
  required: boolean;
  order: number;
}

/**
 * Paket dokumen yang BERLAKU untuk satu Kode Rekening.
 *
 * `source` menandai dari mana paket itu berasal, karena keduanya harus bisa
 * disunting dari menu ini:
 *   - "template" → koleksi `packageTemplates` (paket buatan admin, prioritas 1)
 *   - "config"   → koleksi `checklistConfigs` (checklist bawaan per rekening)
 *
 * Tanpa menggabungkan keduanya, paket yang benar-benar dipakai pengguna tidak
 * muncul di menu ini sehingga tidak bisa disunting.
 */
interface EffectivePackage {
  rekId: string;
  rekKode: string;
  rekNama: string;
  source: "template" | "config";
  sourceId: string;
  description?: string;
  isActive: boolean;
  documents: DocRow[];
  /** Sumber lain yang tertutup oleh paket ini — ditampilkan sebagai catatan. */
  shadowed?: "template" | "config";
}

export const PackageTemplates: React.FC<PackageTemplatesProps> = ({ user }) => {
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [configs, setConfigs] = useState<ChecklistConfig[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [rekList, setRekList] = useState<KodeRekening[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EffectivePackage | null>(null);
  const [formRekId, setFormRekId] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDocs, setFormDocs] = useState<DocRow[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, cList, dList, rList] = await Promise.all([
        getPackageTemplatesList(true),
        // Checklist bawaan per kode rekening ikut dibaca: inilah paket yang
        // selama ini benar-benar dipakai saat pengguna membuat SPJ.
        getChecklistConfigList().catch(() => [] as ChecklistConfig[]),
        getDocumentTypesList(),
        // Termasuk rekening nonaktif agar paket lamanya tetap bisa disunting.
        getKodeRekeningList(true),
      ]);
      setTemplates(tList);
      setConfigs(cList);
      setDocTypes(dList);
      setRekList(rList);
    } catch (e) {
      console.error("Failed to load package templates:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * Paket berlaku per kode rekening, mengikuti prioritas yang sama dengan
   * `createSpjPackage`: paket admin aktif → checklist bawaan aktif → paket
   * admin nonaktif → checklist bawaan nonaktif.
   */
  const effectivePackages: EffectivePackage[] = React.useMemo(() => {
    const rekIds = new Set<string>();
    templates.forEach((t) => t.kodeRekeningId && rekIds.add(t.kodeRekeningId));
    configs.forEach((c) => c.kodeRekeningId && rekIds.add(c.kodeRekeningId));

    const out: EffectivePackage[] = [];
    for (const rekId of rekIds) {
      const t = templates.find((x) => x.kodeRekeningId === rekId);
      const c = configs.find((x) => x.kodeRekeningId === rekId);
      const rek = rekList.find((r) => r.id === rekId);

      let source: "template" | "config" | null = null;
      if (t && t.isActive !== false) source = "template";
      else if (c && c.isActive !== false) source = "config";
      else if (t) source = "template";
      else if (c) source = "config";
      if (!source) continue;

      const chosen = source === "template" ? t! : c!;
      const other = source === "template" ? c : t;

      out.push({
        rekId,
        rekKode: (source === "template" ? t!.kodeRekeningKode : rek?.kode) || rek?.kode || "-",
        rekNama: (source === "template" ? t!.kodeRekeningNama : rek?.nama) || rek?.nama || rekId,
        source,
        sourceId: chosen.id,
        description: source === "template" ? t!.description : undefined,
        isActive: chosen.isActive !== false,
        documents: (chosen.documents || []).slice().sort((a, b) => a.order - b.order),
        shadowed: other ? (source === "template" ? "config" : "template") : undefined,
      });
    }
    return out.sort((a, b) => a.rekKode.localeCompare(b.rekKode));
  }, [templates, configs, rekList]);

  // Kode rekening yang belum punya paket sama sekali — kandidat paket baru.
  const usedRekIds = new Set(effectivePackages.map((p) => p.rekId));
  const activeRekList = rekList.filter((r) => r.status === "ACTIVE" || (!r.status && r.isActive !== false));
  const availableRekList = activeRekList.filter((r) => !usedRekIds.has(r.id) || r.id === formRekId);

  const openCreate = () => {
    setEditing(null);
    setFormRekId("");
    setFormDesc("");
    // Default: Bend 26 only — the most common requirement
    setFormDocs([{ documentTypeId: "doctype-bend26", required: true, order: 1 }]);
    setIsModalOpen(true);
  };

  const openEdit = (p: EffectivePackage) => {
    setEditing(p);
    setFormRekId(p.rekId);
    setFormDesc(p.description || "");
    setFormDocs(p.documents.map((d) => ({ ...d })));
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

      if (editing && editing.source === "config") {
        // Checklist bawaan: hanya daftar dokumennya yang dapat diubah.
        await adminUpdateChecklistConfig(editing.sourceId, { documents: normalizedDocs }, user);
        alert("Paket SPJ berhasil diperbarui.");
      } else if (editing) {
        const clash = templates.find((t) => t.id !== editing.sourceId && t.kodeRekeningId === formRekId);
        if (clash) {
          alert("Kode rekening ini sudah punya paket admin lain. Pilih kode rekening yang berbeda.");
          setSaving(false);
          return;
        }
        await adminUpdatePackageTemplate(
          editing.sourceId,
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
        const clash = templates.find((t) => t.kodeRekeningId === formRekId);
        if (clash) {
          alert("Kode rekening ini sudah punya paket admin. Silakan edit paket tersebut.");
          setSaving(false);
          return;
        }
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

  const handleDelete = async (p: EffectivePackage) => {
    if (p.source !== "template") return;
    if (!confirm(`Hapus paket untuk rekening "${p.rekNama}"? Kode rekening ini akan kembali memakai checklist bawaan / checklist standar.`)) return;
    try {
      await adminDeletePackageTemplate(p.sourceId, user);
      await loadData();
      alert("Paket SPJ dihapus.");
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus paket SPJ.");
    }
  };

  const handleToggleActive = async (p: EffectivePackage) => {
    const nextActive = p.isActive === false;
    if (!nextActive) {
      const warn =
        p.source === "config"
          ? `Nonaktifkan paket untuk rekening "${p.rekNama}"? Kode rekening ini akan kembali memakai checklist standar (Bend 26, Undangan, Daftar Hadir, Notulen).`
          : `Nonaktifkan paket admin untuk rekening "${p.rekNama}"? Paket akan diabaikan dan kode rekening ini memakai checklist bawaan / checklist standar.`;
      if (!confirm(warn)) return;
    }
    try {
      if (p.source === "template") {
        await adminUpdatePackageTemplate(p.sourceId, { isActive: nextActive }, user);
      } else {
        await adminUpdateChecklistConfig(p.sourceId, { isActive: nextActive }, user);
      }
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

  const countDocs = (p: EffectivePackage) => p.documents.length;

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
              Paket dokumen wajib per Kode Rekening — pengguna otomatis mengikuti paket ini
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
            Satu kartu = satu <strong>Kode Rekening</strong> beserta dokumen yang wajib dilengkapi.
            Klik <strong>Edit</strong> pada kartu untuk menambah atau mengurangi dokumennya
            (mis. Makan Minum Lapangan butuh Bend 26, Surat Perintah, dan Laporan Aktivitas Lapangan).
            Setiap pengguna yang membuat SPJ dengan kode rekening tersebut otomatis mengikuti paket itu.
          </p>
          <p>
            Paket bertanda <strong>Paket Admin</strong> dibuat langsung dari menu ini dan selalu diutamakan.
            Paket bertanda <strong>Checklist Bawaan</strong> adalah checklist per kode rekening yang sudah
            berjalan sebelumnya — keduanya bisa disunting dari sini.
          </p>
        </div>
      </div>

      {/* PAKET DOKUMEN PER KODE REKENING */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-gray-200 dark:border-slate-700 text-center text-gray-400">
          Memuat paket SPJ...
        </div>
      ) : effectivePackages.length === 0 ? (
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
          {effectivePackages.map((p) => (
            <div
              key={`${p.source}-${p.sourceId}`}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono font-bold text-[#32848D]">
                      {p.rekKode}
                    </p>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
                      {p.rekNama}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.isActive === false
                        ? "bg-gray-100 text-gray-600"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {p.isActive === false ? "NONAKTIF" : "AKTIF"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.source === "template"
                        ? "bg-[#32848D]/10 text-[#276972] dark:text-[#8fd3da]"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {p.source === "template" ? <ShieldCheck className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                    {p.source === "template" ? "Paket Admin" : "Checklist Bawaan"}
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">{p.description}</p>
                )}
                {p.shadowed && (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1.5 leading-relaxed">
                    {p.shadowed === "config"
                      ? "Checklist bawaan untuk rekening ini juga ada, tetapi paket admin lebih diutamakan."
                      : "Ada paket admin nonaktif untuk rekening ini; yang dipakai checklist bawaan."}
                  </p>
                )}
              </div>

              <div className="p-5 flex-1 space-y-2">
                <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">
                  Dokumen Wajib ({countDocs(p)})
                </p>
                <div className="space-y-1.5">
                  {p.documents.map((d, i) => (
                    <div
                      key={`${d.documentTypeId}-${i}`}
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
                  {p.documents.length === 0 && (
                    <p className="text-xs text-gray-400 italic">Belum ada dokumen dipilih.</p>
                  )}
                </div>
              </div>

              <div className="p-3 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center justify-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleToggleActive(p)}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
                  title={p.isActive === false ? "Aktifkan" : "Nonaktifkan"}
                >
                  {p.isActive === false ? "Aktifkan" : "Nonaktifkan"}
                </button>
                {p.source === "template" ? (
                  <button
                    onClick={() => handleDelete(p)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold"
                    title="Hapus paket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span
                    className="px-3 py-2 text-[10px] text-gray-400 cursor-help"
                    title="Checklist bawaan tidak dihapus agar riwayat SPJ tetap utuh — gunakan Nonaktifkan untuk mengembalikan ke checklist standar."
                  >
                    bawaan
                  </span>
                )}
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
                  disabled={editing?.source === "config"}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option value="">— Pilih Kode Rekening —</option>
                  {availableRekList.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.kode}] {r.nama}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  {editing?.source === "config"
                    ? "Checklist bawaan terikat pada kode rekeningnya, jadi kode rekening tidak dapat dipindah."
                    : "Kode rekening yang sudah punya paket tidak muncul di sini — pilih Edit pada kartu paket tersebut."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Paket SPJ untuk belanja Alat Tulis Kantor"
                  disabled={editing?.source === "config"}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white disabled:opacity-70"
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
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                              {dt.description}
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
