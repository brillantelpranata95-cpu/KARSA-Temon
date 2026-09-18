import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../config/firebase";
import { normalizeDateToDDMMYYYY, todayDDMMYYYY, getYearFromDate, parseAnyDate } from "../utils/date";
import { cachedFetch, invalidateCache } from "../utils/cache";
import {
  GamificationAction,
  UserGamificationProfile,
  ACTION_POINTS,
  emptyCounts,
  getEarnedBadges,
  badgeStatsFromProfile,
} from "../utils/gamification";
import {
  UserProfile,
  Jawatan,
  Kegiatan,
  KodeRekening,
  JenisBelanja,
  DocumentTypeItem,
  ChecklistConfig,
  SpjItem,
  SpjDocumentItem,
  AuditLogItem,
  SpjStatus,
  OfficialPerson,
  OfficialType,
  PackageTemplate
} from "../types";

// Helper for Firestore data sanitization (removes undefined)
export const sanitizeData = <T extends Record<string, any>>(obj: T): T => {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizeData(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result as T;
};

// ------------------- SEED MASTER DATA -------------------
export const seedMasterDataIfEmpty = async () => {
  try {
    const jawatanSnap = await getDocs(collection(db, "jawatan"));
    if (jawatanSnap.empty) {
      console.log("Seeding master data...");

      // 1. Jawatan
      const jawatanList: Jawatan[] = [
        { id: "jawatan-sosial", kode: "JTN-SOS", nama: "Jawatan Sosial", description: "Jawatan Sosial Kapanewon Temon", isActive: true },
        { id: "jawatan-praja", kode: "JTN-PRJ", nama: "Jawatan Praja", description: "Jawatan Praja Kapanewon Temon", isActive: true },
        { id: "jawatan-kemakmuran", kode: "JTN-KMR", nama: "Jawatan Kemakmuran", description: "Jawatan Kemakmuran Kapanewon Temon", isActive: true },
        { id: "jawatan-pelayanan", kode: "JTN-PLN", nama: "Jawatan Pelayanan Umum", description: "Jawatan Pelayanan Kapanewon Temon", isActive: true }
      ];

      for (const j of jawatanList) {
        await setDoc(doc(db, "jawatan", j.id), sanitizeData({ ...j, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      }

      // 2. Kegiatan
      const kegiatanList: Kegiatan[] = [
        {
          id: "keg-efektivitas",
          kodeKegiatan: "7.01.02.2.01.0002",
          namaKegiatan: "Peningkatan Efektivitas Kegiatan Pemerintahan di Tingkat Kecamatan",
          jawatanId: "jawatan-sosial",
          tahunAnggaran: 2026,
          status: "ACTIVE"
        },
        {
          id: "keg-sinergi",
          kodeKegiatan: "7.01.02.2.01.0001",
          namaKegiatan: "Koordinasi/Sinergi Perencanaan dan Pelaksanaan Kegiatan Pemerintah dengan Perangkat Daerah dan Instansi Vertikal Terkait",
          jawatanId: "jawatan-sosial",
          tahunAnggaran: 2026,
          status: "ACTIVE"
        },
        {
          id: "keg-dais",
          kodeKegiatan: "2.22.08.5.07.0006",
          namaKegiatan: "Adat, Seni, Tradisi, dan Lembaga Budaya — Gelar Budaya Jogja",
          jawatanId: "jawatan-sosial",
          tahunAnggaran: 2026,
          status: "ACTIVE"
        }
      ];

      for (const k of kegiatanList) {
        await setDoc(doc(db, "kegiatan", k.id), sanitizeData({ ...k, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      }

      // 3. Kode Rekening
      const rekList: KodeRekening[] = [
        {
          id: "rek-mamin-rapat",
          kode: "5.1.02.02.004.00052",
          nama: "Belanja Makanan dan Minuman Rapat",
          tahunAnggaran: 2026,
          kategori: "MAKAN_MINUM",
          isActive: true
        },
        {
          id: "rek-mamin-lapangan",
          kode: "5.1.02.01.001.00058",
          nama: "Belanja Makanan dan Minuman Aktivitas Lapangan",
          tahunAnggaran: 2026,
          kategori: "MAKAN_MINUM",
          isActive: true
        },
        {
          id: "rek-honor-seniman",
          kode: "5.1.02.02.01.0025",
          nama: "Belanja Jasa Penyelenggaraan Acara Group Kesenian",
          tahunAnggaran: 2026,
          kategori: "HONOR",
          isActive: true
        }
      ];

      for (const r of rekList) {
        await setDoc(doc(db, "kodeRekening", r.id), sanitizeData({ ...r, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      }

      // 4. Document Type
      const docTypeList: DocumentTypeItem[] = [
        { id: "doctype-bend26", code: "BEND_26", name: "Bend 26 (Bukti Kas Pengeluaran)", description: "Kuitansi Bukti Kas Pengeluaran Keuangan", category: "FINANCIAL", isActive: true },
        { id: "doctype-undangan", code: "SURAT_UNDANGAN", name: "Surat Undangan", description: "Surat Undangan Rapat / URL Google Drive", category: "ADMINISTRATIVE", isActive: true },
        { id: "doctype-daftarhadir", code: "DAFTAR_HADIR", name: "Daftar Hadir", description: "Daftar Hadir Peserta Rapat / Acara", category: "ADMINISTRATIVE", isActive: true },
        { id: "doctype-notulen", code: "NOTULENSI_RAPAT", name: "Notulen Rapat", description: "Notulensi Rapat Koordinasi", category: "REPORT", isActive: true },
        { id: "doctype-lap-lapangan", code: "SPJ_AKTIVITAS_LAPANGAN", name: "Laporan Aktivitas Lapangan", description: "Laporan Hasil Pelaksanaan Tugas Lapangan", category: "REPORT", isActive: true },
        { id: "doctype-suratperintah", code: "SURAT_PERINTAH", name: "Surat Perintah", description: "Surat Perintah Tugas / URL Google Drive", category: "ADMINISTRATIVE", isActive: true }
      ];

      for (const dt of docTypeList) {
        await setDoc(doc(db, "documentTypes", dt.id), sanitizeData({ ...dt, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      }

      // 5. Checklist Config (keyed by Kode Rekening — Jenis Belanja removed)
      const checklistList: ChecklistConfig[] = [
        {
          id: "config-rapat",
          kodeRekeningId: "rek-mamin-rapat",
          tahunAnggaran: 2026,
          version: 2,
          isActive: true,
          documents: [
            { documentTypeId: "doctype-bend26", required: true, order: 1 },
            { documentTypeId: "doctype-undangan", required: true, order: 2 },
            { documentTypeId: "doctype-daftarhadir", required: true, order: 3 },
            { documentTypeId: "doctype-notulen", required: true, order: 4 }
          ]
        },
        {
          id: "config-lapangan",
          kodeRekeningId: "rek-mamin-lapangan",
          tahunAnggaran: 2026,
          version: 2,
          isActive: true,
          documents: [
            { documentTypeId: "doctype-suratperintah", required: true, order: 1 },
            { documentTypeId: "doctype-bend26", required: true, order: 2 },
            { documentTypeId: "doctype-lap-lapangan", required: true, order: 3 }
          ]
        },
        {
          id: "config-honor",
          kodeRekeningId: "rek-honor-seniman",
          tahunAnggaran: 2026,
          version: 2,
          isActive: true,
          documents: [
            { documentTypeId: "doctype-bend26", required: true, order: 1 },
            { documentTypeId: "doctype-undangan", required: false, order: 2 },
            { documentTypeId: "doctype-daftarhadir", required: true, order: 3 }
          ]
        }
      ];

      for (const c of checklistList) {
        await setDoc(doc(db, "checklistConfigs", c.id), sanitizeData({ ...c, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      }

      console.log("Master data seeded successfully!");
    }
  } catch (err) {
    console.error("Error seeding master data:", err);
  }
};

// ------------------- AUDIT LOG -------------------
export const logAudit = async (log: Omit<AuditLogItem, "timestamp">) => {
  try {
    await addDoc(collection(db, "auditLogs"), sanitizeData({
      ...log,
      timestamp: serverTimestamp()
    }));
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
};

// ------------------- USER SERVICE -------------------
export const getOrCreateUserProfile = async (authUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }): Promise<UserProfile> => {
  const userRef = doc(db, "users", authUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    const isBootstrapAdmin = authUser.email?.toLowerCase() === "temonkec@gmail.com";
    const bootstrapPatch = isBootstrapAdmin && (data.role !== "ADMIN" || data.jawatanId !== "kapanewon-temon")
      ? { role: "ADMIN" as const, jawatanId: "kapanewon-temon", jawatanName: "Administrasi Kapanewon Temon", isActive: true }
      : {};
    await updateDoc(userRef, { ...bootstrapPatch, lastLoginAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { ...data, ...bootstrapPatch };
  }

  // The Kapanewon account is the sole bootstrap administrator; every other account
  // remains unassigned until that administrator sets its jawatan and access.
  const isBootstrapAdmin = authUser.email?.toLowerCase() === "temonkec@gmail.com";
  const newUser: UserProfile = {
    uid: authUser.uid,
    email: authUser.email || "",
    displayName: authUser.displayName || authUser.email || "Pengguna KARSA",
    photoURL: authUser.photoURL,
    role: isBootstrapAdmin ? "ADMIN" : "USER",
    jawatanId: isBootstrapAdmin ? "kapanewon-temon" : "unassigned",
    jawatanName: isBootstrapAdmin ? "Administrasi Kapanewon Temon" : "Belum ditetapkan",
    isActive: isBootstrapAdmin,
  };

  await setDoc(userRef, sanitizeData({
    ...newUser,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  }));

  await logAudit({
    actorUid: authUser.uid,
    actorEmail: authUser.email || "",
    action: "LOGIN",
    entityType: "USER",
    entityId: authUser.uid,
    newValue: { role: newUser.role, jawatanId: newUser.jawatanId }
  });

  return newUser;
};

// Admin Create User directly
export const adminCreateUser = async (data: {
  email: string;
  displayName: string;
  role: "ADMIN" | "USER";
  jawatanId: string;
  jawatanName: string;
}, actor: UserProfile) => {
  const customUid = `user-${Date.now()}`;
  const userRef = doc(db, "users", customUid);
  const newUser: UserProfile = {
    uid: customUid,
    email: data.email.trim().toLowerCase(),
    displayName: data.displayName.trim() || data.email,
    photoURL: null,
    role: data.role,
    jawatanId: data.jawatanId,
    jawatanName: data.jawatanName,
    isActive: true,
  };

  await setDoc(userRef, sanitizeData({
    ...newUser,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));

  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "UPDATE_USER_ACCESS",
    entityType: "USER",
    entityId: customUid,
    newValue: newUser
  });

  return customUid;
};

// ------------------- MASTER DATA FETCHERS & MANAGERS -------------------
// Master data is cached in-memory (15-min TTL) — see utils/cache.ts.
// Invalidation happens automatically on every write below.
export const getJawatanList = async (): Promise<Jawatan[]> => {
  return cachedFetch("jawatan:all", async () => {
    const snap = await getDocs(collection(db, "jawatan"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Jawatan));
  });
};

export const getKegiatanList = async (jawatanId?: string, includePending = false): Promise<Kegiatan[]> => {
  const key = `kegiatan:${jawatanId || "all"}:${includePending ? "pending" : "active"}`;
  return cachedFetch(key, async () => {
    const snap = await getDocs(collection(db, "kegiatan"));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Kegiatan));
    if (jawatanId) {
      list = list.filter(k => k.jawatanId === jawatanId);
    }
    if (!includePending) {
      list = list.filter(k => k.status === "ACTIVE" || !k.status);
    }
    return list;
  });
};

export const getKodeRekeningList = async (includePending = false): Promise<KodeRekening[]> => {
  const key = `kodeRekening:${includePending ? "pending" : "active"}`;
  return cachedFetch(key, async () => {
    const snap = await getDocs(collection(db, "kodeRekening"));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as KodeRekening));
    if (!includePending) {
      list = list.filter(r => r.status === "ACTIVE" || r.isActive !== false);
    }
    return list;
  });
};

/** Invalidate master-data caches after any write. */
export const invalidateMasterCache = (): void => {
  invalidateCache("kegiatan:");
  invalidateCache("kodeRekening:");
  invalidateCache("jawatan:");
  invalidateCache("packageTemplates:");
  invalidateCache("documentTypes:");
};

// User Request New Kode Kegiatan
export const requestNewKegiatan = async (data: {
  kodeKegiatan: string;
  namaKegiatan: string;
  tahunAnggaran: number;
}, user: UserProfile) => {
  const id = `keg-${Date.now()}`;
  const kegRef = doc(db, "kegiatan", id);
  const payload: Kegiatan = {
    id,
    kodeKegiatan: data.kodeKegiatan.trim(),
    namaKegiatan: data.namaKegiatan.trim(),
    jawatanId: user.jawatanId,
    tahunAnggaran: data.tahunAnggaran || 2026,
    status: "PENDING_APPROVAL",
    requestedBy: user.email
  };
  await setDoc(kegRef, sanitizeData({ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  invalidateMasterCache();
  return id;
};

// User Request New Kode Rekening
export const requestNewKodeRekening = async (data: {
  kode: string;
  nama: string;
  tahunAnggaran: number;
  kategori?: string;
}, user: UserProfile) => {
  const id = `rek-${Date.now()}`;
  const rekRef = doc(db, "kodeRekening", id);
  const payload: KodeRekening = {
    id,
    kode: data.kode.trim(),
    nama: data.nama.trim(),
    tahunAnggaran: data.tahunAnggaran || 2026,
    kategori: data.kategori || "LAINNYA",
    isActive: false,
    status: "PENDING_APPROVAL",
    requestedBy: user.email
  };
  await setDoc(rekRef, sanitizeData({ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  invalidateMasterCache();
  return id;
};

// Admin Approve / Reject Kegiatan
export const adminApproveKegiatan = async (kegiatanId: string, actor: UserProfile) => {
  const kegRef = doc(db, "kegiatan", kegiatanId);
  await updateDoc(kegRef, sanitizeData({ status: "ACTIVE", updatedAt: serverTimestamp() }));
  invalidateMasterCache();
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: kegiatanId,
    newValue: { status: "ACTIVE" }
  });
};

export const adminRejectKegiatan = async (kegiatanId: string, actor: UserProfile) => {
  await deleteDoc(doc(db, "kegiatan", kegiatanId));
  invalidateMasterCache();
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: kegiatanId,
    reason: "Pengajuan kegiatan ditolak oleh admin"
  });
};

// Admin Approve / Reject Kode Rekening
export const adminApproveKodeRekening = async (rekId: string, actor: UserProfile) => {
  const rekRef = doc(db, "kodeRekening", rekId);
  await updateDoc(rekRef, sanitizeData({ isActive: true, status: "ACTIVE", updatedAt: serverTimestamp() }));
  invalidateMasterCache();
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: rekId,
    newValue: { status: "ACTIVE", isActive: true }
  });
};

export const adminRejectKodeRekening = async (rekId: string, actor: UserProfile) => {
  await deleteDoc(doc(db, "kodeRekening", rekId));
  invalidateMasterCache();
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: rekId,
    reason: "Pengajuan kode rekening ditolak oleh admin"
  });
};

// Admin Direct Create Kegiatan
export const adminCreateKegiatan = async (data: {
  kodeKegiatan: string;
  namaKegiatan: string;
  jawatanId: string;
  tahunAnggaran: number;
}, actor: UserProfile) => {
  const id = `keg-${Date.now()}`;
  const kegRef = doc(db, "kegiatan", id);
  const payload: Kegiatan = {
    id,
    kodeKegiatan: data.kodeKegiatan.trim(),
    namaKegiatan: data.namaKegiatan.trim(),
    jawatanId: data.jawatanId,
    tahunAnggaran: data.tahunAnggaran || 2026,
    status: "ACTIVE"
  };
  await setDoc(kegRef, sanitizeData({ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: id,
    newValue: payload
  });
  return id;
};

// Admin Direct Create Kode Rekening
export const adminCreateKodeRekening = async (data: {
  kode: string;
  nama: string;
  tahunAnggaran: number;
  kategori?: string;
}, actor: UserProfile) => {
  const id = `rek-${Date.now()}`;
  const rekRef = doc(db, "kodeRekening", id);
  const payload: KodeRekening = {
    id,
    kode: data.kode.trim(),
    nama: data.nama.trim(),
    tahunAnggaran: data.tahunAnggaran || 2026,
    kategori: data.kategori || "LAINNYA",
    isActive: true,
    status: "ACTIVE"
  };
  await setDoc(rekRef, sanitizeData({ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: id,
    newValue: payload
  });
  return id;
};

// Admin Update Kegiatan (Edit existing kegiatan)
export const adminUpdateKegiatan = async (kegiatanId: string, data: {
  kodeKegiatan?: string;
  namaKegiatan?: string;
  jawatanId?: string;
  tahunAnggaran?: number;
  status?: Kegiatan["status"];
}, actor: UserProfile) => {
  const kegRef = doc(db, "kegiatan", kegiatanId);
  const snap = await getDoc(kegRef);
  if (!snap.exists()) throw new Error("Kegiatan tidak ditemukan");
  const oldData = snap.data() as Kegiatan;
  const updateData: Record<string, any> = { updatedAt: serverTimestamp() };
  if (data.kodeKegiatan !== undefined) updateData.kodeKegiatan = data.kodeKegiatan.trim();
  if (data.namaKegiatan !== undefined) updateData.namaKegiatan = data.namaKegiatan.trim();
  if (data.jawatanId !== undefined) updateData.jawatanId = data.jawatanId;
  if (data.tahunAnggaran !== undefined) updateData.tahunAnggaran = data.tahunAnggaran;
  if (data.status !== undefined) updateData.status = data.status;
  await updateDoc(kegRef, sanitizeData(updateData));
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: kegiatanId,
    oldValue: oldData,
    newValue: updateData
  });
};

// Admin Update Kode Rekening (Edit existing rekening)
export const adminUpdateKodeRekening = async (rekId: string, data: {
  kode?: string;
  nama?: string;
  kategori?: string;
  tahunAnggaran?: number;
  status?: KodeRekening["status"];
  isActive?: boolean;
}, actor: UserProfile) => {
  const rekRef = doc(db, "kodeRekening", rekId);
  const snap = await getDoc(rekRef);
  if (!snap.exists()) throw new Error("Rekening tidak ditemukan");
  const oldData = snap.data() as KodeRekening;
  const updateData: Record<string, any> = { updatedAt: serverTimestamp() };
  if (data.kode !== undefined) updateData.kode = data.kode.trim();
  if (data.nama !== undefined) updateData.nama = data.nama.trim();
  if (data.kategori !== undefined) updateData.kategori = data.kategori;
  if (data.tahunAnggaran !== undefined) updateData.tahunAnggaran = data.tahunAnggaran;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  await updateDoc(rekRef, sanitizeData(updateData));
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: rekId,
    oldValue: oldData,
    newValue: updateData
  });
};

// Admin Delete User
export const adminDeleteUser = async (uid: string, actor: UserProfile) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error("Pengguna tidak ditemukan");
  const oldData = snap.data();
  await deleteDoc(userRef);
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "UPDATE_USER_ACCESS",
    entityType: "USER",
    entityId: uid,
    oldValue: oldData,
    reason: "Pengguna dihapus oleh admin"
  });
};

// @deprecated Jenis Belanja removed — SPJ packages follow Kode Rekening only. Kept for backward compatibility.
export const getJenisBelanjaList = async (): Promise<JenisBelanja[]> => {
  try {
    const snap = await getDocs(collection(db, "jenisBelanja"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as JenisBelanja));
  } catch {
    return [];
  }
};

export const getDocumentTypesList = async (): Promise<DocumentTypeItem[]> => {
  return cachedFetch("documentTypes:all", async () => {
    const snap = await getDocs(collection(db, "documentTypes"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentTypeItem));
  });
};

// ------------------- OFFICIALS (PENANDATANGAN) — CROSS-JAWATAN -------------------
// Master officials are set once by admin and auto-injected into every document
// that needs their signature (PPTK, Notulis, PA/KPA/Panewu, Bendahara).
export const getOfficialsList = async (type?: OfficialType): Promise<OfficialPerson[]> => {
  const snap = await getDocs(collection(db, "officials"));
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as OfficialPerson));
  if (type) list = list.filter(o => o.type === type);
  return list;
};

export const adminSaveOfficial = async (data: {
  id?: string;
  type: OfficialType;
  nama: string;
  nip?: string;
  pangkat?: string;
  jawatanId?: string;
}, actor: UserProfile): Promise<string> => {
  const id = data.id || `official-${data.type.toLowerCase()}-${Date.now()}`;
  const ref = doc(db, "officials", id);
  const payload = {
    id,
    type: data.type,
    nama: data.nama.trim(),
    nip: (data.nip || "").trim(),
    pangkat: (data.pangkat || "").trim(),
    jawatanId: data.jawatanId || "",
  };
  await setDoc(ref, sanitizeData({ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }), { merge: true });
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: id,
    newValue: { type: "OFFICIAL", data: payload }
  });
  return id;
};

export const adminDeleteOfficial = async (officialId: string, actor: UserProfile) => {
  await deleteDoc(doc(db, "officials", officialId));
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: officialId,
    reason: "Penandatangan dihapus oleh admin"
  });
};

