import { readFile } from "node:fs/promises";
import ts from "typescript";

/**
 * Muat modul TypeScript murni (tanpa impor) untuk pengujian.
 *
 * Test runner berjalan tanpa langkah build, jadi berkas .ts ditranspilasi
 * memakai TypeScript compiler yang sudah tersedia sebagai devDependency —
 * jauh lebih andal daripada menghapus anotasi tipe dengan regex.
 */
export const loadTsModule = async (relativePath, exportNames) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  const mod = await import(moduleUrl);
  const picked = {};
  for (const name of exportNames) picked[name] = mod[name];
  return picked;
};
