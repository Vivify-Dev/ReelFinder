import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { RetryRefreshButton } from "@/components/retry-refresh-button";
import { ClockIcon, StarIcon } from "@/components/ui/icons";
import { formatRating, formatRuntime, formatYear } from "@/lib/formatters";
import { toInternalApiUrl } from "@/lib/internal-api-url";
import { getBackdropUrl, getPosterUrl, tmdbProfileUrl } from "@/lib/tmdb-images";
import { MovieDetails } from "@/types/movies";

type MovieFetchResult =
  | { status: "ok"; movie: MovieDetails }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "unavailable" };

async function getMovie(id: string): Promise<MovieFetchResult> {
  const apiUrl = await toInternalApiUrl(`/api/movie/${id}`);
  const res = await fetch(apiUrl, {
    next: { revalidate: 3600 },
  });

  if (res.status === 404) {
    return { status: "not_found" };
  }

  if (res.status === 400) {
    return { status: "invalid" };
  }

  if (res.status === 503) {
    return { status: "unavailable" };
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Movie API request failed (status=${res.status}): ${body.slice(0, 200)}`
    );
  }

  return { status: "ok", movie: (await res.json()) as MovieDetails };
}

type MoviePageProps = {
  params: { id?: string } | Promise<{ id?: string }>;
};

export default async function MoviePage(props: MoviePageProps) {
  const params = await props.params;
  const id = params?.id;

  if (!id) {
    notFound();
  }

  const raw = String(id ?? "");
  if (!/^\d+$/.test(raw)) {
    notFound();
  }

  const movieResult = await getMovie(raw);

  if (movieResult.status === "not_found" || movieResult.status === "invalid") {
    notFound();
  }

  if (movieResult.status === "unavailable") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-muted-foreground">
        <h1 className="text-2xl font-semibold text-white">
          Temporarily unavailable
        </h1>
        <p className="text-sm text-muted-foreground">
          TMDB is having trouble right now. Please retry or head back to search.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <RetryRefreshButton />
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

  const movie = movieResult.movie;
  const backdrop = movie.backdropPath;
  const poster = movie.posterPath;
  const backdropUrl = getBackdropUrl(backdrop, "w1280");
  const posterUrl = getPosterUrl(poster, "w500");
  const hasBackdrop = Boolean(backdropUrl);

  const favoritePayload = {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    releaseDate: movie.releaseDate,
    voteAverage: movie.voteAverage,
  };

  return (
    <div className="space-y-10">
      {hasBackdrop && backdropUrl ? (
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-cyan-500/10">
          <div className="relative aspect-[16/9] min-h-[240px] sm:min-h-[320px]">
            <Image
              src={backdropUrl}
              alt={`${movie.title} backdrop`}
              fill
              sizes="(max-width: 1024px) 100vw, 1200px"
              style={{ objectFit: "cover", objectPosition: "center" }}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/10" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                  {formatYear(movie.releaseDate)}
                </span>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                  <ClockIcon className="h-4 w-4 text-cyan-200" />
                  <span>{formatRuntime(movie.runtime)}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                  <StarIcon className="h-4 w-4 text-amber-300" />
                  <span className="font-semibold">
                    {formatRating(movie.voteAverage)}
                  </span>
                </div>
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                {movie.title}
              </h1>
              {movie.tagline && (
                <p className="mt-2 text-lg italic text-foreground/80">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}
            </div>
          </div>

          <div className="px-6 pb-10 pt-6 sm:px-10">
            <p className="max-w-3xl text-base leading-relaxed text-foreground/80">
              {movie.overview || "No synopsis available for this title yet."}
            </p>

            {movie.genres && movie.genres.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <FavoriteToggle movie={favoritePayload} />
              {movie.homepage && (
                <Link
                  href={movie.homepage}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-cyan-400/70 hover:text-white"
                >
                  Official Site
                </Link>
              )}
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-white/10"
              >
                Back to search
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 shadow-2xl shadow-cyan-500/10">
          <div className="grid items-start gap-6 px-6 py-8 sm:px-10 lg:grid-cols-[220px,1fr]">
            <div className="relative mx-auto aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={`${movie.title} poster`}
                  fill
                  className="object-cover"
                  priority
                  sizes="220px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  No poster available
                </div>
              )}
            </div>

            <div className="pb-2">
              <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                  {formatYear(movie.releaseDate)}
                </span>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                  <ClockIcon className="h-4 w-4 text-cyan-200" />
                  <span>{formatRuntime(movie.runtime)}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                  <StarIcon className="h-4 w-4 text-amber-300" />
                  <span className="font-semibold">
                    {formatRating(movie.voteAverage)}
                  </span>
                </div>
              </div>

              <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                {movie.title}
              </h1>
              {movie.tagline && (
                <p className="mt-2 text-lg italic text-muted-foreground">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}

              <p className="mt-5 max-w-3xl text-base leading-relaxed text-foreground/80">
                {movie.overview || "No synopsis available for this title yet."}
              </p>

              {movie.genres && movie.genres.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <FavoriteToggle movie={favoritePayload} />
                {movie.homepage && (
                  <Link
                    href={movie.homepage}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-cyan-400/70 hover:text-white"
                  >
                    Official Site
                  </Link>
                )}
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-white/10"
                >
                  Back to search
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Top cast</h2>
          <p className="text-sm text-muted-foreground">
            Up to 10 highlighted performers
          </p>
        </div>
        {movie.cast && movie.cast.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {movie.cast.map((person) => {
              const castProfileUrl = tmdbProfileUrl(person.profilePath, "w342");
              return (
                <Link
                  key={person.id}
                  href={`/person/${person.id}`}
                  prefetch={false}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-inner shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:border-cyan-400/50"
                >
                  <div className="relative aspect-[2/3] bg-slate-900">
                    {castProfileUrl ? (
                      <Image
                        src={castProfileUrl}
                        alt={person.name}
                        fill
                        className="object-cover"
                        sizes="180px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.character}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-muted-foreground">
            Cast information isn&apos;t available for this title yet.
          </div>
        )}
      </section>
    </div>
  );
}
