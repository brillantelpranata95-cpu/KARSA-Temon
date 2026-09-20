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

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let firstPage = true;

  for (let i = 0; i < renderable.length; i++) {
    const docItem = renderable[i];
    const label = docItem.documentTypeCode.replace(/_/g, " ");
    onProgress?.(`Dokumen ${i + 1}/${renderable.length}: ${label}`);

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:1000px;background:#ffffff;";
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

      const canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const imgH = (canvas.height * pageW) / canvas.width;
      const pageCount = Math.max(1, Math.ceil(imgH / pageH));

      for (let p = 0; p < pageCount; p++) {
        if (!firstPage) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -p * pageH, pageW, imgH);
        firstPage = false;
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
