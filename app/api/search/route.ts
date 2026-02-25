import { NextRequest, NextResponse } from "next/server";
import { fetchFromTmdb } from "@/lib/tmdb";
import { SearchResponse, SearchResult, SearchType } from "@/types/movies";

export const revalidate = 60;

const CAP_PAGES = 10;
const TMDB_MAX_PAGE = 500;
const SEARCH_TYPES: SearchType[] = [
  "titles",
  "people",
  "genres",
  "keywords",
  "multi",
];

type TmdbPagedResponse<T> = {
  page?: number;
  results?: T[];
  total_pages?: number;
  total_results?: number;
};

type TmdbMovie = {
  id?: number;
  title?: string;
  name?: string;
  media_type?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  popularity?: number;
  vote_count?: number;
};

type TmdbPerson = {
  id?: number;
  name?: string;
  media_type?: string;
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: TmdbMovie[];
  popularity?: number;
};

type TmdbGenreListResponse = {
  genres?: {
    id?: number;
    name?: string;
  }[];
};

type TmdbKeywordSearchResponse = {
  results?: {
    id?: number;
    name?: string;
  }[];
};

type EndpointConfig =
  | {
      endpoint: string;
      params: Record<string, string | number | boolean | undefined>;
      revalidateSeconds: number;
      forceMoviesOnly?: boolean;
      forcePeopleOnly?: boolean;
    }
  | {
      empty: true;
    };

type ScoreComponents = {
  relevanceScore: number;
  popularityScore: number;
  votesScore: number;
  recencyScore: number;
  knownForScore: number;
  combinedScore: number;
};

type RankedItem = {
  item: TmdbMovie | TmdbPerson;
  resultType: "movie" | "person";
  originalRank: number;
  scores: ScoreComponents;
};

type SearchDebugEntry = {
  id: number;
  resultType: "movie" | "person";
  source?: "primary" | "keyword_discover" | "title_search";
  title?: string;
  name?: string;
  original_rank: number;
  relevance_score: number;
  popularity_score: number;
  votes_score: number;
  recency_score: number;
  known_for_score: number;
  combined_score: number;
};

type MovieSearchResult = Extract<SearchResult, { resultType: "movie" }>;
type PersonSearchResult = Extract<SearchResult, { resultType: "person" }>;

const isSearchType = (value: string | null): value is SearchType =>
  value ? SEARCH_TYPES.includes(value as SearchType) : false;

const parsePage = (value: string | null) => {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

const parsePositiveInt = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const intValue = Math.floor(parsed);
  return intValue > 0 ? intValue : null;
};

const clean = (value: string | null) => value?.trim() ?? "";

const asNonNegativeNumber = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

const isRecentRelease = (releaseDate?: string) => {
  if (!releaseDate) {
    return false;
  }

  const releaseTimestamp = Date.parse(releaseDate);
  if (!Number.isFinite(releaseTimestamp)) {
    return false;
  }

  const now = new Date();
  const cutoff = new Date(
    now.getFullYear() - 2,
    now.getMonth(),
    now.getDate()
  ).getTime();

  return releaseTimestamp >= cutoff;
};

const buildMovieScores = (movie: TmdbMovie, rank: number): ScoreComponents => {
  const relevanceScore = 1 / (rank + 1);
  const popularityScore = Math.log10(asNonNegativeNumber(movie.popularity) + 1);
  const votesScore = Math.log10(asNonNegativeNumber(movie.vote_count) + 1);
  const recencyScore = isRecentRelease(movie.release_date) ? 0.1 : 0;

  return {
    relevanceScore,
    popularityScore,
    votesScore,
    recencyScore,
    knownForScore: 0,
    combinedScore:
      relevanceScore * 3.0 +
      popularityScore * 1.5 +
      votesScore * 1.0 +
      recencyScore,
  };
};

const buildPersonScores = (person: TmdbPerson, rank: number): ScoreComponents => {
  const relevanceScore = 1 / (rank + 1);
  const popularityScore = Math.log10(asNonNegativeNumber(person.popularity) + 1);
  const knownForScore =
    (Array.isArray(person.known_for) ? person.known_for.length : 0) * 0.05;

  return {
    relevanceScore,
    popularityScore,
    votesScore: 0,
    recencyScore: 0,
    knownForScore,
    combinedScore: relevanceScore * 3.0 + popularityScore * 2.0 + knownForScore,
  };
};

