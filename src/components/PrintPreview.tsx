import React from "react";
import { SpjItem, SpjDocumentItem } from "../types";
import { terbilangRupiah } from "../utils/format";
import { ArrowLeft, CheckCircle2, Circle, AlertCircle, ExternalLink, Printer } from "lucide-react";

interface PrintPreviewProps {
  spj: SpjItem;
  documents: SpjDocumentItem[];
  onBack: () => void;
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({ spj, documents, onBack }) => {
  const [selectedDocCode, setSelectedDocCode] = React.useState<string>("BEND_26");

  const activeDoc = documents.find(d => d.documentTypeCode === selectedDocCode);
  const data = activeDoc?.data || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header controls (Hidden on Print) */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-gray-900">{spj.nomorSpj}</h2>
            <p className="text-xs text-gray-500">{spj.masterSnapshot.kegiatan.nama}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {documents.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDocCode(d.documentTypeCode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedDocCode === d.documentTypeCode
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {d.documentTypeCode.replace("_", " ")}
            </button>
          ))}
          <button
            onClick={handlePrint}
            className="ml-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* DOCUMENT PRINT CONTAINER (Apple HIG Clean Typography) */}
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-lg max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-none">
        
        {/* ==================== BEND 26 TEMPLATE ==================== */}
        {selectedDocCode === "BEND_26" && (
          <div className="border border-black p-6 space-y-4 font-serif text-sm text-black">
            <div className="flex justify-between items-start text-xs border-b border-black pb-2">
              <div>
                <p>Lembar : I / II / III / IV / V</p>
                <p>Model : Bend. 26.a</p>
              </div>
              <div className="text-right">
                <p>Pajak PHR: Rp. {Number(data.phr || 0).toLocaleString("id-ID")}</p>
                <p>Pajak PPh: Rp. {Number(data.pph || 0).toLocaleString("id-ID")}</p>
                <p>Pajak PPN: Rp. {Number(data.ppn || 0).toLocaleString("id-ID")}</p>
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
                  {`${spj.sharedData?.judulAktivitas || "Aktivitas belum diisi"} sebanyak ${spj.sharedData?.jumlahPeserta || 0} peserta pada tanggal ${spj.tanggal}\n${spj.masterSnapshot.kodeRekening.nama}\n${spj.masterSnapshot.kegiatan.nama.toUpperCase()}`}
                </span>
              </div>
            </div>

            <div className="border-t border-b border-black py-3 flex justify-between items-center font-sans">
              <span className="font-bold text-base">JUMLAH:</span>
              <span className="text-lg font-extrabold bg-gray-100 px-4 py-1 rounded border border-black">
                Rp. {Number(data.nominal || 320000).toLocaleString("id-ID")}
              </span>
              <span className="text-xs">Temon, {data.tanggalKas || spj.tanggal}</span>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-3 text-center py-6 text-xs gap-4">
              <div>
                <p className="font-semibold">Mengetahui dan menyetujui</p>
                <p className="font-semibold">Pengguna Anggaran / KPA</p>
                <div className="h-16"></div>
                <p className="font-bold underline">{spj.sharedData?.paNama || "RUSDI SUWARNO, SIP, M.M"}</p>
                <p>NIP. {spj.sharedData?.paNip || "19770721 199603 1 001"}</p>
              </div>
              <div>
                <p className="font-semibold">Bendahara Pengeluaran</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{spj.sharedData?.bendaharaNama || "SUBARI"}</p>
                <p>NIP. {spj.sharedData?.bendaharaNip || "19700110 200801 1 013"}</p>
              </div>
              <div>
                <p className="font-semibold">PPTK</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{spj.sharedData?.pptkNama || "SURADIMAN, S.I.P., M.M."}</p>
                <p>NIP. {spj.sharedData?.pptkNip || "19730101 199303 1 008"}</p>
              </div>
            </div>

            {/* Bottom Verification */}
            <div className="border-t border-black pt-2 grid grid-cols-3 text-[11px] space-y-1">
              <div>
                <p>Barang tersebut telah diterima dengan cukup dan baik.</p>
                <div className="h-6"></div>
                <p>(…………………………)</p>
              </div>
              <div>
                <p>Telah dipungut Pajak:</p>
                <p>PHR: Rp. {Number(data.phr || 0).toLocaleString("id-ID")}</p>
                <p>PPh: Rp. {Number(data.pph || 0).toLocaleString("id-ID")}</p>
                <p>PPN: Rp. {Number(data.ppn || 0).toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p>Telah dibukukan BK. Tgl: ……………</p>
                <p className="font-mono">Kode Rek: {spj.masterSnapshot.kodeRekening.kode}</p>
                <p>Tahun Anggaran: {spj.tahunAnggaran}</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== NOTULEN TEMPLATE ==================== */}
        {selectedDocCode === "NOTULENSI_RAPAT" && (
          <div className="space-y-6 font-serif text-black text-sm">
            <div className="text-center font-bold text-xl uppercase tracking-widest border-b-2 border-black pb-2">
              NOTULEN RAPAT
            </div>

            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold w-1/4">Rapat</td>
                  <td className="py-2 w-10 text-center">:</td>
                  <td className="py-2">{data.acara || "Rapat Koordinasi Pentas Seni Non-Rekognisi"}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Hari / Tanggal</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.hariTanggal || "Rabu, 05 Agustus 2026"}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Pukul</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.pukul || "09.00 WIB s.d. 11.30 WIB"}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Tempat Rapat</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.tempat || "Pendopo Kapanewon Temon"}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Pemimpin Rapat</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.pemimpinRapat || spj.sharedData?.pptkNama || "SURADIMAN, S.I.P., M.M."}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Notulis</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.notulis || "BRILLANT ELPRANATA, S.Sos."}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 font-semibold">Peserta Rapat</td>
                  <td className="py-2 text-center">:</td>
                  <td className="py-2">{data.pesertaRapat || "20 orang"}</td>
                </tr>
              </tbody>
            </table>

            <div className="space-y-4 pt-4">
              <h3 className="font-bold underline text-base">Keputusan Rapat:</h3>
              <div className="whitespace-pre-line text-justify leading-relaxed bg-gray-50 print:bg-transparent p-4 rounded-xl border border-gray-200 print:border-none">
                {data.keputusanRapat ||
                  `1. Kegiatan rapat koordinasi dimulai pada pukul 09.00 WIB dibuka dengan doa bersama oleh pemimpin rapat;\n2. Pembukaan dari Panewu Temon;\n3. Kegiatan Pentas Seni Non-Rekognisi dimaksudkan untuk mendukung anak-anak tampil lebih percaya diri di depan umum;\n4. Sekolah-sekolah harap dapat memanfaatkan kegiatan ini sebaik mungkin dengan mempersiapkan penampilan yang dipilih;\n5. Untuk koordinasi berikutnya bisa menghubungi Jawatan Sosial ke Kepala Jawatan atau staff.`}
              </div>
            </div>

            <div className="flex justify-end pt-8">
              <div className="text-center w-64">
                <p className="font-semibold">Pemimpin Rapat,</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{data.pemimpinRapat || "SURADIMAN, S.I.P., M.M."}</p>
                <p className="text-xs">{spj.sharedData?.pptkPangkat || "Pembina; IV/a"}</p>
                <p className="text-xs">NIP. {spj.sharedData?.pptkNip || "19730101 199303 1 008"}</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== DAFTAR HADIR TEMPLATE ==================== */}
        {selectedDocCode === "DAFTAR_HADIR" && (
          <div className="space-y-4 font-sans text-black text-sm">
            <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
              <p className="font-bold text-base uppercase">PEMERINTAH KABUPATEN KULON PROGO</p>
              <p className="font-extrabold text-lg uppercase">KAPANEWON TEMON</p>
              <p className="text-xs">Alamat : Jalan Raya Wates-Purworejo Km 10,4 Temon Kulon Progo Telp. (0274) 6472581</p>
              <p className="text-xs">Email: temon@kulonprogokab.go.id Web: temon.kulonprogokab.go.id</p>
            </div>

            <div className="text-center py-2 font-bold text-lg underline uppercase">
              DAFTAR HADIR
            </div>

            <div className="text-left text-xs py-2 space-y-1">
              <p><span className="font-semibold inline-block w-24">HARI</span>: {data.hari || "RABU"}</p>
              <p><span className="font-semibold inline-block w-24">TANGGAL</span>: {data.tanggal || spj.tanggal}</p>
              <p><span className="font-semibold inline-block w-24">PUKUL</span>: {data.jam || "09.00 WIB s.d. 11.00 WIB"}</p>
              <p><span className="font-semibold inline-block w-24">TEMPAT</span>: {data.tempat || "PENDOPO KAPANEWON TEMON"}</p>
              <p><span className="font-semibold inline-block w-24">ACARA</span>: {data.acara || spj.sharedData?.judulAktivitas || spj.masterSnapshot.kegiatan.nama}</p>
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
                {Array.from({ length: Number(spj.sharedData?.jumlahPeserta || data.peserta?.length || 15) }).map((_, idx) => (
                  <tr key={idx} className="border-b border-black h-8">
                    <td className="border-r border-black">{idx + 1}</td>
                    <td className="border-r border-black text-left px-2">
                      {data.peserta?.[idx]?.nama || ""}
                    </td>
                    <td className="border-r border-black text-left px-2">
                      {data.peserta?.[idx]?.jabatan || ""}
                    </td>
                    <td className="text-left px-2 font-mono text-[10px]">
                      {idx % 2 === 0 ? `${idx + 1}. .........` : `        ${idx + 1}. .........`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <div className="text-center w-64 text-xs">
                <p>Temon, {spj.tanggal}</p>
                <p className="font-semibold">PPTK</p>
                <div className="h-16"></div>
                <p className="font-bold underline">{spj.sharedData?.pptkNama || "SURADIMAN, S.I.P., M.M."}</p>
                <p>NIP. {spj.sharedData?.pptkNip || "19730101 199303 1 008"}</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SPJ AKTIVITAS LAPANGAN TEMPLATE ==================== */}
        {selectedDocCode === "SPJ_AKTIVITAS_LAPANGAN" && (
          <div className="space-y-6 font-serif text-black text-sm">
            <div className="text-center font-bold text-xl uppercase tracking-wider underline">
              LAPORAN HASIL PELAKSANAAN TUGAS
            </div>

            <table className="w-full border border-black border-collapse text-sm">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-3 font-semibold w-12 text-center border-r border-black">1.</td>
                  <td className="p-3 font-semibold w-1/3 border-r border-black">Maksud dan Tujuan Perjalanan Dinas</td>
                  <td className="p-3">: {data.maksudTujuan || "Pentas Seni Non-Rekognisi"}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-3 font-semibold text-center border-r border-black">2.</td>
                  <td className="p-3 font-semibold border-r border-black">Tempat Tujuan</td>
                  <td className="p-3">: {data.tempatTujuan || "GOR Kedundang"}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-3 font-semibold text-center border-r border-black">3.</td>
                  <td className="p-3 font-semibold border-r border-black">Lamanya Pelaksanaan Tugas</td>
                  <td className="p-3">: {data.lamaTugas || "1 (hari)"}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-3 font-semibold text-center border-r border-black">4.</td>
                  <td className="p-3 font-semibold border-r border-black">Pelaksanaan Tanggal</td>
                  <td className="p-3">: {data.tanggalPelaksanaan || "12 Agustus 2026"}</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-center border-r border-black align-top">5.</td>
                  <td className="p-3 font-semibold border-r border-black align-top">Kesimpulan (Hasil)</td>
                  <td className="p-3 whitespace-pre-line leading-relaxed text-justify">
                    {data.kesimpulanHasil ||
                      `1. Kegiatan dibuka pukul 08.30 WIB dengan registrasi peserta;\n2. Kegiatan dimulai pukul 09.00 WIB dengan pembukaan dari MC dan menyanyikan Indonesia Raya;\n3. Sambutan dan pembukaan secara resmi oleh Panewu Kapanewon Temon;\n4. Penampilan kesenian anak-anak dari TK/KB/SPS se-Kapanewon Temon;\n5. Kegiatan berjalan dengan lancar dan selesai pukul 12.30 WIB.`}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-2 text-center pt-8 text-xs">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">PANEWU</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{spj.sharedData?.panewuNama || "RUSDI SUWARNO, SIP, M.M"}</p>
              </div>
              <div>
                <p>Temon, {data.tanggalPelaksanaan || spj.tanggal}</p>
                <p className="font-bold">Yang Membuat Laporan</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{data.pembuatLaporan || spj.userName}</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SURAT UNDANGAN TEMPLATE ==================== */}
        {selectedDocCode === "SURAT_UNDANGAN" && (
          <div className="space-y-6 font-serif text-black text-sm">
            {data.externalUrl ? (
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl text-center space-y-4 print:hidden">
                <p className="text-blue-900 font-semibold">Tautan Dokumen External Google Drive Berhasil Dihubungkan:</p>
                <a
                  href={data.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 text-blue-600 underline font-mono text-sm"
                >
                  <span>{data.externalUrl}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : null}

            <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
              <p className="font-bold text-base uppercase">PEMERINTAH KABUPATEN KULON PROGO</p>
              <p className="font-extrabold text-xl uppercase">KAPANEWON TEMON</p>
              <p className="text-xs">Alamat : Jalan Raya Wates-Purworejo Km 10,4 Temon Kulon Progo Telp. (0274) 6472581</p>
            </div>

            <div className="flex justify-between text-xs pt-2">
              <div>
                <p>Nomor : 005 / {spj.nomorSpj.split("/").pop()}</p>
                <p>Sifat : Penting</p>
                <p>Hal : Undangan Rapat Koordinasi</p>
              </div>
              <div className="text-right">
                <p>Temon, {spj.tanggal}</p>
                <p>Kepada Yth.</p>
                <p className="font-bold">{data.tujuanUndangan || "Bapak/Ibu Peserta Rapat"}</p>
                <p>di Tempat</p>
              </div>
            </div>

            <div className="space-y-3 leading-relaxed text-justify pt-4">
              <p>Dengan hormat,</p>
              <p>
                Mengharap kehadiran Bapak/Ibu pada rapat koordinasi pelaksanaan kegiatan {spj.masterSnapshot.kegiatan.nama} yang akan diselenggarakan besok pada:
              </p>

              <div className="pl-6 space-y-1 text-xs">
                <p><span className="font-semibold inline-block w-24">Hari / Tanggal</span>: {data.hariTanggal || "Rabu, 05 Agustus 2026"}</p>
                <p><span className="font-semibold inline-block w-24">Waktu</span>: {data.waktu || "09.00 WIB s.d. selesai"}</p>
                <p><span className="font-semibold inline-block w-24">Tempat</span>: {data.tempat || "Pendopo Kapanewon Temon"}</p>
                <p><span className="font-semibold inline-block w-24">Acara</span>: {data.acara || "Rapat Koordinasi"}</p>
              </div>

              <p>Demikian undangan ini kami sampaikan, atas perhatian dan kehadirannya diucapkan terima kasih.</p>
            </div>

            <div className="flex justify-end pt-8">
              <div className="text-center w-64 text-xs">
                <p className="font-semibold">Panewu Temon</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{spj.sharedData?.panewuNama || "RUSDI SUWARNO, SIP, M.M"}</p>
                <p>NIP. {spj.sharedData?.panewuNip || "19770721 199603 1 001"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
