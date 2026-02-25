import Image from "next/image";
import Link from "next/link";

export function PoweredByBadge() {
  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-50 sm:bottom-5 sm:right-5">
      <Link
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto group flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-2 text-xs font-medium text-slate-200 shadow-lg ring-1 ring-slate-800 backdrop-blur transition hover:-translate-y-0.5 hover:ring-teal-400/70"
        aria-label="Powered by The Movie Database (TMDB)"
      >
        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-300">
          Powered by:
        </span>
        <Image
          src="/TMDB_logo.svg"
          alt="TMDB"
          width={88}
          height={16}
          className="h-4 w-auto transition duration-150 group-hover:scale-105"
          priority
        />
      </Link>
    </div>
  );
}
