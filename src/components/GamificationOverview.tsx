import React, { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { getUserGamification } from "../services/api";
import {
  UserGamificationProfile,
  LEVELS,
  BADGES,
  getLevelForPoints,
  getNextLevel,
  getLevelProgress,
} from "../utils/gamification";
import { Award, Flame, Star } from "lucide-react";

interface GamificationOverviewProps {
  user: UserProfile;
}

/** Compact score + badge strip for the logged-in dashboard. */
export const GamificationOverview: React.FC<GamificationOverviewProps> = ({ user }) => {
  const [profile, setProfile] = useState<UserGamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getUserGamification(user.uid)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => console.error("Gagal memuat skor:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  const points = profile?.totalPoints || 0;
  const level = getLevelForPoints(points);
  const nextLevel = getNextLevel(points);
  const progress = getLevelProgress(points);
  const earned = profile?.badges || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-3xl bg-gradient-to-br from-[#32848D] to-[#276972] p-6 text-white shadow-lg lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Skor Capaian</p>
              <p className="mt-1 text-3xl font-bold">{loading ? "…" : level.title}</p>
              <p className="mt-1 text-sm opacity-80">
                Level {level.level} dari {LEVELS.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white/20 p-4">
              <Star className="h-10 w-10" />
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
              <div className="h-3 rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <p className="text-2xl font-bold">{points.toLocaleString("id-ID")}</p>
              <p className="mt-0.5 text-[11px] opacity-80">Total Poin</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xl font-bold">
                <Flame className="h-5 w-5 text-amber-300" />
                {profile?.streakDays || 0}
              </p>
              <p className="mt-0.5 text-[11px] opacity-80">Hari Beruntun</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xl font-bold">
                <Award className="h-5 w-5 text-amber-300" />
                {earned.length}
              </p>
              <p className="mt-0.5 text-[11px] opacity-80">Lencana</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-slate-700">
            <Award className="h-5 w-5 text-[#32848D]" />
            <h2 className="font-bold text-gray-900 dark:text-white">Badge</h2>
            <span className="ml-auto text-xs font-semibold text-gray-500">
              {earned.length}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {BADGES.map((badge) => {
              const on = earned.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  title={`${badge.name} — ${badge.description}`}
                  className={`rounded-xl p-2 text-center text-2xl ${
                    on ? "bg-[#CBDCA5]/40" : "bg-gray-50 opacity-40 grayscale dark:bg-slate-700/40"
                  }`}
                >
                  {badge.emoji}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
