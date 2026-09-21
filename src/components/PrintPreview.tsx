import React from "react";
import { SpjItem, SpjDocumentItem } from "../types";
import { terbilangRupiah } from "../utils/format";
import { formatDateDDMMYYYY, getNamaHari, getNamaHariCapitalized, getYearFromDate } from "../utils/date";
import { drivePhotoUrl, collectDocPhotos, inspectDriveLink } from "../utils/drive";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import { db } from "../config/firebase";
import { collection, onSnapshot, getDocs } from "firebase/firestore";

/**
 * Ukuran kertas Bend 26: setengah folio (folio 21,5 × 33 cm) dalam posisi
 * vertikal → 16,5 × 21,5 cm. Dipakai untuk mencetak dan untuk pratinjau.
 * `marginMm` adalah sisa tepi kertas agar isi tidak menempel pada batas cetak.
 */
export const BEND26_PAGE = {
  widthMm: 165,
  heightMm: 215,
  marginMm: 6,
};

interface PrintPreviewProps {
  spj: SpjItem;
  documents: SpjDocumentItem[];
  onBack: () => void;
  /** Dokumen yang ditampilkan lebih dulu (dipakai saat mengekspor PDF). */
  initialDocCode?: string;
  /**
   * Saat false, daftar hadir dibaca sekali saja (tanpa listener realtime).
   * Dipakai saat mengekspor PDF agar tidak menambah reads Firestore.
   */
  liveAttendance?: boolean;
}

/** Format a list of ISO dates as "01-02-2026 s.d. 03-02-2026" or comma-joined. */
const formatDateList = (dates?: string[], fallback?: string): string => {
  if (!dates || dates.length === 0) return formatDateDDMMYYYY(fallback);
  const sorted = [...dates].sort();
  if (sorted.length === 1) return formatDateDDMMYYYY(sorted[0]);
  return sorted.map((d) => formatDateDDMMYYYY(d)).join(", ");
};

