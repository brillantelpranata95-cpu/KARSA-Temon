/**
 * Date utility for KARSA Temon
 * All dates are ALWAYS stored as dd-mm-yyyy — no format hints in the UI.
 */

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

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/** Canonical storage format: dd-mm-yyyy. Empty string when unparseable. */
export const normalizeDateToDDMMYYYY = (input?: string | Date | null): string => {
  const d = parseAnyDate(input);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getFullYear()}`;
};

export const formatDateDDMMYYYY = (dateInput?: string | Date | null): string => {
  const normalized = normalizeDateToDDMMYYYY(dateInput);
  return normalized || "-";
};

/** Today in canonical storage format (dd-mm-yyyy). */
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

/** Budget year derived from a document date, falling back to the current year. */
export const getYearFromDate = (dateInput?: string | Date | null): number => {
  const d = parseAnyDate(dateInput);
  return d ? d.getFullYear() : getCurrentYear();
};

const NAMA_HARI = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const NAMA_HARI_CAP = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const getNamaHari = (dateInput?: string | Date | null): string => {
  const d = parseAnyDate(dateInput);
  if (!d) return "RABU";
  return NAMA_HARI[d.getDay()];
};

export const getNamaHariCapitalized = (dateInput?: string | Date | null): string => {
  const d = parseAnyDate(dateInput);
  if (!d) return "Rabu";
  return NAMA_HARI_CAP[d.getDay()];
};

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const formatDateFormalIndo = (dateInput?: string | Date | null): string => {
  const d = parseAnyDate(dateInput);
  if (!d) return "-";
  return `${String(d.getDate()).padStart(2, "0")} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
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
