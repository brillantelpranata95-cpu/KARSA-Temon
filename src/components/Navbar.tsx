import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { LogOut, Building2, Shield, Moon, Sun, Home } from "lucide-react";

interface NavbarProps {
  user: UserProfile;
  activeTab: "dashboard" | "spj" | "master" | "audit";
  setActiveTab: (tab: "dashboard" | "spj" | "master" | "audit") => void;
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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("karsa-dark-mode", darkMode.toString());
  }, [darkMode]);

  const navItems: [string, string][] = [
    ["dashboard", "Dashboard"],
    ["spj", "Daftar SPJ"],
    ...(user.role === "ADMIN" ? ([["master", "Master Data"], ["audit", "Audit Log"]] as [string, string][]) : []),
  ];

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
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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

            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center justify-end space-x-1">
                <span>{user.displayName}</span>
                {user.role === "ADMIN" && (
                  <span className="bg-[#CBDCA5]/50 text-[#32848D] text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center">
                    <Shield className="w-3 h-3 mr-0.5" /> ADMIN
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center justify-end space-x-1">
                <Building2 className="w-3 h-3 text-gray-400" />
                <span>{user.jawatanName}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              title="Keluar / Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex space-x-1 pb-2 overflow-x-auto">
          {navItems.map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
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
