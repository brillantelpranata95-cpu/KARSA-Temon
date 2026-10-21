import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Sidebar, AppTab } from "./components/Sidebar";
import { getSpjById, getSpjDocuments, purgeExpiredAttendanceSessions, recordDailyActivity } from "./services/api";
import { SpjItem, SpjDocumentItem } from "./types";

// ------------------- LAZY LOADING (Efisiensi Waktu Muat Awal) -------------------
// Halaman berat (Recharts, SignaturePad, QRCode, modul admin) dimuat hanya saat
// dibutuhkan, sehingga bundle awal tetap kecil dan halaman publik absensi
// (/absen) terbuka cepat bahkan di jaringan lambat.

const Dashboard = lazy(() => import("./components/Dashboard").then((m) => ({ default: m.Dashboard })));
const SpjList = lazy(() => import("./components/SpjList").then((m) => ({ default: m.SpjList })));
const SpjWizard = lazy(() => import("./components/SpjWizard").then((m) => ({ default: m.SpjWizard })));
const PrintPreview = lazy(() => import("./components/PrintPreview").then((m) => ({ default: m.PrintPreview })));
const AdminView = lazy(() => import("./components/AdminView").then((m) => ({ default: m.AdminView })));
const PackageTemplates = lazy(() => import("./components/PackageTemplates").then((m) => ({ default: m.PackageTemplates })));
const OfficialsSettings = lazy(() => import("./components/OfficialsSettings").then((m) => ({ default: m.OfficialsSettings })));
const PublicDashboard = lazy(() => import("./components/PublicDashboard").then((m) => ({ default: m.PublicDashboard })));
const QRAttendancePage = lazy(() => import("./components/QRAttendancePage"));
const QrDisplayPage = lazy(() => import("./components/QrDisplayPage"));

/** Minimal fallback that keeps layout stable while a chunk downloads. */
function PageLoader() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-slate-500">
      <div className="w-8 h-8 border-3 border-[#32848D] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-medium">Memuat halaman...</p>
    </div>
  );
}

function MainApp() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
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

  // Gamifikasi: catat aktivitas harian (streak) sekali per hari kalender
  useEffect(() => {
    if (!user) return;
    recordDailyActivity(user).catch((e) =>
      console.warn("Daily activity record failed:", e)
    );
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

  // Public routes (no app chrome): QR attendance form + full-screen QR display
  if (location.pathname.startsWith("/absen")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/absen/:spjId" element={<QRAttendancePage />} />
        </Routes>
      </Suspense>
    );
  }

  if (location.pathname.startsWith("/qr-display")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/qr-display/:spjId" element={<QrDisplayPage />} />
        </Routes>
      </Suspense>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicDashboard loading={loading} onLogin={signInWithGoogle} />
      </Suspense>
    );
  }

  // Akun nonaktif/dihapus tidak boleh masuk ke area kerja. Tanpa gerbang ini,
  // "Nonaktifkan" di Master Data hanya label tanpa efek.
  if (user.isActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="w-full max-w-md space-y-4 rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl font-bold text-amber-700">
            !
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Akun Anda belum aktif</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Akses untuk <span className="font-semibold">{user.email}</span> belum diaktifkan atau sudah
            dinonaktifkan administrator Kapanewon Temon. Hubungi admin untuk membuka akses.
          </p>
          <button
            onClick={logout}
            className="w-full rounded-xl bg-[#32848D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#276972]"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setViewMode("list");
        }}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col pt-16 lg:pt-0">
        <main className="mx-auto w-full max-w-[1500px] px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
        </main>
      </div>
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
