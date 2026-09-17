import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("application mounts inside AuthProvider so auth loading can resolve", async () => {
  const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
  assert.match(source, /<AuthProvider>[\s\S]*<App\s*\/>[\s\S]*<\/AuthProvider>/);
});