// Helper: resolve officials of a given type into signature fields for a document.
export const resolveOfficialsForSignature = async (): Promise<{
  pptk: OfficialPerson | null;
  notulis: OfficialPerson | null;
  pa: OfficialPerson | null;
  panewu: OfficialPerson | null;
  bendahara: OfficialPerson | null;
}> => {
  const list = await getOfficialsList();
  const pick = (t: OfficialType) => list.find(o => o.type === t) || null;
  return {
    pptk: pick("PPTK"),
    notulis: pick("NOTULIS"),
    pa: pick("PA"),
    panewu: pick("PANEWU"),
    bendahara: pick("BENDAHARA"),
  };
};

// Save a Pemimpin Rapat option — usable by ANY user (not admin-only) so that
// names entered in notulensi are reusable later across all jawatan.
export const savePemimpinRapatOption = async (data: {
  nama: string;
  nip?: string;
  pangkat?: string;
}, actor: UserProfile): Promise<string> => {
  const existing = await getOfficialsList("PEMIMPIN_RAPAT");
  const dup = existing.find(o => o.nama.toLowerCase() === data.nama.trim().toLowerCase());
  if (dup) return dup.id;

  const id = `official-pemimpin-rapat-${Date.now()}`;
  await setDoc(doc(db, "officials", id), sanitizeData({
    id,
    type: "PEMIMPIN_RAPAT" as OfficialType,
    nama: data.nama.trim(),
    nip: (data.nip || "").trim(),
    pangkat: (data.pangkat || "").trim(),
    jawatanId: actor.jawatanId || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return id;
};

// Notulis options per-jawatan: each jawatan may set its own notulis.
export const getNotulisOptions = async (jawatanId?: string): Promise<OfficialPerson[]> => {
  const list = await getOfficialsList("NOTULIS");
  if (!jawatanId) return list;
  // Jawatan-specific first, then global (no jawatanId) as fallback options
  return list.filter(o => !o.jawatanId || o.jawatanId === jawatanId);
};

/** PPTK options per-jawatan: each jawatan sets its own PPTK. */
export const getPptkOptions = async (jawatanId?: string): Promise<OfficialPerson[]> => {
  const list = await getOfficialsList("PPTK");
  if (!jawatanId) return list;
  return list.filter(o => !o.jawatanId || o.jawatanId === jawatanId);
};

/** Save (or replace) the PPTK of a jawatan — done by that jawatan's own user. */
export const savePptkOption = async (data: {
  nama: string;
  nip?: string;
  pangkat?: string;
  jawatanId?: string;
}, actor: UserProfile): Promise<string> => {
  const jawatanId = data.jawatanId || actor.jawatanId || "";
  const existing = await getOfficialsList("PPTK");
  const mine = existing.find(o => (o.jawatanId || "") === jawatanId);
  const id = mine?.id || `official-pptk-${jawatanId || Date.now()}`;
  await setDoc(doc(db, "officials", id), sanitizeData({
    id,
    type: "PPTK" as OfficialType,
    nama: data.nama.trim(),
    nip: (data.nip || "").trim(),
    pangkat: (data.pangkat || "").trim(),
    jawatanId,
    createdAt: mine?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }), { merge: true });
  return id;
};

/**
 * Set the jawatan's own officials (PPTK / NOTULIS / PEMIMPIN_RAPAT).
 * These three are the jawatan's own domain — admin only monitors them.
 */
export const saveJawatanOfficial = async (data: {
  type: "PPTK" | "NOTULIS" | "PEMIMPIN_RAPAT";
  nama: string;
  nip?: string;
  pangkat?: string;
  jawatanId?: string;
}, actor: UserProfile): Promise<string> => {
  const jawatanId = data.jawatanId || actor.jawatanId || "";
  const existing = await getOfficialsList(data.type);
  const mine = existing.find(o => (o.jawatanId || "") === jawatanId);
  const id = mine?.id || `official-${data.type.toLowerCase()}-${jawatanId || Date.now()}`;
  await setDoc(doc(db, "officials", id), sanitizeData({
    id,
    type: data.type,
    nama: data.nama.trim(),
    nip: (data.nip || "").trim(),
    pangkat: (data.pangkat || "").trim(),
    jawatanId,
    createdAt: mine?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }), { merge: true });
  return id;
};

export const saveNotulisOption = async (data: {
  nama: string;
  nip?: string;
  pangkat?: string;
  jawatanId?: string;
}, actor: UserProfile): Promise<string> => {
  const existing = await getOfficialsList("NOTULIS");
  const dup = existing.find(
    o => o.nama.toLowerCase() === data.nama.trim().toLowerCase() && (o.jawatanId || "") === (data.jawatanId || "")
  );
  if (dup) return dup.id;

  const id = `official-notulis-${Date.now()}`;
  await setDoc(doc(db, "officials", id), sanitizeData({
    id,
    type: "NOTULIS" as OfficialType,
    nama: data.nama.trim(),
    nip: (data.nip || "").trim(),
    pangkat: (data.pangkat || "").trim(),
    jawatanId: data.jawatanId || actor.jawatanId || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return id;
};

// ------------------- PACKAGE TEMPLATES (ADMIN-DEFINED, PER KODE REKENING) -------------------
// A package template defines which documents are required for a given Kode
// Rekening. When a user picks that Kode Rekening while creating an SPJ, the
// checklist is applied automatically — no separate package picker needed.
export const getPackageTemplatesList = async (includeInactive = false): Promise<PackageTemplate[]> => {
  const key = `packageTemplates:${includeInactive ? "all" : "active"}`;
  return cachedFetch(key, async () => {
    const snap = await getDocs(collection(db, "packageTemplates"));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PackageTemplate));
    if (!includeInactive) list = list.filter(p => p.isActive !== false);
    return list;
  });
};

/** Find the active package template bound to a Kode Rekening (or null). */
export const getPackageTemplateByKodeRekening = async (kodeRekeningId: string): Promise<PackageTemplate | null> => {
  if (!kodeRekeningId) return null;
  const snap = await getDocs(query(collection(db, "packageTemplates"), where("kodeRekeningId", "==", kodeRekeningId)));
  const active = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as PackageTemplate))
    .filter(p => p.isActive !== false);
  return active[0] || null;
};

export const adminCreatePackageTemplate = async (data: {
  kodeRekeningId: string;
  kodeRekeningKode?: string;
  kodeRekeningNama?: string;
  description?: string;
  documents: { documentTypeId: string; required: boolean; order: number }[];
}, actor: UserProfile): Promise<string> => {
  if (!data.kodeRekeningId) throw new Error("Kode Rekening wajib dipilih.");
  const existing = await getPackageTemplateByKodeRekening(data.kodeRekeningId);
  if (existing) throw new Error("Paket SPJ untuk kode rekening ini sudah ada. Silakan edit paket tersebut.");

  const id = `pkg-${Date.now()}`;
  const ref = doc(db, "packageTemplates", id);
  const payload: PackageTemplate = {
    id,
    kodeRekeningId: data.kodeRekeningId,
    kodeRekeningKode: (data.kodeRekeningKode || "").trim(),
    kodeRekeningNama: (data.kodeRekeningNama || "").trim(),
    description: (data.description || "").trim(),
    documents: data.documents,
    isActive: true,
  };
  await setDoc(ref, sanitizeData({ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  invalidateMasterCache();
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: id,
    newValue: { type: "PACKAGE_TEMPLATE", data: payload }
  });
  return id;
};

export const adminUpdatePackageTemplate = async (id: string, data: {
  kodeRekeningId?: string;
  kodeRekeningKode?: string;
  kodeRekeningNama?: string;
  description?: string;
  documents?: { documentTypeId: string; required: boolean; order: number }[];
  isActive?: boolean;
}, actor: UserProfile) => {
  const ref = doc(db, "packageTemplates", id);
  const patch: Record<string, any> = { updatedAt: serverTimestamp() };
  if (data.kodeRekeningId !== undefined) patch.kodeRekeningId = data.kodeRekeningId;
  if (data.kodeRekeningKode !== undefined) patch.kodeRekeningKode = data.kodeRekeningKode.trim();
  if (data.kodeRekeningNama !== undefined) patch.kodeRekeningNama = data.kodeRekeningNama.trim();
  if (data.description !== undefined) patch.description = data.description.trim();
  if (data.documents !== undefined) patch.documents = data.documents;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  await updateDoc(ref, sanitizeData(patch));
  invalidateMasterCache();
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: id,
    newValue: { type: "PACKAGE_TEMPLATE_UPDATE", data: patch }
  });
};

export const adminDeletePackageTemplate = async (id: string, actor: UserProfile) => {
  await deleteDoc(doc(db, "packageTemplates", id));
  invalidateMasterCache();
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: id,
    reason: "Paket SPJ dihapus oleh admin"
  });
};

