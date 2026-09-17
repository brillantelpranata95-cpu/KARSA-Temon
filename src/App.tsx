import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { SpjList } from "./components/SpjList";
import { SpjWizard } from "./components/SpjWizard";
import { PrintPreview } from "./components/PrintPreview";
import { AdminView } from "./components/AdminView";
import { PublicDashboard } from "./components/PublicDashboard";
import { getSpjById, getSpjDocuments } from "./services/api";
import { SpjItem, SpjDocumentItem } from "./types";

export function App() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "spj" | "master" | "audit">("dashboard");

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

  const handleCreateSpj = () => {
    setActiveTab("spj");
    setViewMode("list");
  };

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
        ) : (
          <AdminView user={user} activeTab={activeTab as "master" | "audit"} />
        )}
      </main>
    </div>
  );
}

export default App;
