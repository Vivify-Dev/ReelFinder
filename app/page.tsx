"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoadMoreResults } from "@/components/load-more-results";
import { SearchIcon } from "@/components/ui/icons";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Genre, SearchType } from "@/types/movies";

const topGenresCache: { data: Genre[] | null } = { data: null };
type UiSearchType = Exclude<SearchType, "multi">;

const SEARCH_TYPES: Array<{ value: UiSearchType; label: string }> = [
  { value: "titles", label: "Titles" },
  { value: "people", label: "People (Cast & Crew)" },
  { value: "genres", label: "Genres" },
  { value: "keywords", label: "Keywords" },
];

const DEFAULT_SEARCH_TYPE: UiSearchType = "titles";
const LEGACY_SEARCH_TYPES: SearchType[] = [...SEARCH_TYPES.map((type) => type.value), "multi"];
const KNOWN_GENRE_ID_BY_NAME: Record<string, number> = {
  thriller: 53,
};

const isSearchType = (value: string | null): value is SearchType =>
  value ? LEGACY_SEARCH_TYPES.includes(value as SearchType) : false;

const parseGenreId = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const intValue = Math.floor(parsed);
  return intValue > 0 ? intValue : null;
};

const resolveGenreId = (value: unknown, name?: string) => {
  const parsed = parseGenreId(value == null ? null : String(value));
  if (parsed) {
    return parsed;
  }

  const normalizedName = name?.trim().toLowerCase();
  if (!normalizedName) {
    return null;
  }

  return KNOWN_GENRE_ID_BY_NAME[normalizedName] ?? null;
};

