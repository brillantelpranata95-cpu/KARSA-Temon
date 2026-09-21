/**
 * Date utility for KARSA Temon
 * Display format for dates across all documents & UI: DD BULAN YYYY (e.g. 18 SEPTEMBER 2026).
 */

const INDO_MONTHS_MAP: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, feb: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, agu: 7, ags: 7,
  september: 8, sep: 8,
  oktober: 9, okt: 9,
  november: 10, nov: 10,
  desember: 11, des: 11,
};

const NAMA_BULAN_UPPER = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
];

const NAMA_HARI_CAP = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const NAMA_HARI_UPPER = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

/** Parse any supported date representation into a local Date (or null). */
export const parseAnyDate = (input?: string | Date | null): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  const s = String(input).trim();
  if (!s) return null;

  // dd-mm-yyyy or dd/mm/yyyy
  let m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  // yyyy-mm-dd or yyyy/mm/dd
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  // dd BULAN yyyy (e.g. 18 SEPTEMBER 2026 or 05 AGUSTUS 2026)
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const monthIdx = INDO_MONTHS_MAP[m[2].toLowerCase()];
    if (monthIdx !== undefined) {
      return new Date(Number(m[3]), monthIdx, Number(m[1]));
    }
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/** Canonical storage format: dd-mm-yyyy. */
export const normalizeDateToDDMMYYYY = (input?: string | Date | null): string => {
  const d = parseAnyDate(input);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getFullYear()}`;
};

/** Format date for display across all documents & UI: DD BULAN YYYY (e.g. 18 SEPTEMBER 2026). */
export const formatDateDDMMYYYY = (dateInput?: string | Date | null): string => {
  const d = parseAnyDate(dateInput);
  if (!d) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = NAMA_BULAN_UPPER[d.getMonth()];
  return `${day} ${month} ${d.getFullYear()}`;
};

export const formatDateFormalIndo = (dateInput?: string | Date | null): string => {
  return formatDateDDMMYYYY(dateInput);
};

/** Today in canonical storage format. */
export const todayDDMMYYYY = (): string => normalizeDateToDDMMYYYY(new Date());

/** Value for <input type="date"> which always expects yyyy-mm-dd. */
export const toDateInputValue = (dateInput?: string | Date | null): string => {
  const d = parseAnyDate(dateInput);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

/** Current budget year — used automatically on documents (e.g. Bend 26). */
export const getCurrentYear = (): number => new Date().getFullYear();

/** Budget year derived from a document date, falling back to current year. */
export const getYearFromDate = (dateInput?: string | Date | null): number => {
  const d = parseAnyDate(dateInput);
  return d ? d.getFullYear() : getCurrentYear();
};

export const getNamaHari = (dateInput?: string | Date | null): string => {
  const d = parseAnyDate(dateInput);
  if (!d) return "RABU";
  return NAMA_HARI_UPPER[d.getDay()];
};

/**
 * Nama hari selalu ditulis KAPITAL di dalam tanggal, baik pada dokumen cetak
 * maupun pada pratinjau di editor, agar penulisannya seragam di seluruh berkas.
 */
export const getNamaHariCapitalized = (dateInput?: string | Date | null): string => {
  const d = parseAnyDate(dateInput);
  if (!d) return "RABU";
  return NAMA_HARI_CAP[d.getDay()];
};

/** Sort a list of any-format dates chronologically. */
export const sortDates = (dates: string[]): string[] => {
  return [...dates].sort((a, b) => {
    const da = parseAnyDate(a);
    const db = parseAnyDate(b);
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
};
