import assert from "node:assert/strict";
import test from "node:test";
import { loadTsModule } from "./_loadTs.mjs";

const loadDrive = () =>
  loadTsModule("../src/utils/drive.ts", [
    "parseDriveFileId",
    "drivePhotoUrl",
    "driveOpenUrl",
    "inspectDriveLink",
    "collectDocPhotos",
  ]);

const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456";

test("link Google Drive: seluruh bentuk tautan yang lazim dikenali", async () => {
  const { parseDriveFileId } = await loadDrive();

  const variants = [
    `https://drive.google.com/file/d/${FILE_ID}/view`,
    `https://drive.google.com/file/d/${FILE_ID}/view?usp=drive_link`,
    `https://drive.google.com/file/d/${FILE_ID}/view?usp=drive_fs`,
    `https://drive.google.com/open?id=${FILE_ID}`,
    `https://drive.google.com/uc?id=${FILE_ID}&export=view`,
    `https://drive.google.com/thumbnail?id=${FILE_ID}&sz=w1000`,
    `https://docs.google.com/document/d/${FILE_ID}/edit`,
    `https://drive.google.com/d/${FILE_ID}`,
    FILE_ID,
  ];

  for (const link of variants) {
    assert.equal(parseDriveFileId(link), FILE_ID, `gagal membaca: ${link}`);
  }
});

test("link Google Drive: tautan tidak valid dikembalikan null", async () => {
  const { parseDriveFileId } = await loadDrive();

  for (const bad of ["", "   ", "bukan link", "https://example.com/foto.jpg", null, undefined]) {
    assert.equal(parseDriveFileId(bad), null, `seharusnya null: ${String(bad)}`);
  }
});

test("link Google Drive: URL foto memakai endpoint ber-CORS", async () => {
  const { drivePhotoUrl, inspectDriveLink } = await loadDrive();

  const url = drivePhotoUrl(`https://drive.google.com/file/d/${FILE_ID}/view`);
  // lh3.googleusercontent.com mengirim Access-Control-Allow-Origin: * sehingga
  // foto bisa ditampilkan DAN dirender ulang html2canvas saat ekspor PDF.
  // drive.google.com/thumbnail TIDAK mengirim CORS, jadi tidak boleh dipakai.
  assert.ok(url.startsWith("https://lh3.googleusercontent.com/d/"), url);
  assert.ok(url.includes(FILE_ID));
  assert.ok(!url.includes("drive.google.com/thumbnail"));

  const info = inspectDriveLink(`https://drive.google.com/file/d/${FILE_ID}/view`);
  assert.equal(info.fileId, FILE_ID);
  assert.ok(info.photoUrl.includes(FILE_ID));
  assert.ok(info.openUrl.includes(FILE_ID));
});

test("lampiran foto: tautan dari data dokumen dikumpulkan tanpa duplikat", async () => {
  const { collectDocPhotos } = await loadDrive();

  const idA = "1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const idB = "1BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

  const photos = collectDocPhotos({
    fotoUrl: `https://drive.google.com/file/d/${idA}/view`,
    fotoList: [
      `https://drive.google.com/open?id=${idA}`, // duplikat dari fotoUrl
      `https://drive.google.com/file/d/${idB}/view`,
      "bukan link drive",
    ],
  });

  assert.equal(photos.length, 2, "duplikat & tautan tidak valid harus dibuang");
  assert.ok(photos[0].includes(idA));
  assert.ok(photos[1].includes(idB));
});

test("lampiran foto: dokumen tanpa foto menghasilkan daftar kosong", async () => {
  const { collectDocPhotos } = await loadDrive();

  assert.deepEqual(collectDocPhotos({}), []);
  assert.deepEqual(collectDocPhotos({ nominal: 100000 }), []);
  assert.deepEqual(collectDocPhotos(null), []);
});

