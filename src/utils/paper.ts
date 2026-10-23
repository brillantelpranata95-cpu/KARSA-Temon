/**
 * Rapor Kertas — perkiraan dampak pemakaian kertas pada SPJ.
 *
 * Angka sengaja dibuat konservatif dan DITAMPILKAN SEBAGAI PERKIRAAN, bukan
 * klaim resmi:
 *   - 1 lembar A4 80 gsm  ≈ 5 gram (0,0625 m² × 80 g/m²)
 *   - 1 pohon pinus dewasa ≈ 8.000 lembar A4 (kutipan konservasi: 8.000–16.000)
 *
 * Semua konversi ada di sini agar bisa diuji dan mudah dikoreksi bila kantor
 * memakai ukuran kertas lain (folio/F4 lebih berat ± 6 gram).
 */

export const GRAM_PER_SHEET = 5;
export const SHEETS_PER_TREE = 8000;

export interface PaperImpact {
  sheets: number;
  grams: number;
  /** Porsi sebatang pohon (0–1). Kecil sekali untuk satu SPJ — memang begitu kenyataannya. */
  treeShare: number;
}

export const paperImpact = (sheets: unknown): PaperImpact => {
  const n = Math.max(0, Math.floor(Number(sheets) || 0));
  return { sheets: n, grams: n * GRAM_PER_SHEET, treeShare: n / SHEETS_PER_TREE };
};

/** "70 gram" / "1,2 kg" — satuan yang enak dibaca, tanpa desimal yang mengganggu. */
export const formatGram = (grams: unknown): string => {
  const g = Math.max(0, Number(grams) || 0);
  if (g >= 1000) {
    return `${(g / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg`;
  }
  return `${Math.round(g).toLocaleString("id-ID")} gram`;
};

/** Porsi pohon dalam persen; nilai yang akan tampil "0,00%" ditulis "<0,01%" agar tidak terlihat seperti nol. */
export const formatTreeShare = (share: unknown): string => {
  const pct = Math.max(0, Number(share) || 0) * 100;
  if (pct <= 0) return "0%";
  if (pct < 0.005) return "<0,01%";
  return `${pct.toLocaleString("id-ID", { maximumFractionDigits: pct < 1 ? 2 : 1 })}%`;
};

/**
 * Satu kali tekan Cetak dihitung satu lembar. Dokumen panjang (daftar hadir
 * banyak peserta) bisa tercetak lebih dari satu halaman, jadi angkanya adalah
 * BATAS BAWAH — disebut "±" di UI supaya tidak terkesan presisi palsu.
 */
export const sheetsForPrint = (): number => 1;
