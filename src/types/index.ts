export type UserRole = "ADMIN" | "USER";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  jawatanId: string;
  jawatanName: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
}

export interface Jawatan { id: string; kode: string; nama: string; description?: string; isActive: boolean; createdAt?: any; updatedAt?: any; }
export interface Kegiatan { id: string; kodeKegiatan: string; namaKegiatan: string; jawatanId: string; tahunAnggaran: number; status: "ACTIVE" | "INACTIVE" | "ARCHIVED" | "PENDING_APPROVAL"; requestedBy?: string; createdAt?: any; updatedAt?: any; }
export interface KodeRekening { id: string; kode: string; nama: string; tahunAnggaran: number; kategori?: string; isActive: boolean; status?: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL"; requestedBy?: string; createdAt?: any; updatedAt?: any; }
export interface JenisBelanja { id: string; kode: string; nama: string; description?: string; kodeRekeningId?: string; isActive: boolean; createdAt?: any; updatedAt?: any; }
export interface DocumentTypeItem { id: string; code: string; name: string; description: string; category: "FINANCIAL" | "ADMINISTRATIVE" | "REPORT"; isActive: boolean; createdAt?: any; updatedAt?: any; }
export interface ChecklistDocConfig { documentTypeId: string; required: boolean; order: number; }
export interface ChecklistConfig { id: string; kodeRekeningId?: string; jenisBelanjaId?: string; tahunAnggaran: number; version: number; isActive: boolean; documents: ChecklistDocConfig[]; createdAt?: any; updatedAt?: any; }

// ------------------- OFFICIALS (PENANDATANGAN) -------------------
export type OfficialType = "PPTK" | "NOTULIS" | "PEMIMPIN_RAPAT" | "PA" | "PANEWU" | "BENDAHARA";
export interface OfficialPerson {
  id: string;
  type: OfficialType;
  nama: string;
  nip?: string;
  pangkat?: string;
  jawatanId?: string;
  createdAt?: any;
  updatedAt?: any;
}

// ------------------- ADMIN-DEFINED SPJ PACKAGE TEMPLATES -------------------
export interface PackageTemplate {
  id: string;
  kode: string;
  nama: string;
  description?: string;
  documents: ChecklistDocConfig[];
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// ------------------- QR ATTENDANCE SESSION (30 MINUTES TTL) -------------------
export interface AttendanceSession {
  id: string;
  spjId: string;
  createdAtMs: number;
  expiresAtMs: number;
  createdBy?: string;
}

export type SpjStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETE" | "FINALIZED" | "ARCHIVED";
export interface SpjMasterSnapshot {
  kegiatan: { id: string; kode: string; nama: string };
  jenisBelanja?: { id: string; kode: string; nama: string };
  kodeRekening: { id: string; kode: string; nama: string };
}
export interface SpjChecklistSnapshotItem { documentTypeId: string; documentTypeCode: string; documentTypeName: string; required: boolean; order: number; }
export interface SpjSharedData {
  namaKegiatan?: string; kodeKegiatan?: string; kodeRekening?: string; namaRekening?: string;
  judulAktivitas?: string; jumlahPeserta?: number;
  hari?: string; tanggal?: string; jam?: string; tempat?: string; acara?: string;
  pemimpinRapat?: string; pemimpinRapatNip?: string; pemimpinRapatJabatan?: string;
  notulis?: string; notulisNip?: string; notulisJabatan?: string;
  pptkNama?: string; pptkNip?: string; pptkPangkat?: string;
  paNama?: string; paNip?: string; bendaharaNama?: string; bendaharaNip?: string;
  panewuNama?: string; panewuNip?: string;
  penerimaNama?: string;
  tanggalPelaksanaanList?: string[];
}
export interface SpjItem {
  id: string; nomorSpj: string; jawatanId: string; jawatanName: string; userId: string; userEmail: string; userName: string;
  kegiatanId: string; jenisBelanjaId?: string; kodeRekeningId: string; tanggal: string; tahunAnggaran: number; bulan: number;
  status: SpjStatus; progress: number; masterSnapshot: SpjMasterSnapshot;
  packageTemplateId?: string | null; packageTemplateName?: string | null;
  checklistSnapshot: { configId: string; version: number; documents: SpjChecklistSnapshotItem[] };
  sharedData?: SpjSharedData; createdAt?: any; updatedAt?: any; finalizedAt?: any; finalizedBy?: string; reopenReason?: string;
}
export type DocStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED";
export interface SpjDocumentItem { id: string; spjId: string; documentTypeId: string; documentTypeCode: string; templateId: string; templateVersion: number; status: DocStatus; data: Record<string, any>; validation: { isValid: boolean; errors: Array<{ field: string; message: string }>; validatedAt?: any }; externalUrl?: string | null; createdAt?: any; updatedAt?: any; completedAt?: any; }
export interface AuditLogItem { id?: string; actorUid: string; actorEmail: string; action: "CREATE_SPJ" | "UPDATE_SPJ" | "DELETE_SPJ" | "FINALIZE_SPJ" | "REOPEN_SPJ" | "ARCHIVE_SPJ" | "UPDATE_DOC" | "LOGIN" | "MASTER_DATA_UPDATE" | "TEMPLATE_UPDATE" | "UPDATE_USER_ACCESS"; entityType: "SPJ" | "SPJ_DOCUMENT" | "MASTER_DATA" | "USER"; entityId: string; oldValue?: any; newValue?: any; reason?: string | null; timestamp?: any; }
