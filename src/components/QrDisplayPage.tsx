import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { db } from "../config/firebase";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import QRCode from "qrcode";
import { createAttendanceSession, getActiveAttendanceSession } from "../services/api";
import { formatDateDDMMYYYY } from "../utils/date";

interface SpjData {
  id: string;
  judulAktivitas: string;
  tanggal: string;
  jawatanName?: string;
}

/**
 * Full-screen QR display page (opens in a new tab).
 * Shows an oversized QR code with the activity details so participants
 * can scan it from a distance.
 */
const QrDisplayPage: React.FC = () => {
  const { spjId } = useParams<{ spjId: string }>();
  const [spjData, setSpjData] = useState<SpjData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hadirCount, setHadirCount] = useState(0);

  const attendanceUrl = spjId ? `${window.location.origin}/absen/${spjId}` : "";

  const startSession = useCallback(async () => {
    if (!spjId) return;
    try {
      const session = await createAttendanceSession(spjId, {
        uid: "qr-display",
        email: "",
        displayName: "QR Display",
        role: "USER",
        jawatanId: "",
        jawatanName: "",
        isActive: true,
      });
      setExpiresAt(session.expiresAtMs);
      const dataUrl = await QRCode.toDataURL(attendanceUrl, {
        width: 720,
        margin: 2,
        color: { dark: "#111111", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error("Failed to start session:", e);
      setError("Gagal membuat sesi QR.");
    }
  }, [spjId, attendanceUrl]);

  // Load SPJ info, reuse an active session if present, otherwise create one
  useEffect(() => {
    if (!spjId) return;
    const boot = async () => {
      try {
        const spjDoc = await getDoc(doc(db, "spj", spjId));
        if (spjDoc.exists()) {
          const d = spjDoc.data();
          setSpjData({
            id: spjDoc.id,
            judulAktivitas: d.sharedData?.judulAktivitas || d.masterSnapshot?.kegiatan?.nama || "Kegiatan",
            tanggal: d.tanggal || "",
            jawatanName: d.jawatanName || "",
          });
        } else {
          setError("SPJ tidak ditemukan.");
          setLoading(false);
          return;
        }

        const active = await getActiveAttendanceSession(spjId);
        if (active) {
          setExpiresAt(active.expiresAtMs);
          const dataUrl = await QRCode.toDataURL(attendanceUrl, {
            width: 720,
            margin: 2,
            color: { dark: "#111111", light: "#ffffff" },
            errorCorrectionLevel: "H",
          });
          setQrDataUrl(dataUrl);
        } else {
          await startSession();
        }
      } catch (e) {
        console.error(e);
        setError("Gagal memuat data kegiatan.");
      }
      setLoading(false);
    };
    boot();
  }, [spjId, attendanceUrl, startSession]);

  // Live countdown
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = expiresAt - Date.now();
      setRemainingMs(left > 0 ? left : 0);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  // Live count of participants who have signed in
  useEffect(() => {
    if (!spjId) return;
    const unsub = onSnapshot(collection(db, "spj", spjId, "attendance"), (snap) => {
      setHadirCount(snap.size);
    });
    return () => unsub();
  }, [spjId]);

  const formatRemaining = (ms: number): string => {
    if (ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const expired = expiresAt !== null && remainingMs <= 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#32848D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#32848D] font-semibold">Menyiapkan QR absensi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-red-500 text-4xl mb-3">⚠️</p>
          <h1 className="text-xl font-bold text-gray-800 mb-1">QR Tidak Tersedia</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 px-6">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        {/* Activity info */}
        <div className="space-y-1">
          <p className="text-sm font-bold uppercase tracking-widest text-[#32848D]">
            DAFTAR HADIR ONLINE
          </p>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
            {spjData?.judulAktivitas}
          </h1>
          <p className="text-base text-gray-500">
            {spjData?.jawatanName} — {formatDateDDMMYYYY(spjData?.tanggal)}
          </p>
        </div>

        {/* QR code */}
        <div className="flex justify-center">
          {qrDataUrl && !expired ? (
            <div className="bg-white p-5 rounded-3xl border-4 border-gray-900 shadow-2xl">
              <img
                src={qrDataUrl}
                alt="QR Code Absensi"
                className="w-[420px] h-[420px] object-contain"
              />
            </div>
          ) : (
            <div className="w-[420px] h-[420px] rounded-3xl border-4 border-dashed border-gray-300 flex flex-col items-center justify-center gap-3">
              <p className="text-4xl">⏰</p>
              <p className="text-lg font-bold text-gray-500">Sesi QR Berakhir</p>
              <button
                onClick={() => {
                  setExpiresAt(null);
                  setQrDataUrl("");
                  setLoading(true);
                  startSession().finally(() => setLoading(false));
                }}
                className="px-5 py-2.5 bg-[#32848D] hover:bg-[#276972] text-white font-bold rounded-xl text-sm"
              >
                Buat QR Baru (30 menit)
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <p className="text-xl font-bold text-gray-800">
            Pindai QR ini untuk mengisi daftar hadir
          </p>
          <p className="text-sm text-gray-500">
            Buka kamera / aplikasi pemindai QR di ponsel Anda, lalu isi nama dan tanda tangan digital.
          </p>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase text-gray-400">Berlaku</p>
            <p
              className={`text-2xl font-mono font-extrabold ${
                remainingMs < 5 * 60 * 1000 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {formatRemaining(remainingMs)}
            </p>
          </div>
          <div className="w-px h-10 bg-gray-200"></div>
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase text-gray-400">Sudah Hadir</p>
            <p className="text-2xl font-mono font-extrabold text-[#32848D]">{hadirCount}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 pt-4">
          QR hanya berlaku 30 menit sejak dibuat, setelah itu sesi & data absensi dihapus permanen.
          <br />
          Link absensi: <span className="font-mono">{attendanceUrl}</span>
        </p>
      </div>
    </div>
  );
};

export default QrDisplayPage;
