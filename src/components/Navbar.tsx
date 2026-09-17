import React from "react";
import { UserProfile } from "../types";
import { LogOut, Building2, Shield } from "lucide-react";

interface NavbarProps {
  user: UserProfile;
  activeTab: "dashboard" | "spj" | "master" | "audit";
  setActiveTab: (tab: "dashboard" | "spj" | "master" | "audit") => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  return (
    <header className="bg-white border-b border-[#32848D]/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <img src="/karsa-logo.png" alt="KARSA Temon" className="h-11 w-11 rounded-xl object-contain" />
            <div>
              <span className="text-xl font-bold tracking-tight text-gray-900">KARSA Temon</span>
              <span className="block text-xs text-[#32848D] font-medium">Sistem Pengelolaan SPJ Kecamatan</span>
            </div>
          </div>

          <nav className="hidden md:flex space-x-1 bg-[#F6FAF5] p-1 rounded-xl border border-[#32848D]/10">
            {[
              ["dashboard", "Dashboard"],
              ["spj", "Daftar SPJ"],
              ...(user.role === "ADMIN" ? [["master", "Master Data"], ["audit", "Audit Log"]] : [])
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-white text-[#32848D] shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-900 flex items-center justify-end space-x-1">
                <span>{user.displayName}</span>
                {user.role === "ADMIN" && (
                  <span className="bg-[#CBDCA5]/50 text-[#32848D] text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center">
                    <Shield className="w-3 h-3 mr-0.5" /> ADMIN
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 flex items-center justify-end space-x-1">
                <Building2 className="w-3 h-3 text-gray-400" />
                <span>{user.jawatanName}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Keluar / Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
