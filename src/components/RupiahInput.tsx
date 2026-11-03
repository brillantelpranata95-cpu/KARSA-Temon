import React from "react";
import { formatThousands, parseThousands } from "../utils/currencyInput";

interface RupiahInputProps {
  value: number | string | null | undefined;
  onChange: (value: number | "") => void;
  className?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
}

/**
 * Isian nominal rupiah dengan pemisah ribuan langsung saat mengetik.
 * Nilai yang dikirim ke `onChange` selalu angka murni (atau "" bila kosong),
 * sehingga perhitungan pajak/penyimpanan tidak perlu membersihkan titik lagi.
 */
export const RupiahInput: React.FC<RupiahInputProps> = ({
  value,
  onChange,
  className,
  placeholder = "0",
  id,
  ariaLabel,
}) => (
  <input
    id={id}
    type="text"
    inputMode="numeric"
    autoComplete="off"
    value={formatThousands(value)}
    onChange={(e) => onChange(parseThousands(e.target.value))}
    placeholder={placeholder}
    aria-label={ariaLabel}
    className={className}
  />
);
