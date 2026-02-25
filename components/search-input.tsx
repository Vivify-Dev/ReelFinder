"use client";

import { SearchIcon } from "./ui/icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
};

export function SearchInput({ value, onChange, placeholder, label }: Props) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-200">
      <span className="sr-only">{label || "Search movies"}</span>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || "Search movies, actors, or keywords..."}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-4 text-base text-white shadow-inner shadow-cyan-500/10 outline-none transition focus:border-cyan-400/60 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30"
        />
      </div>
    </label>
  );
}
