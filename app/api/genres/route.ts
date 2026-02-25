import { NextResponse } from "next/server";
import { fetchFromTmdb } from "@/lib/tmdb";
import { Genre } from "@/types/movies";

export const revalidate = 86400;

const SAMPLE_PAGES = 2;
const TOP_GENRE_LIMIT = 8;

type TmdbGenreListResponse = {
  genres?: Genre[];
};

type TmdbMovieListResponse = {
  results?: {
    genre_ids?: number[];
  }[];
};

const buildSampleRequests = () => {
  const requests: Array<Promise<TmdbMovieListResponse | null>> = [];

  for (let page = 1; page <= SAMPLE_PAGES; page += 1) {
    requests.push(
      fetchFromTmdb<TmdbMovieListResponse>(
        "/movie/popular",
        { page, language: "en-US" },
        { revalidateSeconds: 86400 }
      )
    );
    requests.push(
      fetchFromTmdb<TmdbMovieListResponse>(
        "/trending/movie/week",
        { page, language: "en-US" },
        { revalidateSeconds: 86400 }
      )
    );
  }

  return requests;
};

export async function GET() {
  const isDev = process.env.NODE_ENV !== "production";
  const start = isDev ? performance.now() : 0;

  try {
    const [genreList, ...sampleResponses] = await Promise.all([
      fetchFromTmdb<TmdbGenreListResponse>(
        "/genre/movie/list",
        { language: "en-US" },
        { revalidateSeconds: 86400 }
      ),
      ...buildSampleRequests(),
    ]);

    const allGenres = genreList?.genres ?? [];
    const genreNameById = new Map(allGenres.map((genre) => [genre.id, genre.name]));
    const counts = new Map<number, number>();

    for (const response of sampleResponses) {
      for (const movie of response?.results ?? []) {
        for (const genreId of movie.genre_ids ?? []) {
          counts.set(genreId, (counts.get(genreId) ?? 0) + 1);
        }
      }
    }

    const topGenres = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([genreId]) => ({
        id: genreId,
        name: genreNameById.get(genreId) ?? "Unknown",
      }))
      .filter((genre) => genre.name !== "Unknown")
      .slice(0, TOP_GENRE_LIMIT);

    return NextResponse.json({
      genres: topGenres,
      sampled_pages_per_feed: SAMPLE_PAGES,
      cache_hours: 24,
    });
  } catch (error) {
    console.error("Genres API error:", error);
    return NextResponse.json(
      {
        error: "TMDB_UNAVAILABLE",
        message: "Failed to load genres.",
      },
      { status: 503 }
    );
  } finally {
    if (isDev) {
      const elapsed = Math.round(performance.now() - start);
      console.info(`[perf] api/genres ${elapsed}ms`);
    }
  }
}
