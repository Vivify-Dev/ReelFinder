"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MovieCard } from "@/components/movie-card";
import { MovieCardSkeleton } from "@/components/movie-card-skeleton";
import { PersonCard } from "@/components/person-card";
import { SearchResponse, SearchResult, SearchType } from "@/types/movies";

type Props = {
  query: string;
  type: SearchType;
  genreId?: number | null;
  keywordId?: number | null;
  emptyTitle?: string;
  emptyDescription?: string;
  endMessage?: string;
  capMessage?: string;
};

const skeletons = Array.from({ length: 8 }, (_, index) => index);
const isDev = process.env.NODE_ENV !== "production";
const DEFAULT_CAP_PAGES = 10;

const normalizePositiveInt = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const intValue = Math.floor(parsed);
  return intValue > 0 ? intValue : null;
};

const dedupeResultsById = (results: SearchResult[]) => {
  const seen = new Set<number>();
  const unique: SearchResult[] = [];

  for (const result of results) {
    if (seen.has(result.id)) {
      continue;
    }
    seen.add(result.id);
    unique.push(result);
  }

  return unique;
};

const mergeUniqueById = (existing: SearchResult[], incoming: SearchResult[]) => {
  if (existing.length === 0) {
    return dedupeResultsById(incoming);
  }

  const seen = new Set(existing.map((item) => item.id));
  const merged = [...existing];

  for (const item of incoming) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
};

type NowPlayingResponse = {
  ids?: number[];
};

let nowPlayingIdsPromise: Promise<Set<number>> | null = null;

const fetchNowPlayingIds = async (): Promise<Set<number>> => {
  if (!nowPlayingIdsPromise) {
    nowPlayingIdsPromise = (async () => {
      const response = await fetch("/api/now-playing-ids", {
        cache: "force-cache",
      });
      if (!response.ok) {
        throw new Error(`Now playing request failed (${response.status})`);
      }

      const payload = (await response.json()) as NowPlayingResponse;
      const ids = new Set<number>();
      for (const rawId of payload.ids ?? []) {
        const normalizedId = normalizePositiveInt(rawId);
        if (normalizedId) {
          ids.add(normalizedId);
        }
      }
      return ids;
    })().catch((error) => {
      nowPlayingIdsPromise = null;
      throw error;
    });
  }

  return nowPlayingIdsPromise;
};

const buildParams = ({
  page,
  query,
  type,
  genreId,
  keywordId,
}: {
  page: number;
  query: string;
  type: SearchType;
  genreId?: number | null;
  keywordId?: number | null;
}) => {
  const params = new URLSearchParams({
    page: String(page),
    type,
  });

  const trimmed = query.trim();
  if (trimmed) {
    params.set("q", trimmed);
  }
  const safeGenreId = normalizePositiveInt(genreId);
  if (safeGenreId !== null) {
    params.set("genreId", String(safeGenreId));
    if (type === "genres") {
      params.set("mode", "discover");
    }
  }
  const safeKeywordId = normalizePositiveInt(keywordId);
  if (safeKeywordId !== null) {
    params.set("keywordId", String(safeKeywordId));
  }

  return params;
};

type FetchPageOptions = {
  force?: boolean;
};