test("Bend 26: ukuran kertas satu lembar folio tegak 21,5 × 33 cm", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/components/PrintPreview.tsx", import.meta.url),
    "utf8"
  );

  // Satu lembar folio penuh dalam posisi tegak (21,5 × 33 cm) — sama dengan
  // blanko resmi Bend 26, isi form di bagian atas dan sisa bawah kosong.
  assert.match(source, /widthMm:\s*215/, "lebar harus 215mm (lebar folio)");
  assert.match(source, /heightMm:\s*330/, "tinggi harus 330mm (panjang folio)");
  // Margin normal di tepi kertas.
  assert.match(source, /marginMm:\s*12/, "margin kertas harus normal (12mm)");
  // Aturan @page untuk kertas folio tegak harus disuntikkan saat Bend 26 dipilih.
  assert.match(source, /@page \{ size: \$\{BEND26_PAGE\.widthMm\}mm \$\{BEND26_PAGE\.heightMm\}mm/);
});

test("Bend 26: tombol hitung pajak terpisah untuk PHR, PPh, dan PPN", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/components/SpjWizard.tsx", import.meta.url),
    "utf8"
  );

  // Satu tombol per jenis pajak — tidak semua pajak dipakai bersamaan.
  assert.match(source, /handleCalcTax/);
  assert.match(source, /Hitung \{label\}/);
  assert.match(source, /calculatePhr/);
  assert.match(source, /calculatePph/);
  assert.match(source, /calculatePpn/);
  // Tombol tunggal "Hitung Pajak Otomatis" sudah tidak dipakai lagi.
  assert.doesNotMatch(source, /handleAutoTax/);
});

test("kesimpulan SPJ Lapangan: Enter otomatis membuat penomoran baru", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/components/SpjWizard.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /handleNumberedEnter/);
  assert.match(source, /onKeyDown=\{\(e\) => handleNumberedEnter\(e, "kesimpulanHasil"\)\}/);
});

test("autocomplete: nama penerima & pembuat laporan memakai riwayat tersimpan", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/components/SpjWizard.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /SuggestionInput/);
  assert.match(source, /storageKey="bend26\.penerima"/);
  assert.match(source, /storageKey="lapangan\.pembuatLaporan"/);
});

test("dokumen cetak bersih: tidak ada teks dalam kurung non-substantif", async () => {
  const fs = await import("node:fs/promises");
  for (const file of [
    "../src/components/SpjList.tsx",
    "../src/components/SpjWizard.tsx",
    "../src/components/PackageTemplates.tsx",
  ]) {
    const source = await fs.readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /Otomatis Kapital/, `${file}: label "Otomatis Kapital" harus dihapus`);
    assert.doesNotMatch(source, /\(Otomatis\)/, `${file}: label "(Otomatis)" harus dihapus`);
    assert.doesNotMatch(source, /\(opsional\)/, `${file}: label "(opsional)" harus dihapus`);
    assert.doesNotMatch(source, /LINK DRIVE/, `${file}: badge "LINK DRIVE" harus dihapus`);
  }
});

test("daftar hadir: kolom tanda tangan tanpa titik-titik", async () => {
  const fs = await import("node:fs/promises");
  for (const file of ["../src/components/PrintPreview.tsx", "../src/components/SpjWizard.tsx"]) {
    const source = await fs.readFile(new URL(file, import.meta.url), "utf8");
    assert.ok(
      !/rowNo\}\.\s*\.\.\.\.\.\.\.\.\./.test(source),
      `${file} masih memuat titik-titik pada kolom tanda tangan`
    );
    assert.ok(!/\$\{rowNo\}\. \.\.\.\.\.\.\.\.\./.test(source), `${file} masih memuat titik-titik`);
  }
});

test("dropdown paket SPJ dapat diketik (bukan select biasa)", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/components/SpjList.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /SearchableSelect/);
  assert.match(source, /rekOptions/);
  assert.match(source, /kegiatanOptions/);
});

