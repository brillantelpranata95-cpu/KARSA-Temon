import React, { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { getUserGamification } from "../services/api";
import { getLevelForPoints, getLevelProgress, UserGamificationProfile } from "../utils/gamification";
import { Icon } from "./Icon";

/**
 * Ringkasan skor capaian — satu kartu tipis yang menempel pada sapaan di header.
 *
 * Sengaja HANYA memuat dokumen poin milik pengguna sendiri (satu `getDoc`), tanpa
 * papan peringkat: peringkat antar pengguna menuntut pembacaan seluruh koleksi
 * `userPoints` dan tidak lagi ditampilkan di Dashboard.
 */
export const SkorRingkas: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [profile, setProfile] = useState<UserGamificationProfile | null>(null);

  useEffect(() => {
    let batal = false;
    getUserGamification(user.uid)
      .then((p) => {
        if (!batal) setProfile(p);
      })
      .catch(() => undefined);
    return () => {
      batal = true;
    };
  }, [user.uid]);

  const poin = profile?.totalPoints || 0;
  const level = getLevelForPoints(poin);
  const progres = getLevelProgress(poin);
  const lencana = profile?.badges?.length || 0;

  return (
    <div className="flex items-stretch gap-4 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/25 text-white">
          <Icon name="trophy" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/75">
            Level {level.level} · {level.title}
          </p>
          <p className="text-xl font-bold leading-tight text-white">
            {poin.toLocaleString("id-ID")} <span className="text-xs font-semibold text-white/75">poin</span>
          </p>
          <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-[#CBDCA5] transition-[width] duration-500"
              style={{ width: `${Math.max(4, Math.min(100, progres))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center border-l border-white/25 pl-4 text-center">
        <p className="text-xl font-bold leading-tight text-white">{lencana}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/75">Lencana</p>
      </div>
    </div>
  );
};

export default SkorRingkas;
