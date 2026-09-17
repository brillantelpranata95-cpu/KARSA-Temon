/**
 * Date utility for KARSA Temon
 * Enforces consistent dd-mm-yyyy formatting across the app.
 */

export const formatDateDDMMYYYY = (dateInput?: string | Date | null): string => {
  if (!dateInput) return "-";
  
  if (typeof dateInput === "string") {
    // If already in dd-mm-yyyy or dd/mm/yyyy
    const partsSlash = dateInput.split("/");
    if (partsSlash.length === 3 && partsSlash[0].length <= 2 && partsSlash[2].length === 4) {
      return `${partsSlash[0].padStart(2, "0")}-${partsSlash[1].padStart(2, "0")}-${partsSlash[2]}`;
    }
    
    // If in yyyy-mm-dd format
    const partsDash = dateInput.split("-");
    if (partsDash.length === 3) {
      if (partsDash[0].length === 4) {
        return `${partsDash[2].padStart(2, "0")}-${partsDash[1].padStart(2, "0")}-${partsDash[0]}`;
      } else if (partsDash[2].length === 4) {
        return `${partsDash[0].padStart(2, "0")}-${partsDash[1].padStart(2, "0")}-${partsDash[2]}`;
      }
    }
  }

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateInput);
  }
};

const NAMA_HARI = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const NAMA_HARI_CAP = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const getNamaHari = (dateInput?: string | Date | null): string => {
  if (!dateInput) return "RABU";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "RABU";
    return NAMA_HARI[d.getDay()];
  } catch {
    return "RABU";
  }
};

export const getNamaHariCapitalized = (dateInput?: string | Date | null): string => {
  if (!dateInput) return "Rabu";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Rabu";
    return NAMA_HARI_CAP[d.getDay()];
  } catch {
    return "Rabu";
  }
};

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const formatDateFormalIndo = (dateInput?: string | Date | null): string => {
  if (!dateInput) return "-";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return formatDateDDMMYYYY(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = NAMA_BULAN[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return formatDateDDMMYYYY(dateInput);
  }
};
