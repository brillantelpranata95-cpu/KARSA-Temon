export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);

const angka = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

const terbilang = (value: number): string => {
  const n = Math.floor(Math.abs(value));
  if (n < 12) return angka[n];
  if (n < 20) return `${terbilang(n - 10)} belas`;
  if (n < 100) return `${terbilang(Math.floor(n / 10))} puluh ${terbilang(n % 10)}`;
  if (n < 200) return `seratus ${terbilang(n - 100)}`;
  if (n < 1000) return `${terbilang(Math.floor(n / 100))} ratus ${terbilang(n % 100)}`;
  if (n < 2000) return `seribu ${terbilang(n - 1000)}`;
  if (n < 1000000) return `${terbilang(Math.floor(n / 1000))} ribu ${terbilang(n % 1000)}`;
  if (n < 1000000000) return `${terbilang(Math.floor(n / 1000000))} juta ${terbilang(n % 1000000)}`;
  if (n < 1000000000000) return `${terbilang(Math.floor(n / 1000000000))} miliar ${terbilang(n % 1000000000)}`;
  return `${terbilang(Math.floor(n / 1000000000000))} triliun ${terbilang(n % 1000000000000)}`;
};

export const terbilangRupiah = (value: number) => {
  const cleaned = terbilang(value).replace(/\s+/g, " ").trim();
  return `${cleaned || "nol"} rupiah`;
};

/**
 * Kapitalkan setiap awal kata, sisanya huruf kecil.
 * Dipakai khusus untuk Tagging Sub-Kegiatan pada dokumen Bend 26 — dokumen
 * lain tetap memakai huruf kapital penuh agar formatnya tidak berubah.
 */
export const toTitleCase = (value?: string | null): string =>
  String(value || "")
    .toLowerCase()
    .replace(/(^|[\s\-/])(\S)/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());

// Self-check: terbilangRupiah(123456) === "seratus dua puluh tiga ribu empat ratus lima puluh enam rupiah"
