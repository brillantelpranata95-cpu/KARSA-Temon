/**
 * Ekspor paket SPJ menjadi satu berkas PDF multi-halaman.
 *
 * Cara kerja: setiap template dokumen dirender persis seperti di halaman
 * Preview (memakai komponen PrintPreview yang sama), lalu diubah menjadi
 * gambar beresolusi tinggi dan disusun ke halaman A4.
 *
 * Dokumen yang isinya hanya berupa tautan Google Drive (Surat Perintah /
 * Surat Undangan) dilewati, karena isinya tidak berada di dalam aplikasi.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { SpjItem, SpjDocumentItem } from "../types";

/** Urutan dokumen di dalam berkas PDF (mengikuti alur pemeriksaan SPJ). */
const DOC_ORDER = [
  "BEND_26",
  "DAFTAR_HADIR",
  "NOTULENSI_RAPAT",
  "SPJ_AKTIVITAS_LAPANGAN",
  "LAMPIRAN_FOTO",
  "SURAT_PERINTAH",
  "SURAT_UNDANGAN",
];

/** Dokumen yang isinya hanya tautan Google Drive — tidak dapat dirender. */
const DRIVE_ONLY = new Set(["SURAT_PERINTAH", "SURAT_UNDANGAN"]);

export interface ExportSpjPdfResult {
  rendered: number;
  skipped: string[];
}

/** Tunggu font & seluruh gambar (logo, tanda tangan) selesai dimuat. */
const waitForAssets = async (host: HTMLElement) => {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }
  const imgs = Array.from(host.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
};

/**
 * Ukuran kertas per jenis dokumen. Satu halaman PDF = satu lembar dokumen.
 * Bend 26 memakai kertas setengah folio vertikal (16,5 × 21,5 cm), dokumen
 * lain tetap A4 (lebar 210mm) agar cetakan tidak terpotong atau menyisakan
 * bidang kosong.
 */
const PAGE_FORMAT: Record<string, [number, number]> = {
  BEND_26: [165, 215],
};

/** Ukuran A4 dalam mm — dipakai sebagai ukuran bawaan halaman PDF. */
const A4_FORMAT: [number, number] = [210, 297];

export const exportSpjPdf = async (
  spj: SpjItem,
  documents: SpjDocumentItem[],
  onProgress?: (label: string) => void
): Promise<ExportSpjPdfResult> => {
  const renderable = documents
    .filter((d) => !DRIVE_ONLY.has(d.documentTypeCode))
    .sort((a, b) => {
      const ia = DOC_ORDER.indexOf(a.documentTypeCode);
      const ib = DOC_ORDER.indexOf(b.documentTypeCode);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  const skipped = documents
    .filter((d) => DRIVE_ONLY.has(d.documentTypeCode))
    .map((d) => d.documentTypeCode.replace(/_/g, " "));

  if (renderable.length === 0) {
    throw new Error(
      skipped.length > 0
        ? "Dokumen paket ini hanya berupa tautan Google Drive, sehingga tidak dapat dibuatkan PDF. Buka Preview untuk membuka tautannya."
        : "Paket SPJ ini belum memiliki dokumen yang dapat dicetak."
    );
  }

  // Dimuat saat dibutuhkan saja agar bundle awal tetap ringan.
  const [{ default: html2canvas }, { default: jsPDF }, { PrintPreview }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
    import("../components/PrintPreview"),
  ]);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: A4_FORMAT });
  let firstPage = true;

  for (let i = 0; i < renderable.length; i++) {
    const docItem = renderable[i];
    const label = docItem.documentTypeCode.replace(/_/g, " ");
    onProgress?.(`Dokumen ${i + 1}/${renderable.length}: ${label}`);

    // Bend 26 dicetak pada setengah folio vertikal; dokumen lain tetap A4.
    const pageFormat = PAGE_FORMAT[docItem.documentTypeCode] || A4_FORMAT;

    if (firstPage) {
      // jsPDF selalu membuat satu halaman A4 saat dibuat; ganti ukurannya bila
      // dokumen pertama bukan A4 agar tidak ada halaman kosong di depan.
      if (pageFormat !== A4_FORMAT) {
        pdf.deletePage(1);
        pdf.addPage(pageFormat, "portrait");
      }
      firstPage = false;
    } else {
      pdf.addPage(pageFormat, "portrait");
    }

    const [pageW, pageH] = pageFormat;

    const host = document.createElement("div");
    // Lebar host disesuaikan dengan lebar kertas dokumen agar tata letak saat
    // dirender identik dengan hasil cetak (Bend 26 = 165mm ≈ 624px).
    const hostWidth = docItem.documentTypeCode === "BEND_26" ? 700 : 1000;
    host.style.cssText = `position:fixed;left:-10000px;top:0;width:${hostWidth}px;background:#ffffff;`;
    document.body.appendChild(host);
    const root = createRoot(host);

    try {
      root.render(
        React.createElement(PrintPreview, {
          spj,
          documents,
          onBack: () => {},
          initialDocCode: docItem.documentTypeCode,
          liveAttendance: false,
        })
      );

      // Beri waktu React menyelesaikan render, lalu tunggu aset selesai dimuat.
      await new Promise((r) => setTimeout(r, 150));
      await waitForAssets(host);
      await new Promise((r) => setTimeout(r, 150));

      const target = host.querySelector<HTMLElement>(".print-doc");
      if (!target) throw new Error("Template dokumen tidak ditemukan.");

      // Ambil elemen dokumennya saja (tanpa bingkai/padding layar) supaya
      // rasio gambar sama dengan rasio kertas.
      const docElement = (target.firstElementChild as HTMLElement) || target;

      const canvas = await html2canvas(docElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const imgH = (canvas.height * pageW) / canvas.width;
      const pageCount = Math.max(1, Math.ceil(imgH / pageH));

      for (let p = 0; p < pageCount; p++) {
        if (p > 0) {
          // Halaman lanjutan memakai format dokumen yang sama agar tidak terpotong.
          pdf.addPage(pageFormat, "portrait");
        }
        pdf.addImage(imgData, "JPEG", 0, -p * pageH, pageW, imgH);
      }
    } finally {
      root.unmount();
      host.remove();
    }
  }

  const safeName = (spj.nomorSpj || "SPJ").replace(/[\\/:*?"<>|]/g, "-");
  pdf.save(`${safeName}.pdf`);
  return { rendered: renderable.length, skipped };
};
