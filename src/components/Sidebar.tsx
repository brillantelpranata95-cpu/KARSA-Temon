import React, { useEffect, useRef, useState } from "react";
import { UserProfile } from "../types";
import { Icon } from "./Icon";
import { useHideScores } from "../utils/prefs";
import { GRAHA_URL } from "../config/appConfig";

export type AppTab = "dashboard" | "spj" | "master" | "audit" | "packages" | "officials" | "gamification";

interface SidebarProps {
  user: UserProfile;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onLogout: () => void;
}

const GELAP_KEY = "karsa-dark-mode";
const LIPAT_KEY = "karsa-sidebar-lipat";

/**
 * Navigasi samping KARSA.
 *
 * Dua kelompok dipisah supaya jelas: MENU (berpindah halaman) dan PENGATURAN
 * (kelola data & preferensi). Sidebar tampil RINGKAS (ikon saja) secara bawaan
 * agar area kerja lebih lapang; pilihan pengguna diingat di localStorage.
 */
export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(GELAP_KEY) === "true";
  });

  // Bawaan RINGKAS (collapsed). Hanya dibuka bila pengguna pernah membukanya.
  const [lipat, setLipat] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const tersimpan = localStorage.getItem(LIPAT_KEY);
    return tersimpan === null ? true : tersimpan === "true";
  });

  const [laciTerbuka, setLaciTerbuka] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [hideScores, setHideScoresPref] = useHideScores(user.uid);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem(GELAP_KEY, darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(LIPAT_KEY, lipat.toString());
  }, [lipat]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (laciTerbuka && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setLaciTerbuka(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [laciTerbuka]);

  const bukaTab = (tab: AppTab) => {
    setActiveTab(tab);
    setLaciTerbuka(false);
  };

  const menuUtama: { id: AppTab; label: string; ikon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", ikon: <Icon name="layout-dashboard" className="w-5 h-5" /> },
    { id: "spj", label: "Daftar SPJ", ikon: <Icon name="file-text" className="w-5 h-5" /> },
  ];

  const menuPengaturan: { id: AppTab; label: string; ket: string; ikon: React.ReactNode }[] = [
    {
      id: "gamification",
      label: "Papan Peringkat",
      ket: "Detail poin, lencana & ranking",
      ikon: <Icon name="trophy" className="w-5 h-5" />,
    },
    {
      id: "officials",
      label: "Penandatangan Jawatan",
      ket: "PPTK, Notulis & Pemimpin Rapat",
      ikon: <Icon name="user-cog" className="w-5 h-5" />,
    },
  ];
  if (user.role === "ADMIN") {
    menuPengaturan.push(
      {
        id: "packages",
        label: "Buat Paket SPJ",
        ket: "Dokumen wajib per Kode Rekening",
        ikon: <Icon name="files" className="w-5 h-5" />,
      },
      {
        id: "master",
        label: "Master Data & Akses",
        ket: "Pengguna, jawatan, rekening",
        ikon: <Icon name="database" className="w-5 h-5" />,
      },
      {
        id: "audit",
        label: "Audit Log",
        ket: "Riwayat aktivitas sistem",
        ikon: <Icon name="scroll" className="w-5 h-5" />,
      },
    );
  }

  /** Satu tombol menu; saat ringkas hanya ikon + tooltip. */
  const TombolMenu = ({
    aktif,
    label,
    ikon,
    onClick,
    lebarPenuh,
    sub,
  }: {
    aktif: boolean;
    label: string;
    ikon: React.ReactNode;
    onClick: () => void;
    lebarPenuh: boolean;
    sub?: string;
  }) => (
    <button
      onClick={onClick}
      title={lebarPenuh ? undefined : label}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        lebarPenuh ? "" : "justify-center"
      } ${
        aktif
          ? "bg-[#32848D] text-white shadow-lg shadow-[#32848D]/25"
          : "text-gray-600 dark:text-slate-300 hover:bg-[#F6FAF5] dark:hover:bg-slate-700/60"
      }`}
    >
      <span className={`shrink-0 ${lebarPenuh ? "mt-0.5" : ""}`}>{ikon}</span>
      {lebarPenuh && (
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{label}</span>
          {sub && (
            <span
              className={`mt-0.5 block text-[11px] ${
                aktif ? "text-white/80" : "text-gray-500 dark:text-slate-400"
              }`}
            >
              {sub}
            </span>
          )}
        </span>
      )}
    </button>
  );

  const isiSidebar = (lebarPenuh: boolean) => (
    <>
      {/* Merek */}
      <div className={`flex items-center gap-3 px-3 py-5 ${lebarPenuh ? "" : "justify-center"}`}>
        <img
          src="/karsa-logo.png"
          alt="KARSA Temon"
          className="h-10 w-10 shrink-0 rounded-xl object-contain"
        />
        {lebarPenuh && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-bold tracking-tight text-gray-900 dark:text-white">
              KARSA TEMON
            </p>
            <p className="truncate text-[11px] font-medium text-[#32848D]">
              Kelola Administrasi &amp; Rekam SPJ
            </p>
          </div>
        )}
      </div>

      {/* Menu utama */}
      <nav className="space-y-1 px-2">
        {menuUtama.map((m) => (
          <TombolMenu
            key={m.id}
            aktif={activeTab === m.id}
            label={m.label}
            ikon={m.ikon}
            onClick={() => bukaTab(m.id)}
            lebarPenuh={lebarPenuh}
          />
        ))}
      </nav>

      {/* Pengaturan */}
      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2 scroll-tipis">
        {lebarPenuh && (
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
            Pengaturan
          </p>
        )}
        <div className="space-y-1">
          {menuPengaturan.map((m) => (
            <TombolMenu
              key={m.id}
              aktif={activeTab === m.id}
              label={m.label}
              sub={m.ket}
              ikon={m.ikon}
              onClick={() => bukaTab(m.id)}
              lebarPenuh={lebarPenuh}
            />
          ))}

          {/* Sembunyikan skor — preferensi, bukan halaman */}
          <button
            onClick={() => setHideScoresPref(!hideScores)}
            title={lebarPenuh ? undefined : "Sembunyikan skor & pencapaian"}
            className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-gray-600 transition hover:bg-[#F6FAF5] dark:text-slate-300 dark:hover:bg-slate-700/60 ${
              lebarPenuh ? "" : "justify-center"
            }`}
          >
            <span className={`shrink-0 ${lebarPenuh ? "mt-0.5" : ""}`}>
              {hideScores ? <Icon name="eye-off" className="w-5 h-5" /> : <Icon name="eye" className="w-5 h-5" />}
            </span>
            {lebarPenuh && (
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {hideScores ? "Tampilkan skor" : "Sembunyikan skor"}
                </span>
                <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-slate-400">
                  Kartu poin &amp; badge di dashboard
                </span>
              </span>
            )}
          </button>

          {/* Pintasan GRAHA — satu origin, jadi tidak perlu login ulang */}
          <a
            href={GRAHA_URL}
            title={lebarPenuh ? undefined : "GRAHA Temon"}
            className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-[#32848D] transition hover:bg-[#F6FAF5] dark:text-[#9ED4DA] dark:hover:bg-slate-700/60 ${
              lebarPenuh ? "" : "justify-center"
            }`}
          >
            <span className={`shrink-0 ${lebarPenuh ? "mt-0.5" : ""}`}>
              <Icon name="landmark" className="w-5 h-5" />
            </span>
            {lebarPenuh && (
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-semibold">
                  GRAHA Temon
                  <Icon name="external-link" className="w-3 h-3 opacity-60" />
                </span>
                <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-slate-400">
                  Peminjaman ruangan &amp; fasilitas
                </span>
              </span>
            )}
          </a>
        </div>
      </div>

      {/* Bawah: tema, identitas, keluar */}
      <div className="space-y-2 px-2 pb-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-[#F6FAF5] dark:text-slate-300 dark:hover:bg-slate-700/60 ${
            lebarPenuh ? "" : "justify-center"
          }`}
        >
          {darkMode ? (
            <Icon name="sun" className="w-5 h-5 shrink-0" />
          ) : (
            <Icon name="moon" className="w-5 h-5 shrink-0" />
          )}
          {lebarPenuh && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        <div
          className={`rounded-2xl bg-[#F6FAF5] p-3 dark:bg-slate-700/40 ${
            lebarPenuh ? "" : "text-center"
          }`}
        >
          {lebarPenuh ? (
            <>
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {user.displayName}
              </p>
              <p className="truncate text-[11px] text-gray-500 dark:text-slate-400">
                {user.jawatanName}
              </p>
              {user.role === "ADMIN" && (
                <span className="mt-1 inline-flex items-center rounded-full bg-[#CBDCA5]/50 px-2 py-0.5 text-[10px] font-bold text-[#32848D]">
                  <Icon name="shield" className="w-3 h-3 mr-0.5" /> ADMIN
                </span>
              )}
            </>
          ) : (
            <span className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-[#32848D]/15 text-xs font-bold text-[#32848D]">
              {user.displayName?.charAt(0)?.toUpperCase() || "U"}
            </span>
          )}
        </div>

        <button
          onClick={onLogout}
          title="Keluar"
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20 ${
            lebarPenuh ? "" : "justify-center"
          }`}
        >
          <Icon name="log-out" className="w-5 h-5 shrink-0" />
          {lebarPenuh && <span>Keluar / Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Tombol buka laci (layar kecil) */}
      <button
        onClick={() => setLaciTerbuka(true)}
        className="fixed left-3 top-3 z-40 grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-lg lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        aria-label="Buka menu"
      >
        <Icon name="menu" className="w-5 h-5" />
      </button>

      {/* Sidebar tetap (layar besar) */}
      <aside
        className={`hidden shrink-0 border-r border-gray-200 bg-white transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:flex-col lg:self-start lg:overflow-hidden dark:border-slate-700 dark:bg-slate-800 ${
          lipat ? "w-[76px]" : "w-72"
        }`}
      >
        {isiSidebar(!lipat)}
        <button
          onClick={() => setLipat((v) => !v)}
          className="mx-2 mb-3 flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-[#F6FAF5] dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700/60"
          title={lipat ? "Perlebar menu" : "Perkecil menu"}
        >
          {lipat ? <Icon name="chevron-right" className="w-4 h-4" /> : <Icon name="chevron-left" className="w-4 h-4" />}
          {!lipat && <span>Perkecil</span>}
        </button>
      </aside>

      {/* Laci geser (layar kecil) */}
      {laciTerbuka && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" />
          <div
            ref={menuRef}
            className="relative flex h-full w-72 flex-col border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800"
          >
            <button
              onClick={() => setLaciTerbuka(false)}
              className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label="Tutup menu"
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
            {isiSidebar(true)}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
