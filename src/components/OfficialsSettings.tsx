import React, { useEffect, useState } from "react";
import { UserProfile, OfficialPerson, OfficialType } from "../types";
import { getOfficialsList, adminSaveOfficial, adminDeleteOfficial } from "../services/api";
import { UserCog, Plus, Trash2, Save, RefreshCw, CheckCircle2, Info, Gavel } from "lucide-react";

interface OfficialsSettingsProps {
  user: UserProfile;
}

interface FieldDef {
  type: OfficialType;
  label: string;
  helper: string;
  color: string;
}

const FIELDS: FieldDef[] = [
  {
    type: "PPTK",
    label: "PPTK (Pejabat Pelaksana Teknis Kegiatan)",
    helper: "Otomatis tercetak sebagai penandatangan di Daftar Hadir dan dokumen yang membutuhkan PPTK.",
    color: "blue",
  },
  {
    type: "NOTULIS",
    label: "Notulis Rapat",
    helper: "Otomatis terisi di kolom Notulis pada Notulen Rapat setiap paket SPJ.",
    color: "teal",
  },
  {
    type: "PEMIMPIN_RAPAT",
    label: "Pemimpin Rapat",
    helper: "Daftar pilihan pemimpin rapat yang dapat dipakai lintas jawatan pada notulensi.",
    color: "amber",
  },
  {
    type: "PA",
    label: "Pengguna Anggaran / KPA",
    helper: "Otomatis tercetak sebagai 'Mengetahui dan menyetujui — Pengguna Anggaran/KPA' pada Bend 26.",
    color: "violet",
  },
  {
    type: "PANEWU",
    label: "Panewu",
    helper: "Otomatis tercetak sebagai 'Mengetahui — PANEWU' pada Laporan Aktivitas Lapangan.",
    color: "emerald",
  },
  {
    type: "BENDAHARA",
    label: "Bendahara Pengeluaran",
    helper: "Otomatis tercetak sebagai 'Bendahara Pengeluaran' pada Bend 26.",
    color: "rose",
  },
];

