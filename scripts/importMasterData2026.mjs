/**
 * Import master data resmi (Sub-Kegiatan + Kode Rekening) dari
 * "BUKU BANTU TAHUN 2026 - SEPTEMBER" ke Firestore KARSA Temon.
 *
 * Sumber  : src/data/masterData2026.json (hasil ekstraksi PDF)
 * Target  : koleksi "kegiatan" & "kodeRekening" (project karsa-temon)
 *
 * Sifat   : IDEMPOTEN — aman dijalankan berulang.
 *           · Dokumen lama yang cocok diperbarui kodenya (di tempat, ID dipertahankan
 *             agar referensi SPJ/checklistConfig tetap valid).
 *           · jawatanId TIDAK PERNAH ditimpa, supaya pembagian jawatan manual aman.
 *
 * Jalankan: node scripts/importMasterData2026.mjs
 */
import fs from "fs";
import os from "os";
import path from "path";

const PROJECT = "karsa-temon";
const YEAR = 2026;

// ---- Token dari Firebase CLI ----
const cfgPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const token = cfg.tokens?.access_token;
if (!token) {
  console.error("Token Firebase CLI tidak ditemukan. Jalankan: npx firebase projects:list");
  process.exit(1);
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// ---- Sumber data ----
const dataPath = path.resolve("src/data/masterData2026.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// ---- Pemetaan dokumen lama -> kode resmi (diperbarui di tempat) ----
// Kegiatan: ID lama dipertahankan agar referensi apa pun tidak putus.
const LEGACY_KEGIATAN = {
  "keg-sinergi": "7.01.2.2.01.1",
  "keg-efektivitas": "7.01.2.2.01.2",
  "keg-1789703725368": "7.01.6.2.01.17",
};
// Rekening: ID lama dipertahankan karena direferensikan checklistConfigs.
const LEGACY_REKENING = {
  "rek-mamin-rapat": "5.1.02.01.001.00052",
  "rek-mamin-lapangan": "5.1.02.01.001.00058",
};

// ---- Helper REST ----
// Nilai Firestore mentah (mis. {timestampValue: ...}) diteruskan apa adanya;
// nilai JS biasa dikonversi ke tipe Firestore yang sesuai.
const RAW_KEYS = new Set([
  "stringValue", "integerValue", "doubleValue", "booleanValue",
  "timestampValue", "nullValue", "mapValue", "arrayValue", "referenceValue",
]);
const isRaw = (v) => v && typeof v === "object" && Object.keys(v).length === 1 && RAW_KEYS.has(Object.keys(v)[0]);

const fsValue = (v) => {
  if (isRaw(v)) return v;
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") return { integerValue: String(v) };
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
};
const fsFields = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = fsValue(v);
  return out;
};
const nowIso = () => new Date().toISOString();

const docId = (prefix, kode) => `${prefix}-${YEAR}-${kode}`;

/** PATCH membuat/mengganti dokumen; updateMask membatasi field yang ditulis. */
const patch = async (col, id, fields, updateMask) => {
  const mask = (updateMask || Object.keys(fields))
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");
  const url = `${BASE}/${col}/${encodeURIComponent(id)}?${mask}&access_token=${token}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: fsFields(fields) }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH ${col}/${id} gagal (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
};

const list = async (col) => {
  const res = await fetch(`${BASE}/${col}?pageSize=300&access_token=${token}`);
  const json = await res.json();
  if (json.error) throw new Error(`GET ${col}: ${json.error.message}`);
  return json.documents || [];
};
const codeOf = (doc, field) => doc.fields?.[field]?.stringValue || "";

const run = async () => {
  const ts = nowIso();
  let kegCreated = 0, kegUpdated = 0, rekCreated = 0, rekUpdated = 0;

  // ================= SUB-KEGIATAN =================
  const existingKeg = await list("kegiatan");
  const kegByCode = new Map(existingKeg.map((d) => [codeOf(d, "kodeKegiatan"), d.name.split("/").pop()]));

  for (const s of data.kodeSubKegiatan) {
    // Dokumen lama yang kodenya diperbaiki?
    const legacyId = Object.keys(LEGACY_KEGIATAN).find((id) => LEGACY_KEGIATAN[id] === s.kode);
    const existingId = legacyId || kegByCode.get(s.kode);

    if (existingId) {
      // Perbarui hanya field kode/nama/tahun/status — jawatanId DIBIARKAN apa adanya.
      await patch("kegiatan", existingId, {
        kodeKegiatan: s.kode,
        namaKegiatan: s.nama,
        tahunAnggaran: YEAR,
        status: "ACTIVE",
        updatedAt: { timestampValue: ts },
      }, ["kodeKegiatan", "namaKegiatan", "tahunAnggaran", "status", "updatedAt"]);
      kegUpdated++;
      console.log(`  ↻ kegiatan ${existingId}  ${s.kode}`);
    } else {
      const id = docId("keg", s.kode);
      await patch("kegiatan", id, {
        id,
        kodeKegiatan: s.kode,
        namaKegiatan: s.nama,
        jawatanId: "", // kosong — admin menautkan jawatan secara manual
        tahunAnggaran: YEAR,
        status: "ACTIVE",
        createdAt: { timestampValue: ts },
        updatedAt: { timestampValue: ts },
      });
      kegCreated++;
      console.log(`  + kegiatan ${id}  ${s.kode}`);
    }
  }

  // ================= KODE REKENING =================
  const existingRek = await list("kodeRekening");
  const rekByCode = new Map(existingRek.map((d) => [codeOf(d, "kode"), d.name.split("/").pop()]));

  for (const r of data.kodeRekening) {
    const legacyId = Object.keys(LEGACY_REKENING).find((id) => LEGACY_REKENING[id] === r.kode);
    const existingId = legacyId || rekByCode.get(r.kode);

    if (existingId) {
      await patch("kodeRekening", existingId, {
        kode: r.kode,
        nama: r.nama,
        kategori: r.kategoriSaran,
        tahunAnggaran: YEAR,
        isActive: true,
        status: "ACTIVE",
        updatedAt: { timestampValue: ts },
      }, ["kode", "nama", "kategori", "tahunAnggaran", "isActive", "status", "updatedAt"]);
      rekUpdated++;
    } else {
      const id = docId("rek", r.kode);
      await patch("kodeRekening", id, {
        id,
        kode: r.kode,
        nama: r.nama,
        kategori: r.kategoriSaran,
        tahunAnggaran: YEAR,
        isActive: true,
        status: "ACTIVE",
        createdAt: { timestampValue: ts },
        updatedAt: { timestampValue: ts },
      });
      rekCreated++;
    }
  }

  // ================= AUDIT LOG =================
  const auditId = `audit-import-master-${Date.now()}`;
  await patch("auditLogs", auditId, {
    actorUid: "RCPZY4IHaNQgOTPz4LaPWc7KIKI2",
    actorEmail: "temonkec@gmail.com",
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: "import-buku-bantu-2026",
    newValue:
      `Impor master data resmi BUKU BANTU 2026: ${data.kodeSubKegiatan.length} sub-kegiatan ` +
      `(${kegCreated} baru, ${kegUpdated} diperbarui) & ${data.kodeRekening.length} kode rekening ` +
      `(${rekCreated} baru, ${rekUpdated} diperbarui).`,
    reason: "Impor dari dokumen BUKU BANTU TAHUN 2026 - SEPTEMBER (Triwulan III)",
    timestamp: { timestampValue: ts },
  });

  console.log("\n================ RINGKASAN ================");
  console.log(`Sub-Kegiatan : ${kegCreated} dibuat, ${kegUpdated} diperbarui (total ${data.kodeSubKegiatan.length})`);
  console.log(`Kode Rekening: ${rekCreated} dibuat, ${rekUpdated} diperbarui (total ${data.kodeRekening.length})`);
  console.log(`Audit log    : ${auditId}`);
};

run().catch((e) => {
  console.error("\nIMPOR GAGAL:", e.message);
  process.exit(1);
});
