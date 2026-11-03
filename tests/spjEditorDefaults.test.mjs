import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const readWizard = () =>
  readFile(new URL("../src/components/SpjWizard.tsx", import.meta.url), "utf8");

test("Bend 26: isian nominal memakai pemisah ribuan live", async () => {
  const source = await readWizard();

  assert.match(source, /import \{ RupiahInput \} from "\.\/RupiahInput"/);
  assert.match(source, /<RupiahInput[\s\S]*?ariaLabel="Nominal Bend 26"/);
  // Nominal utama tidak boleh kembali menjadi input angka mentah.
  assert.doesNotMatch(source, /type="number"\s+min="0"\s+value=\{formData\.nominal/);
  // PHR/PPh/PPN juga nominal — ikut memakai format ribuan.
  assert.match(source, /ariaLabel=\{`\$\{label\} Bend 26`\}/);
});

test("Formulir Aktivitas Lapangan: tanggal pelaksanaan otomatis dari tanggal SPJ", async () => {
  const source = await readWizard();

  assert.match(source, /next\.tanggalPelaksanaan = tanggalSpj \|\| ""/);
  assert.match(
    source,
    /withDocDefaults\(docs\[0\], docs\[0\]\.data \|\| \{\}, s\?\.sharedData, s\?\.tanggal\)/
  );
  assert.match(
    source,
    /withDocDefaults\(docItem, docItem\.data \|\| \{\}, spj\?\.sharedData, spj\?\.tanggal\)/
  );
  // Tetap bisa disunting: input tanggal masih terhubung ke formData.
  assert.match(source, /onChange=\{\(e\) => handleFormChange\("tanggalPelaksanaan", e\.target\.value\)\}/);
});
