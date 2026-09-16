import React from "react";
import { UserProfile } from "../types";
import { LogOut, User as UserIcon, Building2, Shield, FileSpreadsheet } from "lucide-react";

interface NavbarProps {
  user: UserProfile;
  activeTab: "dashboard" | "spj" | "master" | "audit";
  setActiveTab: (tab: "dashboard" | "spj" | "master" | "audit") => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="bg-blue-600 text-white p-2 rounded-xl font-bold shadow-md flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-gray-900">KARSA Temon</span>
              <span className="block text-xs text-blue-600 font-medium">Sistem Pengelolaan SPJ Kecamatan</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-white text-blue-600 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("spj")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "spj"
                  ? "bg-white text-blue-600 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Daftar SPJ
            </button>
            {user.role === "ADMIN" && (
              <>
                <button
                  onClick={() => setActiveTab("master")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "master"
                      ? "bg-white text-blue-600 shadow-sm font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Master Data
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "audit"
                      ? "bg-white text-blue-600 shadow-sm font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Audit Log
                </button>
              </>
            )}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-900 flex items-center justify-end space-x-1">
                <span>{user.displayName}</span>
                {user.role === "ADMIN" && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center">
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
