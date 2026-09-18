import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../config/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import SignaturePad from "signature_pad";

interface SpjData {
  id: string;
  judulAktivitas: string;
  tanggal: string;
  jawatanName?: string;
}

const QRAttendancePage: React.FC = () => {
  const { spjId } = useParams<{ spjId: string }>();
  const [spjData, setSpjData] = useState<SpjData | null>(null);
  const [loading, setLoading] = useState(true);
  const [namaPeserta, setNamaPeserta] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (!spjId) return;
    const fetchSpj = async () => {
      try {
        const spjDoc = await getDoc(doc(db, "spj", spjId));
        if (spjDoc.exists()) {
          const d = spjDoc.data();
          setSpjData({
            id: spjDoc.id,
            judulAktivitas: d.judulAktivitas || "Kegiatan",
            tanggal: d.tanggal || "",
            jawatanName: d.jawatanName || "",
          });
        } else {
          setSpjData(null);
        }
      } catch {
        setSpjData(null);
      }
      setLoading(false);
    };
    fetchSpj();
  }, [spjId]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const pad = new SignaturePad(canvasRef.current, {
      backgroundColor: "#ffffff",
      penColor: "#1a1a1a",
      minWidth: 1.5,
      maxWidth: 3,
    });
    signaturePadRef.current = pad;

    // Responsive resize
    const handleResize = () => {
      if (canvasRef.current && pad) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvasRef.current.width = canvasRef.current.offsetWidth * ratio;
        canvasRef.current.height = 200 * ratio;
        pad.fromData(pad.toData());
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = async () => {
    if (!spjId || !namaPeserta.trim()) {
      alert("Mohon isi nama lengkap Anda.");
      return;
    }
    if (signaturePadRef.current?.isEmpty()) {
      alert("Mohon tanda tangan di kotak yang tersedia.");
      return;
    }

    try {
      const ttdDataUrl = signaturePadRef.current?.toDataURL("image/png") || "";
      const attCol = collection(db, "spj", spjId, "attendance");
      await addDoc(attCol, {
        nama: namaPeserta.trim(),
        ttdImage: ttdDataUrl,
        timestamp: serverTimestamp(),
        method: "QR_SIGNATURE",
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
      <div className="min-h-screen bg-[#F6FAF5] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link Tidak Valid</h1>
          <p className="text-sm text-gray-500">Tautan absensi ini tidak ditemukan atau sudah tidak berlaku.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F6FAF5] flex items-center justify-center">
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
      {/* Header Card */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 p-7 mb-6">
          <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-gray-100">
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

          {/* Form Input Nama */}
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
                autoFocus
                className="w-full border-2 border-gray-200 focus:border-[#32848D] rounded-2xl px-4 py-3.5 text-base font-medium outline-none transition-colors"
              />
            </div>

            {/* Signature Pad */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Tanda Tangan Digital
              </label>
              <p className="text-[11px] text-gray-400 mb-2 italic">Silahkan tanda tangan di kotak putih di bawah ini</p>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden bg-white relative">
                <canvas ref={canvasRef} className="w-full touch-none" style={{ height: "200px" }} />
              </div>
              <button
                type="button"
                onClick={handleClearSignature}
                className="mt-2 text-xs text-[#32848D] hover:text-[#276972] font-medium underline"
              >
                Hapus & Ulangi Tanda Tangan
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
