import React, { useState, useEffect, useRef } from "react";
import { UserProfile } from "../types";
import {
  LogOut,
  Building2,
  Shield,
  Moon,
  Sun,
  Settings,
  FileStack,
  UserCog,
  Database,
  ScrollText,
  Trophy,
  Eye,
  EyeOff,
} from "lucide-react";
import { useHideScores } from "../utils/prefs";

export type AppTab = "dashboard" | "spj" | "master" | "audit" | "packages" | "officials" | "gamification";

interface NavbarProps {
  user: UserProfile;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("karsa-dark-mode");
      return saved === "true";
    }
    return false;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [hideScores, setHideScoresPref] = useHideScores(user.uid);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("karsa-dark-mode", darkMode.toString());
  }, [darkMode]);

  // Close the settings dropdown when clicking outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Main navigation shows only Dashboard and Daftar SPJ.
  // Every other section lives in the account (username) menu.
  const navItems: [AppTab, string][] = [
    ["dashboard", "Dashboard"],
    ["spj", "Daftar SPJ"],
  ];

  const openTab = (tab: AppTab) => {
    setActiveTab(tab);
    setSettingsOpen(false);
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-[#32848D]/10 dark:border-slate-700 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <img src="/karsa-logo.png" alt="KARSA Temon" className="h-11 w-11 rounded-xl object-contain" />
            <div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">KARSA TEMON</span>
              <span className="block text-xs text-[#32848D] font-medium">Kelola Administrasi dan Rekam SPJ</span>
            </div>
          </div>

          <nav className="hidden md:flex space-x-1 bg-[#F6FAF5] dark:bg-slate-700/50 p-1 rounded-xl border border-[#32848D]/10 dark:border-slate-600">
            {navItems.map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-white dark:bg-slate-600 text-[#32848D] dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-600/50"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              title={darkMode ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User chip — clicking opens the Pengaturan menu */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Buka menu pengaturan"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#32848D]/15 flex items-center justify-center text-[#32848D] font-bold text-sm">
                    {user.displayName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center justify-end space-x-1">
                    <span className="max-w-[140px] truncate">{user.displayName}</span>
                    {user.role === "ADMIN" && (
                      <span className="bg-[#CBDCA5]/50 text-[#32848D] text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center shrink-0">
                        <Shield className="w-3 h-3 mr-0.5" /> ADMIN
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center justify-end space-x-1">
                    <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="max-w-[140px] truncate">{user.jawatanName}</span>
                  </div>
                </div>
                <Settings className={`w-4 h-4 text-gray-400 transition-transform ${settingsOpen ? "rotate-90" : ""}`} />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30">
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Pengaturan</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                      Penandatangan, paket SPJ, master data
                    </p>
                  </div>

                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => setHideScoresPref(!hideScores)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F6FAF5] dark:hover:bg-slate-700/60 flex items-start space-x-2.5 transition-colors"
                    >
                      {hideScores ? (
                        <EyeOff className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      ) : (
                        <Eye className="w-4 h-4 text-[#32848D] mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {hideScores ? "Tampilkan skor & pencapaian" : "Sembunyikan skor & pencapaian"}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">
                          {hideScores
                            ? "Kartu poin dan badge kembali muncul di dashboard"
                            : "Sembunyikan skor capaian dan badge di dashboard"}
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => openTab("gamification")}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F6FAF5] dark:hover:bg-slate-700/60 flex items-start space-x-2.5 transition-colors"
                    >
                      <Trophy className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Papan Peringkat</p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">
                          Detail poin, lencana & ranking
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => openTab("officials")}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F6FAF5] dark:hover:bg-slate-700/60 flex items-start space-x-2.5 transition-colors"
                    >
                      <UserCog className="w-4 h-4 text-[#32848D] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Penandatangan Jawatan</p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">
                          PPTK, Notulis & Pemimpin Rapat jawatan Anda
                        </p>
                      </div>
                    </button>

                    {user.role === "ADMIN" && (
                      <>
                        <button
                          onClick={() => openTab("packages")}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F6FAF5] dark:hover:bg-slate-700/60 flex items-start space-x-2.5 transition-colors"
                        >
                          <FileStack className="w-4 h-4 text-[#32848D] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Buat Paket SPJ</p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400">
                              Dokumen wajib per Kode Rekening
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => openTab("master")}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F6FAF5] dark:hover:bg-slate-700/60 flex items-start space-x-2.5 transition-colors"
                        >
                          <Database className="w-4 h-4 text-[#32848D] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Master Data & Akses</p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400">
                              Pengguna, jawatan, sub-kegiatan, rekening
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => openTab("audit")}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F6FAF5] dark:hover:bg-slate-700/60 flex items-start space-x-2.5 transition-colors"
                        >
                          <ScrollText className="w-4 h-4 text-[#32848D] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Audit Log</p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400">
                              Riwayat seluruh aktivitas sistem
                            </p>
                          </div>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="border-t border-gray-100 dark:border-slate-700 p-1.5">
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2.5 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="text-sm font-semibold text-red-600">Keluar / Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex space-x-1 pb-2 overflow-x-auto">
          {navItems.map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-[#32848D] text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
