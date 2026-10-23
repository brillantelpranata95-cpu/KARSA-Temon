import assert from "node:assert/strict";
import test from "node:test";
import { loadTsModule } from "./_loadTs.mjs";

const loadPaper = () =>
  loadTsModule("../src/utils/paper.ts", [
    "paperImpact",
    "formatGram",
    "formatTreeShare",
    "sheetsForPrint",
    "GRAM_PER_SHEET",
    "SHEETS_PER_TREE",
  ]);

test("rapor kertas: lembar → gram → porsi pohon memakai angka konservatif", async () => {
  const { paperImpact, GRAM_PER_SHEET, SHEETS_PER_TREE } = await loadPaper();

  assert.equal(GRAM_PER_SHEET, 5, "1 lembar A4 80 gsm ≈ 5 gram");
  assert.equal(SHEETS_PER_TREE, 8000, "1 pohon ≈ 8.000 lembar (batas bawah)");

  const hasil = paperImpact(20);
  assert.equal(hasil.sheets, 20);
  assert.equal(hasil.grams, 100);
  assert.equal(hasil.treeShare, 20 / 8000);
});

test("rapor kertas: masukan aneh tidak menghasilkan NaN", async () => {
  const { paperImpact } = await loadPaper();

  for (const input of [0, "", null, undefined, "abc", NaN, -7]) {
    const hasil = paperImpact(input);
    assert.equal(hasil.sheets, 0, `lembar untuk ${String(input)} harus 0`);
    assert.equal(hasil.grams, 0);
    assert.equal(hasil.treeShare, 0);
  }

  // Angka desimal dari Firestore tetap dibulatkan ke bawah (tidak ada setengah lembar).
  assert.equal(paperImpact(3.9).sheets, 3);
});

test("rapor kertas: format gram & persen enak dibaca, bukan angka mentah", async () => {
  const { formatGram, formatTreeShare } = await loadPaper();

  assert.equal(formatGram(70), "70 gram");
  assert.equal(formatGram(1000), "1 kg");
  assert.equal(formatGram(1250), "1,3 kg");

  assert.equal(formatTreeShare(0), "0%");
  assert.equal(formatTreeShare(20 / 8000), "0,25%");
  // 1 lembar dari 8.000 = 0,0125% → tampil "0,01%", bukan "<0,01%" (itu bukan nol).
  assert.equal(formatTreeShare(1 / 8000), "0,01%");
  assert.equal(formatTreeShare(1 / 100000), "<0,01%", "nilai yang akan tampil 0,00% ditulis <0,01%");
  assert.equal(formatTreeShare(0.5), "50%");
});

test("rapor kertas: satu kali cetak dihitung satu lembar (batas bawah)", async () => {
  const { sheetsForPrint } = await loadPaper();
  assert.equal(sheetsForPrint(), 1);
});
