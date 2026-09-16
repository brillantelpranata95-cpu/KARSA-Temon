import React, { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { SpjList } from "./components/SpjList";
import { SpjWizard } from "./components/SpjWizard";
import { PrintPreview } from "./components/PrintPreview";
import { AdminView } from "./components/AdminView";
import { getSpjById, getSpjDocuments } from "./services/api";
import { SpjItem, SpjDocumentItem } from "./types";
import { FileSpreadsheet, Lock, ShieldCheck, Sparkles } from "lucide-react";

export function App() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "spj" | "master" | "audit">("spj");

  // Selected SPJ for edit/preview
  const [selectedSpjId, setSelectedSpjId] = useState<string | null>(null);
  const [selectedSpj, setSelectedSpj] = useState<SpjItem | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<SpjDocumentItem[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "edit" | "preview">("list");

  const handleSelectSpj = async (spjId: string, mode: "edit" | "preview") => {
    setSelectedSpjId(spjId);
    setViewMode(mode);
    const [s, docs] = await Promise.all([getSpjById(spjId), getSpjDocuments(spjId)]);
    setSelectedSpj(s);
    setSelectedDocs(docs);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">KARSA Temon</h1>
            <p className="text-sm text-gray-500 mt-1">
              Sistem Otomasi SPJ Kapanewon Temon, Kulon Progo
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-600 space-y-2 text-left">
            <div className="flex items-center space-x-2 text-blue-600 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Autentikasi Aman Google Workspace</span>
            </div>
            <p>
              Masuk menggunakan akun dinas atau email terdaftar untuk mengelola pertanggungjawaban kegiatan.
            </p>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all flex items-center justify-center space-x-3"
          >
            <span>Masuk dengan Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setViewMode("list");
        }}
        onLogout={logout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === "preview" && selectedSpj ? (
          <PrintPreview
            spj={selectedSpj}
            documents={selectedDocs}
            onBack={() => setViewMode("list")}
          />
        ) : viewMode === "edit" && selectedSpjId ? (
          <SpjWizard
            user={user}
            spjId={selectedSpjId}
            onBack={() => setViewMode("list")}
            onPreview={() => handleSelectSpj(selectedSpjId, "preview")}
          />
        ) : activeTab === "dashboard" || activeTab === "spj" ? (
          <SpjList user={user} onSelectSpj={handleSelectSpj} />
        ) : (
          <AdminView user={user} activeTab={activeTab as "master" | "audit"} />
        )}
      </main>
    </div>
  );
}

export default App;