test("lampiran foto terdaftar sebagai tipe dokumen & punya template cetak", async () => {
  const fs = await import("node:fs/promises");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");
  const preview = await fs.readFile(new URL("../src/components/PrintPreview.tsx", import.meta.url), "utf8");

  assert.match(api, /doctype-lampiran-foto/);
  assert.match(api, /LAMPIRAN_FOTO/);
  // Harus tersedia pada deployment lama tanpa migrasi manual.
  assert.match(api, /syncDocumentTypes/);
  assert.match(preview, /LAMPIRAN_FOTO/);
});

test("Bend 26: lembar folio tegak diperkecil pada layar agar halaman tidak bergeser", async () => {
  const fs = await import("node:fs/promises");
  const preview = await fs.readFile(new URL("../src/components/PrintPreview.tsx", import.meta.url), "utf8");
  const css = await fs.readFile(new URL("../src/index.css", import.meta.url), "utf8");

  // Skala dihitung dari lebar kartu pratinjau, bukan dipatok angka tetap.
  assert.match(preview, /BEND26_NATURAL_WIDTH_PX/, "acuan lebar asli lembar harus ada");
  assert.match(preview, /ResizeObserver/, "skala harus dihitung ulang saat lebar kartu berubah");
  assert.match(preview, /BEND26_MIN_ZOOM/, "harus ada batas bawah pengecilan");
  // Pembungkus penahan geser + elemen berskala.
  assert.match(preview, /bend26-fit/);
  assert.match(preview, /bend26-fit-inner/);
  assert.match(css, /\.bend26-fit\s*\{[^}]*overflow-x:\s*auto/s, "sisa geseran harus tertahan di kartu");
});

test("Bend 26: cetak tetap 1:1 (215 × 330 mm), skala layar dinetralkan", async () => {
  const fs = await import("node:fs/promises");
  const css = await fs.readFile(new URL("../src/index.css", import.meta.url), "utf8");
  const preview = await fs.readFile(new URL("../src/components/PrintPreview.tsx", import.meta.url), "utf8");
  const exportPdf = await fs.readFile(new URL("../src/utils/exportSpjPdf.ts", import.meta.url), "utf8");

  // Aturan cetak harus mengembalikan zoom ke 1 dan membuang pembungkus layar,
  // supaya hasil cetak/PDF tetap seukuran kertas.
  assert.match(css, /\.bend26-fit-inner\s*\{\s*zoom:\s*1\s*!important/, "zoom cetak harus 1");
  assert.match(css, /\.bend26-fit\s*\{[^}]*overflow:\s*visible\s*!important/s, "pembungkus layar tidak boleh memotong cetakan");
  // Ekspor PDF merender pada ukuran asli (tanpa skala layar).
  assert.match(exportPdf, /screenFit:\s*false/, "ekspor PDF harus memakai ukuran asli");
  assert.match(preview, /screenFit = true/, "pratinjau layar memakai skala secara bawaan");
});

test("Bend 26: ekspor PDF memakai halaman folio tegak 215 × 330 mm", async () => {
  const fs = await import("node:fs/promises");
  const exportPdf = await fs.readFile(new URL("../src/utils/exportSpjPdf.ts", import.meta.url), "utf8");

  // jsPDF menganggap `format` sebagai [lebar, tinggi] untuk orientasi portrait,
  // jadi folio tegak ditulis [215, 330] — bukan lagi landscape [165, 330].
  assert.match(
    exportPdf,
    /BEND_26:\s*\{\s*format:\s*\[215,\s*330\],\s*orientation:\s*"portrait"\s*\}/,
    "Bend 26 harus diekspor sebagai folio tegak 215 × 330 mm"
  );
  assert.doesNotMatch(exportPdf, /orientation:\s*"landscape"\s*\},\s*\n?\s*BEND_26|BEND_26:[^}]*landscape/, "Bend 26 tidak boleh lagi landscape");
  // Lebar host render mengikuti 215mm ≈ 813px, bukan 330mm ≈ 1247px.
  assert.match(exportPdf, /BEND_26:\s*81[0-9]/, "lebar host harus mengikuti folio tegak (≈813px)");
});

