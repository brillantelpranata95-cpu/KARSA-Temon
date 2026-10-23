import React from "react";
import { Icon } from "./Icon";
import { formatGram, formatTreeShare, paperImpact } from "../utils/paper";

/**
 * Pengingat hemat kertas yang muncul sekali per sesi setelah pengguna masuk.
 * Gambar berasal dari aset kampanye kantor (public/green/) — sudah dikompres
 * ke WebP ~98 KB agar tidak membebani kuota Hosting (360 MB/hari).
 */
export const GreenLoginNotice: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pengingat hemat kertas"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol tutup di pojok kanan atas gambar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pengingat"
          title="Tutup"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur transition hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Icon name="x" className="h-4 w-4" tebal />
        </button>

        <img
          src={`${import.meta.env.BASE_URL}green/hemat-kertas.webp`}
          alt="Hemat kertas, kantor hijau"
          className="block w-full"
        />

        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">Cetak hanya yang perlu.</span>{" "}
            Baca di layar, bagikan PDF, dan simpan kertas untuk dokumen yang memang butuh tanda tangan basah.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-[#32848D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#276972]"
          >
            Siap, mulai hemat
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Rapor Kertas pada saat SPJ difinalisasi: berapa lembar yang sudah dicetak
 * untuk paket ini, dan setara apa. Nada sengaja tidak menghakimi — angka kecil
 * diakui apa adanya, lalu ditutup dengan satu ajakan.
 */
export const RaporKertasModal: React.FC<{ sheets: number; onClose: () => void }> = ({ sheets, onClose }) => {
  const { sheets: n, grams, treeShare } = paperImpact(sheets);
  const tanpaKertas = n <= 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Rapor kertas SPJ">
      <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-800">
        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${
            tanpaKertas ? "bg-emerald-100 text-emerald-700" : "bg-[#32848D]/10 text-[#32848D]"
          }`}
        >
          <Icon name={tanpaKertas ? "circle-check" : "file-text"} className="h-7 w-7" tebal />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {tanpaKertas ? "SPJ selesai — tanpa satu lembar pun kertas" : "SPJ selesai. Ini jejak kertasnya."}
          </h3>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Rapor Kertas · {n} lembar tercetak
          </p>
        </div>

        {tanpaKertas ? (
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Seluruh dokumen paket ini diselesaikan di layar. Itu bukan hal kecil: satu tumpukan dokumen
            tidak perlu difotokopi hari ini. Terima kasih sudah menjaga kantor tetap hijau.
          </p>
        ) : (
          <>
            <div className="rounded-2xl border border-[#32848D]/15 bg-[#F6FAF5] p-4 text-left dark:border-slate-700 dark:bg-slate-700/40">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                Selama menyiapkan paket ini, kamu mencetak{" "}
                <span className="font-bold text-[#32848D]">{n} lembar</span> (±{formatGram(grams)} kertas) —
                sekitar <span className="font-semibold">{formatTreeShare(treeShare)}</span> dari sebatang pohon
                pinus dewasa (±8.000 lembar per pohon).
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Angkanya kecil untuk satu SPJ. Dikalikan seluruh SPJ di kantor ini, ia tumbuh cepat.
              </p>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Langkah berikutnya cukup satu: baca dan bagikan sebagai PDF, cetak hanya dokumen yang benar-benar
              butuh tanda tangan basah. Yuk, lebih bijak lagi dengan kertas.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-[#32848D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#276972]"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
};
