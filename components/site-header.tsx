"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartIcon } from "./ui/icons";

export function SiteHeader() {
  const pathname = usePathname();
  const isDiscover = pathname === "/" || pathname === "/discover";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:py-4">
        <Link href="/" className="group inline-flex min-w-0 items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/30 sm:h-10 sm:w-10">
            <Image
              src="/icons/camcorder.png"
              alt=""
              width={20}
              height={20}
              className="relative z-10 h-[22px] w-[22px] object-contain"
              style={{ objectFit: "contain" }}
              aria-hidden
            />
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
              ReelFinder
            </span>
            <span className="hidden text-xs text-slate-400 sm:block">
              Search, save, rewatch.
            </span>
          </div>
        </Link>

        <nav className="ml-auto flex items-center gap-2 text-sm font-medium text-slate-200">
          <Link
            href="/"
            className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-2 transition sm:px-4 ${
              isDiscover
                ? "bg-white text-slate-950 shadow"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            Discover
          </Link>
          <Link
            href="/favorites"
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 px-3 py-2 shadow-inner shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-cyan-400/30 sm:px-4 ${
              pathname === "/favorites"
                ? "bg-white text-slate-950 shadow"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <HeartIcon
              className={`h-4 w-4 ${
                pathname === "/favorites" ? "text-slate-900" : "text-cyan-300"
              }`}
            />
            Saved
          </Link>
        </nav>
      </div>
    </header>
  );
}
