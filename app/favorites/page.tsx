"use client";

import Link from "next/link";
import { MovieCard } from "@/components/movie-card";
import { MovieCardSkeleton } from "@/components/movie-card-skeleton";
import { useFavorites } from "@/components/favorites-provider";

export default function FavoritesPage() {
  const { favorites, ready } = useFavorites();

  const hasFavorites = favorites.length > 0;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 px-6 py-8 shadow-2xl shadow-cyan-500/10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Favorites</h1>
            <p className="text-sm text-muted-foreground">
              Movies you&apos;ve saved for later.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-400/30 transition hover:-translate-y-0.5 hover:shadow-lg hover:text-slate-900"
          >
            Back to search
          </Link>
        </div>
      </section>

      {!ready && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <MovieCardSkeleton key={index} />
          ))}
        </div>
      )}

      {ready && hasFavorites && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites
            .slice()
            .reverse()
            .map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
        </div>
      )}

      {ready && !hasFavorites && (
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-muted-foreground">
          <p className="text-lg font-medium text-white">No favorites yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start saving movies you love.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-400/30 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Discover movies
          </Link>
        </div>
      )}
    </div>
  );
}