// ------------------- QR ATTENDANCE SESSIONS (30-MINUTE TTL) -------------------
// A QR attendance session is valid for 30 minutes only; an expiry sweep
// permanently removes expired sessions AND their captured attendance rows
// so storage never fills up with stale records.
export const QR_SESSION_TTL_MS = 30 * 60 * 1000;

export const createAttendanceSession = async (spjId: string, actor: UserProfile): Promise<{ id: string; expiresAtMs: number }> => {
  const now = Date.now();
  const expiresAtMs = now + QR_SESSION_TTL_MS;
  const ref = await addDoc(collection(db, "attendanceSessions"), sanitizeData({
    spjId,
    createdAtMs: now,
    expiresAtMs,
    createdBy: actor.email,
    createdAt: serverTimestamp(),
  }));
  return { id: ref.id, expiresAtMs };
};

export const getActiveAttendanceSession = async (spjId: string): Promise<{ id: string; expiresAtMs: number } | null> => {
  const snap = await getDocs(query(collection(db, "attendanceSessions"), where("spjId", "==", spjId)));
  const now = Date.now();
  const active = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(s => Number(s.expiresAtMs) > now)
    .sort((a, b) => Number(b.expiresAtMs) - Number(a.expiresAtMs))[0];
  return active ? { id: active.id, expiresAtMs: Number(active.expiresAtMs) } : null;
};

