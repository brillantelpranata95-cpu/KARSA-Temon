import React, { useEffect, useState } from "react";
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
import { Trophy, Flame, Star, Award, TrendingUp, RefreshCw, Target } from "lucide-react";

interface GamificationPageProps {
  user: UserProfile;
}

export const GamificationPage: React.FC<GamificationPageProps> = ({ user }) => {
  const [profile, setProfile] = useState<UserGamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserGamificationProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Catat aktivitas harian (streak) lalu muat profil + papan peringkat
      await recordDailyActivity(user);
      const [p, lb] = await Promise.all([
        getUserGamification(user.uid),
        getGamificationLeaderboard(),
      ]);
      setProfile(p);
      setLeaderboard(lb);
    } catch (err) {
      console.error("Gagal memuat gamifikasi:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const points = profile?.totalPoints || 0;
  const level = getLevelForPoints(points);
  const nextLevel = getNextLevel(points);
  const progress = getLevelProgress(points);
  const badgeStats = profile ? badgeStatsFromProfile(profile) : null;
  const earnedBadgeIds = profile?.badges || [];
  const myRank = leaderboard.findIndex((p) => p.uid === user.uid) + 1;

  const actionEntries = profile
    ? (Object.entries(profile.counts || {}) as [GamificationAction, number][]).filter(
        ([, count]) => count > 0
      )
    : [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Gamifikasi & Pencapaian
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Kumpulkan poin dari aktivitas SPJ-mu dan raih lencana penghargaan.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 font-semibold text-sm inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-gray-100 dark:border-slate-700 text-center text-gray-400">
          Memuat data gamifikasi...
        </div>
      ) : (
        <>
          {/* KARTU PROFIL POIN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Level Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#32848D] to-[#276972] p-6 rounded-3xl text-white shadow-lg space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs opacity-80 font-semibold uppercase tracking-wide">Level Kamu</p>
                  <p className="text-3xl font-bold mt-1">{level.title}</p>
                  <p className="text-sm opacity-80 mt-1">
                    Level {level.level} dari {LEVELS.length}
                  </p>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl">
                  <Star className="w-10 h-10" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2 opacity-90">
                  <span>{points.toLocaleString("id-ID")} poin</span>
                  <span>
                    {nextLevel
                      ? `${nextLevel.minPoints.toLocaleString("id-ID")} poin untuk ${nextLevel.title}`
                      : "Level maksimum tercapai! 🎉"}
                  </span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-white transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold">{points.toLocaleString("id-ID")}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">Total Poin</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Flame className="w-5 h-5 text-amber-300" />
                    {profile?.streakDays || 0}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">Hari Beruntun</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Award className="w-5 h-5 text-amber-300" />
                    {earnedBadgeIds.length}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">Lencana</p>
                </div>
              </div>
            </div>

            {/* Rank Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-center items-center text-center space-y-3">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-2xl">
                <TrendingUp className="w-10 h-10 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold">Peringkat Kamu</p>
                <p className="text-5xl font-bold text-gray-900 dark:text-white mt-1">
                  {myRank > 0 ? `#${myRank}` : "—"}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  dari {leaderboard.length} pengguna aktif
                </p>
              </div>
            </div>
          </div>

          {/* LENCANA */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-700 pb-3">
              <Award className="w-5 h-5 text-[#32848D]" />
              <h2 className="font-bold text-gray-900 dark:text-white">Lencana Penghargaan</h2>
              <span className="ml-auto text-xs font-semibold text-gray-500 dark:text-slate-400">
                {earnedBadgeIds.length}/{BADGES.length} diperoleh
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {BADGES.map((badge) => {
                const earned = earnedBadgeIds.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-2xl border text-center transition ${
                      earned
                        ? "bg-[#CBDCA5]/30 dark:bg-[#CBDCA5]/10 border-[#CBDCA5] dark:border-[#CBDCA5]/50"
                        : "bg-gray-50 dark:bg-slate-700/40 border-gray-100 dark:border-slate-700 opacity-50 grayscale"
                    }`}
                    title={badge.description}
                  >
                    <p className="text-3xl">{badge.emoji}</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white mt-2">{badge.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 leading-snug">
                      {badge.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AKTIVITAS & PAPAN PERINGKAT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aktivitas */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-700 pb-3">
                <Target className="w-5 h-5 text-[#32848D]" />
                <h2 className="font-bold text-gray-900 dark:text-white">Rincian Aktivitas</h2>
              </div>
              {actionEntries.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
                  Belum ada aktivitas tercatat. Mulai buat paket SPJ untuk mendapat poin!
                </p>
              ) : (
                <div className="space-y-2">
                  {actionEntries.map(([action, count]) => (
                    <div
                      key={action}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/40"
                    >
                      <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {ACTION_LABELS[action] || action}
                      </span>
                      <span className="text-xs font-bold text-[#32848D] bg-[#32848D]/10 px-2.5 py-1 rounded-full">
                        {count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Papan Peringkat */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-700 pb-3">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-gray-900 dark:text-white">Papan Peringkat</h2>
              </div>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
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
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          isMe
                            ? "bg-[#32848D]/10 border border-[#32848D]/30"
                            : "bg-gray-50 dark:bg-slate-700/40"
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            idx === 0
                              ? "bg-amber-100 text-amber-700"
                              : idx === 1
                              ? "bg-gray-200 text-gray-700"
                              : idx === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-slate-300"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {p.displayName} {isMe && <span className="text-[#32848D]">(Kamu)</span>}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                            {pLevel.title}
                            {p.jawatanName ? ` — ${p.jawatanName}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#32848D] shrink-0">
                          {(p.totalPoints || 0).toLocaleString("id-ID")} poin
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CARA MENDAPATKAN POIN */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-3">
              Cara Mendapatkan Poin
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/40 flex items-start gap-3"
                >
                  <span className="text-xs font-bold text-white bg-[#32848D] px-2 py-1 rounded-lg shrink-0">
                    {pts}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-slate-300 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
