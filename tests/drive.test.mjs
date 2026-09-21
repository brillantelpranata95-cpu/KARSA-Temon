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

test("Bend 26: ukuran kertas setengah folio horizontal 33 × 16,5 cm", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/components/PrintPreview.tsx", import.meta.url),
    "utf8"
  );

  // Panjang memenuhi panjang kertas folio (33 cm), tingginya setengah halaman
  // folio (16,5 cm) — posisi horizontal/memanjang.
  assert.match(source, /widthMm:\s*330/, "lebar harus 330mm (panjang folio)");
  assert.match(source, /heightMm:\s*165/, "tinggi harus 165mm (setengah halaman folio)");
  // Margin normal di tepi kertas.
  assert.match(source, /marginMm:\s*12/, "margin kertas harus normal (12mm)");
  // Aturan @page untuk kertas setengah folio harus disuntikkan saat Bend 26 dipilih.
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
