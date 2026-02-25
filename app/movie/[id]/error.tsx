"use client";

import Link from "next/link";

type ErrorProps = {
  error: Error;
  reset: () => void;
};

export default function Error({ reset }: ErrorProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-muted-foreground">
      <h1 className="text-2xl font-semibold text-white">
        We couldn&apos;t load this movie
      </h1>
      <p className="text-sm text-muted-foreground">
        It might be a temporary TMDB hiccup or rate limit. Please try again.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:-translate-y-0.5 hover:shadow-cyan-400/30 hover:text-slate-900"
        >
          Retry
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-cyan-400/70 hover:text-white"
        >
          Back to search
        </Link>
      </div>
    </div>
  );
}
