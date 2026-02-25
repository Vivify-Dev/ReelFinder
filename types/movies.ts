export type MovieSummary = {
  id: number;
  title: string;
  overview?: string;
  releaseDate?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  voteAverage?: number;
  inTheatersOnly?: boolean;
};

export type Genre = {
  id: number;
  name: string;
};

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profilePath?: string | null;
};

export type PersonSummary = {
  id: number;
  name: string;
  profilePath?: string | null;
  knownForDepartment?: string;
  knownForTitles?: string[];
};

export type PersonMovieCredit = MovieSummary & {
  character?: string;
  job?: string;
};

export type PersonDetails = PersonSummary & {
  biography?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  popularity?: number;
  movieCredits?: PersonMovieCredit[];
};

export type MovieDetails = MovieSummary & {
  tagline?: string;
  runtime?: number;
  genres?: Genre[];
  backdropPath?: string | null;
  cast?: CastMember[];
  status?: string;
  homepage?: string;
};

export type PaginatedResult<T> = {
  page: number;
  totalPages: number;
  results: T[];
  totalResults?: number;
};

export type SearchType = "titles" | "people" | "genres" | "keywords" | "multi";

export type SearchResult =
  | (MovieSummary & { resultType: "movie" })
  | (PersonSummary & { resultType: "person" });

export type SearchResponse = {
  results: SearchResult[];
  page: number;
  total_pages: number;
  has_more: boolean;
  cap_pages: number;
  cap_reached: boolean;
};
