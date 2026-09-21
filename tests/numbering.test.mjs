import assert from "node:assert/strict";
import test from "node:test";
import { loadTsModule } from "./_loadTs.mjs";

const loadNumbering = () => loadTsModule("../src/utils/numbering.ts", ["applyNumberedEnter"]);

/** Posisi kursor di akhir teks — kasus paling umum saat menekan Enter. */
const atEnd = (text) => text.length;

test("kesimpulan: Enter di kolom kosong TIDAK memunculkan nomor", async () => {
  const { applyNumberedEnter } = await loadNumbering();

  // Inilah keluhan aslinya: klik pertama di kolom kosong lalu Enter langsung
  // menghasilkan "1. " yang tidak diminta. Sekarang Enter diserahkan ke
  // perilaku bawaan textarea.
  const empty = applyNumberedEnter("", 0);
  assert.equal(empty.handled, false, "kolom kosong tidak boleh ditangani");
  assert.equal(empty.value, "", "nilai tidak boleh berubah");

  // Baris baru kosong (mis. hasil Enter biasa) juga tidak memicu nomor.
  const blankLine = applyNumberedEnter("Kegiatan dibuka\n", atEnd("Kegiatan dibuka\n"));
  assert.equal(blankLine.handled, false, "baris kosong tanpa nomor tidak ditangani");
  assert.equal(blankLine.value, "Kegiatan dibuka\n");

  // Teks biasa tanpa nomor tidak dipaksa bernomor.
  const plain = applyNumberedEnter("Kegiatan berjalan lancar", atEnd("Kegiatan berjalan lancar"));
  assert.equal(plain.handled, false, "baris tanpa nomor tidak ditangani");
});

test("kesimpulan: Enter melanjutkan nomor dari baris yang sudah bernomor", async () => {
  const { applyNumberedEnter } = await loadNumbering();

  const first = "1. Kegiatan dibuka";
  const r1 = applyNumberedEnter(first, atEnd(first));
  assert.equal(r1.handled, true);
  assert.equal(r1.value, "1. Kegiatan dibuka\n2. ");
  assert.equal(r1.caret, r1.value.length, "kursor harus di akhir nomor baru");

  // Melanjutkan dari nomor berapa pun, bukan hanya 1.
  const third = "1. A\n2. B\n3. C";
  const r3 = applyNumberedEnter(third, atEnd(third));
  assert.equal(r3.value, "1. A\n2. B\n3. C\n4. ");
  assert.equal(r3.caret, r3.value.length);

  // Indentasi baris dipertahankan.
  const indented = "  1. A";
  const ri = applyNumberedEnter(indented, atEnd(indented));
  assert.equal(ri.value, "  1. A\n  2. ");
});

test("kesimpulan: nomor menggantung tanpa isi dikeluarkan dari daftar", async () => {
  const { applyNumberedEnter } = await loadNumbering();

  // "2. " tanpa teks: sebelumnya Enter tidak melakukan apa pun (buntu).
  // Sekarang nomor menggantung dibuang supaya tidak ikut tercetak.
  const dangling = "1. A\n2. ";
  const rd = applyNumberedEnter(dangling, atEnd(dangling));
  assert.equal(rd.handled, true);
  assert.equal(rd.value, "1. A\n");
  assert.equal(rd.caret, 5, "kursor pindah ke awal baris yang dibersihkan");

  // Nomor menggantung di tengah teks: sisa teks tetap utuh.
  const middle = "1. A\n2. \n3. B";
  const caret = "1. A\n2. ".length;
  const rm = applyNumberedEnter(middle, caret);
  assert.equal(rm.handled, true);
  assert.equal(rm.value, "1. A\n\n3. B");
});

test("kesimpulan: Enter menyisipkan di posisi kursor, bukan hanya di akhir", async () => {
  const { applyNumberedEnter } = await loadNumbering();

  // Kursor di tengah baris bernomor: "1. K|egiatan".
  const result = applyNumberedEnter("1. Kegiatan", "1. K".length);
  assert.equal(result.handled, true);
  assert.equal(result.value, "1. K\n2. egiatan");
  assert.equal(result.caret, "1. K\n2. ".length);
});
