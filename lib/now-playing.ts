import { fetchFromTmdb } from "@/lib/tmdb";

export const NOW_PLAYING_REVALIDATE_SECONDS = 86400;

const NOW_PLAYING_SAMPLE_PAGES = 4;

type TmdbNowPlayingResponse = {
  results?: Array<{
    id?: number;
  }>;
};

export async function getNowPlayingIds(): Promise<Set<number>> {
  const requests = Array.from({ length: NOW_PLAYING_SAMPLE_PAGES }, (_, index) =>
    fetchFromTmdb<TmdbNowPlayingResponse>(
      "/movie/now_playing",
      {
        page: index + 1,
        language: "en-US",
        region: "US",
      },
      { revalidateSeconds: NOW_PLAYING_REVALIDATE_SECONDS }
    )
  );

  const responses = await Promise.all(requests);
  const ids = new Set<number>();

  for (const response of responses) {
    for (const movie of response?.results ?? []) {
      if (typeof movie.id === "number" && Number.isFinite(movie.id)) {
        ids.add(movie.id);
      }
    }
  }

  return ids;
}
