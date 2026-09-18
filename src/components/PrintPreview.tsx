import React from "react";
import { SpjItem, SpjDocumentItem } from "../types";
import { terbilangRupiah } from "../utils/format";
import { formatDateDDMMYYYY, getNamaHari, getNamaHariCapitalized, getYearFromDate } from "../utils/date";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import { db } from "../config/firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface PrintPreviewProps {
  spj: SpjItem;
  documents: SpjDocumentItem[];
  onBack: () => void;
}

/** Format a list of ISO dates as "01-02-2026 s.d. 03-02-2026" or comma-joined. */
const formatDateList = (dates?: string[], fallback?: string): string => {
  if (!dates || dates.length === 0) return formatDateDDMMYYYY(fallback);
  const sorted = [...dates].sort();
  if (sorted.length === 1) return formatDateDDMMYYYY(sorted[0]);
  return sorted.map((d) => formatDateDDMMYYYY(d)).join(", ");
};

export const PrintPreview: React.FC<PrintPreviewProps> = ({ spj, documents, onBack }) => {
  const [selectedDocCode, setSelectedDocCode] = React.useState<string>("BEND_26");
  // Live QR attendance rows so the printed daftar hadir matches what was submitted
  const [qrAttendance, setQrAttendance] = React.useState<Array<{ id: string; nama: string; ttdImage?: string }>>([]);

  React.useEffect(() => {
    if (!spj?.id) return;
    const unsub = onSnapshot(collection(db, "spj", spj.id, "attendance"), (snap) => {
      setQrAttendance(
        snap.docs.map((d) => {
          const row = d.data() as any;
          return { id: d.id, nama: row.nama || "", ttdImage: row.ttdImage || "" };
        })
      );
    });
    return () => unsub();
  }, [spj?.id]);

  const activeDoc = documents.find(d => d.documentTypeCode === selectedDocCode);
  const data = activeDoc?.data || {};

  /** Merge QR attendance (real-time) with manually typed peserta rows, QR first. */
  const mergedPeserta = React.useMemo(() => {
    const manual: any[] = data.peserta || [];
    const qrNames = new Set(qrAttendance.map((r) => r.nama.trim().toLowerCase()));
    const manualRows = manual
      .filter((p: any) => p?.nama && !qrNames.has(String(p.nama).trim().toLowerCase()))
      .map((p: any) => ({ nama: p.nama, jabatan: p.jabatan || "", ttdImage: p.ttdImage || "" }));
    const qrRows = qrAttendance.map((r) => ({ nama: r.nama, jabatan: "", ttdImage: r.ttdImage }));
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
          <div className="border border-black p-6 space-y-4 font-serif text-sm text-black">
            <div className="flex justify-between items-start text-xs border-b border-black pb-2">
              <div>
                <p>Lembar : I / II / III / IV / V</p>
                <p>Model : Bend. 26. a</p>
              </div>
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
                  {`${spj.sharedData?.judulAktivitas || "Aktivitas belum diisi"} sebanyak ${spj.sharedData?.jumlahPeserta || 0} peserta pada tanggal ${formatDateDDMMYYYY(spj.tanggal)}\n${spj.masterSnapshot.kodeRekening.nama}\n${spj.masterSnapshot.kegiatan.nama.toUpperCase()}`}
                </span>
              </div>
            </div>

            <div className="border-t border-b border-black py-3 flex justify-between items-center font-sans">
              <span className="font-bold text-base">Terbilang</span>
              <span className="text-lg font-extrabold bg-gray-100 px-4 py-1 rounded border border-black font-mono">
                Rp. {Number(data.nominal || 0).toLocaleString("id-ID")},-
              </span>
            </div>

            {/* Rincian Pajak — kembali di bagian bawah Bend 26 */}
            <div className="border border-black">
              <div className="bg-gray-100 px-3 py-1 text-xs font-bold uppercase border-b border-black">
                Rincian Pajak
              </div>
              <div className="grid grid-cols-4 text-xs divide-x divide-black">
                <div className="p-2">
                  <p className="font-semibold">PPh 21 / PHR</p>
                  <p className="font-mono mt-1">Rp. {Number(data.phr || 0).toLocaleString("id-ID")},-</p>
                </div>
                <div className="p-2">
                  <p className="font-semibold">PPh</p>
                  <p className="font-mono mt-1">Rp. {Number(data.pph || 0).toLocaleString("id-ID")},-</p>
                </div>
                <div className="p-2">
                  <p className="font-semibold">PPN</p>
                  <p className="font-mono mt-1">Rp. {Number(data.ppn || 0).toLocaleString("id-ID")},-</p>
                </div>
                <div className="p-2 bg-gray-50">
                  <p className="font-semibold">Total Pajak</p>
                  <p className="font-mono font-bold mt-1">Rp. {totalPajak.toLocaleString("id-ID")},-</p>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-3 text-center py-6 text-xs gap-4">
              <div>
                <p className="font-semibold">Mengetahui dan menyetujui</p>
                <p className="font-semibold">Pengguna Anggaran / KPA</p>
                <div className="h-16"></div>
                <p className="font-bold underline">{spj.sharedData?.paNama || "…………………"}</p>
                <p>NIP. {spj.sharedData?.paNip || "…………………"}</p>
              </div>
              <div>
                <p className="font-semibold">Bendahara Pengeluaran</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{spj.sharedData?.bendaharaNama || "…………………"}</p>
                <p>NIP. {spj.sharedData?.bendaharaNip || "…………………"}</p>
              </div>
              <div>
                <p className="font-semibold">Penerima</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{data.penerima || "…………………………"}</p>
                <p>NIP. {data.penerimaNip || "…………………………"}</p>
              </div>
            </div>

            {/* Bottom Verification */}
            <div className="border-t border-black pt-2 grid grid-cols-3 text-[11px] space-y-1">
              <div>
                <p>Barang tersebut telah diterima dengan cukup dan baik.</p>
                <div className="h-6"></div>
                <p>(…………………………)</p>
              </div>
              <div></div>
              <div>
                <p>Telah dibukukan BK. Tgl: ……………</p>
                <p className="font-mono">Kode Rek: {spj.masterSnapshot.kegiatan.kode} {spj.masterSnapshot.kodeRekening.kode}</p>
                <p>Tahun Anggaran: {getYearFromDate(spj.tanggal) || spj.tahunAnggaran}</p>
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
              NOTULEN RAPAT
            </div>

            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold w-1/4">Rapat</td>
                  <td className="py-2 w-10 text-center">:</td>
                  <td className="py-2">{spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Hari / Tanggal</td>
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
                  <td className="py-2 font-semibold">Tempat Rapat</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.tempat || "Pendopo Kapanewon Temon"}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Pemimpin Rapat</td>
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
                <p className="text-xs">NIP. {data.pemimpinRapatNip || spj.sharedData?.pemimpinRapatNip || "…………………………"}</p>
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

            <div className="text-left text-xs py-2 space-y-1 font-mono">
              <p><span className="font-semibold inline-block w-24">HARI</span>: {getNamaHari(spj.tanggal)}</p>
              <p><span className="font-semibold inline-block w-24">TANGGAL</span>: {formatDateDDMMYYYY(spj.tanggal)}</p>
              <p><span className="font-semibold inline-block w-24">PUKUL</span>: {data.jam || "09.00 WIB s.d. 11.00 WIB"}</p>
              <p><span className="font-semibold inline-block w-24">TEMPAT</span>: {data.tempat || "PENDOPO KAPANEWON TEMON"}</p>
              <p><span className="font-semibold inline-block w-24">ACARA</span>: {spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama}</p>
            </div>

            <table className="w-full border border-black text-xs text-center border-collapse">
              <thead>
                <tr className="bg-gray-100 print:bg-transparent border-b border-black">
                  <th className="border-r border-black p-2 w-12">NO</th>
                  <th className="border-r border-black p-2 text-left">NAMA</th>
                  <th className="border-r border-black p-2 text-left">JABATAN / ALAMAT</th>
                  <th className="p-2 w-40">TANDA TANGAN</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(Number(spj.sharedData?.jumlahPeserta || 15), mergedPeserta.length) }).map((_, idx) => {
                  const row = mergedPeserta[idx];
                  return (
                    <tr key={idx} className="border-b border-black h-8">
                      <td className="border-r border-black">{idx + 1}</td>
                      <td className="border-r border-black text-left px-2">
                        {row?.nama || ""}
                      </td>
                      <td className="border-r border-black text-left px-2">
                        {row?.jabatan || ""}
                      </td>
                      <td className="text-left px-2">
                        {row?.ttdImage ? (
                          <img
                            src={row.ttdImage}
                            alt="ttd"
                            className="h-8 object-contain mx-auto"
                          />
                        ) : (
                          <span className="font-mono text-[10px]">{idx % 2 === 0 ? `${idx + 1}. .........` : `        ${idx + 1}. .........`}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <div className="text-center w-64 text-xs">
                <p>Temon, {formatDateDDMMYYYY(spj.tanggal)}</p>
                <p className="font-semibold">PPTK</p>
                <div className="h-16"></div>
                <p className="font-bold underline">{spj.sharedData?.pptkNama || "…………………………"}</p>
                <p>NIP. {spj.sharedData?.pptkNip || "…………………………"}</p>
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
