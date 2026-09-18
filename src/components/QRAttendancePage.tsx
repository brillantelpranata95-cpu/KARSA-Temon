import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { db } from "../config/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import SignaturePad from "signature_pad";
import { getActiveAttendanceSession } from "../services/api";

interface SpjData {
  id: string;
  judulAktivitas: string;
  tanggal: string;
  jawatanName?: string;
}

/**
 * Export the signature as a COMPACT transparent PNG.
 * Steps: trim empty margins → downscale → re-encode as PNG.
 * Keeps documents crisp while storing only a few KB per participant.
 * (SignaturePad v5 draws directly onto the canvas element it was given.)
 */
const exportCompactSignature = (canvas: HTMLCanvasElement): string => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  const { width, height } = canvas;
  const pixels = ctx.getImageData(0, 0, width, height).data;

  // Find the bounding box of inked pixels (alpha based — background is transparent)
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || maxY < 0) return canvas.toDataURL("image/png");

  // Small padding so strokes are never clipped
  const padding = 8;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // Downscale: keep at most 600px on the longest side (signatures stay legible)
  const MAX_SIDE = 600;
  const scale = Math.min(1, MAX_SIDE / Math.max(cropW, cropH));
  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const outCtx = out.getContext("2d");
  if (!outCtx) return canvas.toDataURL("image/png");
  // Transparent background — no white box when printed over a document
  outCtx.clearRect(0, 0, outW, outH);
  outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, outW, outH);

  return out.toDataURL("image/png");
};

