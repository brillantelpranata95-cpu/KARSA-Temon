# AGENTS.md — Aturan Proyek KARSA TEMON

Panduan ini mengikat semua perubahan kode dan desain, termasuk dokumen cetak
baru yang dibuat di masa depan.

## Aturan Dokumen Cetak (WAJIB)

**Jangan pernah menampilkan timestamp waktu cetak di dokumen cetak.**

Berlaku untuk semua bentuk keluaran cetak/PDF, antara lain:

- `src/components/PrintPreview.tsx` (pratinjau & cetak browser)
- `src/utils/exportRecap.ts` (PDF rekapitulasi)
- `src/utils/exportSpjPdf.ts` (paket PDF SPJ)
- Dokumen cetak baru apa pun yang ditambahkan kemudian

Yang **dilarang** (contoh):

- `Tanggal cetak: 03/11/2026 14.05`
- `Waktu cetak`, `Dicetak pada`, `Printed at`, `Generated at` yang memakai
  waktu berjalan (`new Date()`)
- Footer/header berisi jam cetak, termasuk dari `window.print()` bawaan browser

Yang **tetap boleh** dan jangan dihapus:

- Tanggal kegiatan/SPJ, tanggal pelaksanaan, tahun anggaran, jam pelaksanaan
  kegiatan (mis. `09.00 WIB s.d. 11.00 WIB`).
- Nama pencetak/penanda tangan (mis. `Dicetak oleh : Nama`) — ini identitas,
  bukan timestamp.
- Nomor halaman (`Halaman 1 dari 3`).

Alasan: dokumen SPJ adalah arsip resmi; waktu cetak ulang tidak relevan dan
membuat dokumen yang sama terlihat berbeda setiap kali dicetak.

### Pencegahan regresi

- `tests/print-no-timestamp.test.mjs` memindai seluruh `src/` dan gagal bila
  menemukan label timestamp cetak.
- Jalankan `npm test` sebelum build/deploy.
- Bila sebuah desain baru butuh metadata, gunakan tanggal dokumen/kegiatan,
  bukan waktu berjalan.

## Perintah Penting

- `npm run dev` — server pengembangan
- `npm run build` — typecheck + build produksi (`dist/`)
- `npm test` — test Node
- `npm run lint` — oxlint
- `bash deploy.sh` — deploy KARSA + GRAHA ke Firebase Hosting (lihat komentar
  di dalam skrip; jangan deploy tanpa `public/graha` agar `/graha` tidak hilang)