const toUiSearchType = (type: SearchType): UiSearchType =>
  type === "multi" ? DEFAULT_SEARCH_TYPE : type;

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didHydrateFromParams = useRef(false);
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<UiSearchType>(DEFAULT_SEARCH_TYPE);
  const [activeGenreId, setActiveGenreId] = useState<number | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genreLoadError, setGenreLoadError] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 320);

  useEffect(() => {
    if (didHydrateFromParams.current) {
      return;
    }

    const paramsQuery = (
      searchParams.get("q") ?? searchParams.get("query") ?? ""
    ).trim();
    const paramsType = searchParams.get("type");
    const rawGenreParam =
      searchParams.get("genreId") ?? searchParams.get("with_genres");
    const paramsGenre = resolveGenreId(
      rawGenreParam,
      rawGenreParam ?? undefined
    );

    setQuery(paramsQuery);
    setSubmittedQuery(paramsQuery || null);
    setSearchType(isSearchType(paramsType) ? toUiSearchType(paramsType) : DEFAULT_SEARCH_TYPE);
    setActiveGenreId(paramsGenre);

    didHydrateFromParams.current = true;
  }, [searchParams]);

  useEffect(() => {
    const hasSearchQuery = Boolean(
      (searchParams.get("q") ?? searchParams.get("query") ?? "").trim()
    );
    const hasSearchType = Boolean(searchParams.get("type"));
    const hasGenre = Boolean(
      searchParams.get("genreId") ?? searchParams.get("with_genres")
    );

    if (!hasSearchQuery && !hasSearchType && !hasGenre) {
      setQuery("");
      setSubmittedQuery(null);
      setSearchType(DEFAULT_SEARCH_TYPE);
      setActiveGenreId(null);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const fetchGenres = async () => {
      try {
        if (topGenresCache.data) {
          setGenres(topGenresCache.data);
          return;
        }

        const res = await fetch("/api/genres", { cache: "force-cache" });
        if (!res.ok) {
          throw new Error("Genres request failed");
        }
        const payload = (await res.json()) as { genres: Genre[] };
        if (!cancelled) {
          topGenresCache.data = payload.genres ?? [];
          setGenres(payload.genres ?? []);
          setGenreLoadError(null);
        }
      } catch (error) {
        console.error("Genre request failed", error);
        if (!cancelled) {
          setGenreLoadError("Could not load popular genres.");
        }
      }
    };

    fetchGenres();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveQuery = activeGenreId
    ? ""
    : (submittedQuery ?? debouncedQuery).trim();

  useEffect(() => {
    if (submittedQuery !== null && debouncedQuery.trim() === submittedQuery) {
      setSubmittedQuery(null);
    }
  }, [debouncedQuery, submittedQuery]);

  const activeGenre = useMemo(
    () =>
      genres.find((genre) => resolveGenreId(genre.id, genre.name) === activeGenreId) ??
      null,
    [genres, activeGenreId]
  );

  const titleCopy = useMemo(() => {
    if (activeGenre) {
      return `${activeGenre.name} Movies`;
    }
    if (effectiveQuery) {
      if (searchType === "people") return `People matching "${effectiveQuery}"`;
      if (searchType === "genres") return `Genre matches for "${effectiveQuery}"`;
      if (searchType === "keywords") return `Keyword matches for "${effectiveQuery}"`;
      if (searchType === "titles") return `Title matches for "${effectiveQuery}"`;
      return `Results for "${effectiveQuery}"`;
    }
    if (searchType === "people") return "Popular People";
    return "Trending";
  }, [activeGenre, effectiveQuery, searchType]);

  const subtitleCopy = useMemo(() => {
    if (activeGenre) {
      return `Browsing ${activeGenre.name} titles.`;
    }
    if (effectiveQuery) {
      return "Not seeing it? Try a different search type.";
    }
    return "A curated feed of what people are watching right now.";
  }, [activeGenre, effectiveQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    const trimmedQuery = activeGenreId ? "" : effectiveQuery;

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }
    if (searchType !== DEFAULT_SEARCH_TYPE) {
      params.set("type", searchType);
    }
    if (activeGenreId) {
      params.set("genreId", String(activeGenreId));
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [activeGenreId, effectiveQuery, pathname, router, searchType]);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-6 py-16 shadow-2xl shadow-cyan-500/10 sm:px-10">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-center text-4xl font-semibold leading-tight text-white sm:text-5xl">
            ReelFinder
          </h1>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedQuery(query.trim());
              if (activeGenreId !== null) {
                setActiveGenreId(null);
              }
            }}
            className="space-y-4"
          >
            <label className="block space-y-2 text-sm font-medium text-foreground">
              <span className="sr-only">Search</span>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-2 shadow-inner shadow-cyan-500/10">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setSubmittedQuery(null);
                        if (activeGenreId !== null) {
                          setActiveGenreId(null);
                        }
                      }}
                      placeholder="Search titles, people, genres, or keywords..."
                      className="h-12 w-full rounded-xl bg-transparent pl-10 pr-3 text-lg text-foreground outline-none transition focus:bg-white/5"
                    />
                  </div>

                  <div className="flex items-center border-t border-white/10 pt-2 sm:border-l sm:border-t-0 sm:pl-2 sm:pt-0">
                    <span className="sr-only">Search type</span>
                    <select
                      value={searchType}
                      onChange={(event) => {
                        const nextType = event.target.value as UiSearchType;
                        setSearchType(nextType);
                        setSubmittedQuery(null);
                        if (nextType !== "genres") {
                          setActiveGenreId(null);
                        }
                      }}
                      className="h-10 min-w-[10rem] rounded-xl border border-white/15 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-cyan-400/60"
                    >
                      {SEARCH_TYPES.map((typeOption) => (
                        <option
                          key={typeOption.value}
                          value={typeOption.value}
                          className="bg-slate-900 text-white"
                        >
                          {typeOption.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </label>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {genres.map((genre) => {
                const genreId = resolveGenreId(genre.id, genre.name);
                if (!genreId) {
                  return null;
                }
                const isActive = activeGenreId === genreId;
                return (
                  <button
                    key={genreId}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      if (isActive) {
                        setActiveGenreId(null);
                        setSearchType(DEFAULT_SEARCH_TYPE);
                        return;
                      }
                      setQuery("");
                      setSubmittedQuery(null);
                      setSearchType("genres");
                      setActiveGenreId(genreId);
                    }}
                    className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-cyan-300/70 bg-white text-slate-950 shadow shadow-cyan-400/20"
                        : "border-white/10 bg-white/10 text-foreground hover:border-cyan-400/60 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>

            {genreLoadError && (
              <p className="text-sm text-rose-200">{genreLoadError}</p>
            )}
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{titleCopy}</h2>
          <p className="text-sm text-muted-foreground">{subtitleCopy}</p>
        </div>

        <LoadMoreResults
          query={effectiveQuery}
          type={searchType}
          genreId={activeGenreId}
          emptyTitle="No results found"
          emptyDescription="Try a different query, or switch search type."
          endMessage="No more results."
          capMessage="Use search to explore more."
        />
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="space-y-10" />}>
      <HomeContent />
    </Suspense>
  );
}
