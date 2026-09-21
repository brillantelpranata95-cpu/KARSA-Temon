import React, { useEffect, useState } from "react";
import { UserProfile, OfficialPerson, Jawatan } from "../types";
import {
  getOfficialsList,
  getJawatanList,
  adminSaveOfficial,
  adminDeleteOfficial,
  saveJawatanOfficial,
  savePemimpinRapatOption,
} from "../services/api";
import { UserCog, Plus, Trash2, Save, RefreshCw, CheckCircle2, Info, Gavel, Lock, Eye, Building2 } from "lucide-react";

interface OfficialsSettingsProps {
  user: UserProfile;
}

type JawatanManagedType = "PPTK" | "NOTULIS" | "PEMIMPIN_RAPAT";

interface FieldDef {
  type: JawatanManagedType | "PA" | "PANEWU" | "BENDAHARA";
  label: string;
  helper: string;
  color: string;
  jawatanManaged: boolean;
}

const FIELDS: FieldDef[] = [
  {
    type: "PPTK",
    label: "PPTK (Pejabat Pelaksana Teknis Kegiatan)",
    helper: "Tercetak otomatis sebagai penandatangan pada Daftar Hadir dan dokumen yang membutuhkan PPTK.",
    color: "blue",
    jawatanManaged: true,
  },
  {
    type: "NOTULIS",
    label: "Notulis Rapat",
    helper: "Terisi otomatis di kolom Notulis pada Notulen Rapat setiap paket SPJ jawatan Anda.",
    color: "teal",
    jawatanManaged: true,
  },
  {
    type: "PEMIMPIN_RAPAT",
    label: "Pemimpin Rapat",
    helper: "Pilihan pemimpin rapat jawatan Anda yang dapat dipakai pada notulensi.",
    color: "amber",
    jawatanManaged: true,
  },
  {
    type: "PA",
    label: "Pengguna Anggaran / KPA",
    helper: "Tercetak sebagai 'Mengetahui dan menyetujui — Pengguna Anggaran/KPA' pada Bend 26.",
    color: "violet",
    jawatanManaged: false,
  },
  {
    type: "PANEWU",
    label: "Panewu",
    helper: "Tercetak sebagai 'Mengetahui — PANEWU' pada Laporan Aktivitas Lapangan.",
    color: "emerald",
    jawatanManaged: false,
  },
  {
    type: "BENDAHARA",
    label: "Bendahara Pengeluaran",
    helper: "Tercetak sebagai 'Bendahara Pengeluaran' pada Bend 26.",
    color: "rose",
    jawatanManaged: false,
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
  const [jawatanList, setJawatanList] = useState<Jawatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { nama: string; nip: string; pangkat: string }>>({});
  const [newRows, setNewRows] = useState<Record<string, { nama: string; nip: string; pangkat: string }>>({});

  const isAdmin = user.role === "ADMIN";

  const loadOfficials = async () => {
    setLoading(true);
    try {
      const [list, jList] = await Promise.all([getOfficialsList(), getJawatanList()]);
      setOfficials(list);
      setJawatanList(jList);
      const d: Record<string, { nama: string; nip: string; pangkat: string }> = {};
      FIELDS.forEach((f) => {
        const entry = f.jawatanManaged && !isAdmin
          ? list.find((o) => o.type === f.type && (o.jawatanId || "") === user.jawatanId)
          : list.find((o) => o.type === f.type);
        d[f.type] = {
          nama: entry?.nama || "",
          nip: entry?.nip || "",
          pangkat: entry?.pangkat || "",
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

  const getJawatanName = (jawatanId?: string): string => {
    if (!jawatanId) return "Umum / Kapanewon";
    const found = jawatanList.find((j) => j.id === jawatanId);
    return found ? found.nama : jawatanId;
  };

  const handleSavePrimary = async (field: FieldDef) => {
    if (field.jawatanManaged && isAdmin) {
      alert("PPTK, Notulis, dan Pemimpin Rapat diatur oleh jawatan masing-masing.");
      return;
    }
    const draft = drafts[field.type];
    if (!draft?.nama?.trim()) {
      alert(`Nama ${field.label} wajib diisi.`);
      return;
    }
    setSaving(field.type);
    try {
      if (field.jawatanManaged && !isAdmin) {
        await saveJawatanOfficial(
          {
            type: field.type as JawatanManagedType,
            nama: draft.nama,
            nip: draft.nip,
            pangkat: draft.pangkat,
            jawatanId: user.jawatanId,
          },
          user
        );
      } else {
        const existing = officials.find((o) => o.type === field.type);
        await adminSaveOfficial(
          {
            id: existing?.id,
            type: field.type,
            nama: draft.nama,
            nip: draft.nip,
            pangkat: draft.pangkat,
            jawatanId: field.jawatanManaged ? user.jawatanId : (existing?.jawatanId || ""),
          },
          user
        );
      }
      await loadOfficials();
      alert(`${field.label} berhasil disimpan.`);
    } catch (e) {
      console.error(e);
      alert(`Gagal menyimpan ${field.label}.`);
    }
    setSaving(null);
  };

  const handleAddAdditional = async (field: FieldDef) => {
    if (field.jawatanManaged && isAdmin) {
      alert("Pilihan PPTK, Notulis, dan Pemimpin Rapat diisi oleh jawatan masing-masing.");
      return;
    }
    const row = newRows[field.type];
    if (!row?.nama?.trim()) {
      alert("Nama wajib diisi.");
      return;
    }
    setSaving(field.type);
    try {
      if (field.type === "PEMIMPIN_RAPAT" && !isAdmin) {
        await savePemimpinRapatOption(
          { nama: row.nama, nip: row.nip, pangkat: row.pangkat },
          user
        );
      } else {
        await adminSaveOfficial(
          {
            type: field.type,
            nama: row.nama,
            nip: row.nip,
            pangkat: row.pangkat,
            jawatanId: field.jawatanManaged ? user.jawatanId : "",
          },
          user
        );
      }
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
    if (!confirm(`Apakah Anda yakin ingin menghapus "${official.nama}" (${official.type})?`)) return;
    try {
      await adminDeleteOfficial(official.id, user);
      await loadOfficials();
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus data.");
    }
  };

  const visibleOfficialsFor = (field: FieldDef): OfficialPerson[] => {
    if (!field.jawatanManaged) return officials.filter((o) => o.type === field.type);
    if (isAdmin) return officials.filter((o) => o.type === field.type);
    return officials.filter((o) => o.type === field.type && (o.jawatanId || "") === user.jawatanId);
  };

  // Jawatan-managed officials list for Admin
  const jawatanManagedOfficialsForAdmin = officials.filter((o) =>
    ["PPTK", "NOTULIS", "PEMIMPIN_RAPAT"].includes(o.type)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#32848D]/10 rounded-xl">
            <UserCog className="w-6 h-6 text-[#32848D]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Pengaturan Penandatangan {isAdmin ? "— Kapanewon Temon" : `— ${user.jawatanName}`}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {isAdmin
                ? "Kelola pejabat tingkat Kapanewon dan pantau/hapus data penandatangan jawatan"
                : "PPTK, Notulis & Pemimpin Rapat diatur oleh jawatan masing-masing"}
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
          {isAdmin ? (
            <>
              <p className="font-semibold">Fungsi Administrator:</p>
              <p>1. <strong>Pejabat Tingkat Kapanewon</strong> (PA/KPA, Panewu, Bendahara) ditetapkan langsung oleh Admin pada kartu di bawah.</p>
              <p>2. <strong>Data Penandatangan Jawatan</strong> (PPTK, Notulis, Pemimpin Rapat) ditampilkan dalam bentuk daftar list. Admin berwewenang menghapus data yang tidak sesuai.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Cara kerja:</p>
              <p>1. Isi PPTK, Notulis, dan Pemimpin Rapat jawatan Anda (nama, NIP, pangkat) lalu klik Simpan.</p>
              <p>2. Setiap dokumen SPJ baru jawatan Anda otomatis mengambil data ini sesuai jenis dokumennya.</p>
              <p>3. <strong>Pengguna Anggaran/KPA, Panewu, dan Bendahara Pengeluaran</strong> ditetapkan oleh Administrator Kapanewon.</p>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-gray-200 dark:border-slate-700 text-center text-gray-400">
          Memuat data penandatangan...
        </div>
      ) : isAdmin ? (
        /* ================= ADMIN VIEW ================= */
        <div className="space-y-8">
          {/* Section 1: Admin-managed pejabat (PA, Panewu, Bendahara) in cards */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#32848D]" />
              <span>Pejabat Tingkat Kapanewon (PA / Panewu / Bendahara Pengeluaran)</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {FIELDS.filter((f) => !f.jawatanManaged).map((field) => {
                const c = colorClasses[field.color];
                const rows = visibleOfficialsFor(field);
                const primary = rows[0];
                const draft = drafts[field.type] || { nama: "", nip: "", pangkat: "" };

                return (
                  <div
                    key={field.type}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden"
                  >
                    <div className={`px-5 py-3 border-b ${c.bg} ${c.border}`}>
                      <h3 className={`font-bold text-sm flex items-center gap-2 ${c.text}`}>
                        <UserCog className="w-4 h-4" />
                        {field.label}
                      </h3>
                      <p className={`text-[11px] mt-1 ${c.text} opacity-80`}>{field.helper}</p>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap & Gelar</label>
                        <input
                          type="text"
                          value={draft.nama}
                          onChange={(e) => setDrafts((p) => ({ ...p, [field.type]: { ...draft, nama: e.target.value } }))}
                          placeholder="Nama Lengkap..."
                          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">NIP</label>
                          <input
                            type="text"
                            value={draft.nip}
                            onChange={(e) => setDrafts((p) => ({ ...p, [field.type]: { ...draft, nip: e.target.value } }))}
                            placeholder="NIP"
                            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Pangkat</label>
                          <input
                            type="text"
                            value={draft.pangkat}
                            onChange={(e) => setDrafts((p) => ({ ...p, [field.type]: { ...draft, pangkat: e.target.value } }))}
                            placeholder="Pangkat/Gol"
                            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleSavePrimary(field)}
                        disabled={saving === field.type}
                        className={`w-full py-2.5 ${c.button} text-white rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-2 shadow-sm disabled:opacity-60`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{primary ? "Perbarui" : "Simpan"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Jawatan-managed officials in a clean LIST / TABLE for Admin */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#32848D]" />
                  <span>Daftar Penandatangan Jawatan (PPTK, Notulis & Pemimpin Rapat)</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Seluruh data penandatangan yang diinput oleh jawatan-jawatan. Admin berwewenang menghapus data jika diperlukan.
                </p>
              </div>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                Total: {jawatanManagedOfficialsForAdmin.length} Data
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              {jawatanManagedOfficialsForAdmin.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Belum ada data penandatangan yang diinput oleh jawatan.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase">
                        <th className="p-3.5">Jawatan</th>
                        <th className="p-3.5">Jabatan / Tipe</th>
                        <th className="p-3.5">Nama Lengkap & Gelar</th>
                        <th className="p-3.5">NIP</th>
                        <th className="p-3.5">Pangkat / Gol.</th>
                        <th className="p-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {jawatanManagedOfficialsForAdmin.map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition">
                          <td className="p-3.5 font-medium text-gray-800 dark:text-slate-200 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-100 dark:border-emerald-800/50 text-xs">
                              {getJawatanName(o.jawatanId)}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            {o.type === "PPTK" ? (
                              <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800">
                                PPTK
                              </span>
                            ) : o.type === "NOTULIS" ? (
                              <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 rounded-lg text-xs font-bold border border-teal-200 dark:border-teal-800">
                                Notulis Rapat
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-bold border border-amber-200 dark:border-amber-800">
                                Pemimpin Rapat
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold text-gray-900 dark:text-white">
                            {o.nama}
                          </td>
                          <td className="p-3.5 font-mono text-xs text-gray-600 dark:text-slate-300 whitespace-nowrap">
                            {o.nip ? `NIP. ${o.nip}` : "—"}
                          </td>
                          <td className="p-3.5 text-xs text-gray-600 dark:text-slate-300 whitespace-nowrap">
                            {o.pangkat || "—"}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDelete(o)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                              title="Hapus Penandatangan Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================= JAWATAN / USER VIEW (CARDS) ================= */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {FIELDS.map((field) => {
            const c = colorClasses[field.color];
            const rows = visibleOfficialsFor(field);
            const primary = rows[0];
            const extras = rows.slice(1);
            const draft = drafts[field.type] || { nama: "", nip: "", pangkat: "" };
            const newRow = newRows[field.type] || { nama: "", nip: "", pangkat: "" };
            const editable = field.jawatanManaged;

            return (
              <div
                key={field.type}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden"
              >
                <div className={`px-5 py-3 border-b ${c.bg} ${c.border}`}>
                  <h2 className={`font-bold text-sm flex items-center gap-2 ${c.text}`}>
                    {field.type === "PEMIMPIN_RAPAT" ? <Gavel className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
                    {field.label}
                    {field.jawatanManaged ? (
                      <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/60">
                        RANAH JAWATAN
                      </span>
                    ) : (
                      <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/60 inline-flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> ADMIN
                      </span>
                    )}
                  </h2>
                  <p className={`text-[11px] mt-1 ${c.text} opacity-80`}>{field.helper}</p>
                </div>

                <div className="p-5 space-y-4">
                  {editable ? (
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
                  ) : (
                    <div className="bg-gray-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center space-x-2 text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Data ditetapkan Administrator Kapanewon</span>
                      </div>
                      {primary ? (
                        <>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{primary.nama}</p>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400">
                            {primary.nip ? `NIP. ${primary.nip}` : "Tanpa NIP"}
                            {primary.pangkat ? ` • ${primary.pangkat}` : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Belum ditetapkan oleh admin.</p>
                      )}
                    </div>
                  )}

                  {/* Additional entries */}
                  {extras.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-2">
                      <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">
                        Pilihan Tambahan ({extras.length})
                      </p>
                      {extras.map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/40 rounded-xl px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{o.nama}</p>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                              {o.nip ? `NIP. ${o.nip}` : "Tanpa NIP"}
                            </p>
                          </div>
                          {editable && (
                            <button
                              onClick={() => handleDelete(o)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg shrink-0"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add another option */}
                  {editable && (
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
                          placeholder="NIP"
                          className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={newRow.pangkat}
                          onChange={(e) => setNewRows((p) => ({ ...p, [field.type]: { ...newRow, pangkat: e.target.value } }))}
                          placeholder="Pangkat"
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
                  )}

                  {primary && (
                    <div className="flex items-center space-x-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Data tersimpan — otomatis dipakai dokumen SPJ baru.</span>
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
