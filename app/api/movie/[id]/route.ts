import { NextResponse } from "next/server";
import { tmdbFetchJson, TmdbFetchError } from "@/lib/tmdb";
import { CastMember, MovieDetails } from "@/types/movies";

export const revalidate = 3600;

type TmdbMovieDetail = {
  id: number;
  title: string;
  overview: string;
  release_date?: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
  tagline?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  vote_average?: number;
  status?: string;
  homepage?: string;
  credits?: {
    cast?: {
      id: number;
      name: string;
      character: string;
      profile_path?: string | null;
    }[];
  };
};

const parseTmdbStatusCode = (body: string) => {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { status_code?: number };
    const code = Number(parsed?.status_code);
    return Number.isFinite(code) ? code : null;
  } catch {
    return null;
  }
};

const mapMovie = (data: TmdbMovieDetail): MovieDetails => {
  const cast: CastMember[] =
    data.credits?.cast
      ?.slice(0, 10)
      .map((member) => ({
        id: member.id,
        name: member.name,
        character: member.character,
        profilePath: member.profile_path,
      })) ?? [];

  return {
    id: data.id,
    title: data.title,
    overview: data.overview,
    releaseDate: data.release_date,
    runtime: data.runtime,
    genres: data.genres,
    tagline: data.tagline,
    backdropPath: data.backdrop_path,
    posterPath: data.poster_path,
    voteAverage: data.vote_average,
    cast,
    status: data.status,
    homepage: data.homepage,
  };
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  const isDev = process.env.NODE_ENV !== "production";
  const start = isDev ? performance.now() : 0;
  const { id: rawId } = await params;
  const id = typeof rawId === "string" ? rawId : "";
  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { message: "Movie id must be digits only." },
      { status: 400 }
    );
  }

  try {
    const data = await tmdbFetchJson<TmdbMovieDetail>(
      `/3/movie/${id}?append_to_response=credits&language=en-US`,
      { next: { revalidate } }
    );

    return NextResponse.json(mapMovie(data));
  } catch (error) {
    const status =
      error instanceof TmdbFetchError ? error.status : undefined;
    const body = error instanceof TmdbFetchError ? error.body : undefined;
    const statusCode = body ? parseTmdbStatusCode(body) : null;

    if (status === 404 || statusCode === 34) {
      return NextResponse.json({ message: "Movie not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: "TMDB_UNAVAILABLE",
        message: "Failed to fetch movie details.",
      },
      { status: 503 }
    );
  } finally {
    if (isDev) {
      const elapsed = Math.round(performance.now() - start);
      console.info(`[perf] api/movie/${id || "invalid"} ${elapsed}ms`);
    }
  }
}