export const validateAttendanceSession = async (spjId: string): Promise<boolean> => {
  const active = await getActiveAttendanceSession(spjId);
  return !!active;
};

// Permanently purge expired QR sessions and their attendance payloads.
export const purgeExpiredAttendanceSessions = async (): Promise<number> => {
  const snap = await getDocs(collection(db, "attendanceSessions"));
  const now = Date.now();
  const expired = snap.docs.filter(d => Number((d.data() as any).expiresAtMs) <= now);
  let purged = 0;
  for (const s of expired) {
    const sessionData = s.data() as any;
    const spjId = sessionData.spjId;
    // Remove attendance rows captured by this expired session
    if (spjId) {
      try {
        const attSnap = await getDocs(collection(db, "spj", spjId, "attendance"));
        const batch = writeBatch(db);
        attSnap.docs.forEach(a => {
          const att = a.data() as any;
          if (!att.sessionId || att.sessionId === s.id) batch.delete(a.ref);
        });
        await batch.commit();
      } catch (e) {
        console.warn("Failed to purge attendance rows:", e);
      }
    }
    await deleteDoc(s.ref);
    purged++;
  }
  return purged;
};

// ------------------- SPJ NUMBER GENERATOR -------------------
export const generateSpjNumber = async (tahun: number): Promise<string> => {
  const spjRef = collection(db, "spj");
  const q = query(spjRef, where("tahunAnggaran", "==", tahun));
  const snap = await getDocs(q);
  const count = snap.size + 1;
  const seq = count.toString().padStart(5, "0");
  return `SPJ/TMN/${tahun}/${seq}`;
};

