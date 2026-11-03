/**
 * Pembantu isian rupiah: tampilkan pemisah ribuan saat mengetik, tetapi
 * simpan nilainya sebagai angka murni.
 *
 * Contoh: ketik `1500000` → tampil `1.500.000` → nilai tersimpan `1500000`.
 * Dipakai Bend 26 agar nominal besar lebih mudah dibaca tanpa mengubah data.
 */

/** Format angka/teks menjadi tampilan ribuan Indonesia (tanpa "Rp"). */
export const formatThousands = (value: unknown): string => {
  if (value === "" || value === null || value === undefined) return "";
  let raw: number;
  if (typeof value === "number") {
    raw = value;
  } else {
    const digits = String(value).replace(/[^\d-]/g, "");
    if (!digits || digits === "-") return "";
    raw = Number(digits);
  }
  if (!Number.isFinite(raw)) return "";
  // Nominal rupiah tidak memakai desimal.
  return Math.trunc(raw).toLocaleString("id-ID");
};

/**
 * Baca teks berformat menjadi angka. Hanya digit yang dipakai, sehingga
 * `Rp 1.500.000`, `1.500.000`, dan `1500000` sama-sama menjadi `1500000`.
 * Kosong / tanpa digit → `""` (bukan 0) agar placeholder tetap tampil.
 */
export const parseThousands = (raw: string): number | "" => {
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  const value = Number(digits);
  return Number.isFinite(value) ? value : "";
};
