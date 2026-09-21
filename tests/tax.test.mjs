import assert from "node:assert/strict";
import test from "node:test";
import { loadTsModule } from "./_loadTs.mjs";

const loadTax = () =>
  loadTsModule("../src/utils/tax.ts", [
    "calculateBend26Tax",
    "PHR_RATE",
    "PPH_RATE",
    "PPN_RATE",
  ]);

test("pajak Bend 26: PHR 8%, PPh 2% dari (nominal - PHR), PPN 11% dari nominal", async () => {
  const { calculateBend26Tax, PHR_RATE, PPH_RATE, PPN_RATE } = await loadTax();

  assert.equal(PHR_RATE, 0.08);
  assert.equal(PPH_RATE, 0.02);
  assert.equal(PPN_RATE, 0.11);

  // Nominal 1.000.000 → PHR 80.000, PPh 2% × 920.000 = 18.400, PPN 110.000
  const result = calculateBend26Tax(1_000_000);
  assert.equal(result.phr, 80_000);
  assert.equal(result.pph, 18_400);
  assert.equal(result.ppn, 110_000);
  assert.equal(result.total, 208_400);

  // PPh dihitung dari nominal SETELAH dikurangi PHR, bukan dari nominal penuh
  assert.equal(result.pph, Math.round((1_000_000 - result.phr) * PPH_RATE));
  assert.notEqual(result.pph, Math.round(1_000_000 * PPH_RATE));
});

test("pajak Bend 26: nilai kosong / tidak valid menghasilkan nol (bukan NaN)", async () => {
  const { calculateBend26Tax } = await loadTax();

  for (const input of [0, "", null, undefined, "abc", NaN, -5000]) {
    const result = calculateBend26Tax(input);
    assert.equal(result.nominal, 0, `nominal untuk ${String(input)} harus 0`);
    assert.equal(result.phr, 0);
    assert.equal(result.pph, 0);
    assert.equal(result.ppn, 0);
    assert.equal(result.total, 0);
  }
});

test("pajak Bend 26: hasil dibulatkan ke rupiah penuh", async () => {
  const { calculateBend26Tax } = await loadTax();

  const result = calculateBend26Tax(1_234_567);
  for (const key of ["phr", "pph", "ppn"]) {
    assert.ok(Number.isInteger(result[key]), `${key} harus bilangan bulat`);
  }
  assert.equal(result.phr, Math.round(1_234_567 * 0.08));
});

test("pajak Bend 26: total adalah jumlah ketiga komponen", async () => {
  const { calculateBend26Tax } = await loadTax();

  const r = calculateBend26Tax(2_500_000);
  assert.equal(r.total, r.phr + r.pph + r.ppn);
});
