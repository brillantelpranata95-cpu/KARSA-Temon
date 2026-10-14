/**
 * Konstanta lintas-aplikasi KARSA Temon.
 *
 * GRAHA Temon (peminjaman ruangan) disajikan di dalam origin yang SAMA dengan
 * KARSA — `/graha` — bukan di domain terpisah. Alasannya teknis: Firebase Auth
 * menyimpan sesi login per-origin (IndexedDB), sehingga dua domain berbeda
 * tidak dapat berbagi sesi. Dengan satu origin, pengguna yang sudah masuk di
 * KARSA langsung masuk ke GRAHA tanpa login ulang (SSO).
 */
export const GRAHA_URL = "/graha";

/** Alamat lengkap GRAHA, untuk pesan/berbagi tautan. */
export const GRAHA_URL_PENUH = "https://karsa-temon.web.app/graha";
