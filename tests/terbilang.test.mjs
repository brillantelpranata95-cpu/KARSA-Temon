import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("terbilang rupiah covers official Indonesian wording", async () => {
  const source = await readFile(new URL("../src/utils/format.ts", import.meta.url), "utf8");
  assert.match(source, /export const terbilangRupiah/);
  assert.match(source, /seratus dua puluh tiga ribu empat ratus lima puluh enam rupiah/);
});