export const PrintPreview: React.FC<PrintPreviewProps> = ({ spj, documents, onBack, initialDocCode, liveAttendance = true }) => {
  const [selectedDocCode, setSelectedDocCode] = React.useState<string>(initialDocCode || "BEND_26");
  // Live QR attendance rows so the printed daftar hadir matches what was submitted
  const [qrAttendance, setQrAttendance] = React.useState<Array<{ id: string; nama: string; jabatan: string; ttdImage?: string }>>([]);

  React.useEffect(() => {
    if (!spj?.id) return;

    // Mode ekspor PDF: cukup baca sekali (tanpa langganan realtime).
    if (!liveAttendance) {
      getDocs(collection(db, "spj", spj.id, "attendance"))
        .then((snap) => {
          setQrAttendance(
            snap.docs.map((d) => {
              const row = d.data() as any;
              return { id: d.id, nama: row.nama || "", jabatan: row.jabatan || "", ttdImage: row.ttdImage || "" };
            })
          );
        })
        .catch(() => {});
      return;
    }

    const unsub = onSnapshot(collection(db, "spj", spj.id, "attendance"), (snap) => {
      setQrAttendance(
        snap.docs.map((d) => {
          const row = d.data() as any;
          return { id: d.id, nama: row.nama || "", jabatan: row.jabatan || "", ttdImage: row.ttdImage || "" };
        })
      );
    });
    return () => unsub();
  }, [spj?.id, liveAttendance]);

  const activeDoc = documents.find(d => d.documentTypeCode === selectedDocCode);
  const data = activeDoc?.data || {};

  // Lampiran foto: kumpulkan seluruh tautan Google Drive yang ditautkan
  const lampiranPhotos = React.useMemo(() => collectDocPhotos(activeDoc?.data), [activeDoc?.data]);

  // Bend 26 dicetak pada kertas setengah folio vertikal (16,5 × 21,5 cm).
  // Margin @page dibuat 0 dan tepi kertas diwakili padding dalam lembar
  // dokumen, sehingga hasil cetak persis sama dengan yang terlihat di layar
  // (WYSIWYG) dan tidak terpotong oleh margin bawaan browser.
  React.useEffect(() => {
    if (selectedDocCode !== "BEND_26") return;
    const style = document.createElement("style");
    style.setAttribute("data-karsa", "bend26-page");
    style.textContent = `@page { size: ${BEND26_PAGE.widthMm}mm ${BEND26_PAGE.heightMm}mm; margin: 0; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [selectedDocCode]);

  /** Merge QR attendance (real-time) with manually typed peserta rows, QR first. */
  const mergedPeserta = React.useMemo(() => {
    const manual: any[] = data.peserta || [];
    const qrNames = new Set(qrAttendance.map((r) => r.nama.trim().toLowerCase()));
    const manualRows = manual
      .filter((p: any) => p?.nama && !qrNames.has(String(p.nama).trim().toLowerCase()))
      .map((p: any) => ({ nama: p.nama, jabatan: p.jabatan || "", ttdImage: p.ttdImage || "" }));
    const qrRows = qrAttendance.map((r) => ({ nama: r.nama, jabatan: r.jabatan || "", ttdImage: r.ttdImage }));
    return [...qrRows, ...manualRows];
  }, [data.peserta, qrAttendance]);

  const handlePrint = () => {
    window.print();
  };

  // Helper for Notulen Decisions formatting
  const getFormattedKeputusanRapat = (): string => {
    if (data.keputusanRapat) {
      return data.keputusanRapat;
    }
    const jamMulai = data.jamMulai || "09.00";
    const jamSelesai = data.jamSelesai || "11.30";
    return [
      `1. Kegiatan rapat koordinasi dimulai pada pukul ${jamMulai} WIB dibuka dengan doa bersama oleh pemimpin rapat;`,
      `2. Pembukaan dari Panewu Temon;`,
      `3. Diskusi teknis pelaksanaan kegiatan;`,
      `4. Kegiatan rapat koordinasi diakhiri pada pukul ${jamSelesai} WIB ditutup dengan doa bersama oleh pemimpin rapat.`
    ].join("\n");
  };

  const totalPajak = Number(data.phr || 0) + Number(data.pph || 0) + Number(data.ppn || 0);

  return (
    <div className="space-y-6">
      {/* Header controls (Hidden on Print) */}
      <div className="print:hidden bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">{spj.nomorSpj}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">{spj.masterSnapshot.kegiatan.nama}</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {documents.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDocCode(d.documentTypeCode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedDocCode === d.documentTypeCode
                  ? "bg-[#32848D] text-white shadow-sm font-semibold"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              {d.documentTypeCode.replace(/_/g, " ")}
            </button>
          ))}
          <button
            onClick={handlePrint}
            className="ml-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* DOCUMENT PRINT CONTAINER — only .print-doc is visible when printing */}
      <div className="print-doc bg-white p-8 rounded-2xl border border-gray-200 shadow-lg max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-none">
        
        {/* ==================== BEND 26 TEMPLATE ==================== */}
        {selectedDocCode === "BEND_26" && (
          <div
            className="bend26-sheet border border-black space-y-4 font-serif text-sm text-black"
            style={{
              width: `${BEND26_PAGE.widthMm}mm`,
              minHeight: `${BEND26_PAGE.heightMm}mm`,
              padding: `${BEND26_PAGE.marginMm}mm`,
              boxSizing: "border-box",
            }}
          >
            {/* Baris lembar/model — "Model : Bend. 26. a" diletakkan di pojok kanan atas */}
            <div className="flex justify-between items-start text-xs border-b border-black pb-2">
              <p>Lembar : I / II / III / IV / V</p>
              <p>Model : Bend. 26. a</p>
            </div>

            <div className="text-center py-2">
              <h1 className="text-xl font-bold uppercase tracking-wide underline">BUKTI KAS PENGELUARAN</h1>
            </div>

            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-12">
                <span className="col-span-3 font-semibold">Terima dari</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8">Bendahara Pengeluaran Kapanewon Temon</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-3 font-semibold">Uang sebesar</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8 capitalize font-medium">{terbilangRupiah(Number(data.nominal || 0))}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-3 font-semibold">Untuk membayar</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8 whitespace-pre-line">
                  {`${spj.masterSnapshot.kodeRekening.nama}\n${spj.sharedData?.judulAktivitas || "Aktivitas belum diisi"} sebanyak ${spj.sharedData?.jumlahPeserta || 0} peserta pada tanggal ${formatDateDDMMYYYY(spj.tanggal)}\n${spj.masterSnapshot.kegiatan.nama.toUpperCase()}`}
                </span>
              </div>
            </div>

            {/* Terbilang — angka rupiah memakai margin kiri yang sama dengan
                baris "Terima dari / Uang sebesar / Untuk membayar" di atasnya. */}
            <div className="border-t border-b border-black py-3">
              <div className="grid grid-cols-12 items-center font-sans">
                <span className="col-span-3 font-bold text-base">Terbilang</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8">
                  <span className="inline-block text-lg font-extrabold bg-gray-100 px-4 py-1 rounded border border-black font-mono">
                    Rp. {Number(data.nominal || 0).toLocaleString("id-ID")},-
                  </span>
                </span>
              </div>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-3 text-center py-6 text-xs gap-4">
              <div>
                <p className="font-semibold">Mengetahui dan menyetujui</p>
                <p className="font-semibold">Pengguna Anggaran / KPA</p>
                <div className="h-16"></div>
                <p className="font-bold underline">{spj.sharedData?.paNama || "…………………"}</p>
                {spj.sharedData?.paNip ? <p>NIP. {spj.sharedData.paNip}</p> : null}
              </div>
              <div>
                <p className="font-semibold">Bendahara Pengeluaran</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{spj.sharedData?.bendaharaNama || "…………………"}</p>
                {spj.sharedData?.bendaharaNip ? <p>NIP. {spj.sharedData.bendaharaNip}</p> : null}
              </div>
              <div>
                <p className="font-semibold">Penerima</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{data.penerima || "…………………………"}</p>
                {data.penerimaNip ? <p>NIP. {data.penerimaNip}</p> : null}
              </div>
            </div>

            {/* Bottom 3-Column Verification Box (Sesuai Master & Foto) */}
            <div className="border border-black grid grid-cols-3 text-[11px] divide-x divide-black mt-4">
              {/* Kolom 1: Penerimaan Barang/Jasa */}
              <div className="p-2 flex flex-col justify-between">
                <div>
                  <p>Barang tersebut telah diterima</p>
                  <p>dengan cukup dan baik</p>
                </div>
                <div className="mt-10 text-center">
                  <p>( ......................................... )</p>
                </div>
              </div>

              {/* Kolom 2: Telah Dipungut (Rincian Pajak Vertikal) */}
              <div className="p-2 flex flex-col justify-between">
                <div>
                  <p className="font-semibold mb-1">Telah dipungut</p>
                  <table className="w-full text-[10px]">
                    <tbody>
                      <tr>
                        <td className="py-0.5 font-medium">PHR</td>
                        <td className="py-0.5 text-right font-mono">Rp. {Number(data.phr || 0).toLocaleString("id-ID")}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-medium">PPh</td>
                        <td className="py-0.5 text-right font-mono">Rp. {Number(data.pph || 0).toLocaleString("id-ID")}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-medium">PPN</td>
                        <td className="py-0.5 text-right font-mono">Rp. {Number(data.ppn || 0).toLocaleString("id-ID")}</td>
                      </tr>
                      <tr className="border-t border-black font-bold">
                        <td className="py-0.5">Total Pajak</td>
                        <td className="py-0.5 text-right font-mono">Rp. {totalPajak.toLocaleString("id-ID")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-center">
                  <p>( ......................................... )</p>
                </div>
              </div>

              {/* Kolom 3: Pembukuan */}
              <div className="p-2 flex flex-col justify-between">
                <div className="space-y-0.5">
                  <p className="font-semibold">Telah dibukukan</p>
                  <p>BK. Tgl .................... No. ....................</p>
                  <p className="font-mono text-[10px] break-all">
                    Kode Rek. {spj.masterSnapshot.kegiatan.kode} {spj.masterSnapshot.kodeRekening.kode}
                  </p>
                  <p>Tahun Anggaran : {getYearFromDate(spj.tanggal) || spj.tahunAnggaran || "2026"}</p>
                  <p className="mt-1">Paraf</p>
                </div>
                <div className="mt-4 text-center">
                  <p>( ......................................... )</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== NOTULEN TEMPLATE ==================== */}
        {selectedDocCode === "NOTULENSI_RAPAT" && (
          <div className="space-y-6 font-serif text-black text-sm">
            {/* Kop Resmi Pemkab */}
            <div className="flex items-center space-x-4 border-b-2 border-black pb-3">
              <img src="/kulonprogo-logo.png" alt="Logo Pemkab Kulon Progo" className="w-16 h-16 object-contain shrink-0" />
              <div className="text-center flex-1 space-y-0.5">
                <p className="font-bold text-sm uppercase tracking-wide">PEMERINTAH KABUPATEN KULON PROGO</p>
                <p className="font-extrabold text-lg uppercase tracking-wider">KAPANEWON TEMON</p>
                <p className="text-[11px]">Alamat : Jalan Raya Wates-Purworejo Km 10,4 Temon Kulon Progo Telp. (0274) 6472581</p>
                <p className="text-[11px]">Email: temon@kulonprogokab.go.id Web: temon.kulonprogokab.go.id</p>
              </div>
            </div>

            <div className="text-center font-bold text-xl uppercase tracking-widest border-b border-black pb-2">
              NOTULEN
            </div>

            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold w-1/4">Rapat</td>
                  <td className="py-2 w-10 text-center">:</td>
                  <td className="py-2 font-bold uppercase">{spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Hari/ tanggal</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{`${getNamaHariCapitalized(spj.tanggal)}, ${formatDateDDMMYYYY(spj.tanggal)}`}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Pukul</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">
                    {data.jamMulai && data.jamSelesai
                      ? `${data.jamMulai} WIB s.d. ${data.jamSelesai} WIB`
                      : data.pukul || "09.00 WIB s.d. 11.30 WIB"}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Tempat rapat</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2 font-semibold uppercase">{spj.sharedData?.tempat || data.tempat || "PENDOPO KAPANEWON TEMON"}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold align-top">Acara</td>
                  <td className="py-2 text-center align-top">:</td>
                  <td className="py-2">
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Pembukaan</li>
                      <li>Paparan</li>
                      <li>Diskusi</li>
                      <li>Penutup</li>
                    </ol>
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Pemimpin Rapat</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.pemimpinRapat || spj.sharedData?.pemimpinRapat || "…………………………"}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Ketua</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.pemimpinRapat || spj.sharedData?.pemimpinRapat || "…………………………"}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Notulis</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.notulis || spj.sharedData?.notulis || "…………………………"}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Peserta Rapat</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{`${spj.sharedData?.jumlahPeserta || 20} orang`}</td>
                </tr>
              </tbody>
            </table>

            <div className="space-y-4 pt-4">
              <h3 className="font-bold underline text-base">Keputusan Rapat:</h3>
              <div className="whitespace-pre-line text-justify leading-relaxed bg-gray-50 print:bg-transparent p-4 rounded-xl border border-gray-200 print:border-none">
                {getFormattedKeputusanRapat()}
              </div>
            </div>

            <div className="flex justify-end pt-8">
              <div className="text-center w-64">
                <p className="font-semibold">Pemimpin Rapat,</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{data.pemimpinRapat || spj.sharedData?.pemimpinRapat || "…………………………"}</p>
                <p className="text-xs">{data.pemimpinRapatPangkat || spj.sharedData?.pemimpinRapatJabatan || ""}</p>
                {(data.pemimpinRapatNip || spj.sharedData?.pemimpinRapatNip) ? (
                  <p className="text-xs">NIP. {data.pemimpinRapatNip || spj.sharedData?.pemimpinRapatNip}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ==================== DAFTAR HADIR TEMPLATE ==================== */}
        {selectedDocCode === "DAFTAR_HADIR" && (
          <div className="space-y-4 font-sans text-black text-sm">
            <div className="flex items-center space-x-4 border-b-2 border-black pb-3">
              <img src="/kulonprogo-logo.png" alt="Logo Pemkab Kulon Progo" className="w-16 h-16 object-contain shrink-0" />
              <div className="text-center flex-1 space-y-0.5">
                <p className="font-bold text-sm uppercase tracking-wide">PEMERINTAH KABUPATEN KULON PROGO</p>
                <p className="font-extrabold text-lg uppercase tracking-wider">KAPANEWON TEMON</p>
                <p className="text-[11px]">Alamat : Jalan Raya Wates-Purworejo Km 10,4 Temon Kulon Progo Telp. (0274) 6472581</p>
                <p className="text-[11px]">Email: temon@kulonprogokab.go.id Web: temon.kulonprogokab.go.id</p>
              </div>
            </div>

            <div className="text-center py-2 font-bold text-lg underline uppercase">
              DAFTAR HADIR
            </div>

            <div className="text-left text-xs py-2 space-y-1 font-mono uppercase">
              <p><span className="font-semibold inline-block w-24">HARI</span>: {getNamaHari(spj.tanggal)}</p>
              <p><span className="font-semibold inline-block w-24">TANGGAL</span>: {formatDateDDMMYYYY(spj.tanggal)}</p>
              <p><span className="font-semibold inline-block w-24">PUKUL</span>: {data.jam || "09.00 WIB S.D. 11.00 WIB"}</p>
              <p><span className="font-semibold inline-block w-24">TEMPAT</span>: {spj.sharedData?.tempat || data.tempat || "PENDOPO KAPANEWON TEMON"}</p>
              <p><span className="font-semibold inline-block w-24">ACARA</span>: {spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama}</p>
            </div>

            <table className="w-full border border-black text-xs text-center border-collapse">
              <thead>
                <tr className="bg-gray-100 print:bg-transparent border-b border-black">
                  <th className="border border-black p-2 w-12 text-center">NO</th>
                  <th className="border border-black p-2 text-left">NAMA</th>
                  <th className="border border-black p-2 text-left">JABATAN / ALAMAT</th>
                  <th className="border border-black p-2 text-left" colSpan={2}>TANDA TANGAN</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(Number(spj.sharedData?.jumlahPeserta || 15), mergedPeserta.length) }).map((_, idx) => {
                  const rowNo = idx + 1;
                  const isOdd = rowNo % 2 !== 0;
                  const row = mergedPeserta[idx];
                  return (
                    <tr key={idx} className="border-b border-black h-8">
                      <td className="border border-black text-center">{rowNo}</td>
                      <td className="border border-black text-left px-2">{row?.nama || ""}</td>
                      <td className="border border-black text-left px-2">{row?.jabatan || ""}</td>
                      <td className="border border-black text-left px-2 w-32">
                        {isOdd ? (
                          row?.ttdImage ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] shrink-0">{rowNo}.</span>
                              <img src={row.ttdImage} alt="ttd" className="h-7 object-contain" />
                            </div>
                          ) : (
                            <span className="font-mono text-[10px]">{rowNo}.</span>
                          )
                        ) : null}
                      </td>
                      <td className="border border-black text-left px-2 w-32">
                        {!isOdd ? (
                          row?.ttdImage ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] shrink-0">{rowNo}.</span>
                              <img src={row.ttdImage} alt="ttd" className="h-7 object-contain" />
                            </div>
                          ) : (
                            <span className="font-mono text-[10px]">{rowNo}.</span>
                          )
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <div className="text-center w-64 text-xs">
                <p>Temon, {formatDateDDMMYYYY(spj.tanggal)}</p>
                <p className="font-semibold">Pejabat Pelaksana Teknis Kegiatan</p>
                <div className="h-16"></div>
                <p className="font-bold underline">{spj.sharedData?.pptkNama || "…………………………"}</p>
                {spj.sharedData?.pptkNip ? <p>NIP. {spj.sharedData.pptkNip}</p> : null}
              </div>
            </div>
          </div>
        )}

        {/* ==================== LAMPIRAN FOTO TEMPLATE ==================== */}
        {selectedDocCode === "LAMPIRAN_FOTO" && (
          <div className="space-y-6 font-sans text-black text-sm">
            <div className="flex items-center space-x-4 border-b-2 border-black pb-3">
              <img src="/kulonprogo-logo.png" alt="Logo Pemkab Kulon Progo" className="w-16 h-16 object-contain shrink-0" />
              <div className="text-center flex-1 space-y-0.5">
                <p className="font-bold text-sm uppercase tracking-wide">PEMERINTAH KABUPATEN KULON PROGO</p>
                <p className="font-extrabold text-lg uppercase tracking-wider">KAPANEWON TEMON</p>
                <p className="text-[11px]">Alamat : Jalan Raya Wates-Purworejo Km 10,4 Temon Kulon Progo Telp. (0274) 6472581</p>
                <p className="text-[11px]">Email: temon@kulonprogokab.go.id Web: temon.kulonprogokab.go.id</p>
              </div>
            </div>

            <div className="text-center py-2 font-bold text-lg underline uppercase">
              LAMPIRAN FOTO DOKUMENTASI
            </div>

            <div className="text-left text-xs py-1 space-y-1 font-mono uppercase">
              <p><span className="font-semibold inline-block w-24">HARI</span>: {getNamaHari(spj.tanggal)}</p>
              <p><span className="font-semibold inline-block w-24">TANGGAL</span>: {formatDateDDMMYYYY(spj.tanggal)}</p>
              <p><span className="font-semibold inline-block w-24">TEMPAT</span>: {spj.sharedData?.tempat || "PENDOPO KAPANEWON TEMON"}</p>
              <p><span className="font-semibold inline-block w-24">ACARA</span>: {spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama}</p>
            </div>

            {lampiranPhotos.length === 0 ? (
              <div className="text-center p-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl print:hidden">
                <p>Belum ada foto Google Drive yang ditautkan untuk dokumen ini.</p>
                <p className="text-xs mt-2">Silakan isi tautan foto di editor SPJ terlebih dahulu.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {lampiranPhotos.map((link, idx) => {
                  const info = inspectDriveLink(link);
                  const src = drivePhotoUrl(link);
                  return (
                    <div key={`${info?.fileId || idx}`} className="space-y-1.5">
                      <div className="border border-black p-1">
                        {src ? (
                          <img
                            src={src}
                            alt={`Lampiran foto ${idx + 1}`}
                            className="w-full max-h-[110mm] object-contain"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="p-6 text-center text-xs text-gray-500">
                            Tautan tidak dapat dibaca: {link}
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 print:text-black">
                        Foto {idx + 1} — {spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <div className="text-center w-64 text-xs">
                <p>Temon, {formatDateDDMMYYYY(spj.tanggal)}</p>
                <p className="font-semibold">Pejabat Pelaksana Teknis Kegiatan</p>
                <div className="h-16"></div>
                <p className="font-bold underline">{spj.sharedData?.pptkNama || "…………………………"}</p>
                {spj.sharedData?.pptkNip ? <p>NIP. {spj.sharedData.pptkNip}</p> : null}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SPJ AKTIVITAS LAPANGAN TEMPLATE ==================== */}
        {selectedDocCode === "SPJ_AKTIVITAS_LAPANGAN" && (
          <div className="space-y-6 font-serif text-black text-sm">
            <div className="flex items-center space-x-4 border-b-2 border-black pb-3">
              <img src="/kulonprogo-logo.png" alt="Logo Pemkab Kulon Progo" className="w-16 h-16 object-contain shrink-0" />
              <div className="text-center flex-1 space-y-0.5">
                <p className="font-bold text-sm uppercase tracking-wide">PEMERINTAH KABUPATEN KULON PROGO</p>
                <p className="font-extrabold text-lg uppercase tracking-wider">KAPANEWON TEMON</p>
                <p className="text-[11px]">Alamat : Jalan Raya Wates-Purworejo Km 10,4 Temon Kulon Progo Telp. (0274) 6472581</p>
              </div>
            </div>

            <div className="text-center font-bold text-xl uppercase tracking-wider underline">
              LAPORAN HASIL PELAKSANAAN TUGAS
            </div>

            <table className="w-full border border-black border-collapse text-sm">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-3 font-semibold w-12 text-center border-r border-black">1.</td>
                  <td className="p-3 font-semibold w-1/3 border-r border-black">Maksud dan Tujuan Perjalanan Dinas</td>
                  <td className="p-3">: {data.maksudTujuan || spj.sharedData?.judulAktivitas || "Aktivitas Lapangan"}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-3 font-semibold text-center border-r border-black">2.</td>
                  <td className="p-3 font-semibold border-r border-black">Tempat Tujuan</td>
                  <td className="p-3">: {data.tempatTujuan || "Kapanewon Temon"}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-3 font-semibold text-center border-r border-black">3.</td>
                  <td className="p-3 font-semibold border-r border-black">Lamanya Pelaksanaan Tugas</td>
                  <td className="p-3">: {data.lamaTugas || "1 (hari)"}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-3 font-semibold text-center border-r border-black">4.</td>
                  <td className="p-3 font-semibold border-r border-black">Pelaksanaan Tanggal</td>
                  <td className="p-3">
                    : {formatDateList(data.tanggalPelaksanaanList, data.tanggalPelaksanaan || spj.tanggal)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-center border-r border-black align-top">5.</td>
                  <td className="p-3 font-semibold border-r border-black align-top">Kesimpulan (Hasil)</td>
                  <td className="p-3 whitespace-pre-line leading-relaxed text-justify">
                    {data.kesimpulanHasil ||
                      `1. Kegiatan dibuka pukul 08.30 WIB dengan registrasi peserta;\n2. Kegiatan dimulai pukul 09.00 WIB dengan pembukaan dari MC dan menyanyikan Indonesia Raya;\n3. Sambutan dan pembukaan secara resmi oleh Panewu Kapanewon Temon;\n4. Pelaksanaan tugas lapangan berjalan tertib dan lancar;\n5. Kegiatan selesai pukul 12.30 WIB.`}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-2 text-center pt-8 text-xs">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">PANEWU</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{spj.sharedData?.panewuNama || "…………………………"}</p>
                <p>NIP. {spj.sharedData?.panewuNip || "…………………………"}</p>
              </div>
              <div>
                <p>Temon, {formatDateList(data.tanggalPelaksanaanList, data.tanggalPelaksanaan || spj.tanggal)}</p>
                <p className="font-bold">Yang Membuat Laporan</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{data.pembuatLaporan || spj.userName}</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SURAT PERINTAH TEMPLATE ==================== */}
        {selectedDocCode === "SURAT_PERINTAH" && (
          <div className="space-y-6 font-serif text-black text-sm">
            {activeDoc?.externalUrl ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-center space-y-2 print:hidden">
                  <p className="text-indigo-900 font-semibold">Surat Perintah dari Google Drive:</p>
                  <a
                    href={activeDoc.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 text-indigo-600 underline font-mono text-sm"
                  >
                    <span>{activeDoc.externalUrl}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="border border-gray-300 rounded-xl overflow-hidden">
                  <iframe
                    src={activeDoc.externalUrl.replace("/view?usp=drive_fs", "/preview").replace("/edit", "/preview")}
                    className="w-full h-[800px] border-0"
                    title="Surat Perintah"
                  ></iframe>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <p>Belum ada tautan Google Drive yang ditautkan untuk Surat Perintah ini.</p>
                <p className="text-xs mt-2">Silakan isi tautan di editor SPJ terlebih dahulu.</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== SURAT UNDANGAN TEMPLATE ==================== */}
        {selectedDocCode === "SURAT_UNDANGAN" && (
          <div className="space-y-6 font-serif text-black text-sm">
            {activeDoc?.externalUrl ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-center space-y-2 print:hidden">
                  <p className="text-blue-900 font-semibold">Surat Undangan dari Google Drive:</p>
                  <a
                    href={activeDoc.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-600 underline font-mono text-sm"
                  >
                    <span>{activeDoc.externalUrl}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="border border-gray-300 rounded-xl overflow-hidden">
                  <iframe
                    src={activeDoc.externalUrl.replace("/view?usp=drive_fs", "/preview").replace("/edit", "/preview")}
                    className="w-full h-[800px] border-0"
                    title="Surat Undangan"
                  ></iframe>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <p>Belum ada tautan Google Drive yang ditautkan untuk surat undangan ini.</p>
                <p className="text-xs mt-2">Silakan isi tautan di editor SPJ terlebih dahulu.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
