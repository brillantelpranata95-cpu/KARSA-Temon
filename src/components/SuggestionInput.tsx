/**
 * SuggestionInput — kolom teks dengan riwayat isian.
 *
 * Setiap nama yang pernah diketik disimpan di localStorage (per `storageKey`),
 * sehingga saat pengguna mulai mengetik di kolom yang sama, daftar nama yang
 * pernah dipakai muncul di bawah kolom dan dapat dipilih langsung.
 *
 * Dipakai untuk Nama Penerima (Bend 26) dan Nama Pembuat Laporan
 * (SPJ Aktivitas Lapangan). Riwayat bersifat lokal pada peramban pengguna —
 * tidak menambah pembacaan Firestore.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { History, X } from "lucide-react";

const MAX_HISTORY = 30;
const STORAGE_PREFIX = "karsa.suggest.";

/** Baca riwayat tersimpan (aman bila localStorage tidak tersedia). */
const readHistory = (storageKey: string): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string" && v.trim()) : [];
  } catch {
    return [];
  }
};

const writeHistory = (storageKey: string, list: string[]) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(list.slice(0, MAX_HISTORY)));
  } catch {
    /* storage penuh / diblokir — abaikan, isian tetap berfungsi */
  }
};

/** Simpan satu nama ke riwayat (paling baru di depan, tanpa duplikat). */
const rememberName = (storageKey: string, name?: string | null): void => {
  const value = String(name || "").trim();
  if (!value) return;
  const list = readHistory(storageKey).filter((v) => v.toLowerCase() !== value.toLowerCase());
  writeHistory(storageKey, [value, ...list]);
};

interface SuggestionInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Kunci riwayat — gunakan kunci berbeda per jenis kolom. */
  storageKey: string;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const SuggestionInput: React.FC<SuggestionInputProps> = ({
  value,
  onChange,
  storageKey,
  placeholder,
  className,
  id,
}) => {
  const [history, setHistory] = useState<string[]>(() => readHistory(storageKey));
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Muat ulang riwayat bila kolom berpindah konteks (mis. ganti dokumen).
  // Dilakukan saat render, bukan di dalam efek, agar tidak memicu render ganda.
  const [lastKey, setLastKey] = useState(storageKey);
  if (lastKey !== storageKey) {
    setLastKey(storageKey);
    setHistory(readHistory(storageKey));
  }

  // Tutup daftar saat klik di luar kolom.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const query = value.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!query) return history.slice(0, 8);
    return history.filter((h) => h.toLowerCase().includes(query) && h.toLowerCase() !== query).slice(0, 8);
  }, [history, query]);

  const commit = (name: string) => {
    rememberName(storageKey, name);
    setHistory(readHistory(storageKey));
  };

  const removeItem = (name: string) => {
    const next = readHistory(storageKey).filter((v) => v !== name);
    writeHistory(storageKey, next);
    setHistory(next);
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Simpan saat pengguna selesai mengisi kolom.
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches.length > 0) {
            e.preventDefault();
            onChange(matches[0]);
            commit(matches[0]);
            setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
        autoComplete="off"
      />

      {open && matches.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg overflow-hidden">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-700 inline-flex items-center gap-1">
            <History className="w-3 h-3" /> Nama yang pernah dipakai
          </p>
          <ul className="max-h-52 overflow-y-auto">
            {matches.map((name) => (
              <li key={name} className="flex items-center group">
                <button
                  type="button"
                  // onMouseDown agar terpilih sebelum input kehilangan fokus
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(name);
                    commit(name);
                    setOpen(false);
                  }}
                  className="flex-1 text-left px-3 py-2 text-xs text-gray-800 dark:text-slate-200 hover:bg-[#F6FAF5] dark:hover:bg-slate-700/60 truncate"
                >
                  {name}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeItem(name);
                  }}
                  title="Hapus dari riwayat"
                  className="px-2 py-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
