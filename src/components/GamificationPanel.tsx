import React, { useCallback, useEffect, useState } from "react";
import { UserProfile } from "../types";
import {
  getUserGamification,
  getGamificationLeaderboard,
  recordDailyActivity,
} from "../services/api";
import {
  UserGamificationProfile,
  LEVELS,
  BADGES,
  getLevelForPoints,
  getNextLevel,
  getLevelProgress,
  badgeStatsFromProfile,
  ACTION_LABELS,
  GamificationAction,
} from "../utils/gamification";
import { Icon } from "./Icon";

interface GamificationPanelProps {
  user: UserProfile;
}

/**
 * Panel skor capaian + papan peringkat.
 *
 * Dulu isinya halaman terpisah ("Papan Peringkat" di sidebar). Sekarang
 * seluruh isinya menyatu di Dashboard supaya angka yang dilihat pengguna
 * berasal dari SATU sumber yang sama: dokumen `userPoints/{uid}`.
 *
 * Poin harian dicatat di sini (sekali per hari) sehingga skor di Dashboard
 * ikut bertambah tanpa perlu membuka halaman lain.
 */
export const GamificationPanel: React.FC<GamificationPanelProps> = ({ user }) => {
  const [profile, setProfile] = useState<UserGamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserGamificationProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [gagal, setGagal] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setGagal(null);
    try {
      await recordDailyActivity(user);
      const [p, lb] = await Promise.all([
        getUserGamification(user.uid),
        getGamificationLeaderboard(),
      ]);
      setProfile(p);
      setLeaderboard(lb);
    } catch (err) {
      console.error("Gagal memuat gamifikasi:", err);
      setGagal("Sebagian data capaian gagal dimuat.");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const points = profile?.totalPoints || 0;
  const level = getLevelForPoints(points);
  const nextLevel = getNextLevel(points);
  const progress = getLevelProgress(points);
  const earnedBadgeIds = profile?.badges || [];
  const myRank = leaderboard.findIndex((p) => p.uid === user.uid) + 1;

  const actionEntries = profile
    ? (Object.entries(profile.counts || {}) as [GamificationAction, number][]).filter(
        ([, count]) => count > 0
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Judul panel + segarkan */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Icon name="trophy" className="h-5 w-5 text-amber-500" />
            Skor Capaian &amp; Papan Peringkat
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Poin dari aktivitas SPJ-mu, lencana yang diraih, dan peringkat antar pengguna.
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 self-start rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300"
        >
          <Icon name="refresh-ccw" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {gagal && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          {gagal}
        </p>
      )}

      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-gray-400 dark:border-slate-700 dark:bg-slate-800">
          Memuat data capaian...
        </div>
      ) : (
        <>
          {/* Kartu level + peringkat */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 rounded-3xl bg-gradient-to-br from-[#32848D] to-[#276972] p-6 text-white shadow-lg lg:col-span-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Level Kamu</p>
                  <p className="mt-1 text-3xl font-bold">{level.title}</p>
                  <p className="mt-1 text-sm opacity-80">
                    Level {level.level} dari {LEVELS.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/20 p-4">
                  <Icon name="star" className="h-10 w-10" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs opacity-90">
                  <span>{points.toLocaleString("id-ID")} poin</span>
                  <span>
                    {nextLevel
                      ? `${nextLevel.minPoints.toLocaleString("id-ID")} poin untuk ${nextLevel.title}`
                      : "Level maksimum tercapai"}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-3 rounded-full bg-white transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-bold">{points.toLocaleString("id-ID")}</p>
                  <p className="mt-0.5 text-[11px] opacity-80">Total Poin</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <Icon name="fire" className="h-5 w-5 text-amber-300" />
                    {profile?.streakDays || 0}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-80">Hari Beruntun</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <Icon name="award" className="h-5 w-5 text-amber-300" />
                    {earnedBadgeIds.length}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-80">Lencana</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-900/30">
                <Icon name="medal" className="h-10 w-10 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Peringkat Kamu</p>
                <p className="mt-1 text-5xl font-bold text-gray-900 dark:text-white">
                  {myRank > 0 ? `#${myRank}` : "—"}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  dari {leaderboard.length} pengguna aktif
                </p>
              </div>
            </div>
          </div>

          {/* Lencana */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-slate-700">
              <Icon name="award" className="h-5 w-5 text-[#32848D]" />
              <h3 className="font-bold text-gray-900 dark:text-white">Lencana Penghargaan</h3>
              <span className="ml-auto text-xs font-semibold text-gray-500 dark:text-slate-400">
                {earnedBadgeIds.length}/{BADGES.length} diperoleh
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {BADGES.map((badge) => {
                const earned = earnedBadgeIds.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`rounded-2xl border p-4 text-center transition ${
                      earned
                        ? "border-[#CBDCA5] bg-[#CBDCA5]/30 dark:border-[#CBDCA5]/50 dark:bg-[#CBDCA5]/10"
                        : "border-gray-100 bg-gray-50 opacity-50 grayscale dark:border-slate-700 dark:bg-slate-700/40"
                    }`}
                    title={badge.description}
                  >
                    <p className="text-3xl">{badge.emoji}</p>
                    <p className="mt-2 text-xs font-bold text-gray-900 dark:text-white">{badge.name}</p>
                    <p className="mt-1 text-[10px] leading-snug text-gray-500 dark:text-slate-400">
                      {badge.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aktivitas + papan peringkat */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-slate-700">
                <Icon name="target" className="h-5 w-5 text-[#32848D]" />
                <h3 className="font-bold text-gray-900 dark:text-white">Rincian Aktivitas</h3>
              </div>
              {actionEntries.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                  Belum ada aktivitas tercatat. Mulai buat paket SPJ untuk mendapat poin!
                </p>
              ) : (
                <div className="space-y-2">
                  {actionEntries.map(([action, count]) => (
                    <div
                      key={action}
                      className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-slate-700/40"
                    >
                      <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {ACTION_LABELS[action] || action}
                      </span>
                      <span className="rounded-full bg-[#32848D]/10 px-2.5 py-1 text-xs font-bold text-[#32848D]">
                        {count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-slate-700">
                <Icon name="trophy" className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">Papan Peringkat</h3>
              </div>
              {leaderboard.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                  Belum ada data papan peringkat.
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((p, idx) => {
                    const isMe = p.uid === user.uid;
                    const pLevel = getLevelForPoints(p.totalPoints || 0);
                    return (
                      <div
                        key={p.uid}
                        className={`flex items-center gap-3 rounded-xl p-3 ${
                          isMe
                            ? "border border-[#32848D]/30 bg-[#32848D]/10"
                            : "bg-gray-50 dark:bg-slate-700/40"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0
                              ? "bg-amber-100 text-amber-700"
                              : idx === 1
                              ? "bg-gray-200 text-gray-700"
                              : idx === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-600 dark:bg-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                            {p.displayName} {isMe && <span className="text-[#32848D]">(Kamu)</span>}
                          </p>
                          <p className="truncate text-[10px] text-gray-500 dark:text-slate-400">
                            {pLevel.title}
                            {p.jawatanName ? ` — ${p.jawatanName}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-[#32848D]">
                          {(p.totalPoints || 0).toLocaleString("id-ID")} poin
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cara mendapatkan poin */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 border-b border-gray-100 pb-3 font-bold text-gray-900 dark:text-white dark:border-slate-700">
              Cara Mendapatkan Poin
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["CREATE_SPJ", "+10 poin", "Setiap membuat paket SPJ baru"],
                  ["COMPLETE_DOCUMENT", "+5 poin", "Setiap melengkapi dokumen SPJ"],
                  ["FINALIZE_SPJ", "+20 poin", "Setiap menyelesaikan paket SPJ"],
                  ["ATTEND_QR", "+3 poin", "Hadir lewat presensi QR"],
                  ["DAILY_LOGIN", "+1 poin", "Aktif menggunakan aplikasi setiap hari"],
                  ["APPROVE_REQUEST", "+5 poin", "Admin menyetujui pengajuan master data"],
                ] as const
              ).map(([action, pts, desc]) => (
                <div
                  key={action}
                  className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 dark:bg-slate-700/40"
                >
                  <span className="shrink-0 rounded-lg bg-[#32848D] px-2 py-1 text-xs font-bold text-white">
                    {pts}
                  </span>
                  <p className="text-xs leading-snug text-gray-600 dark:text-slate-300">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
