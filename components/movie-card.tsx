"use client";

import Image from "next/image";
import Link from "next/link";
import { MovieSummary } from "@/types/movies";
import { formatRating, formatYear } from "@/lib/formatters";
import { tmdbPosterUrl } from "@/lib/tmdb-images";
import { useFavorites } from "./favorites-provider";
import { HeartIcon, StarIcon } from "./ui/icons";

type Props = {
  movie: MovieSummary;
};

export function MovieCard({ movie }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const movieId = Number(movie.id);
  if (!Number.isInteger(movieId)) {
    return null;
  }
  const posterUrl = tmdbPosterUrl(movie.posterPath, "w342");

  const favorite = isFavorite(movieId);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-1 hover:border-cyan-400/40">
      <div className="relative">
        {movie.inTheatersOnly && (
          <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-950 shadow-md shadow-amber-400/40">
            <span className="h-2 w-2 rounded-full bg-slate-950/80" aria-hidden />
            <span>In theaters</span>
          </div>
        )}
        <Link href={`/movie/${movieId}`} prefetch={false} className="block">
          <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={`${movie.title} poster`}
                fill
                className="object-cover transition duration-500 group-hover:scale-105 group-hover:opacity-90"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 220px"
                priority={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                No poster
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
        </Link>
        <button
          aria-label={favorite ? "Remove from favorites" : "Save to favorites"}
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(movie);
          }}
          className="absolute right-3 top-3 z-20 rounded-full bg-slate-950/75 p-2 text-white opacity-100 shadow-md backdrop-blur transition md:opacity-0 md:pointer-events-none md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:focus-visible:pointer-events-auto md:focus-visible:opacity-100 md:hover:scale-105"
        >
          <HeartIcon
            className={`h-4 w-4 ${favorite ? "text-rose-400" : "text-white"}`}
          />
        </button>
      </div>
      <Link
        href={`/movie/${movieId}`}
        prefetch={false}
        className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-white">
            {movie.title}
          </h3>
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-foreground/80">
            {formatYear(movie.releaseDate)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="line-clamp-2 text-left text-muted-foreground">
            {movie.overview || "No synopsis available."}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between text-sm font-medium text-foreground/80">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
            <StarIcon className="h-4 w-4 text-amber-300" />
            <span>{formatRating(movie.voteAverage)}</span>
          </div>
          <span className="text-xs uppercase tracking-wide text-cyan-200">
            Details
          </span>
        </div>
      </Link>
    </article>
  );
}