const rankResults = (
  rawResults: Array<TmdbMovie | TmdbPerson>,
  config: Exclude<EndpointConfig, { empty: true }>
) => {
  const ranked: RankedItem[] = rawResults.map((item, index) => {
    const resultType: RankedItem["resultType"] = config.forceMoviesOnly
      ? "movie"
      : config.forcePeopleOnly
        ? "person"
        : (item as TmdbPerson).media_type === "person"
          ? "person"
          : "movie";

    const scores =
      resultType === "person"
        ? buildPersonScores(item as TmdbPerson, index)
        : buildMovieScores(item as TmdbMovie, index);

    return {
      item,
      resultType,
      originalRank: index,
      scores,
    };
  });

  ranked.sort((a, b) => {
    const scoreDiff = b.scores.combinedScore - a.scores.combinedScore;
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.originalRank - b.originalRank;
  });

  return ranked;
};

const appendMoviesFromSource = ({
  source,
  rawMovies,
  mapped,
  seenIds,
  debugOrder,
  debugEntries,
}: {
  source: "keyword_discover" | "title_search";
  rawMovies: TmdbMovie[];
  mapped: SearchResult[];
  seenIds: Set<number>;
  debugOrder: boolean;
  debugEntries: SearchDebugEntry[];
}) => {
  for (const [rank, movie] of rawMovies.entries()) {
    const movieResult = toMovieResult(movie);
    if (!movieResult || seenIds.has(movieResult.id)) {
      continue;
    }

    seenIds.add(movieResult.id);
    mapped.push(movieResult);

    if (debugOrder && debugEntries.length < 8) {
      const scores = buildMovieScores(movie, rank);
      debugEntries.push({
        id: movieResult.id,
        title: movieResult.title,
        resultType: "movie",
        source,
        original_rank: rank,
        relevance_score: Number(scores.relevanceScore.toFixed(4)),
        popularity_score: Number(scores.popularityScore.toFixed(4)),
        votes_score: Number(scores.votesScore.toFixed(4)),
        recency_score: Number(scores.recencyScore.toFixed(4)),
        known_for_score: Number(scores.knownForScore.toFixed(4)),
        combined_score: Number(scores.combinedScore.toFixed(4)),
      });
    }
  }
};

const toCappedTotalPages = (totalPages?: number, sourceUsed = false) => {
  if (!sourceUsed) {
    return 0;
  }
  return Math.min(Math.max(1, Number(totalPages ?? 1)), CAP_PAGES);
};

const toMovieResult = (movie: TmdbMovie): MovieSearchResult | null => {
  if (!movie || typeof movie.id !== "number" || !Number.isFinite(movie.id)) {
    return null;
  }
  if (movie.media_type && movie.media_type !== "movie") {
    return null;
  }

  const title = movie.title ?? movie.name;
  if (!title || typeof title !== "string") {
    return null;
  }

  return {
    resultType: "movie",
    id: movie.id,
    title,
    overview: movie.overview,
    releaseDate: movie.release_date,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    voteAverage: movie.vote_average,
  };
};

const toPersonResult = (person: TmdbPerson): PersonSearchResult | null => {
  if (!person || typeof person.id !== "number" || !Number.isFinite(person.id)) {
    return null;
  }
  if (person.media_type && person.media_type !== "person") {
    return null;
  }
  if (!person.name || typeof person.name !== "string") {
    return null;
  }

  const knownForTitles =
    person.known_for
      ?.map((credit) => credit.title ?? credit.name)
      .filter((title): title is string => Boolean(title)) ?? [];

  return {
    resultType: "person",
    id: person.id,
    name: person.name,
    profilePath: person.profile_path,
    knownForDepartment: person.known_for_department,
    knownForTitles,
  };
};

