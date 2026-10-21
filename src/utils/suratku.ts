/**
 * suratKU Kulon Progo - pembantu tautan surat resmi.
 *
 * KARSA tidak menyimpan salinan isi surat, hanya tautannya. Server suratKU
 * tidak menyediakan API publik dan menolak ditampilkan di dalam iframe,
 * jadi tautannya selalu dibuka di tab baru.
 */

export const SURATKU_ORIGIN = "https://suratku.kulonprogokab.go.id";

/** Rapikan tautan suratKU; kembalikan null bila bukan domain suratKU. */
export const normalizeSuratkuUrl = (raw?: string | null): string | null => {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (u.hostname.toLowerCase() !== "suratku.kulonprogokab.go.id") return null;
    return `${SURATKU_ORIGIN}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
};

export const isSuratkuUrl = (raw?: string | null): boolean =>
  normalizeSuratkuUrl(raw) !== null;