const colorClasses: Record<string, { bg: string; border: string; text: string; button: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-900 dark:text-blue-200", button: "bg-blue-600 hover:bg-blue-700" },
  teal: { bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-200 dark:border-teal-800", text: "text-teal-900 dark:text-teal-200", button: "bg-teal-600 hover:bg-teal-700" },
  amber: { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-900 dark:text-amber-200", button: "bg-amber-600 hover:bg-amber-700" },
  violet: { bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-800", text: "text-violet-900 dark:text-violet-200", button: "bg-violet-600 hover:bg-violet-700" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-900 dark:text-emerald-200", button: "bg-emerald-600 hover:bg-emerald-700" },
  rose: { bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-800", text: "text-rose-900 dark:text-rose-200", button: "bg-rose-600 hover:bg-rose-700" },
};

export const OfficialsSettings: React.FC<OfficialsSettingsProps> = ({ user }) => {
  const [officials, setOfficials] = useState<OfficialPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  // Per-type draft values for the primary (first) official
  const [drafts, setDrafts] = useState<Record<string, { nama: string; nip: string; pangkat: string }>>({});
  const [newRows, setNewRows] = useState<Record<string, { nama: string; nip: string; pangkat: string }>>({});

  const loadOfficials = async () => {
    setLoading(true);
    try {
      const list = await getOfficialsList();
      setOfficials(list);
      const d: Record<string, { nama: string; nip: string; pangkat: string }> = {};
      FIELDS.forEach((f) => {
        const primary = list.find((o) => o.type === f.type);
        d[f.type] = {
          nama: primary?.nama || "",
          nip: primary?.nip || "",
          pangkat: primary?.pangkat || "",
        };
      });
      setDrafts(d);
    } catch (e) {
      console.error("Failed to load officials:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOfficials();
  }, []);

  const handleSavePrimary = async (field: FieldDef) => {
    const draft = drafts[field.type];
    if (!draft?.nama?.trim()) {
      alert(`Nama ${field.label} wajib diisi.`);
      return;
    }
    setSaving(field.type);
    try {
      const existing = officials.find((o) => o.type === field.type);
      await adminSaveOfficial(
        {
          id: existing?.id,
          type: field.type,
          nama: draft.nama,
          nip: draft.nip,
          pangkat: draft.pangkat,
          jawatanId: existing?.jawatanId || "",
        },
        user
      );
      await loadOfficials();
      alert(`${field.label} berhasil disimpan. Seluruh dokumen baru akan otomatis memakai data ini.`);
    } catch (e) {
      console.error(e);
      alert(`Gagal menyimpan ${field.label}.`);
    }
    setSaving(null);
  };

  const handleAddAdditional = async (field: FieldDef) => {
    const row = newRows[field.type];
    if (!row?.nama?.trim()) {
      alert("Nama wajib diisi.");
      return;
    }
    setSaving(field.type);
    try {
      await adminSaveOfficial(
        {
          type: field.type,
          nama: row.nama,
          nip: row.nip,
          pangkat: row.pangkat,
        },
        user
      );
      setNewRows((prev) => ({ ...prev, [field.type]: { nama: "", nip: "", pangkat: "" } }));
      await loadOfficials();
      alert("Data berhasil ditambahkan.");
    } catch (e) {
      console.error(e);
      alert("Gagal menambahkan data.");
    }
    setSaving(null);
  };

  const handleDelete = async (official: OfficialPerson) => {
    if (!confirm(`Hapus "${official.nama}" dari daftar ${official.type.replace(/_/g, " ")}?`)) return;
    try {
      await adminDeleteOfficial(official.id, user);
      await loadOfficials();
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus data.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#32848D]/10 rounded-xl">
            <UserCog className="w-6 h-6 text-[#32848D]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pengaturan Penandatangan</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Data ini otomatis dipakai pada semua dokumen SPJ yang membutuhkan tanda tangan terkait
            </p>
          </div>
        </div>
        <button
          onClick={loadOfficials}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-semibold">Cara kerja:</p>
          <p>1. Isi data penandatangan di bawah ini (nama, NIP, pangkat) lalu klik Simpan.</p>
          <p>2. Setiap paket SPJ <strong>baru</strong> yang dibuat akan otomatis mengambil data ini sesuai jenis dokumennya.</p>
          <p>3. Untuk Notulis, setiap jawatan dapat memiliki notulisnya sendiri — daftar di bawah dipakai sebagai pilihan.</p>
          <p>4. Data penerima pada Bend 26 <strong>tidak</strong> diambil dari sini — diisi manual per dokumen.</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-gray-200 dark:border-slate-700 text-center text-gray-400">
          Memuat data penandatangan...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {FIELDS.map((field) => {
            const c = colorClasses[field.color];
            const primary = officials.find((o) => o.type === field.type);
            const extras = officials.filter((o) => o.type === field.type && o.id !== primary?.id);
            const draft = drafts[field.type] || { nama: "", nip: "", pangkat: "" };
            const newRow = newRows[field.type] || { nama: "", nip: "", pangkat: "" };

            return (
              <div
                key={field.type}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden"
              >
                <div className={`px-5 py-3 border-b ${c.bg} ${c.border}`}>
                  <h2 className={`font-bold text-sm flex items-center gap-2 ${c.text}`}>
                    {field.type === "PEMIMPIN_RAPAT" ? <Gavel className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
                    {field.label}
                  </h2>
                  <p className={`text-[11px] mt-1 ${c.text} opacity-80`}>{field.helper}</p>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap & Gelar</label>
                      <input
                        type="text"
                        value={draft.nama}
                        onChange={(e) => setDrafts((p) => ({ ...p, [field.type]: { ...draft, nama: e.target.value } }))}
                        placeholder="Contoh: NAMA LENGKAP, S.Sos., M.M."
                        className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">NIP</label>
                        <input
                          type="text"
                          value={draft.nip}
                          onChange={(e) => setDrafts((p) => ({ ...p, [field.type]: { ...draft, nip: e.target.value } }))}
                          placeholder="19730101 199303 1 008"
                          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Pangkat / Gol.</label>
                        <input
                          type="text"
                          value={draft.pangkat}
                          onChange={(e) => setDrafts((p) => ({ ...p, [field.type]: { ...draft, pangkat: e.target.value } }))}
                          placeholder="Pembina; IV/a"
                          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleSavePrimary(field)}
                      disabled={saving === field.type}
                      className={`w-full py-2.5 ${c.button} text-white rounded-xl text-sm font-semibold inline-flex items-center justify-center space-x-2 shadow-sm disabled:opacity-60`}
                    >
                      {saving === field.type ? (
                        <span>Menyimpan...</span>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{primary ? "Perbarui Data Utama" : "Simpan Data Utama"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Additional entries (e.g. extra pemimpin rapat / notulis options) */}
                  {extras.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-2">
                      <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Pilihan Tambahan ({extras.length})</p>
                      {extras.map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/40 rounded-xl px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{o.nama}</p>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                              {o.nip ? `NIP. ${o.nip}` : "Tanpa NIP"} {o.jawatanId ? `• ${o.jawatanId}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(o)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg shrink-0"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add another option — mainly useful for Notulis & Pemimpin Rapat */}
                  <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-2">
                    <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">
                      Tambah Pilihan Lain
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newRow.nama}
                        onChange={(e) => setNewRows((p) => ({ ...p, [field.type]: { ...newRow, nama: e.target.value } }))}
                        placeholder="Nama"
                        className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={newRow.nip}
                        onChange={(e) => setNewRows((p) => ({ ...p, [field.type]: { ...newRow, nip: e.target.value } }))}
                        placeholder="NIP (opsional)"
                        className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={newRow.pangkat}
                        onChange={(e) => setNewRows((p) => ({ ...p, [field.type]: { ...newRow, pangkat: e.target.value } }))}
                        placeholder="Pangkat (opsional)"
                        className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={() => handleAddAdditional(field)}
                      disabled={saving === field.type}
                      className="w-full py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-1.5 disabled:opacity-60"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Pilihan</span>
                    </button>
                  </div>

                  {primary && (
                    <div className="flex items-center space-x-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Data utama tersimpan — otomatis dipakai dokumen SPJ baru.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OfficialsSettings;