const resolveGenreId = async (
  query: string,
  genreId: number | null
): Promise<number | null> => {
  if (genreId) return genreId;
  if (!query) return null;

  const genres = await fetchFromTmdb<TmdbGenreListResponse>(
    "/genre/movie/list",
    { language: "en-US" },
    { revalidateSeconds: 86400 }
  );

  const entries = genres?.genres ?? [];
  const normalizedQuery = query.toLowerCase();
  const exact = entries.find(
    (genre) =>
      typeof genre.name === "string" &&
      genre.name.toLowerCase() === normalizedQuery &&
      typeof genre.id === "number"
  );
  if (exact?.id) return exact.id;

  const partial = entries.find(
    (genre) =>
      typeof genre.name === "string" &&
      genre.name.toLowerCase().includes(normalizedQuery) &&
      typeof genre.id === "number"
  );
  return partial?.id ?? null;
};

const resolveKeywordId = async (
  query: string,
  keywordId: number | null
): Promise<number | null> => {
  if (keywordId) return keywordId;
  if (!query) return null;

  const keywordResponse = await fetchFromTmdb<TmdbKeywordSearchResponse>(
    "/search/keyword",
    {
      query,
      page: 1,
      include_adult: false,
    },
    { revalidateSeconds: 300 }
  );

  const results = keywordResponse?.results ?? [];
  if (!results.length) return null;

  const normalizedQuery = query.toLowerCase();
  const exact = results.find(
    (keyword) =>
      typeof keyword.name === "string" &&
      keyword.name.toLowerCase() === normalizedQuery &&
      typeof keyword.id === "number"
  );
  if (exact?.id) return exact.id;

  const first = results.find((keyword) => typeof keyword.id === "number");
  return first?.id ?? null;
};

const buildEndpointConfig = async ({
  type,
  query,
  page,
  genreId,
  keywordId,
}: {
  type: SearchType;
  query: string;
  page: number;
  genreId: number | null;
  keywordId: number | null;
}): Promise<EndpointConfig> => {
  const baseParams = {
    page,
    include_adult: false,
    language: "en-US",
  };

  if (type === "people") {
    return query
      ? {
          endpoint: "/search/person",
          params: { ...baseParams, query },
          revalidateSeconds: 300,
          forcePeopleOnly: true,
        }
      : {
          endpoint: "/person/popular",
          params: { ...baseParams },
          revalidateSeconds: 300,
          forcePeopleOnly: true,
        };
  }

  if (type === "titles") {
    return query
      ? {
          endpoint: "/search/movie",
          params: { ...baseParams, query },
          revalidateSeconds: 300,
          forceMoviesOnly: true,
        }
      : {
          endpoint: "/movie/popular",
          params: { ...baseParams },
          revalidateSeconds: 300,
          forceMoviesOnly: true,
        };
  }

  if (type === "genres") {
    const resolvedGenreId = await resolveGenreId(query, genreId);
    if (!resolvedGenreId) {
      if (!query && !genreId) {
        return {
          endpoint: "/movie/popular",
          params: { ...baseParams },
          revalidateSeconds: 300,
          forceMoviesOnly: true,
        };
      }
      return { empty: true };
    }
    return {
      endpoint: "/discover/movie",
      params: {
        ...baseParams,
        with_genres: resolvedGenreId,
        sort_by: "popularity.desc",
      },
      revalidateSeconds: 300,
      forceMoviesOnly: true,
    };
  }

  if (type === "keywords") {
    const resolvedKeywordId = await resolveKeywordId(query, keywordId);
    if (!resolvedKeywordId) {
      if (!query && !keywordId) {
        return {
          endpoint: "/movie/popular",
          params: { ...baseParams },
          revalidateSeconds: 300,
          forceMoviesOnly: true,
        };
      }
      return { empty: true };
    }
    return {
      endpoint: "/discover/movie",
      params: {
        ...baseParams,
        with_keywords: resolvedKeywordId,
        sort_by: "popularity.desc",
      },
      revalidateSeconds: 300,
      forceMoviesOnly: true,
    };
  }

  return query
    ? {
        endpoint: "/search/multi",
        params: { ...baseParams, query },
        revalidateSeconds: 300,
      }
    : {
        endpoint: "/movie/popular",
        params: { ...baseParams },
        revalidateSeconds: 300,
        forceMoviesOnly: true,
      };
};

const buildEmptyPayload = (page: number, capReached: boolean): SearchResponse => ({
  results: [],
  page,
  total_pages: 1,
  has_more: false,
  cap_pages: CAP_PAGES,
  cap_reached: capReached,
});