export function LoadMoreResults({
  query,
  type,
  genreId = null,
  keywordId = null,
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or switching to another type.",
  endMessage = "No more results.",
  capMessage = "Use search to explore more.",
}: Props) {
  const [items, setItems] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [capPages, setCapPages] = useState(DEFAULT_CAP_PAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequestedPage, setLastRequestedPage] = useState(1);
  const [nowPlayingIds, setNowPlayingIds] = useState<Set<number>>(new Set());
  const requestCounter = useRef(0);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedPagesRef = useRef(new Set<number>());
  const pageRef = useRef(0);
  const hasMoreRef = useRef(false);
  const capPagesRef = useRef(DEFAULT_CAP_PAGES);
  const errorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const safeGenreId = normalizePositiveInt(genreId);
  const safeKeywordId = normalizePositiveInt(keywordId);

  const resetKey = useMemo(
    () =>
      JSON.stringify({
        query: query.trim(),
        type,
        genreId: safeGenreId,
        keywordId: safeKeywordId,
      }),
    [query, type, safeGenreId, safeKeywordId]
  );

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    capPagesRef.current = capPages;
  }, [capPages]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  useEffect(() => {
    let cancelled = false;

    const loadNowPlayingIds = async () => {
      try {
        const ids = await fetchNowPlayingIds();
        if (!cancelled) {
          setNowPlayingIds(ids);
        }
      } catch (nowPlayingError) {
        console.error("Now playing ids request failed", nowPlayingError);
      }
    };

    void loadNowPlayingIds();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean, options: FetchPageOptions = {}) => {
      const { force = false } = options;

      if (!force) {
        if (inFlightRef.current || fetchedPagesRef.current.has(targetPage)) {
          return;
        }
      } else if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const requestId = requestCounter.current + 1;
      requestCounter.current = requestId;
      inFlightRef.current = true;
      setLastRequestedPage(targetPage);
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const params = buildParams({
          page: targetPage,
          query,
          type,
          genreId: safeGenreId,
          keywordId: safeKeywordId,
        });
        const requestUrl = `/api/search?${params.toString()}`;
        const res = await fetch(requestUrl, {
          cache: targetPage === 1 ? "force-cache" : "no-store",
          signal: controller.signal,
        });

        if (isDev && type === "genres") {
          const snippet = (await res.clone().text()).slice(0, 180);
          console.info("[LoadMoreResults.fetchPage]", {
            url: requestUrl,
            status: res.status,
            body: snippet,
          });
        }

        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }

        const payload = (await res.json()) as SearchResponse;
        if (requestCounter.current !== requestId) {
          return;
        }

        const normalizedResults = dedupeResultsById(payload.results);
        setItems((current) =>
          append
            ? mergeUniqueById(current, normalizedResults)
            : normalizedResults
        );
        setPage(payload.page);
        pageRef.current = payload.page;
        fetchedPagesRef.current.add(payload.page);

        const nextCapPages =
          normalizePositiveInt(payload.cap_pages) ?? DEFAULT_CAP_PAGES;
        setCapPages(nextCapPages);
        capPagesRef.current = nextCapPages;

        const nextHasMore = payload.has_more && payload.page < nextCapPages;
        setHasMore(nextHasMore);
        hasMoreRef.current = nextHasMore;

        const didHitCap = payload.cap_reached || payload.page >= nextCapPages;
        setCapReached(didHitCap);
      } catch (fetchError) {
        if (requestCounter.current !== requestId) {
          return;
        }

        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        console.error("Search request failed", fetchError);
        setError("We hit a snag loading results. Please try again.");
      } finally {
        if (requestCounter.current === requestId) {
          setIsLoading(false);
          inFlightRef.current = false;
          abortControllerRef.current = null;
        }
      }
    },
    [query, type, safeGenreId, safeKeywordId]
  );

  const isEmpty = !isLoading && !error && items.length === 0;
  const showInitialLoading = isLoading && items.length === 0;
  const hasItems = items.length > 0;
  const canLoadMore = hasMore && page < capPages;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!hasItems) {
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }
        if (inFlightRef.current || errorRef.current) {
          return;
        }
        if (!hasMoreRef.current || pageRef.current >= capPagesRef.current) {
          return;
        }

        void fetchPage(pageRef.current + 1, true);
      },
      { root: null, rootMargin: "280px 0px", threshold: 0.01 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [fetchPage, hasItems]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    inFlightRef.current = false;
    fetchedPagesRef.current.clear();

    setItems([]);
    setPage(0);
    pageRef.current = 0;
    setHasMore(false);
    hasMoreRef.current = false;
    setCapReached(false);
    setCapPages(DEFAULT_CAP_PAGES);
    capPagesRef.current = DEFAULT_CAP_PAGES;
    setError(null);
    setLastRequestedPage(1);
    void fetchPage(1, false, { force: true });
  }, [fetchPage, resetKey]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          <p>{error}</p>
          <button
            onClick={() =>
              void fetchPage(
                Math.max(1, lastRequestedPage),
                lastRequestedPage > 1
              )
            }
            className="mt-3 inline-flex items-center justify-center rounded-full border border-rose-300/40 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:border-rose-200/60"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {showInitialLoading
          ? skeletons.map((id) => <MovieCardSkeleton key={id} />)
          : items.map((item) =>
              item.resultType === "movie" ? (
                <MovieCard
                  key={`movie-${item.id}`}
                  movie={{
                    ...item,
                    inTheatersOnly: nowPlayingIds.has(item.id),
                  }}
                />
              ) : (
                <PersonCard key={`person-${item.id}`} person={item} />
              )
            )}
      </div>

      {isEmpty && (
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-muted-foreground">
          <p className="text-lg font-medium text-white">{emptyTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      )}

      {hasItems && (
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <div ref={sentinelRef} className="h-3 w-full" aria-hidden />
          {isLoading ? (
            <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
              Loading...
            </p>
          ) : canLoadMore ? (
            <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
              Scroll to load more
            </p>
          ) : (
            <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
              {capReached ? capMessage : endMessage}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Loaded {items.length} results</p>
        </div>
      )}
    </div>
  );
}
