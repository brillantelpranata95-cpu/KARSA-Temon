/**
 * Ekspor Rekapitulasi SPJ ke PDF — laporan resmi siap cetak/tanda tangan.
 *
 * Menggunakan jsPDF + autotable agar tabel rapi, berulang header di tiap
 * halaman, dan ringkasan nominal per kategori di bagian atas.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SpjItem, UserProfile } from "../types";
import { formatDateDDMMYYYY } from "./date";

export interface RecapOptions {
  spjs: SpjItem[];
  user: UserProfile;
  periodLabel?: string; // e.g. "Semua Periode", "September 2026"
  nominalBySpjId?: Record<string, number>;
}

/** Convert "Rp 1.234.567" style numbers safely. */
const formatRupiah = (value: number): string =>
  "Rp " + (value || 0).toLocaleString("id-ID");

export const exportSpjRecapPdf = ({ spjs, user, periodLabel, nominalBySpjId }: RecapOptions): void => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString("id-ID");

  // ---------- KOP RESMI ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("REKAPITULASI SURAT PERTANGGUNGJAWABAN (SPJ)", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(11);
  doc.text("KECAMATAN TEMON — KABUPATEN KULON PROGO", pageWidth / 2, 20, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("KARSA TEMON — Kelola Administrasi dan Rekam SPJ", pageWidth / 2, 25, { align: "center" });

  doc.setLineWidth(0.6);
  doc.line(14, 28, pageWidth - 14, 28);

  // ---------- METADATA ----------
  doc.setFontSize(9);
  const metaY = 34;
  doc.text(`Jawatan      : ${user.role === "ADMIN" ? "Seluruh Jawatan" : user.jawatanName || "-"}`, 14, metaY);
  doc.text(`Periode      : ${periodLabel || "Semua Periode"}`, 14, metaY + 5);
  doc.text(`Dicetak oleh : ${user.displayName || user.email}`, pageWidth / 2, metaY);
  doc.text(`Tanggal cetak: ${generatedAt} WIB`, pageWidth / 2, metaY + 5);
  doc.text(`Total Paket  : ${spjs.length} SPJ`, pageWidth - 14, metaY, { align: "right" });

  const totalNominal = spjs.reduce((sum, s) => sum + (nominalBySpjId?.[s.id] || 0), 0);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Nilai  : ${formatRupiah(totalNominal)}`, pageWidth - 14, metaY + 5, { align: "right" });
  doc.setFont("helvetica", "normal");

  // ---------- TABEL REKAP ----------
  const body = spjs.map((spj, idx) => [
    String(idx + 1),
    spj.nomorSpj || "-",
    formatDateDDMMYYYY(spj.tanggal) || "-",
    spj.jawatanName || "-",
    spj.masterSnapshot?.kegiatan?.nama || "-",
    spj.sharedData?.judulAktivitas || "-",
    `[${spj.masterSnapshot?.kodeRekening?.kode || "-"}] ${spj.masterSnapshot?.kodeRekening?.nama || ""}`,
    nominalBySpjId?.[spj.id] !== undefined ? formatRupiah(nominalBySpjId[spj.id]) : "-",
    spj.status === "FINALIZED" ? "Final" : spj.status === "COMPLETE" ? "Lengkap" : spj.status === "IN_PROGRESS" ? "Proses" : "Draft",
    `${spj.progress || 0}%`,
  ]);

  autoTable(doc, {
    startY: metaY + 12,
    head: [["No", "Nomor SPJ", "Tanggal", "Jawatan", "Sub-Kegiatan", "Tagging Sub-Kegiatan", "Kode Rekening", "Nominal", "Status", "Progres"]],
    body,
    styles: { fontSize: 7.5, cellPadding: 2, valign: "top" },
    headStyles: { fillColor: [50, 132, 141], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [246, 250, 245] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 30 },
      2: { cellWidth: 18 },
      3: { cellWidth: 28 },
      4: { cellWidth: 45 },
      5: { cellWidth: 40 },
      6: { cellWidth: 45 },
      7: { cellWidth: 25, halign: "right" },
      8: { cellWidth: 16, halign: "center" },
      9: { cellWidth: 14, halign: "center" },
    },
    didDrawPage: (data) => {
      // Footer di setiap halaman
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Dokumen ini dihasilkan otomatis oleh KARSA TEMON — Sistem Pengelolaan SPJ Terintegrasi Kecamatan Temon`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" }
      );
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 6,
        { align: "right" }
      );
    },
  });

  // ---------- BLOK TANDA TANGAN ----------
  const finalY = (doc as any).lastAutoTable?.finalY || 60;
  const pageHeight = doc.internal.pageSize.getHeight();
  let signY = finalY + 14;
  if (signY > pageHeight - 45) {
    doc.addPage();
    signY = 30;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Mengetahui,", pageWidth - 90, signY);
  doc.text("Panewu Temon", pageWidth - 90, signY + 5);
  doc.text("", pageWidth - 90, signY + 10);
  doc.text("(......................................)", pageWidth - 90, signY + 30);

  const fileName = `Rekapitulasi-SPJ-${user.role === "ADMIN" ? "Semua-Jawatan" : (user.jawatanName || "Jawatan").replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};