const QRAttendancePage: React.FC = () => {
  const { spjId } = useParams<{ spjId: string }>();
  const [spjData, setSpjData] = useState<SpjData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [namaPeserta, setNamaPeserta] = useState("");
  const [jabatanPeserta, setJabatanPeserta] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  // Signals that the canvas is mounted so the pad-init effect can run
  const [canvasReady, setCanvasReady] = useState(false);

  // ---- Load SPJ + validate 30-minute attendance session ----
  useEffect(() => {
    if (!spjId) return;
    const fetchData = async () => {
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
          setSpjData(null);
        }

        // Session must exist and be unexpired (30-minute TTL)
        const active = await getActiveAttendanceSession(spjId);
        if (active) {
          setSessionValid(true);
          setSessionId(active.id);
          setSessionExpiresAt(active.expiresAtMs);
        } else {
          setSessionValid(false);
        }
      } catch (e) {
        console.error("Failed to load attendance data:", e);
        setSpjData(null);
        setSessionValid(false);
      }
      setLoading(false);
    };
    fetchData();
  }, [spjId]);

  // ---- Countdown timer for session expiry ----
  useEffect(() => {
    if (!sessionExpiresAt) return;
    const tick = () => {
      const left = sessionExpiresAt - Date.now();
      setRemainingMs(left);
      if (left <= 0) setSessionValid(false);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt]);

  // ---- Initialize SignaturePad ONLY after the canvas is actually mounted ----
  // (previously the effect ran on first render while the canvas was still absent)
  useEffect(() => {
    if (!canvasReady || !canvasRef.current || signaturePadRef.current) return;

    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    // Size the drawing buffer from the rendered element; this also clears the canvas.
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      // Transparent background → exported PNG has no white box, so it prints cleanly
      backgroundColor: "rgba(0,0,0,0)",
      penColor: "#1a1a1a",
      minWidth: 1.5,
      maxWidth: 3,
    });
    signaturePadRef.current = pad;

    const handleResize = () => {
      if (!canvasRef.current || !signaturePadRef.current) return;
      const r = Math.max(window.devicePixelRatio || 1, 1);
      const data = signaturePadRef.current.toData();
      canvasRef.current.width = canvasRef.current.offsetWidth * r;
      canvasRef.current.height = canvasRef.current.offsetHeight * r;
      const c = canvasRef.current.getContext("2d");
      if (c) c.scale(r, r);
      signaturePadRef.current.clear();
      signaturePadRef.current.fromData(data);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      pad.off();
      signaturePadRef.current = null;
    };
  }, [canvasReady]);

  // Callback ref: flips canvasReady once the element is attached to the DOM.
  const attachCanvas = useCallback((node: HTMLCanvasElement | null) => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
    setCanvasReady(!!node);
  }, []);

  const handleSubmit = async () => {
    if (!spjId) return;
    if (sessionValid === false) {
      alert("Sesi absensi sudah berakhir (melebihi 30 menit). Minta panitia membuat QR baru.");
      return;
    }
    if (!namaPeserta.trim()) {
      alert("Mohon isi nama lengkap Anda.");
      return;
    }
    if (!jabatanPeserta.trim()) {
      alert("Mohon isi jabatan / alamat Anda.");
      return;
    }
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert("Mohon tanda tangan di kotak yang tersedia.");
      return;
    }

    try {
      const ttdDataUrl = canvasRef.current
        ? exportCompactSignature(canvasRef.current)
        : (signaturePadRef.current.toDataURL("image/png") || "");
      const attCol = collection(db, "spj", spjId, "attendance");
      await addDoc(attCol, {
        nama: namaPeserta.trim(),
        jabatan: jabatanPeserta.trim(),
        ttdImage: ttdDataUrl,
        timestamp: serverTimestamp(),
        timestampMs: Date.now(),
        method: "QR_SIGNATURE",
        sessionId: sessionId || null,
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan kehadiran. Silakan coba lagi.");
    }
  };

  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
  };

  const formatRemaining = (ms: number): string => {
    if (ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6FAF5] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#32848D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#32848D] font-semibold">Memuat data kegiatan...</p>
        </div>
      </div>
    );
  }

  if (!spjData) {
    return (
      <div className="min-h-screen bg-[#F6FAF5] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link Tidak Valid</h1>
          <p className="text-sm text-gray-500">Tautan absensi ini tidak ditemukan atau sudah tidak berlaku.</p>
        </div>
      </div>
    );
  }

  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-[#F6FAF5] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-amber-700 mb-2">Sesi Absensi Berakhir</h1>
          <p className="text-sm text-gray-500">
            QR code absensi ini hanya berlaku 30 menit sejak dibuat. Silakan minta panitia membuat QR code baru.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F6FAF5] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-emerald-700 mb-2">Absensi Berhasil!</h1>
          <p className="text-gray-600 mb-1">Terima kasih, <strong>{namaPeserta}</strong>!</p>
          <p className="text-sm text-gray-400">Kehadiran Anda telah tercatat untuk kegiatan:</p>
          <p className="font-semibold text-[#32848D] mt-2">{spjData.judulAktivitas}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6FAF5] via-white to-[#E8F5E9] py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 p-7 mb-6">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-[#32848D]/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[#32848D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-[#32848D] leading-tight">Daftar Hadir Online</h1>
                <p className="text-xs text-gray-400 mt-0.5">Sistem Pengelolaan SPJ Kecamatan Temon</p>
              </div>
            </div>
            {remainingMs > 0 && (
              <div className="text-right">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Berlaku</p>
                <p className={`text-sm font-mono font-bold ${remainingMs < 5 * 60 * 1000 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatRemaining(remainingMs)}
                </p>
              </div>
            )}
          </div>

          {/* Info Kegiatan */}
          <div className="bg-[#F6FAF5] rounded-2xl p-4 mb-5 space-y-2">
            <div className="flex items-start space-x-2.5">
              <span className="text-xs font-semibold text-gray-400 w-24 shrink-0 pt-0.5">Kegiatan</span>
              <span className="text-sm font-bold text-gray-800">{spjData.judulAktivitas}</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <span className="text-xs font-semibold text-gray-400 w-24 shrink-0 pt-0.5">Tanggal</span>
              <span className="text-sm font-medium text-gray-700">{spjData.tanggal}</span>
            </div>
            {spjData.jawatanName && (
              <div className="flex items-start space-x-2.5">
                <span className="text-xs font-semibold text-gray-400 w-24 shrink-0 pt-0.5">Jawatan</span>
                <span className="text-sm font-medium text-gray-700">{spjData.jawatanName}</span>
              </div>
            )}
          </div>

          {/* Form Input Nama & Jabatan */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Nama Lengkap Peserta
              </label>
              <input
                type="text"
                value={namaPeserta}
                onChange={(e) => setNamaPeserta(e.target.value)}
                placeholder="Ketik nama lengkap Anda..."
                className="w-full border-2 border-gray-200 focus:border-[#32848D] rounded-2xl px-4 py-3.5 text-base font-medium outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Jabatan / Alamat
              </label>
              <input
                type="text"
                value={jabatanPeserta}
                onChange={(e) => setJabatanPeserta(e.target.value)}
                placeholder="Contoh: Staf Kapanewon Temon / Temon Kulon"
                className="w-full border-2 border-gray-200 focus:border-[#32848D] rounded-2xl px-4 py-3.5 text-base font-medium outline-none transition-colors"
              />
            </div>

            {/* Signature Pad */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Tanda Tangan Digital
              </label>
              <p className="text-[11px] text-gray-400 mb-2 italic">
                Silahkan tanda tangan (coret-coret) di kotak putih di bawah ini menggunakan jari atau mouse
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden bg-white">
                <canvas
                  ref={attachCanvas}
                  className="w-full block bg-white"
                  style={{ height: "200px", touchAction: "none" }}
                />
              </div>
              <button
                type="button"
                onClick={handleClearSignature}
                className="mt-2 text-xs text-[#32848D] hover:text-[#276972] font-medium underline"
              >
                Hapus &amp; Ulangi Tanda Tangan
              </button>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="w-full bg-[#32848D] hover:bg-[#276972] text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-[#32848D]/25 transition-all active:scale-[0.98]"
            >
              ✅ Kirim Absensi
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-[10px] text-gray-300 text-center mt-5">
            KARSA TEMON — Kelola Administrasi dan Rekam SPJ<br />
            Sistem Pengelolaan SPJ Terintegrasi Kecamatan Temon
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRAttendancePage;