test("SPJ Aktivitas Lapangan: Maksud/Tujuan & Tempat Tujuan terisi otomatis dari data paket", async () => {
  const fs = await import("node:fs/promises");
  const wizard = await fs.readFile(new URL("../src/components/SpjWizard.tsx", import.meta.url), "utf8");
  const preview = await fs.readFile(new URL("../src/components/PrintPreview.tsx", import.meta.url), "utf8");

  // Isian otomatis hanya boleh mengisi kolom yang belum pernah diisi, supaya
  // suntingan manual pengguna tidak pernah ditimpa.
  assert.match(wizard, /withDocDefaults/, "harus ada pengisi nilai bawaan dokumen");
  assert.match(wizard, /next\.maksudTujuan === undefined/, "Maksud/Tujuan hanya diisi bila belum ada");
  assert.match(wizard, /next\.tempatTujuan === undefined/, "Tempat Tujuan hanya diisi bila belum ada");
  assert.match(wizard, /shared\?\.judulAktivitas/, "Maksud/Tujuan diambil dari Judul Aktivitas (tagging sub-kegiatan)");
  assert.match(wizard, /shared\?\.tempat/, "Tempat Tujuan diambil dari Tempat/Lokasi paket");
  // Dipakai baik saat memuat paket maupun saat berpindah dokumen.
  assert.match(wizard, /setFormData\(withDocDefaults\(docs\[0\]/, "isi otomatis berlaku saat paket dibuka");
  assert.match(wizard, /setFormData\(withDocDefaults\(docItem/, "isi otomatis berlaku saat dokumen dipilih");
  // Cetakan memakai nilai tersimpan, lalu jatuh ke data paket bila masih kosong.
  assert.match(preview, /data\.tempatTujuan \|\| spj\.sharedData\?\.tempat/, "cetakan memakai Tempat/Lokasi sebagai cadangan");
});

test("Notulensi: label poin keputusan tidak lagi memakai penanda (Tengah)", async () => {
  const fs = await import("node:fs/promises");
  const wizard = await fs.readFile(new URL("../src/components/SpjWizard.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(wizard, /Poin-Poin Isi Keputusan Rapat \(Tengah\)/, "penanda (Tengah) harus dihapus");
  assert.match(wizard, /Poin-Poin Isi Keputusan Rapat\s*<\/label>/, "label tetap ada tanpa penanda");
});

test("Buat Paket SPJ: menampilkan paket efektif dari template maupun checklist bawaan", async () => {
  const fs = await import("node:fs/promises");
  const comp = await fs.readFile(new URL("../src/components/PackageTemplates.tsx", import.meta.url), "utf8");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");

  // Paket yang benar-benar dipakai pengguna bisa berasal dari checklistConfigs,
  // jadi menu ini wajib membacanya — kalau tidak, paket tampak hilang.
  assert.match(api, /getChecklistConfigList/, "API harus menyediakan daftar checklist bawaan");
  assert.match(comp, /getChecklistConfigList/, "menu harus memuat checklist bawaan");
  assert.match(comp, /effectivePackages/, "menu harus menghitung paket efektif per kode rekening");
  // Paket admin diutamakan, sesuai urutan resolusi di createSpjPackage.
  assert.match(comp, /if \(t && t\.isActive !== false\) source = "template"/, "paket admin aktif diutamakan");
  assert.match(comp, /source === "config"/, "checklist bawaan juga dapat disunting");
  assert.match(api, /adminUpdateChecklistConfig/, "API harus bisa menyunting checklist bawaan");
  // Menonaktifkan checklist bawaan harus benar-benar mengembalikan ke standar.
  assert.match(api, /activeConfig/, "checklist nonaktif tidak boleh dipakai saat membuat SPJ");
});

