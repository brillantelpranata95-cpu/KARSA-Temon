/**
 * Penomoran otomatis untuk kolom Kesimpulan (SPJ Aktivitas Lapangan).
 *
 * Aturannya sengaja konservatif: nomor hanya dilanjutkan dari baris yang
 * SUDAH bernomor, sehingga menekan Enter di kolom yang masih kosong tidak
 * memunculkan "1. " yang tidak diminta pengguna.
 */

export interface NumberedEnterResult {
  /** Nilai baru untuk textarea. */
  value: string;
  /** Posisi kursor setelah perubahan. */
  caret: number;
  /**
   * true bila tombol Enter sudah ditangani (pemanggil harus memanggil
   * preventDefault dan memakai value/caret di atas).
   */
  handled: boolean;
}

/**
 * Terapkan perilaku Enter pada teks bernomor.
 *
 * - Baris belum bernomor (termasuk kolom kosong) → tidak ditangani, Enter
 *   berperilaku bawaan sebagai baris baru biasa.
 * - Baris bernomor berisi teks → sisipkan nomor berikutnya.
 * - Baris hanya berisi nomor ("2. " tanpa isi) → buang nomor menggantung itu
 *   dan keluarkan pengguna dari daftar, supaya tidak ada nomor tanpa isi yang
 *   ikut tercetak.
 */
export const applyNumberedEnter = (
  text: string,
  caretInput?: number | null
): NumberedEnterResult => {
  const caret = caretInput ?? text.length;
  const before = text.slice(0, caret);
  const after = text.slice(caret);

  const lines = before.split("\n");
  const lastLine = lines[lines.length - 1] ?? "";
  const current = lastLine.match(/^(\s*)(\d+)\.\s*(.*)$/);

  // Belum ada nomor di baris ini: biarkan Enter berperilaku biasa.
  if (!current) return { value: text, caret, handled: false };

  // Nomor menggantung tanpa isi: hapus nomornya, sisakan baris kosong.
  if (!current[3].trim()) {
    const lineStart = before.length - lastLine.length;
    return { value: before.slice(0, lineStart) + after, caret: lineStart, handled: true };
  }

  const insert = `\n${current[1]}${Number(current[2]) + 1}. `;
  return { value: before + insert + after, caret: caret + insert.length, handled: true };
};
