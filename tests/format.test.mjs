import assert from "node:assert/strict";
import test from "node:test";
import { loadTsModule } from "./_loadTs.mjs";

const loadFormat = () =>
  loadTsModule("../src/utils/format.ts", ["toTitleCase", "terbilangRupiah"]);

const loadDate = () =>
  loadTsModule("../src/utils/date.ts", ["getNamaHariCapitalized", "getNamaHari"]);

test("toTitleCase: kapital di setiap awal kata (khusus tagging Bend 26)", async () => {
  const { toTitleCase } = await loadFormat();

  assert.equal(toTitleCase("RAPAT KOORDINASI PENTAS SENI"), "Rapat Koordinasi Pentas Seni");
  assert.equal(toTitleCase("rapat koordinasi"), "Rapat Koordinasi");
  // Tanda hubung dan garis miring juga memulai kata baru.
  assert.equal(toTitleCase("rapat tindak-lanjut"), "Rapat Tindak-Lanjut");
  assert.equal(toTitleCase("monitoring/evaluasi"), "Monitoring/Evaluasi");
  // Nilai kosong tidak menghasilkan error.
  assert.equal(toTitleCase(""), "");
  assert.equal(toTitleCase(null), "");
  assert.equal(toTitleCase(undefined), "");
});

test("terbilang: tidak terpengaruh perubahan title case", async () => {
  const { terbilangRupiah } = await loadFormat();
  assert.equal(terbilangRupiah(1_000_000), "satu juta rupiah");
  assert.equal(terbilangRupiah(0), "nol rupiah");
});

test("nama hari di dalam tanggal selalu KAPITAL", async () => {
  const { getNamaHariCapitalized, getNamaHari } = await loadDate();

  // 21 September 2026 adalah hari Senin.
  assert.equal(getNamaHariCapitalized("21-09-2026"), "SENIN");
  assert.equal(getNamaHari("21-09-2026"), "SENIN");

  // Semua hari dalam seminggu harus kapital penuh (bukan "Senin", "Rabu", dst).
  const week = ["20-09-2026", "21-09-2026", "22-09-2026", "23-09-2026", "24-09-2026", "25-09-2026", "26-09-2026"];
  for (const d of week) {
    const nama = getNamaHariCapitalized(d);
    assert.equal(nama, nama.toUpperCase(), `${d} harus kapital penuh, dapat: ${nama}`);
  }

  // Nilai tidak valid tetap kapital.
  assert.equal(getNamaHariCapitalized(""), "RABU");
  assert.equal(getNamaHariCapitalized(null), "RABU");
});
