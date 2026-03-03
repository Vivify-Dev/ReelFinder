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
const SEARCH_TYPE_BUTTON_LABEL: Record<UiSearchType, string> = {
  titles: "Titles",
  people: "People",
  genres: "Genres",
  keywords: "Keywords",
};
const SHORT_SEARCH_PLACEHOLDER = "Search…";
const LONG_SEARCH_PLACEHOLDER = "Search titles, people, genres, or keywords…";

const DEFAULT_SEARCH_TYPE: UiSearchType = "titles";
const LEGACY_SEARCH_TYPES: SearchType[] = [...SEARCH_TYPES.map((type) => type.value), "multi"];
const KNOWN_GENRE_ID_BY_NAME: Record<string, number> = {
  thriller: 53,
};
const isDev = process.env.NODE_ENV !== "production";

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

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      setIsDesktop(mediaQuery.matches);
    };

    onChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onChange);
      return () => {
        mediaQuery.removeEventListener("change", onChange);
      };
    }

    mediaQuery.addListener(onChange);
    return () => {
      mediaQuery.removeListener(onChange);
    };
  }, []);

  return isDesktop;
}

type SearchBarProps = {
  query: string;
  searchType: UiSearchType;
  onQueryChange: (nextQuery: string) => void;
  onSearchTypeChange: (nextType: UiSearchType) => void;
};

function SearchBar({
  query,
  searchType,
  onQueryChange,
  onSearchTypeChange,
}: SearchBarProps) {
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const typeButtonRef = useRef<HTMLButtonElement | null>(null);
  const typeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isTypeOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (typeButtonRef.current?.contains(target)) {
        return;
      }

      if (typeMenuRef.current?.contains(target)) {
        return;
      }

      setIsTypeOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTypeOpen]);

  const searchPlaceholder = isDesktop
    ? LONG_SEARCH_PLACEHOLDER
    : SHORT_SEARCH_PLACEHOLDER;

  return (
    <div className="space-y-2 text-sm font-medium text-foreground">
      <label htmlFor="home-search-input" className="sr-only">
        Search
      </label>
      <div className="rounded-2xl border border-white/15 bg-white/10 p-2 shadow-inner shadow-cyan-500/10 sm:p-2.5">
        <div className="relative min-w-0">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
          <input
            id="home-search-input"
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-12 w-full rounded-xl bg-transparent pl-10 pr-24 text-base text-foreground outline-none transition placeholder:text-slate-300/90 focus:bg-white/5 sm:pr-28 sm:text-lg lg:pr-32"
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <div className="relative inline-block">
              <button
                ref={typeButtonRef}
                type="button"
                onClick={() => setIsTypeOpen((open) => !open)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/20 bg-slate-900/70 px-2.5 text-xs font-semibold text-slate-100 shadow-inner shadow-cyan-500/10 transition hover:bg-white/10 lg:px-3 lg:text-sm"
                aria-label="Choose search type"
                aria-haspopup="menu"
                aria-expanded={isTypeOpen}
                aria-controls="search-type-menu"
              >
                {SEARCH_TYPE_BUTTON_LABEL[searchType]}
              </button>

              {isTypeOpen && (
                <div
                  ref={typeMenuRef}
                  id="search-type-menu"
                  role="menu"
                  aria-label="Search Type"
                  className="absolute right-0 top-full z-[100] mt-2 w-[min(24rem,calc(100vw-3rem))] rounded-2xl border border-white/15 bg-slate-950/95 p-0 text-slate-100 shadow-2xl shadow-cyan-500/20 lg:w-[28rem]"
                >
                  <div className="max-h-[70dvh] overflow-y-auto">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-4 py-3">
                      <h3 className="text-base font-semibold text-white">Search Type</h3>
                      <button
                        type="button"
                        onClick={() => setIsTypeOpen(false)}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                      >
                        Close
                      </button>
                    </div>

                    <div className="space-y-2 p-4">
                      {SEARCH_TYPES.map((typeOption) => {
                        const isActive = searchType === typeOption.value;

                        return (
                          <button
                            key={typeOption.value}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => {
                              onSearchTypeChange(typeOption.value);
                              setIsTypeOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                              isActive
                                ? "border-cyan-300/70 bg-white text-slate-950 shadow"
                                : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                            }`}
                          >
                            <span>{typeOption.label}</span>
                            {isActive && (
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                                Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type GenreChipsRowProps = {
  genres: Genre[];
  activeGenreId: number | null;
  onToggleGenre: (genreId: number) => void;
  className: string;
  scrollable?: boolean;
};

function GenreChipsRow({
  genres,
  activeGenreId,
  onToggleGenre,
  className,
  scrollable = false,
}: GenreChipsRowProps) {
  return (
    <div className={className}>
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
            onClick={() => onToggleGenre(genreId)}
            className={`${scrollable ? "shrink-0" : ""} rounded-full border px-3 py-2 text-sm font-semibold transition ${
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
  );
}

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
        if (isDev) {
          console.error("Genre request failed", error);
        }
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

  const handleSearchTypeChange = (nextType: UiSearchType) => {
    setSearchType(nextType);
    setSubmittedQuery(null);
    if (nextType !== "genres") {
      setActiveGenreId(null);
    }
  };

  const handleToggleGenre = (genreId: number) => {
    const isActive = activeGenreId === genreId;
    if (isActive) {
      setActiveGenreId(null);
      setSearchType(DEFAULT_SEARCH_TYPE);
      return;
    }

    setQuery("");
    setSubmittedQuery(null);
    setSearchType("genres");
    setActiveGenreId(genreId);
  };

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
      <section className="relative z-40 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-4 py-10 shadow-2xl shadow-cyan-500/10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-3xl space-y-5 text-center sm:space-y-6">
          <h1 className="text-center text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
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
          >
            <div className="mx-auto w-full max-w-3xl space-y-3 sm:space-y-4">
              <SearchBar
                query={query}
                searchType={searchType}
                onQueryChange={(nextQuery) => {
                  setQuery(nextQuery);
                  setSubmittedQuery(null);
                  if (activeGenreId !== null) {
                    setActiveGenreId(null);
                  }
                }}
                onSearchTypeChange={handleSearchTypeChange}
              />

              <GenreChipsRow
                genres={genres}
                activeGenreId={activeGenreId}
                onToggleGenre={handleToggleGenre}
                scrollable
                className="flex w-full items-center gap-2 overflow-x-auto pb-1 pr-1 md:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              />

              <GenreChipsRow
                genres={genres}
                activeGenreId={activeGenreId}
                onToggleGenre={handleToggleGenre}
                className="hidden w-full flex-wrap items-center justify-start gap-2.5 md:flex lg:hidden"
              />

              <div className="hidden w-full lg:block">
                <div className="w-full overflow-x-auto pb-1 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <GenreChipsRow
                    genres={genres}
                    activeGenreId={activeGenreId}
                    onToggleGenre={handleToggleGenre}
                    scrollable
                    className="mx-auto flex w-max min-w-full flex-nowrap items-center justify-center gap-2 whitespace-nowrap"
                  />
                </div>
              </div>
            </div>

            {genreLoadError && (
              <p className="text-sm text-rose-200">{genreLoadError}</p>
            )}
          </form>
        </div>
      </section>

      <section className="relative z-0 space-y-4">
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
