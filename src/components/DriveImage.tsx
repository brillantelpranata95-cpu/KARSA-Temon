/**
 * DriveImage — menampilkan foto Google Drive dengan penanganan kegagalan akses.
 *
 * Google Drive hanya mengizinkan pratinjau bila berkas dibagikan publik
 * ("Siapa saja yang memiliki link"). Aplikasi tidak dapat menembus izin
 * tersebut, jadi ketika foto gagal dimuat komponen ini menampilkan penjelasan
 * yang jelas beserta tautan untuk membuka berkas di Drive — bukan gambar rusak.
 */
import React, { useState } from "react";
import { ImageOff, ExternalLink } from "lucide-react";
import { drivePhotoUrl, inspectDriveLink } from "../utils/drive";

interface DriveImageProps {
  /** Tautan Google Drive yang ditempel pengguna. */
  link: string;
  alt: string;
  /** Kelas untuk elemen <img> saat berhasil dimuat. */
  imgClassName?: string;
  /** Kelas pembungkus saat gagal — di dokumen cetak dibuat netral. */
  fallbackClassName?: string;
  crossOrigin?: "anonymous" | "use-credentials";
}

export const DriveImage: React.FC<DriveImageProps> = ({
  link,
  alt,
  imgClassName,
  fallbackClassName,
  crossOrigin = "anonymous",
}) => {
  // Simpan tautan yang gagal (bukan boolean) agar status otomatis kembali
  // normal begitu tautannya diganti — tanpa perlu efek tambahan.
  const [failedLink, setFailedLink] = useState<string | null>(null);
  const info = inspectDriveLink(link);
  const src = drivePhotoUrl(link);
  const failed = failedLink === link;

  if (!src) {
    return (
      <div className={fallbackClassName}>
        <ImageOff className="w-6 h-6 mx-auto mb-1" />
        <p className="text-[10px] text-center px-2">Tautan tidak dikenali</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className={fallbackClassName}>
        <ImageOff className="w-6 h-6 mx-auto mb-1" />
        <p className="text-[10px] text-center px-2 leading-relaxed">
          Foto tidak dapat ditampilkan — berkas belum dibagikan publik.
          <br />
          Setel berbagi di Drive menjadi <strong>&ldquo;Siapa saja yang memiliki link&rdquo;</strong>.
        </p>
        {info && (
          <a
            href={info.openUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 text-[10px] font-semibold underline inline-flex items-center gap-1 justify-center w-full"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Buka di Drive</span>
          </a>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName}
      crossOrigin={crossOrigin}
      onError={() => setFailedLink(link)}
    />
  );
};
