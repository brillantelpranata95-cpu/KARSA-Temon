import assert from "node:assert/strict";
import test from "node:test";
import { loadTsModule } from "./_loadTs.mjs";

const loadCurrency = () =>
  loadTsModule("../src/utils/currencyInput.ts", ["formatThousands", "parseThousands"]);

test("isian rupiah: pemisah ribuan muncul saat mengetik", async () => {
  const { formatThousands } = await loadCurrency();

  assert.equal(formatThousands(0), "0");
  assert.equal(formatThousands(1500), "1.500");
  assert.equal(formatThousands(1500000), "1.500.000");
  assert.equal(formatThousands("1500000"), "1.500.000");
  assert.equal(formatThousands("1.500.000"), "1.500.000");
  assert.equal(formatThousands(1234567890), "1.234.567.890");
});

test("isian rupiah: kosong dan nilai aneh tidak menghasilkan NaN", async () => {
  const { formatThousands, parseThousands } = await loadCurrency();

  for (const input of ["", null, undefined, "abc"]) {
    assert.equal(formatThousands(input), "", `format ${String(input)} harus kosong`);
  }
  assert.equal(formatThousands(Number.NaN), "");

  assert.equal(parseThousands(""), "");
  assert.equal(parseThousands("   "), "");
  assert.equal(parseThousands("abc"), "");
});

test("isian rupiah: teks berformat dibaca kembali sebagai angka murni", async () => {
  const { parseThousands } = await loadCurrency();

  assert.equal(parseThousands("1.500.000"), 1500000);
  assert.equal(parseThousands("Rp 1.500.000"), 1500000);
  assert.equal(parseThousands("1500000"), 1500000);
  assert.equal(parseThousands("0"), 0);
  // Nol tetap 0 (bukan ""), agar pengguna bisa mengetik angka yang diawali 0.
  assert.equal(parseThousands("000"), 0);
});
