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

test("Buat Paket SPJ: kartu 'Paket SPJ yang Sudah Ada' dihapus dari menu admin", async () => {
  const fs = await import("node:fs/promises");
  const comp = await fs.readFile(new URL("../src/components/PackageTemplates.tsx", import.meta.url), "utf8");

  // Menu ini hanya untuk mengelola paket dokumen per kode rekening.
  // Daftar SPJ yang sudah dibuat punya menunya sendiri ("SPJ Saya"), jadi
  // kartu ringkasan di sini dihapus agar menu tidak tercampur.
  assert.doesNotMatch(comp, /Paket SPJ yang Sudah Ada/, "kartu daftar SPJ harus dihapus");
  assert.doesNotMatch(comp, /getSpjList/, "menu paket tidak boleh lagi menarik daftar SPJ");
  assert.doesNotMatch(comp, /onOpenSpj/, "prop pembuka SPJ harus dihapus bersama kartunya");
  // Bagian pengelolaan paket tetap ada.
  assert.match(comp, /effectivePackages/, "pengelolaan paket per kode rekening tetap ada");
  assert.match(comp, /getChecklistConfigList/, "checklist bawaan tetap dibaca");
});


test("SPJ final: tombol Revisi tersedia untuk pemilik SPJ dan Admin", async () => {
  const fs = await import("node:fs/promises");
  const list = await fs.readFile(new URL("../src/components/SpjList.tsx", import.meta.url), "utf8");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");

  // SPJ yang sudah final harus bisa direvisi pemiliknya sendiri, bukan hanya admin.
  assert.match(
    list,
    /spj\.status === "FINALIZED" && \(user\.role === "ADMIN" \|\| spj\.userId === user\.uid\)/,
    "tombol Revisi tampil untuk pemilik SPJ dan admin"
  );
  assert.match(list, /<span>Revisi<\/span>/, "label tombol Revisi");
  // Alasan revisi wajib, minimal 5 karakter, sebelum status diubah.
  assert.match(list, /reopenReason\.trim\(\)\.length < 5/, "alasan revisi wajib diisi");
  // Setelah revisi dibuka pengguna langsung masuk ke editor, bukan disuruh mencari barisnya.
  assert.match(list, /onSelectSpj\(spjId, "edit"\)/, "langsung buka editor setelah revisi");
  // API menolak revisi untuk SPJ yang statusnya bukan FINALIZED.
  assert.match(api, /if \(current\.status !== "FINALIZED"\) return;/, "hanya SPJ final yang bisa direvisi");
});