const buildErrorPayload = (
  page: number,
  error: string,
  message: string
): SearchResponse & { error: string; message: string } => ({
  ...buildEmptyPayload(page, false),
  error,
  message,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = clean(searchParams.get("q") ?? searchParams.get("query"));
  const page = parsePage(searchParams.get("page"));
  const debugOrder = clean(searchParams.get("debugOrder")) === "1";
  const typeParam = clean(searchParams.get("type"));
  const type = isSearchType(typeParam) ? typeParam : "multi";
  const mode = clean(searchParams.get("mode"));
  const rawGenreId = clean(
    searchParams.get("genreId") ?? searchParams.get("with_genres")
  );
  const genreId = parsePositiveInt(rawGenreId || null);
  const keywordId = parsePositiveInt(
    searchParams.get("keywordId") ?? searchParams.get("with_keywords")
  );

  if (mode === "discover" && type === "genres" && !genreId) {
    return NextResponse.json(
      buildErrorPayload(
        page,
        "INVALID_GENRE_ID",
        "genreId must be a positive integer when mode=discover for genre browsing."
      ),
      { status: 400 }
    );
  }

  if (page > CAP_PAGES) {
    return NextResponse.json(buildEmptyPayload(page, true));
  }

  try {
    const safePage = Math.min(page, TMDB_MAX_PAGE);

    if (type === "keywords" && (query || keywordId)) {
      const baseParams = {
        page: safePage,
        include_adult: false,
        language: "en-US",
      };

      const debugEntries: SearchDebugEntry[] = [];
      const mapped: SearchResult[] = [];
      const seenIds = new Set<number>();

      let resolvedKeywordId: number | null = null;
      let keywordResolutionError: unknown = null;

      const titleRequest =
        query.length > 0
          ? fetchFromTmdb<TmdbPagedResponse<TmdbMovie>>(
              "/search/movie",
              { ...baseParams, query },
              { revalidateSeconds: 300 }
            )
          : Promise.resolve(null);

      try {
        resolvedKeywordId = await resolveKeywordId(query, keywordId);
      } catch (error) {
        keywordResolutionError = error;
      }

      let keywordData: TmdbPagedResponse<TmdbMovie> | null = null;
      let titleData: TmdbPagedResponse<TmdbMovie> | null = null;
      let keywordFlowError: unknown = null;
      let titleFlowError: unknown = null;

      if (resolvedKeywordId) {
        try {
          keywordData = await fetchFromTmdb<TmdbPagedResponse<TmdbMovie>>(
            "/discover/movie",
            {
              ...baseParams,
              with_keywords: resolvedKeywordId,
              sort_by: "popularity.desc",
            },
            { revalidateSeconds: 300 }
          );
        } catch (error) {
          keywordFlowError = error;
        }
      }

      try {
        titleData = await titleRequest;
      } catch (error) {
        titleFlowError = error;
      }

      if (keywordFlowError || keywordResolutionError) {
        console.warn("Keyword discover flow failed", {
          keywordFlowError,
          keywordResolutionError,
        });
      }
      if (titleFlowError) {
        console.warn("Keyword title-match flow failed", titleFlowError);
      }

      const keywordSourceUsed = Boolean(resolvedKeywordId);
      const titleSourceUsed = query.length > 0;
      const keywordSourceSucceeded = keywordSourceUsed && !keywordFlowError;
      const titleSourceSucceeded = titleSourceUsed && !titleFlowError;

      if (!keywordSourceSucceeded && !titleSourceSucceeded) {
        return NextResponse.json(
          buildErrorPayload(
            page,
            "TMDB_UNAVAILABLE",
            "Unable to fetch results right now. Please try again shortly."
          ),
          { status: 503 }
        );
      }

      appendMoviesFromSource({
        source: "keyword_discover",
        rawMovies: keywordData?.results ?? [],
        mapped,
        seenIds,
        debugOrder,
        debugEntries,
      });

      appendMoviesFromSource({
        source: "title_search",
        rawMovies: titleData?.results ?? [],
        mapped,
        seenIds,
        debugOrder,
        debugEntries,
      });

      const keywordTotalPages = toCappedTotalPages(
        keywordData?.total_pages,
        keywordSourceUsed
      );
      const titleTotalPages = toCappedTotalPages(
        titleData?.total_pages,
        titleSourceUsed
      );

      const hasMore =
        (keywordSourceUsed && safePage < keywordTotalPages) ||
        (titleSourceUsed && safePage < titleTotalPages);
      const capReached =
        safePage >= CAP_PAGES &&
        ((keywordSourceUsed &&
          Number(keywordData?.total_pages ?? 0) > CAP_PAGES) ||
          (titleSourceUsed && Number(titleData?.total_pages ?? 0) > CAP_PAGES));

      const payload: SearchResponse & { debug_order?: SearchDebugEntry[] } = {
        results: mapped,
        page: safePage,
        total_pages: Math.max(1, keywordTotalPages, titleTotalPages),
        has_more: hasMore,
        cap_pages: CAP_PAGES,
        cap_reached: capReached,
      };

      if (debugOrder) {
        payload.debug_order = debugEntries;
      }

      return NextResponse.json(payload);
    }

    const config = await buildEndpointConfig({
      type,
      query,
      page: safePage,
      genreId,
      keywordId,
    });

    if ("empty" in config) {
      return NextResponse.json(buildEmptyPayload(page, false));
    }

    const data = await fetchFromTmdb<TmdbPagedResponse<TmdbMovie | TmdbPerson>>(
      config.endpoint,
      config.params,
      { revalidateSeconds: config.revalidateSeconds }
    );

    const rawResults = data?.results ?? [];
    const rankedResults = rankResults(rawResults, config);
    const mapped: SearchResult[] = [];
    const debugEntries: SearchDebugEntry[] = [];

    for (const rankedItem of rankedResults) {
      const { item, resultType, originalRank, scores } = rankedItem;

      if (resultType === "movie") {
        const movieResult = toMovieResult(item as TmdbMovie);
        if (movieResult) mapped.push(movieResult);
        if (debugOrder && movieResult && debugEntries.length < 8) {
          debugEntries.push({
            id: movieResult.id,
            title: movieResult.title,
            resultType: "movie",
            source: "primary",
            original_rank: originalRank,
            relevance_score: Number(scores.relevanceScore.toFixed(4)),
            popularity_score: Number(scores.popularityScore.toFixed(4)),
            votes_score: Number(scores.votesScore.toFixed(4)),
            recency_score: Number(scores.recencyScore.toFixed(4)),
            known_for_score: Number(scores.knownForScore.toFixed(4)),
            combined_score: Number(scores.combinedScore.toFixed(4)),
          });
        }
        continue;
      }

      const personResult = toPersonResult(item as TmdbPerson);
      if (personResult) {
        mapped.push(personResult);
        if (debugOrder && debugEntries.length < 8) {
          debugEntries.push({
            id: personResult.id,
            name: personResult.name,
            resultType: "person",
            source: "primary",
            original_rank: originalRank,
            relevance_score: Number(scores.relevanceScore.toFixed(4)),
            popularity_score: Number(scores.popularityScore.toFixed(4)),
            votes_score: Number(scores.votesScore.toFixed(4)),
            recency_score: Number(scores.recencyScore.toFixed(4)),
            known_for_score: Number(scores.knownForScore.toFixed(4)),
            combined_score: Number(scores.combinedScore.toFixed(4)),
          });
        }
        continue;
      }
    }

    const tmdbPage = Math.max(1, Number(data?.page ?? page));
    const tmdbTotalPages = Math.max(1, Number(data?.total_pages ?? 1));
    const cappedTotalPages = Math.min(tmdbTotalPages, CAP_PAGES);
    const hasMore = tmdbPage < cappedTotalPages;
    const capReached = tmdbTotalPages > CAP_PAGES && tmdbPage >= CAP_PAGES;

    const payload: SearchResponse & { debug_order?: SearchDebugEntry[] } = {
      results: mapped,
      page: tmdbPage,
      total_pages: cappedTotalPages,
      has_more: hasMore,
      cap_pages: CAP_PAGES,
      cap_reached: capReached,
    };

    if (debugOrder) {
      payload.debug_order = debugEntries;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      buildErrorPayload(
        page,
        "TMDB_UNAVAILABLE",
        "Unable to fetch results right now. Please try again shortly."
      ),
      { status: 503 }
    );
  }
}