// ------------------- SPJ ENGINE -------------------
export const createSpjPackage = async (params: {
  user: UserProfile;
  kegiatan: Kegiatan;
  kodeRekening: KodeRekening;
  tanggal: string;
  judulAktivitas: string;
  jumlahPeserta: number;
  targetJawatanId?: string;
  targetJawatanName?: string;
  packageTemplate?: PackageTemplate | null;
}): Promise<string> => {
  const { user, kegiatan, kodeRekening, judulAktivitas, jumlahPeserta, targetJawatanId, targetJawatanName } = params;
  // Dates are ALWAYS stored as dd-mm-yyyy
  const tanggal = normalizeDateToDDMMYYYY(params.tanggal) || todayDDMMYYYY();
  // Tahun anggaran follows the year the document is created (from its date)
  const year = getYearFromDate(tanggal);
  const month = parseAnyDate(tanggal)?.getMonth() ?? 0;
  const bulan = month + 1;
  const nomorSpj = await generateSpjNumber(year);

  const activeJawatanId = targetJawatanId || user.jawatanId;
  const activeJawatanName = targetJawatanName || user.jawatanName;

  // Checklist resolution priority:
  // 1) Package template bound to the chosen Kode Rekening (admin-defined).
  // 2) Passed-in package template (explicit override).
  // 3) Checklist config keyed by kodeRekeningId.
  // 4) Default fallback.
  let packageTemplate = params.packageTemplate || null;
  if (!packageTemplate) {
    try {
      packageTemplate = await getPackageTemplateByKodeRekening(kodeRekening.id);
    } catch (e) {
      console.warn("Failed to resolve package template:", e);
    }
  }

  let checklistDocs: { documentTypeId: string; required: boolean; order: number }[] = [];
  let configId = "config-default";

  if (packageTemplate && packageTemplate.documents?.length > 0) {
    configId = packageTemplate.id;
    checklistDocs = [...packageTemplate.documents].sort((a, b) => a.order - b.order);
  } else {
    const configSnap = await getDocs(query(collection(db, "checklistConfigs"), where("kodeRekeningId", "==", kodeRekening.id)));
    if (!configSnap.empty) {
      const configData = configSnap.docs[0].data() as ChecklistConfig;
      configId = configSnap.docs[0].id;
      checklistDocs = configData.documents;
    } else {
      checklistDocs = [
        { documentTypeId: "doctype-bend26", required: true, order: 1 },
        { documentTypeId: "doctype-undangan", required: true, order: 2 },
        { documentTypeId: "doctype-daftarhadir", required: true, order: 3 },
        { documentTypeId: "doctype-notulen", required: true, order: 4 }
      ];
    }
  }

  // Get doc types details
  const docTypesMap = new Map<string, DocumentTypeItem>();
  const dtSnap = await getDocs(collection(db, "documentTypes"));
  dtSnap.docs.forEach(d => docTypesMap.set(d.id, { id: d.id, ...d.data() } as DocumentTypeItem));

  const checklistSnapshotItems = checklistDocs.map(d => {
    const dt = docTypesMap.get(d.documentTypeId);
    return {
      documentTypeId: d.documentTypeId,
      documentTypeCode: dt?.code || "GENERIC",
      documentTypeName: dt?.name || "Dokumen",
      required: d.required,
      order: d.order
    };
  });

  // Master Snapshot (Jenis Belanja removed — SPJ follows Kode Rekening only)
  const masterSnapshot = {
    kegiatan: { id: kegiatan.id, kode: kegiatan.kodeKegiatan, nama: kegiatan.namaKegiatan },
    kodeRekening: { id: kodeRekening.id, kode: kodeRekening.kode, nama: kodeRekening.nama }
  };

  // Auto-inject admin-configured officials (PPTK, PA/KPA, Panewu, Bendahara, Notulis)
  let officials: Awaited<ReturnType<typeof resolveOfficialsForSignature>> | null = null;
  try {
    officials = await resolveOfficialsForSignature();
  } catch (e) {
    console.warn("Failed to resolve officials:", e);
  }

  const spjData: Omit<SpjItem, "id"> = {
    nomorSpj,
    jawatanId: activeJawatanId,
    jawatanName: activeJawatanName,
    userId: user.uid,
    userEmail: user.email,
    userName: user.displayName,
    kegiatanId: kegiatan.id,
    kodeRekeningId: kodeRekening.id,
    tanggal,
    tahunAnggaran: year,
    bulan,
    status: "DRAFT",
    progress: 0,
    masterSnapshot,
    packageTemplateId: packageTemplate?.id || null,
    packageTemplateName: packageTemplate?.nama || null,
    checklistSnapshot: {
      configId,
      version: 1,
      documents: checklistSnapshotItems
    },
    sharedData: {
      namaKegiatan: kegiatan.namaKegiatan,
      kodeKegiatan: kegiatan.kodeKegiatan,
      kodeRekening: kodeRekening.kode,
      namaRekening: kodeRekening.nama,
      judulAktivitas: judulAktivitas.trim(),
      jumlahPeserta: Math.max(1, Math.floor(jumlahPeserta)),
      paNama: officials?.pa?.nama || officials?.panewu?.nama || "",
      paNip: officials?.pa?.nip || officials?.panewu?.nip || "",
      bendaharaNama: officials?.bendahara?.nama || "",
      bendaharaNip: officials?.bendahara?.nip || "",
      pptkNama: officials?.pptk?.nama || "",
      pptkNip: officials?.pptk?.nip || "",
      pptkPangkat: officials?.pptk?.pangkat || "",
      panewuNama: officials?.panewu?.nama || "",
      panewuNip: officials?.panewu?.nip || "",
      notulis: officials?.notulis?.nama || "",
      notulisNip: officials?.notulis?.nip || "",
      notulisJabatan: officials?.notulis?.pangkat || ""
    }
  };

  const spjRef = await addDoc(collection(db, "spj"), sanitizeData({
    ...spjData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));

  // Initialize Documents
  for (const item of checklistSnapshotItems) {
    const spjDoc: Omit<SpjDocumentItem, "id"> = {
      spjId: spjRef.id,
      documentTypeId: item.documentTypeId,
      documentTypeCode: item.documentTypeCode,
      templateId: `tpl-${item.documentTypeCode.toLowerCase()}`,
      templateVersion: 1,
      status: "DRAFT",
      data: item.documentTypeCode === "DAFTAR_HADIR"
        ? { peserta: Array.from({ length: Math.max(1, Math.floor(jumlahPeserta)) }, (_, index) => ({ no: index + 1, nama: "", jabatan: "", tandaTangan: "" })) }
        : {},
      validation: {
        isValid: false,
        errors: [{ field: "general", message: "Dokumen belum diisi" }]
      },
      externalUrl: null
    };

    await addDoc(collection(db, "spjDocuments"), sanitizeData({
      ...spjDoc,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));
  }

  await logAudit({
    actorUid: user.uid,
    actorEmail: user.email,
    action: "CREATE_SPJ",
    entityType: "SPJ",
    entityId: spjRef.id,
    newValue: { nomorSpj }
  });

  // Gamifikasi: poin membuat paket SPJ (fire-and-forget, tidak blokir alur)
  awardGamificationPoints(user, "CREATE_SPJ").catch((e) =>
    console.warn("Gamification skip (CREATE_SPJ):", e)
  );

  return spjRef.id;
};

// Fetch SPJ List — excludes ARCHIVED (use getArchivedSpjList for archived)
export const getSpjList = async (user: UserProfile): Promise<SpjItem[]> => {
  const colRef = collection(db, "spj");
  if (user.role !== "ADMIN") {
    // For regular users: fetch by jawatanId, then filter out ARCHIVED in-memory
    // (avoids composite index requirement for status != ARCHIVED + jawatanId ==)
    const snap = await getDocs(query(colRef, where("jawatanId", "==", user.jawatanId)));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as SpjItem))
      .filter(s => s.status !== "ARCHIVED");
  }
  // For ADMIN: fetch all, filter out ARCHIVED in-memory
  const snap = await getDocs(colRef);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as SpjItem))
    .filter(s => s.status !== "ARCHIVED");
};

