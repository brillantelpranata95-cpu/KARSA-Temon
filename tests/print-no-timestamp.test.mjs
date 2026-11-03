import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Aturan proyek: dokumen cetak tidak boleh menampilkan timestamp waktu cetak.
 *
 * Tanggal kegiatan, jam pelaksanaan, dan nama pencetak tetap boleh. Yang
 * dilarang adalah label yang menampilkan waktu berjalan saat dokumen dicetak,
 * mis. "Tanggal cetak: ...", "Dicetak pada ...", atau "Printed at ...".
 *
 * Test ini menjaga agar aturan tersebut tidak hilang saat ada desain dokumen
 * baru di masa depan.
 */
const SRC_DIR = fileURLToPath(new URL("../src", import.meta.url));

const FORBIDDEN_PATTERNS = [
  /Tanggal\s+cetak/i,
  /Waktu\s+cetak/i,
  /Jam\s+cetak/i,
  // "Dicetak pada Senin, 3 November" / "Dicetak tgl 03/11/2026",
  // tetapi bukan kalimat seperti "ditarik dan dicetak pada lembar Lampiran Foto".
  /Dicetak\s+(pada|tanggal|tgl)\s*[:\-]/i,
  /Dicetak\s+(pada|tanggal|tgl)\s+\d{1,2}[\/\-.]\d/i,
  /Printed\s+(at|on|date)\s*[:]/i,
];

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

const collectSourceFiles = async (dir) => {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...(await collectSourceFiles(path.join(dir, entry.name))));
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(path.join(dir, entry.name));
  }
  return files;
};

test("dokumen cetak tidak memuat timestamp waktu cetak", async () => {
  const files = await collectSourceFiles(SRC_DIR);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // abaikan komentar penjelas
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          violations.push(`${path.relative(SRC_DIR, file)}:${index + 1} → ${line.trim()}`);
        }
      }
    });
  }

  assert.deepEqual(
    violations,
    [],
    `Dilarang menampilkan timestamp waktu cetak di dokumen cetak.\n` +
      `Gunakan tanggal kegiatan/dokumen, atau hapus metadatanya:\n${violations.join("\n")}`
  );
});
