/**
 * Perhitungan pajak otomatis Bend 26 — KARSA Temon
 *
 * Rincian baku Kapanewon Temon:
 *   PHR = 8%  x nominal
 *   PPh = 2%  x (nominal - PHR)
 *   PPN = 11% x nominal
 *
 * Hasil dibulatkan ke rupiah penuh (Math.round) supaya angka pada kuitansi
 * tidak memuat sen dan jumlahnya rekonsiliasi dengan nominal.
 */

export const PHR_RATE = 0.08;
export const PPH_RATE = 0.02;
export const PPN_RATE = 0.11;

export interface TaxBreakdown {
  nominal: number;
  phr: number;
  pph: number;
  ppn: number;
  total: number;
}

const toPositiveNumber = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
};

/**
 * Hitung PHR, PPh, dan PPN dari nominal (angka terbilang).
 * PPh dihitung dari nominal SETELAH dikurangi PHR.
 */
export const calculateBend26Tax = (nominal: unknown): TaxBreakdown => {
  const base = toPositiveNumber(nominal);
  const phr = Math.round(base * PHR_RATE);
  const pph = Math.round((base - phr) * PPH_RATE);
  const ppn = Math.round(base * PPN_RATE);
  return { nominal: base, phr, pph, ppn, total: phr + pph + ppn };
};

/**
 * Perhitungan per jenis pajak — dipakai tombol terpisah di editor Bend 26.
 * Tidak semua pajak dipakai bersamaan, sehingga tiap kolom punya tombolnya
 * sendiri dan hanya mengisi kolom itu saja.
 */
export const calculatePhr = (nominal: unknown): number =>
  Math.round(toPositiveNumber(nominal) * PHR_RATE);

export const calculatePph = (nominal: unknown): number => {
  const base = toPositiveNumber(nominal);
  return Math.round((base - calculatePhr(base)) * PPH_RATE);
};

export const calculatePpn = (nominal: unknown): number =>
  Math.round(toPositiveNumber(nominal) * PPN_RATE);
