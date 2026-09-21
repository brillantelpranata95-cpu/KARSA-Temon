import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface ComboOption {
  value: string;
  /** Primary line, e.g. "[5.1.02.02.004.00052] Belanja Makanan dan Minuman Rapat" */
  label: string;
  /** Secondary line shown under the label (optional). */
  hint?: string;
  /** Extra keywords that should also match the typed keyword. */
  keywords?: string;
}

interface SearchableSelectProps {
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Text shown when the dropdown is open but nothing matches. */
  emptyText?: string;
  /** Rendered above the list — used for the "+ Ajukan ... Baru" actions. */
  header?: React.ReactNode;
  disabled?: boolean;
  /** Shown inside the input while nothing is selected. */
  searchPlaceholder?: string;
}

/**
 * Kotak pilihan yang bisa diketik: pengguna mengetik kata kunci, daftar di
 * bawahnya langsung tersaring (kode maupun nama), jadi tidak perlu menggulir
 * satu per satu. Nilai tetap berupa `value` dari opsi yang dipilih.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "— Pilih —",
  emptyText = "Tidak ada hasil yang cocok.",
  header,
  disabled = false,
  searchPlaceholder = "Ketik untuk mencari...",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    // Setiap kata kunci harus cocok (AND) supaya "makan rapat" tetap presisi.
    const terms = q.split(/\s+/).filter(Boolean);
    return options.filter((o) => {
      const hay = `${o.label} ${o.hint || ""} ${o.keywords || ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Tutup daftar saat klik di luar komponen
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const commit = (opt: ComboOption) => {
    onChange(opt.value);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) commit(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          disabled={disabled}
          value={open ? query : selected?.label || ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onKeyDown={handleKeyDown}
          placeholder={selected ? selected.label : searchPlaceholder || placeholder}
          className={`w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl pl-9 pr-16 py-2.5 text-gray-900 dark:text-white text-sm ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Kosongkan pilihan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => !disabled && setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl overflow-hidden">
          {header && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40">
              {header}
            </div>
          )}
          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">{emptyText}</p>
            ) : (
              filtered.map((o, idx) => (
                <button
                  type="button"
                  key={o.value}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => commit(o)}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-gray-50 dark:border-slate-700/50 last:border-b-0 ${
                    idx === highlight ? "bg-[#32848D]/10" : ""
                  } ${o.value === value ? "font-semibold" : ""}`}
                >
                  <span className="block text-gray-900 dark:text-white leading-snug">{o.label}</span>
                  {o.hint && (
                    <span className="block text-[10px] text-gray-400 dark:text-slate-400 mt-0.5">{o.hint}</span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-1.5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40">
            <p className="text-[10px] text-gray-400">
              {filtered.length} dari {options.length} pilihan — ketik kata kunci, lalu Enter untuk memilih.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