// Fetch Single SPJ
export const getSpjById = async (spjId: string): Promise<SpjItem | null> => {
  const snap = await getDoc(doc(db, "spj", spjId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SpjItem;
};

// Fetch SPJ Documents
export const getSpjDocuments = async (spjId: string): Promise<SpjDocumentItem[]> => {
  const snap = await getDocs(query(collection(db, "spjDocuments"), where("spjId", "==", spjId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SpjDocumentItem));
};

// Save SPJ Document & Recalculate Progress
export const saveSpjDocumentData = async (
  documentId: string,
  docData: Record<string, any>,
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED",
  externalUrl?: string | null,
  actor?: UserProfile
) => {
  const docRef = doc(db, "spjDocuments", documentId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;

  const currentDoc = docSnap.data() as SpjDocumentItem;
  const wasAlreadyCompleted = currentDoc.status === "COMPLETED" && currentDoc.validation?.isValid;
  
  // Basic validation calculation
  const errors: Array<{ field: string; message: string }> = [];
  if (status === "COMPLETED") {
    if (currentDoc.documentTypeCode === "SURAT_UNDANGAN" && externalUrl) {
      // valid
    } else if (Object.keys(docData).length === 0 && !externalUrl) {
      errors.push({ field: "data", message: "Isi formulir belum lengkap" });
    }
  }

  const isValid = status === "COMPLETED" && errors.length === 0;

  await updateDoc(docRef, sanitizeData({
    data: docData,
    status,
    externalUrl: externalUrl || null,
    validation: {
      isValid,
      errors,
      validatedAt: new Date().toISOString()
    },
    updatedAt: serverTimestamp(),
    ...(status === "COMPLETED" ? { completedAt: new Date().toISOString() } : {})
  }));

  // Recalculate SPJ progress & status
  await recalculateSpjStatus(currentDoc.spjId);

  // Gamifikasi: poin saat dokumen PERTAMA KALI selesai (bukan setiap edit)
  if (isValid && !wasAlreadyCompleted && actor) {
    awardGamificationPoints(actor, "COMPLETE_DOCUMENT").catch((e) =>
      console.warn("Gamification skip (COMPLETE_DOCUMENT):", e)
    );
  }
};

// Recalculate SPJ Progress & Status
export const recalculateSpjStatus = async (spjId: string) => {
  const spjRef = doc(db, "spj", spjId);
  const spjSnap = await getDoc(spjRef);
  if (!spjSnap.exists()) return;

  const spj = spjSnap.data() as SpjItem;
  if (spj.status === "FINALIZED" || spj.status === "ARCHIVED") return;

  const docs = await getSpjDocuments(spjId);
  const requiredDocs = spj.checklistSnapshot.documents.filter(d => d.required);
  const totalRequired = requiredDocs.length || 1;

  let completedCount = 0;
  for (const req of requiredDocs) {
    const foundDoc = docs.find(d => d.documentTypeId === req.documentTypeId);
    if (foundDoc && foundDoc.status === "COMPLETED" && foundDoc.validation.isValid) {
      completedCount++;
    }
  }

  const progress = Math.round((completedCount / totalRequired) * 100);

  let newStatus: SpjStatus = spj.status;
  if (progress === 100) {
    newStatus = "COMPLETE";
  } else if (progress > 0) {
    newStatus = "IN_PROGRESS";
  } else {
    newStatus = "DRAFT";
  }

  await updateDoc(spjRef, {
    progress,
    status: newStatus,
    updatedAt: serverTimestamp()
  });
};

// Finalize SPJ
export const finalizeSpj = async (spjId: string, user: UserProfile) => {
  const spjRef = doc(db, "spj", spjId);
  const spjSnap = await getDoc(spjRef);
  if (!spjSnap.exists()) return;

  await updateDoc(spjRef, {
    status: "FINALIZED",
    finalizedAt: new Date().toISOString(),
    finalizedBy: user.displayName,
    updatedAt: serverTimestamp()
  });

  await logAudit({
    actorUid: user.uid,
    actorEmail: user.email,
    action: "FINALIZE_SPJ",
    entityType: "SPJ",
    entityId: spjId,
    oldValue: { status: "COMPLETE" },
    newValue: { status: "FINALIZED" }
  });

  // Gamifikasi: poin menyelesaikan paket SPJ
  awardGamificationPoints(user, "FINALIZE_SPJ").catch((e) =>
    console.warn("Gamification skip (FINALIZE_SPJ):", e)
  );
};

// Reopen SPJ (Admin Only)
export const reopenSpj = async (spjId: string, reason: string, user: UserProfile) => {
  const spjRef = doc(db, "spj", spjId);
  
  await updateDoc(spjRef, {
    status: "IN_PROGRESS",
    reopenReason: reason,
    updatedAt: serverTimestamp()
  });

  await logAudit({
    actorUid: user.uid,
    actorEmail: user.email,
    action: "REOPEN_SPJ",
    entityType: "SPJ",
    entityId: spjId,
    reason,
    oldValue: { status: "FINALIZED" },
    newValue: { status: "IN_PROGRESS" }
  });
};

// Update SPJ Shared Data (e.g. PPTK Nama, NIP, Pangkat)
export const updateSpjSharedData = async (spjId: string, sharedDataPatch: Partial<SpjItem["sharedData"]>) => {
  const spjRef = doc(db, "spj", spjId);
  const snap = await getDoc(spjRef);
  if (!snap.exists()) return;
  const current = snap.data() as SpjItem;
  const updatedShared = { ...(current.sharedData || {}), ...sharedDataPatch };
  await updateDoc(spjRef, sanitizeData({ sharedData: updatedShared, updatedAt: serverTimestamp() }));
};

// Delete SPJ (Admin only)
export const deleteSpj = async (spjId: string, user: UserProfile) => {
  const spjRef = doc(db, "spj", spjId);
  const docsSnap = await getDocs(query(collection(db, "spjDocuments"), where("spjId", "==", spjId)));
  
  // Delete all associated documents
  const batch = writeBatch(db);
  docsSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(spjRef);
  await batch.commit();

  await logAudit({
    actorUid: user.uid,
    actorEmail: user.email,
    action: "DELETE_SPJ",
    entityType: "SPJ",
    entityId: spjId,
    reason: "SPJ dihapus oleh administrator"
  });
};

// Archive SPJ (move to archive box)
export const archiveSpj = async (spjId: string, user: UserProfile) => {
  const spjRef = doc(db, "spj", spjId);
  const spjSnap = await getDoc(spjRef);
  if (!spjSnap.exists()) return;

  await updateDoc(spjRef, {
    status: "ARCHIVED",
    archivedAt: new Date().toISOString(),
    archivedBy: user.displayName,
    updatedAt: serverTimestamp()
  });

  await logAudit({
    actorUid: user.uid,
    actorEmail: user.email,
    action: "ARCHIVE_SPJ",
    entityType: "SPJ",
    entityId: spjId,
    newValue: { status: "ARCHIVED" }
  });
};

// Get archived SPJs (no orderBy — avoids composite index requirement)
export const getArchivedSpjList = async (user: UserProfile): Promise<SpjItem[]> => {
  const snap = await getDocs(query(collection(db, "spj"), where("status", "==", "ARCHIVED")));
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SpjItem));
  if (user.role !== "ADMIN") {
    list = list.filter(s => s.jawatanId === user.jawatanId);
  }
  return list;
};

// Create/Update Jawatan (Admin only)
export const createJawatan = async (jawatan: Omit<Jawatan, "createdAt" | "updatedAt">, user: UserProfile) => {
  const ref = doc(db, "jawatan", jawatan.id);
  await setDoc(ref, sanitizeData({
    ...jawatan,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  invalidateMasterCache();
  
  await logAudit({
    actorUid: user.uid,
    actorEmail: user.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: jawatan.id,
    newValue: { type: "JAWATAN", data: jawatan }
  });
  
  return jawatan.id;
};

export const updateJawatan = async (jawatanId: string, patchData: Partial<Jawatan>, user: UserProfile) => {
  const ref = doc(db, "jawatan", jawatanId);
  await updateDoc(ref, sanitizeData({ ...patchData, updatedAt: serverTimestamp() }));
  invalidateMasterCache();
  
  await logAudit({
    actorUid: user.uid,
    actorEmail: user.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: jawatanId,
    newValue: { type: "JAWATAN_UPDATE", data: patchData }
  });
};

export const deleteJawatan = async (jawatanId: string, user: UserProfile) => {
  await deleteDoc(doc(db, "jawatan", jawatanId));
  invalidateMasterCache();
  
  await logAudit({
    actorUid: user.uid,
    actorEmail: user.email,
    action: "MASTER_DATA_UPDATE",
    entityType: "MASTER_DATA",
    entityId: jawatanId,
    reason: "Jawatan dihapus oleh administrator"
  });
};

// Get SPJ statistics for dashboard/AI analysis
export const getSpjStatistics = async (user: UserProfile): Promise<{
  totalSpj: number;
  finalizedSpj: number;
  inProgressSpj: number;
  draftSpj: number;
  totalNominal: number;
  byKategori: Record<string, { count: number; totalNominal: number; percentage: number }>;
}> => {
  const spjCol = collection(db, "spj");
  const q = user.role !== "ADMIN"
    ? query(spjCol, where("jawatanId", "==", user.jawatanId))
    : spjCol;
  const snap = await getDocs(q);
  const spjList = snap.docs.map(d => ({ id: d.id, ...d.data() } as SpjItem));
  
  // Fetch documents to get nominal data
  const allDocSnap = await getDocs(collection(db, "spjDocuments"));
  const allDocs = allDocSnap.docs.map(d => ({ id: d.id, ...d.data() } as SpjDocumentItem));
  
  let totalNominal = 0;
  const byKategori: Record<string, { count: number; totalNominal: number }> = {};
  
  for (const spj of spjList) {
    const spjDocs = allDocs.filter(d => d.spjId === spj.id);
    const bend26Doc = spjDocs.find(d => d.documentTypeCode === "BEND_26");
    const nominal = Number(bend26Doc?.data?.nominal || 0);
    totalNominal += nominal;
    
    // Classify by kode rekening nama for AI analysis
    const rekNama = spj.masterSnapshot.kodeRekening?.nama || "LAINNYA";
    const kategori = rekNama.toUpperCase().includes("RAPAT") ? "MAKAN_MINUM_RAPAT"
      : rekNama.toUpperCase().includes("LAPANGAN") ? "MAKAN_MINUM_LAPANGAN"
      : rekNama.toUpperCase().includes("HONOR") || rekNama.toUpperCase().includes("JASA") ? "HONOR_JASA"
      : rekNama.toUpperCase().includes("ATK") ? "ATK"
      : rekNama.toUpperCase().includes("TRANSPORT") ? "TRANSPORT"
      : "LAINNYA";
      
    if (!byKategori[kategori]) {
      byKategori[kategori] = { count: 0, totalNominal: 0 };
    }
    byKategori[kategori].count += 1;
    byKategori[kategori].totalNominal += nominal;
  }
  
  // Calculate percentages
  const byKategoriWithPercentage: Record<string, { count: number; totalNominal: number; percentage: number }> = {};
  Object.keys(byKategori).forEach(key => {
    byKategoriWithPercentage[key] = {
      ...byKategori[key],
      percentage: totalNominal > 0 ? (byKategori[key].totalNominal / totalNominal) * 100 : 0
    };
  });
  
  return {
    totalSpj: spjList.length,
    finalizedSpj: spjList.filter(s => s.status === "FINALIZED").length,
    inProgressSpj: spjList.filter(s => s.status === "IN_PROGRESS" || s.status === "COMPLETE").length,
    draftSpj: spjList.filter(s => s.status === "DRAFT").length,
    totalNominal,
    byKategori: byKategoriWithPercentage
  };
};

// Update User Access (Admin only)
export const getAllUsers = async (): Promise<UserProfile[]> => {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
};

export const updateUserAccess = async (targetUid: string, patchData: { role?: "ADMIN" | "USER"; jawatanId?: string; jawatanName?: string; isActive?: boolean }, actor: UserProfile) => {
  const userRef = doc(db, "users", targetUid);
  await updateDoc(userRef, sanitizeData({ ...patchData, updatedAt: serverTimestamp() }));
  await logAudit({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "UPDATE_USER_ACCESS",
    entityType: "USER",
    entityId: targetUid,
    newValue: patchData
  });
};

// ------------------- GAMIFIKASI (POIN, LEVEL, LENCANA) -------------------
// Every user (admin and staff alike) earns points from real actions stored in
// Firestore so progress survives refresh and follows the account everywhere.

export const getUserGamification = async (uid: string): Promise<UserGamificationProfile | null> => {
  const snap = await getDoc(doc(db, "userPoints", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserGamificationProfile;
};

/** Award points for one action, keeping counters, streak, and badges in sync. */
export const awardGamificationPoints = async (
  user: UserProfile,
  action: GamificationAction
): Promise<UserGamificationProfile> => {
  const ref = doc(db, "userPoints", user.uid);
  const snap = await getDoc(ref);
  const today = todayDDMMYYYY();

  let profile: UserGamificationProfile;
  if (snap.exists()) {
    profile = snap.data() as UserGamificationProfile;
  } else {
    profile = {
      uid: user.uid,
      displayName: user.displayName || user.email,
      jawatanName: user.jawatanName,
      totalPoints: 0,
      counts: emptyCounts(),
      streakDays: 0,
      badges: [],
    };
  }

  // Streak: consecutive calendar days with at least one recorded action.
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${d.getFullYear()}`;
  })();

  if (profile.lastActiveDate !== today) {
    profile.streakDays = profile.lastActiveDate === yesterday ? (profile.streakDays || 0) + 1 : 1;
    profile.lastActiveDate = today;
  }

  profile.counts = { ...emptyCounts(), ...(profile.counts || {}) };
  profile.counts[action] = (profile.counts[action] || 0) + 1;
  profile.totalPoints = (profile.totalPoints || 0) + ACTION_POINTS[action];
  profile.displayName = user.displayName || user.email;
  profile.jawatanName = user.jawatanName;

  // Recompute earned badges from the updated stats.
  const stats = badgeStatsFromProfile(profile);
  profile.badges = getEarnedBadges(stats).map((b) => b.id);

  await setDoc(ref, sanitizeData({ ...profile, updatedAt: serverTimestamp() }));
  return profile;
};

/** Leaderboard across every user — highest total points first. */
export const getGamificationLeaderboard = async (): Promise<UserGamificationProfile[]> => {
  const snap = await getDocs(collection(db, "userPoints"));
  return snap.docs
    .map((d) => d.data() as UserGamificationProfile)
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
};

/** Record a daily-login point once per calendar day (idempotent per day). */
export const recordDailyActivity = async (user: UserProfile): Promise<UserGamificationProfile | null> => {
  try {
    const existing = await getUserGamification(user.uid);
    const today = todayDDMMYYYY();
    if (existing && existing.lastActiveDate === today && (existing.counts?.DAILY_LOGIN || 0) > 0) {
      // Already recorded today — just refresh streak continuity without adding points.
      return existing;
    }
    return await awardGamificationPoints(user, "DAILY_LOGIN");
  } catch (err) {
    console.warn("Gamification daily activity skipped:", err);
    return null;
  }
};
