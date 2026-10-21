import React from "react";
import { Icon } from "./Icon";
import { normalizeSuratkuUrl, SURATKU_ORIGIN } from "../utils/suratku";

/**
 * Kolom tautan surat untuk dokumen yang dibuat di luar KARSA.
 *
 * Dua sumber yang diterima:
 *  1. suratKU Kulon Progo - surat resmi bertanda tangan elektronik (BSrE).
 *     Cukup tempel tautannya; isi surat TIDAK disalin ke Firestore.
 *  2. Google Drive - cara lama, tetap didukung untuk berkas lama.
 *
 * Tautan suratKU sengaja TIDAK di-iframe (server suratKU menolak ditampilkan
 * di halaman lain), diganti tombol "Buka di suratKU".
 */

type Tone = "blue" | "indigo";

interface SuratLinkFieldProps {
  label: string;
  tone: Tone;
  value: string;
  onChange: (value: string) => void;
}

const TONE: Record<Tone, { box: string; label: string; hint: string; ring: string }> = {
  blue: {
    box: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    label: "text-blue-900 dark:text-blue-200",
    hint: "text-blue-700 dark:text-blue-300",
    ring: "border-blue-300 dark:border-blue-700",
  },
  indigo: {
    box: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
    label: "text-indigo-900 dark:text-indigo-200",
    hint: "text-indigo-700 dark:text-indigo-300",
    ring: "border-indigo-300 dark:border-indigo-700",
  },
};

export const SuratLinkField: React.FC<SuratLinkFieldProps> = ({
  label,
  tone,
  value,
  onChange,
}) => {
  const t = TONE[tone];
  const suratku = normalizeSuratkuUrl(value);
  const adaTautanLain = Boolean(value.trim()) && !suratku;

  return (
    <div className="space-y-3 text-sm">
      <div className={`space-y-2 rounded-xl border p-4 ${t.box}`}>
        <label className={`block text-xs font-bold ${t.label}`}>{label}</label>
        <p className={`text-xs ${t.hint}`}>
          Surat yang sudah terbit di suratKU cukup ditempel tautannya - tidak perlu
          diunggah ke Google Drive. Tautan Drive lama tetap diterima.
        </p>
        <div className="flex items-center space-x-2">
          <Icon name="link" className="h-4 w-4 shrink-0 text-[#32848D]" />
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${SURATKU_ORIGIN}/... atau https://drive.google.com/file/d/...`}
            className={`w-full rounded-lg border bg-white p-2 text-xs text-gray-900 dark:bg-slate-700 dark:text-white ${t.ring}`}
          />
        </div>

        {suratku && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200">
            <p className="flex items-center gap-1.5 font-bold">
              <Icon name="circle-check" className="h-4 w-4" />
              Tautan suratKU terdeteksi
            </p>
            <p className="mt-1">
              Surat resmi ini tidak disalin ke dalam aplikasi. Isi dan pengesahannya
              dibuka langsung di suratKU.
            </p>
            <a
              href={suratku}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#32848D] px-3 py-1.5 font-semibold text-white hover:bg-[#276972]"
            >
              <Icon name="external-link" className="h-3.5 w-3.5" />
              Buka di suratKU
            </a>
          </div>
        )}

        {adaTautanLain && (
          <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-slate-600 dark:bg-slate-700">
            <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-slate-300">
              Pratinjau tautan:
            </p>
            <iframe
              src={value.replace("/view?usp=drive_fs", "/preview").replace("/edit", "/preview")}
              className="h-64 w-full rounded-lg border-0"
              title={`Pratinjau ${label}`}
            />
          </div>
        )}
      </div>

    </div>
  );
};
