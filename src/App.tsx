import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Navbar, AppTab } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { SpjList } from "./components/SpjList";
import { SpjWizard } from "./components/SpjWizard";
import { PrintPreview } from "./components/PrintPreview";
import { AdminView } from "./components/AdminView";
import { PackageTemplates } from "./components/PackageTemplates";
import { OfficialsSettings } from "./components/OfficialsSettings";
import { PublicDashboard } from "./components/PublicDashboard";
import QRAttendancePage from "./components/QRAttendancePage";
import { getSpjById, getSpjDocuments, purgeExpiredAttendanceSessions } from "./services/api";
import { SpjItem, SpjDocumentItem } from "./types";

function MainApp() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");

  const [selectedSpjId, setSelectedSpjId] = useState<string | null>(null);
  const [selectedSpj, setSelectedSpj] = useState<SpjItem | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<SpjDocumentItem[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "edit" | "preview">("list");

  // Housekeeping: permanently purge expired QR attendance sessions (30-min TTL)
  // and their captured attendance payloads so storage never accumulates.
  useEffect(() => {
    if (!user) return;
    const sweep = () => {
      purgeExpiredAttendanceSessions().catch((e) =>
        console.warn("Attendance purge sweep failed:", e)
      );
    };
    sweep();
    const iv = setInterval(sweep, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(iv);
  }, [user]);

  const handleSelectSpj = async (spjId: string, mode: "edit" | "preview") => {
    setSelectedSpjId(spjId);
    setViewMode(mode);
    const [s, docs] = await Promise.all([getSpjById(spjId), getSpjDocuments(spjId)]);
    setSelectedSpj(s);
    setSelectedDocs(docs);
  };

  const handleCreateSpj = () => {
    setActiveTab("spj");
    setViewMode("list");
  };

  // Jika di route /absen, jangan render layout utama
  if (location.pathname.startsWith("/absen")) {
    return (
      <Routes>
        <Route path="/absen/:spjId" element={<QRAttendancePage />} />
      </Routes>
    );
  }

  if (!user) {
    return <PublicDashboard loading={loading} onLogin={signInWithGoogle} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
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
        ) : activeTab === "dashboard" ? (
          <Dashboard user={user} onCreateSpj={handleCreateSpj} />
        ) : activeTab === "spj" ? (
          <SpjList user={user} onSelectSpj={handleSelectSpj} />
        ) : activeTab === "packages" ? (
          <PackageTemplates user={user} />
        ) : activeTab === "officials" ? (
          <OfficialsSettings user={user} />
        ) : (
          <AdminView user={user} activeTab={activeTab as "master" | "audit"} />
        )}
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

export default App;
