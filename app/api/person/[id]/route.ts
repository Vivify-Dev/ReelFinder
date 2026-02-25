import { NextResponse } from "next/server";
import { PersonDetails, PersonMovieCredit } from "@/types/movies";
import { tmdbFetchJson, TmdbFetchError } from "@/lib/tmdb";

export const revalidate = 3600;

type TmdbCredit = {
  id?: number;
  title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  character?: string;
  job?: string;
};

type TmdbPersonDetails = {
  id?: number;
  name?: string;
  profile_path?: string | null;
  known_for_department?: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  place_of_birth?: string;
  popularity?: number;
  movie_credits?: {
    cast?: TmdbCredit[];
    crew?: TmdbCredit[];
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

const normalizeCredit = (credit: TmdbCredit): PersonMovieCredit | null => {
  if (!credit || typeof credit.id !== "number" || !Number.isFinite(credit.id)) {
    return null;
  }
  const title = credit.title;
  if (!title || typeof title !== "string") {
    return null;
  }

  return {
    id: credit.id,
    title,
    overview: credit.overview,
    releaseDate: credit.release_date,
    posterPath: credit.poster_path,
    backdropPath: credit.backdrop_path,
    voteAverage: credit.vote_average,
    character: credit.character,
    job: credit.job,
  };
};

const sortByReleaseDateDesc = (a: PersonMovieCredit, b: PersonMovieCredit) => {
  const aTime = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
  const bTime = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
  return bTime - aTime;
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
      { message: "Person id must be digits only." },
      { status: 400 }
    );
  }

  try {
    const data = await tmdbFetchJson<TmdbPersonDetails>(
      `/3/person/${id}?append_to_response=movie_credits&language=en-US`,
      { next: { revalidate } }
    );

    const mergedCredits = [
      ...(data.movie_credits?.cast ?? []),
      ...(data.movie_credits?.crew ?? []),
    ];

    const creditMap = new Map<number, PersonMovieCredit>();
    for (const credit of mergedCredits) {
      const normalized = normalizeCredit(credit);
      if (!normalized) continue;
      const existing = creditMap.get(normalized.id);
      if (!existing) {
        creditMap.set(normalized.id, normalized);
        continue;
      }

      creditMap.set(normalized.id, {
        ...existing,
        character: existing.character ?? normalized.character,
        job: existing.job ?? normalized.job,
      });
    }

    const movieCredits = [...creditMap.values()]
      .sort(sortByReleaseDateDesc)
      .slice(0, 24);

    const payload: PersonDetails = {
      id: data.id ?? Number(id),
      name: data.name ?? "Unknown Person",
      profilePath: data.profile_path,
      knownForDepartment: data.known_for_department,
      biography: data.biography,
      birthday: data.birthday,
      deathday: data.deathday,
      placeOfBirth: data.place_of_birth,
      popularity: data.popularity,
      movieCredits,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const status =
      error instanceof TmdbFetchError ? error.status : undefined;
    const body = error instanceof TmdbFetchError ? error.body : undefined;
    const statusCode = body ? parseTmdbStatusCode(body) : null;

    if (status === 404 || statusCode === 34) {
      return NextResponse.json({ message: "Person not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: "TMDB_UNAVAILABLE",
        message: "Failed to fetch person details.",
      },
      { status: 503 }
    );
  } finally {
    if (isDev) {
      const elapsed = Math.round(performance.now() - start);
      console.info(`[perf] api/person/${id || "invalid"} ${elapsed}ms`);
    }
  }
}
