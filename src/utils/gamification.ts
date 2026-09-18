/**
 * Gamifikasi KARSA Temon — poin, level, dan lencana untuk semua pengguna.
 *
 * Dirancang agar adil untuk seluruh level pengguna:
 * - Admin mendapat poin dari kegiatan kurasi (approve, audit) 
 * - User mendapat poin dari kegiatan operasional (buat SPJ, lengkapi dokumen)
 *
 * Semua poin dihitung dari aktivitas nyata yang tersimpan di Firestore
 * (koleksi `userPoints`), sehingga bisa lintas perangkat dan tahan refresh.
 */

export type GamificationAction =
  | "CREATE_SPJ"
  | "COMPLETE_DOCUMENT"
  | "FINALIZE_SPJ"
  | "ATTEND_QR"
  | "DAILY_LOGIN"
  | "APPROVE_REQUEST"
  | "HELPFUL_REVIEW";

/** Poin per aktivitas — nilai kecil agar progres terasa tapi tidak inflasi. */
export const ACTION_POINTS: Record<GamificationAction, number> = {
  CREATE_SPJ: 10,
  COMPLETE_DOCUMENT: 5,
  FINALIZE_SPJ: 20,
  ATTEND_QR: 3,
  DAILY_LOGIN: 1,
  APPROVE_REQUEST: 5,
  HELPFUL_REVIEW: 2,
};

export const ACTION_LABELS: Record<GamificationAction, string> = {
  CREATE_SPJ: "Membuat Paket SPJ Baru",
  COMPLETE_DOCUMENT: "Melengkapi Dokumen SPJ",
  FINALIZE_SPJ: "Menyelesaikan Paket SPJ",
  ATTEND_QR: "Hadir via Presensi QR",
  DAILY_LOGIN: "Aktif Harian",
  APPROVE_REQUEST: "Menyetujui Pengajuan Master Data",
  HELPFUL_REVIEW: "Meninjau Berkas Rekan",
};

/** Level: makin tinggi makin besar lompatan poinnya (kurva kuadratik ringan). */
export interface GamificationLevel {
  level: number;
  title: string;
  minPoints: number;
  color: string;
}

export const LEVELS: GamificationLevel[] = [
  { level: 1, title: "Pemula Administrasi", minPoints: 0, color: "#94A3B8" },
  { level: 2, title: "Staf Teliti", minPoints: 50, color: "#60A5FA" },
  { level: 3, title: "Pengelola Andal", minPoints: 150, color: "#32848D" },
  { level: 4, title: "Ahli SPJ", minPoints: 350, color: "#8B5CF6" },
  { level: 5, title: "Maestro Administrasi", minPoints: 700, color: "#F59E0B" },
  { level: 6, title: "Legenda KARSA", minPoints: 1200, color: "#EF4444" },
];

export const getLevelForPoints = (points: number): GamificationLevel => {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (points >= lvl.minPoints) current = lvl;
  }
  return current;
};

export const getNextLevel = (points: number): GamificationLevel | null => {
  for (const lvl of LEVELS) {
    if (points < lvl.minPoints) return lvl;
  }
  return null;
};

/** Progres menuju level berikutnya (0–100). */
export const getLevelProgress = (points: number): number => {
  const current = getLevelForPoints(points);
  const next = getNextLevel(points);
  if (!next) return 100;
  const span = next.minPoints - current.minPoints;
  if (span <= 0) return 100;
  return Math.min(100, Math.round(((points - current.minPoints) / span) * 100));
};

// ------------------- LENCANA (BADGES) -------------------

export interface GamificationBadge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  /** Return true when the badge should be awarded. */
  check: (stats: BadgeStats) => boolean;
}

export interface BadgeStats {
  totalPoints: number;
  spjCreated: number;
  docsCompleted: number;
  spjFinalized: number;
  qrAttended: number;
  streakDays: number;
}

export const BADGES: GamificationBadge[] = [
  {
    id: "first_spj",
    name: "Langkah Pertama",
    description: "Membuat paket SPJ pertamamu",
    emoji: "🌱",
    check: (s) => s.spjCreated >= 1,
  },
  {
    id: "spj_5",
    name: "Produktif",
    description: "Membuat 5 paket SPJ",
    emoji: "📦",
    check: (s) => s.spjCreated >= 5,
  },
  {
    id: "spj_25",
    name: "Veteran Berkas",
    description: "Membuat 25 paket SPJ",
    emoji: "🏆",
    check: (s) => s.spjCreated >= 25,
  },
  {
    id: "doc_10",
    name: "Penyusun Rapi",
    description: "Melengkapi 10 dokumen SPJ",
    emoji: "📝",
    check: (s) => s.docsCompleted >= 10,
  },
  {
    id: "doc_50",
    name: "Arsip Hidup",
    description: "Melengkapi 50 dokumen SPJ",
    emoji: "📚",
    check: (s) => s.docsCompleted >= 50,
  },
  {
    id: "final_1",
    name: "Tuntas",
    description: "Menyelesaikan paket SPJ pertamamu",
    emoji: "✅",
    check: (s) => s.spjFinalized >= 1,
  },
  {
    id: "final_10",
    name: "Penjamin Mutu",
    description: "Menyelesaikan 10 paket SPJ",
    emoji: "🎯",
    check: (s) => s.spjFinalized >= 10,
  },
  {
    id: "qr_5",
    name: "Hadir Terus",
    description: "Hadir di 5 kegiatan lewat presensi QR",
    emoji: "📱",
    check: (s) => s.qrAttended >= 5,
  },
  {
    id: "streak_7",
    name: "Konsisten",
    description: "Aktif 7 hari berturut-turut",
    emoji: "🔥",
    check: (s) => s.streakDays >= 7,
  },
  {
    id: "points_500",
    name: "Kolektor Poin",
    description: "Mengumpulkan 500 poin",
    emoji: "💎",
    check: (s) => s.totalPoints >= 500,
  },
];

export const getEarnedBadges = (stats: BadgeStats): GamificationBadge[] =>
  BADGES.filter((b) => b.check(stats));

// ------------------- FIREBASE PERSISTENCE SHAPE -------------------

export interface UserGamificationProfile {
  uid: string;
  displayName: string;
  jawatanName?: string;
  totalPoints: number;
  counts: Record<GamificationAction, number>;
  streakDays: number;
  lastActiveDate?: string; // dd-mm-yyyy of last recorded activity
  badges: string[]; // badge ids
  updatedAt?: any;
}

export const emptyCounts = (): Record<GamificationAction, number> => ({
  CREATE_SPJ: 0,
  COMPLETE_DOCUMENT: 0,
  FINALIZE_SPJ: 0,
  ATTEND_QR: 0,
  DAILY_LOGIN: 0,
  APPROVE_REQUEST: 0,
  HELPFUL_REVIEW: 0,
});

export const badgeStatsFromProfile = (p: UserGamificationProfile): BadgeStats => ({
  totalPoints: p.totalPoints || 0,
  spjCreated: p.counts?.CREATE_SPJ || 0,
  docsCompleted: p.counts?.COMPLETE_DOCUMENT || 0,
  spjFinalized: p.counts?.FINALIZE_SPJ || 0,
  qrAttended: p.counts?.ATTEND_QR || 0,
  streakDays: p.streakDays || 0,
});
