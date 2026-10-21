import React, { useEffect, useState } from "react";

/**
 * Ikon Koboyo (https://koboyo.com/icons) — SVG hand-drawn, lisensi bebas komersial.
 *
 * Semua ikon UI aplikasi ini berasal dari Koboyo; jangan menambah Lucide atau emoji
 * sebagai ikon UI. Nama ikon TIDAK bisa ditebak (banyak 404 senyap), jadi SELALU probe
 * dulu sebelum memakai nama baru:
 *   curl -s -o /dev/null -w "%{http_code}" https://koboyo.com/icons/svg/<nama>.svg
 *
 * Cara kerja: SVG diambil dari `public/koboyo/<nama>.svg` saat dibutuhkan, lalu
 * disimpan di cache memori. Tidak ada SVG yang ikut ke bundle JS, supaya ukuran
 * unduhan awal tetap kecil. Permintaan untuk ikon yang sama hanya sekali (dedupe).
 *
 * `import.meta.env.BASE_URL` dipakai agar ikon tetap benar saat aplikasi dilayani
 * di sub-path (GRAHA berjalan di `/graha/`), bukan hanya di root.
 */

const cache = new Map<string, string>();
const sedangDimuat = new Map<string, Promise<string>>();

function muatIkon(nama: string): Promise<string> {
  const sudahAda = cache.get(nama);
  if (sudahAda !== undefined) return Promise.resolve(sudahAda);

  const prosesLama = sedangDimuat.get(nama);
  if (prosesLama) return prosesLama;

  const proses = fetch(`${import.meta.env.BASE_URL}koboyo/${nama}.svg`)
    .then((respons) => (respons.ok ? respons.text() : ""))
    .then((teks) => {
      cache.set(nama, teks);
      sedangDimuat.delete(nama);
      return teks;
    })
    .catch(() => {
      sedangDimuat.delete(nama);
      return "";
    });

  sedangDimuat.set(nama, proses);
  return proses;
}

/**
 * Siapkan SVG agar mewarisi warna teks (`currentColor`) dan ukuran dari className.
 * Atribut width/height bawaan dibuang supaya ukuran ditentukan CSS, bukan berkas.
 */
function siapkanSvg(mentah: string, className: string, tebal = false): string {
  if (!mentah || !mentah.includes("<svg")) return "";
  let s = mentah
    .replace(/\swidth="[^"]*"/g, "")
    .replace(/\sheight="[^"]*"/g, "")
    .replace(/\sclass="[^"]*"/g, "")
    .replace(/fill="currentColor"/g, "");
  // `tebal` menambah garis tepi pada path supaya ikon terbaca lebih jelas,
  // dipakai untuk ikon navigasi (sidebar) dan tombol aksi berikon saja.
  const garis = tebal
    ? ' stroke="currentColor" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"'
    : "";
  return s.replace(/<svg\b/, `<svg class="${className}" fill="currentColor"${garis}`);
}

export interface IconProps {
  /** Nama ikon Koboyo, mis. "fire", "map-pin", "circle-check". */
  name: string;
  /** Kelas Tailwind; tentukan ukuran di sini (mis. "w-5 h-5"). */
  className?: string;
  /** Ukuran dalam piksel; alternatif cepat untuk w-/h-. */
  size?: number;
  /** Garis tepi lebih tebal — untuk ikon navigasi & tombol aksi berikon. */
  tebal?: boolean;
}

/**
 * Pemakaian: `<Icon name="fire" className="w-5 h-5" />`
 *
 * Selalu dibungkus <span> berukuran sama baik saat ikon masih dimuat maupun sudah
 * tampil, sehingga tata letak tidak bergeser (layout shift) saat SVG tiba.
 */
export const Icon: React.FC<IconProps> = ({ name, className, size, tebal = false }) => {
  const [svg, setSvg] = useState<string>(() => cache.get(name) ?? "");

  useEffect(() => {
    let hidup = true;
    const sudahAda = cache.get(name);
    if (sudahAda !== undefined) {
      setSvg(sudahAda);
      return;
    }
    setSvg("");
    muatIkon(name).then((teks) => {
      if (hidup) setSvg(teks);
    });
    return () => {
      hidup = false;
    };
  }, [name]);

  const kelas = className ?? "w-5 h-5";
  const gaya = size ? { width: size, height: size } : undefined;

  return (
    <span
      className={`inline-block shrink-0 align-middle ${kelas}`}
      style={gaya}
      aria-hidden="true"
      dangerouslySetInnerHTML={svg ? { __html: siapkanSvg(svg, "block w-full h-full", tebal) } : undefined}
    />
  );
};

export default Icon;