test("Bend 26: pengingat muncul saat nominal berganti sebelum pajak dihitung ulang", async () => {
  const fs = await import("node:fs/promises");
  const wizard = await fs.readFile(new URL("../src/components/SpjWizard.tsx", import.meta.url), "utf8");
  const tax = await fs.readFile(new URL("../src/utils/tax.ts", import.meta.url), "utf8");

  // Pembanding nominal vs dasar hitung ada di utils agar bisa diuji terpisah.
  assert.match(tax, /export const taxNeedsRecalc/, "helper taxNeedsRecalc tersedia");
  // Setiap tombol hitung (dan Kosongkan) menandai nominal yang dipakai.
  assert.match(wizard, /taxBasis: nominal/, "dasar pajak dicatat saat menghitung");
  assert.match(wizard, /bend26PajakPerluDihitung/, "editor memakai status perlu hitung ulang");
  assert.match(wizard, /Pajak belum dihitung ulang/, "teks pengingat tampil di editor");
  // Simpan tetap meminta konfirmasi supaya angka pajak tidak tersimpan salah.
  assert.match(wizard, /if \(bend26PajakPerluDihitung\) \{\s*const lanjut = confirm/, "simpan meminta konfirmasi");
});

test("green company: pengingat login, hitung cetak, dan rapor kertas saat finalisasi", async () => {
  const fs = await import("node:fs/promises");
  const app = await fs.readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const preview = await fs.readFile(new URL("../src/components/PrintPreview.tsx", import.meta.url), "utf8");
  const wizard = await fs.readFile(new URL("../src/components/SpjWizard.tsx", import.meta.url), "utf8");
  const notice = await fs.readFile(new URL("../src/components/GreenNotice.tsx", import.meta.url), "utf8");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");

  // 1) Pop-up hemat kertas setelah login, sekali per sesi browser.
  assert.match(app, /GreenLoginNotice/, "App memasang pop-up pengingat");
  assert.match(app, /karsa-green-notice/, "penanda sesi agar tidak muncul berulang");
  assert.match(app, /sessionStorage/, "memakai sessionStorage, bukan localStorage");
  assert.match(notice, /green\/hemat-kertas\.webp/, "memakai gambar kampanye yang sudah dikompres");
  assert.match(notice, /absolute right-3 top-3/, "tombol tutup di pojok kanan atas gambar");

  // 2) Cetak dihitung, ekspor PDF tidak (PDF justru menghemat kertas).
  assert.match(api, /export const logDocumentPrint/, "API mencatat pemakaian kertas");
  assert.match(api, /printedSheets: increment/, "jumlah lembar ditambah, bukan ditimpa");
  assert.match(preview, /logDocumentPrint\(activeDoc\.id/, "tombol Cetak mencatat pemakaian kertas");
  assert.match(preview, /window\.print\(\)/, "pencetakan tetap berjalan");

  // 3) Rapor kertas muncul sesudah finalisasi, memakai data dokumen terbaru.
  assert.match(wizard, /getSpjDocuments\(spj\.id\)\.catch/, "angka cetak dibaca ulang saat finalisasi");
  assert.match(wizard, /setRaporKertas\(totalSheets\)/, "rapor ditampilkan setelah finalisasi");
  assert.match(wizard, /<RaporKertasModal sheets=\{raporKertas\}/, "modal rapor dipasang");

  // 4) Aset gambar benar-benar ada di public/ (kalau tidak, pop-up kosong).
  const img = await fs.readFile(new URL("../public/green/hemat-kertas.webp", import.meta.url));
  assert.ok(img.length > 10_000, "gambar pengingat tersedia");
  assert.ok(img.length < 300_000, "gambar tetap ringan untuk kuota Hosting");
});

test("Daftar Penerimaan hanya muncul bila paket/checklist memilihnya", async () => {
  const fs = await import("node:fs/promises");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");

  // Regresi: dokumen ini dulu DIPAKSAKAN ke setiap SPJ baru, sehingga muncul
  // pada paket mamin lapangan yang tidak membutuhkannya.
  assert.doesNotMatch(
    api,
    /Daftar Penerimaan selalu disertakan/,
    "tidak boleh ada penambahan Daftar Penerimaan secara membabi buta"
  );
  assert.doesNotMatch(
    api,
    /checklistDocs\.some\(\(d\) => d\.documentTypeId === "doctype-daftarpenerimaan"\)/,
    "tidak boleh ada pengecekan yang menambahkan dokumen ini otomatis"
  );

  // Checklist standar (dipakai hanya bila rekening tidak punya paket/config)
  // juga tidak boleh memuat Daftar Penerimaan.
  const defaultBlock = api.match(
    /checklistDocs = \[\s*\{ documentTypeId: "doctype-bend26"[\s\S]*?\n\s*\];/
  );
  assert.ok(defaultBlock, "blok checklist standar harus tetap ada");
  assert.doesNotMatch(
    defaultBlock[0],
    /daftarpenerimaan/i,
    "checklist standar tidak boleh memuat Daftar Penerimaan"
  );
});

test("multi tanggal: satu aksi membuat paket SPJ tersendiri per tanggal", async () => {
  const fs = await import("node:fs/promises");
  const list = await fs.readFile(new URL("../src/components/SpjList.tsx", import.meta.url), "utf8");
  const date = await fs.readFile(new URL("../src/utils/date.ts", import.meta.url), "utf8");
  const preview = await fs.readFile(new URL("../src/components/PrintPreview.tsx", import.meta.url), "utf8");

  // Input tanggal berupa daftar, bukan satu nilai tunggal.
  assert.match(list, /const \[tanggalSpjList, setTanggalSpjList\]/);
  assert.doesNotMatch(list, /const \[tanggalSpj, setTanggalSpj\]/);
  assert.match(list, /sortDates\(tanggalSpjList\)/, "tanggal diurutkan sebelum diproses");
  assert.match(list, /for \(const tanggal of tanggalList\)/, "setiap tanggal diproses");
  assert.match(list, /await createSpjPackage\(\{[\s\S]*?tanggal,/, "paket dibuat dengan tanggalnya sendiri");
  // Nomor SPJ berurutan, jadi pembuatan tidak boleh paralel.
  assert.match(list, /generateSpjNumber|berurutan/, "pembuatan berurutan untuk nomor SPJ unik");
  // Penjelasan agar pengguna tahu konsekuensinya.
  assert.match(list, /Setiap tanggal menjadi paket SPJ tersendiri/);

  // Utilitas pengurutan tanggal tersedia dan dipakai bersama.
  assert.match(date, /export const sortDates/);

  // Dokumen cetak mengambil tanggal dari SPJ masing-masing, sehingga Notulen,
  // Bend 26, dan Daftar Hadir pada tiap paket memakai tanggal yang benar.
  assert.match(preview, /formatDateDDMMYYYY\(spj\.tanggal\)/);
});

test("multi tanggal: pengelompokan visual memakai batchId", async () => {
  const fs = await import("node:fs/promises");
  const list = await fs.readFile(new URL("../src/components/SpjList.tsx", import.meta.url), "utf8");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");
  const types = await fs.readFile(new URL("../src/types/index.ts", import.meta.url), "utf8");

  // Model data: batch hanya penanda visual, SPJ tetap berdiri sendiri.
  assert.match(types, /batchId\?: string/, "SpjItem punya batchId opsional");
  assert.match(types, /batchIndex\?: number/, "SpjItem punya batchIndex opsional");
  assert.match(types, /batchTotal\?: number/, "SpjItem punya batchTotal opsional");
  assert.match(api, /batchId: params\.batchId/, "batchId disimpan ke dokumen SPJ");

  // Satu batchId dibuat sekali per aksi multi tanggal, dan hanya bila > 1 tanggal.
  assert.match(
    list,
    /tanggalList\.length > 1[\s\S]{0,200}batch-\$\{Date\.now\(\)\}/,
    "batchId hanya dibuat untuk lebih dari satu tanggal"
  );
  assert.match(list, /batchIndex: batchId \? urutanTanggal/, "urutan tanggal dicatat");
  assert.match(list, /batchTotal: batchId \? tanggalList\.length/, "jumlah tanggal dicatat");

  // Pengelompokan + pelipatan di daftar SPJ.
  assert.match(list, /const batchGroups = React\.useMemo/, "SPJ dikelompokkan per batch");
  assert.match(list, /collapsedBatches/, "batch bisa dilipat/ditampilkan");
  assert.match(list, /Paket multi tanggal · \{batchSiblings\.length\} SPJ/, "header batch");
  // Baris anggota batch diberi aksen agar mudah dibedakan dari SPJ tunggal.
  assert.match(list, /border-l-\[#32848D\]\/40/, "aksen kiri untuk anggota batch");
  // SPJ lama tanpa batchId tidak boleh ikut berubah perilakunya.
  assert.match(list, /spj\.batchId \? "border-l-2/, "aksen hanya untuk SPJ ber-batch");
});

test("hapus SPJ: pemilik boleh menghapus miliknya sendiri, admin semua", async () => {
  const fs = await import("node:fs/promises");
  const list = await fs.readFile(new URL("../src/components/SpjList.tsx", import.meta.url), "utf8");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");

  // Tombol Hapus tampil untuk admin DAN pemilik SPJ.
  assert.match(
    list,
    /user\.role === "ADMIN" \|\| spj\.userId === user\.uid \?[\s\S]{0,200}setDeleteSpjId\(spj\.id\)/,
    "tombol Hapus tampil untuk pemilik dan admin"
  );
  assert.doesNotMatch(
    list,
    /user\.role === "ADMIN" && \(\s*<button\s+onClick=\{\(\) => setDeleteSpjId\(spj\.id\)\}/,
    "tombol Hapus tidak boleh admin-only lagi"
  );

  // API menolak penghapusan SPJ milik orang lain.
  assert.match(
    api,
    /const milikSendiri = spjData\.userId === user\.uid/,
    "API memeriksa kepemilikan SPJ"
  );
  assert.match(
    api,
    /user\.role !== "ADMIN" && !milikSendiri[\s\S]{0,120}hanya dapat menghapus SPJ yang Anda buat sendiri/,
    "API menolak hapus SPJ milik orang lain"
  );
  assert.match(api, /SPJ dihapus oleh pemiliknya sendiri/, "alasan audit untuk pemilik");
});

test("jam pelaksanaan: input dikembalikan dan diteruskan ke dokumen", async () => {
  const fs = await import("node:fs/promises");
  const list = await fs.readFile(new URL("../src/components/SpjList.tsx", import.meta.url), "utf8");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");
  const wizard = await fs.readFile(new URL("../src/components/SpjWizard.tsx", import.meta.url), "utf8");
  const preview = await fs.readFile(new URL("../src/components/PrintPreview.tsx", import.meta.url), "utf8");

  // Form pembuatan paket punya isian Jam Pelaksanaan.
  assert.match(list, /const \[jamPelaksanaan, setJamPelaksanaan\]/);
  assert.match(list, /Jam Pelaksanaan/, "label input tersedia");
  assert.match(list, /jam: jamPelaksanaan\.trim\(\)/, "nilai jam dikirim saat membuat SPJ");

  // API menyimpannya di sharedData.jam.
  assert.match(api, /jam\?: string;/, "parameter jam di createSpjPackage");
  assert.match(api, /params\.jam\?\.trim\(\) \? \{ jam: params\.jam\.trim\(\) \}/, "jam disimpan ke sharedData");

  // Wizard Daftar Hadir bisa menyunting jam, dan cetakan memakai nilai itu.
  assert.match(wizard, /handleFormChange\("jam"/, "input jam bisa disunting per dokumen");
  assert.match(preview, /data\.jam \|\| spj\.sharedData\?\.jam/, "cetakan memakai jam paket sebagai cadangan");
});

test("dashboard: SPJ dimuat 5 per halaman dengan limit server", async () => {
  const fs = await import("node:fs/promises");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");
  const dash = await fs.readFile(new URL("../src/components/Dashboard.tsx", import.meta.url), "utf8");
  const indexes = JSON.parse(
    await fs.readFile(new URL("../firestore.indexes.json", import.meta.url), "utf8")
  );
  const firebase = JSON.parse(
    await fs.readFile(new URL("../firebase.json", import.meta.url), "utf8")
  );

  // Query dibatasi di server, bukan mengambil seluruh koleksi.
  assert.match(api, /export const getRecentSpjPage/);
  assert.match(api, /limit\(pageSize \+ 1\)/, "query dibatasi limit");
  assert.match(api, /startAfter\(opts\.after\)/, "paginasi memakai cursor, bukan offset");
  assert.match(api, /pageSize \|\| 5/, "ukuran halaman default 5");

  // Dashboard memakai 5 per halaman dan punya navigasi.
  assert.match(dash, /const PER_HALAMAN = 5/);
  assert.match(dash, /getRecentSpjPage\(user/);
  assert.match(dash, /Halaman \{recentPage \+ 1\}/);
  assert.match(dash, /recentHasMore/);

  // Index komposit untuk filter jawatan + urutan terbaru.
  assert.equal(indexes.indexes[0].collectionGroup, "spj");
  assert.deepEqual(
    indexes.indexes[0].fields.map((f) => f.fieldPath),
    ["jawatanId", "createdAt"]
  );
  assert.equal(firebase.firestore.indexes, "firestore.indexes.json");
});

test("finalisasi: boleh berapa pun persen dengan notifikasi alasan", async () => {
  const fs = await import("node:fs/promises");
  const wizard = await fs.readFile(new URL("../src/components/SpjWizard.tsx", import.meta.url), "utf8");
  const api = await fs.readFile(new URL("../src/services/api.ts", import.meta.url), "utf8");

  // Tombol tidak lagi dinonaktifkan saat progres < 100.
  assert.doesNotMatch(
    wizard,
    /onClick=\{handleFinalize\}\s+disabled=\{spj\.progress < 100\}/,
    "tombol Finalisasi tidak boleh dinonaktifkan karena progres"
  );
  assert.doesNotMatch(
    wizard,
    /Seluruh dokumen wajib harus berstatus SELESAI sebelum finalisasi/,
    "blokir finalisasi < 100% harus dihapus"
  );

  // Saat < 100%, pengguna diberi tahu dokumen wajib yang belum selesai.
  assert.match(wizard, /if \(spj\.progress < 100\)/, "ada cabang notifikasi < 100%");
  assert.match(wizard, /Dokumen wajib yang belum selesai/, "rincian dokumen yang belum selesai");
  assert.match(wizard, /Anda TETAP dapat memfinalisasi sekarang/, "penegasan tetap boleh finalisasi");
  assert.match(wizard, /Lanjutkan finalisasi\?/, "konfirmasi lanjut");

  // API tetap mau memfinalisasi tanpa memeriksa progres.
  assert.match(api, /export const finalizeSpj = async/);
  assert.doesNotMatch(
    api,
    /finalizeSpj[\s\S]{0,400}progress < 100/,
    "API finalize tidak boleh menolak progres < 100"
  );
});

test("multi tanggal: hapus semua tanggal sekaligus dari header batch", async () => {
  const fs = await import("node:fs/promises");
  const list = await fs.readFile(new URL("../src/components/SpjList.tsx", import.meta.url), "utf8");

  assert.match(list, /const \[deleteBatchId, setDeleteBatchId\]/);
  assert.match(list, /const \[deletingBatch, setDeletingBatch\]/);
  assert.match(list, /const handleDeleteBatch = async/, "handler hapus batch tersedia");
  assert.match(list, /spjs\.filter\(\(s\) => s\.batchId === deleteBatchId\)/, "anggota batch dipilih");
  assert.match(list, /for \(const s of items\)[\s\S]{0,200}await deleteSpj\(s\.id, user\)/, "hapus berurutan");
  assert.match(list, /setDeleteBatchId\(spj\.batchId as string\)/, "tombol memakai batchId");
  assert.match(list, /Hapus semua/, "label tombol hapus semua");
  assert.match(list, /Hapus Semua Tanggal/, "judul modal konfirmasi");
});

test("daftar SPJ: 5 per halaman, sama dengan dashboard", async () => {
  const fs = await import("node:fs/promises");
  const list = await fs.readFile(new URL("../src/components/SpjList.tsx", import.meta.url), "utf8");
  const dash = await fs.readFile(new URL("../src/components/Dashboard.tsx", import.meta.url), "utf8");

  assert.match(list, /const PAGE_SIZE = 5;/, "daftar SPJ 5 per halaman");
  assert.doesNotMatch(list, /const PAGE_SIZE = 15;/, "ukuran lama 15 harus diganti");
  assert.match(dash, /const PER_HALAMAN = 5;/, "dashboard tetap 5 per halaman");
  // Jumlah di footer mengikuti hasil filter, bukan seluruh data.
  assert.match(list, /dari \{spjsTersaring\.length\} SPJ/);
});
