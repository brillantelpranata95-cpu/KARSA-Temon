/**
 * Google Drive helper — KARSA Temon
 *
 * Users paste a normal Google Drive share link; we only need the file ID to
 * build a CORS-enabled thumbnail URL:
 *
 *   https://lh3.googleusercontent.com/d/<id>=w1600
 *
 * That endpoint answers with `Access-Control-Allow-Origin: *`, so the browser
 * can both display the photo and let html2canvas re-render it for the PDF
 * export. The `drive.google.com/thumbnail?...=s1600` endpoint does NOT send
 * CORS headers, so it would break PDF generation — do not use it.
 */

export interface DriveLinkInfo {
  fileId: string;
  /** URL that can be used inside <img src>. */
  photoUrl: string;
  /** URL to open the original file in a new tab. */
  openUrl: string;
}

/** Width token used on the thumbnail endpoint (covers full-width A4 at 2x). */
const PHOTO_WIDTH = 1600;

/**
 * Extract a Google Drive file ID from any of the link shapes Drive produces:
 *   /file/d/<id>/view, /open?id=<id>, /uc?id=<id>&export=view,
 *   ?id=<id>, /thumbnail?id=<id>, /d/<id>, docs.google.com/.../d/<id>/edit
 * Also accepts a bare file ID.
 */
export const parseDriveFileId = (raw?: string | null): string | null => {
  const s = String(raw || "").trim();
  if (!s) return null;

  // Bare file ID (Drive IDs are long, urlsafe-base64-ish, no slashes/spaces)
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return s;

  // /file/d/<id>/... — also matches docs.google.com/.../d/<id>/edit
  const pathMatch = s.match(/\/d\/([A-Za-z0-9_-]{20,})/);
  if (pathMatch) return pathMatch[1];

  // ?id=<id>  (open, uc, thumbnail, ...)
  const queryMatch = s.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if (queryMatch) return queryMatch[1];

  // Google Docs "resourcekey" links keep the id before the query
  const docsMatch = s.match(/\/(?:document|spreadsheets|presentation)\/d\/([A-Za-z0-9_-]{20,})/);
  if (docsMatch) return docsMatch[1];

  return null;
};

/** Turn any pasted Drive link into the CORS-safe thumbnail URL (or null). */
export const drivePhotoUrl = (raw?: string | null): string | null => {
  const id = parseDriveFileId(raw);
  if (!id) return null;
  return `https://lh3.googleusercontent.com/d/${id}=w${PHOTO_WIDTH}`;
};

/** Public "open in Drive" URL for a pasted link. */
export const driveOpenUrl = (raw?: string | null): string | null => {
  const id = parseDriveFileId(raw);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/view`;
};

/** Validate a pasted link and bundle everything the UI needs. */
export const inspectDriveLink = (raw?: string | null): DriveLinkInfo | null => {
  const photoUrl = drivePhotoUrl(raw);
  const openUrl = driveOpenUrl(raw);
  const fileId = parseDriveFileId(raw);
  if (!fileId || !photoUrl || !openUrl) return null;
  return { fileId, photoUrl, openUrl };
};

/**
 * Read a Drive link out of a document's `data` payload.
 * Supports the single-photo fields (`fotoUrl` / `externalUrl`) plus the
 * multi-photo list (`fotoList: string[]`) used by "Lampiran Foto".
 */
export const collectDocPhotos = (data?: Record<string, any> | null): string[] => {
  if (!data) return [];
  const out: string[] = [];
  const push = (v: any) => {
    if (typeof v !== "string") return;
    const id = parseDriveFileId(v);
    if (id) out.push(v);
  };
  push(data.fotoUrl);
  push(data.externalUrl);
  if (Array.isArray(data.fotoList)) data.fotoList.forEach(push);
  // De-duplicate by file id while keeping the original links
  const seen = new Set<string>();
  return out.filter((link) => {
    const id = parseDriveFileId(link) as string;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
