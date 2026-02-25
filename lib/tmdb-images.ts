const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

type PosterSize = "w342" | "w500";
type BackdropSize = "w780" | "w1280";
type ProfileSize = "w342" | "w500";

const buildTmdbImageUrl = (path: string | null | undefined, size: string) => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE}/${size}${normalizedPath}`;
};

export const tmdbPosterUrl = (
  path: string | null | undefined,
  size: PosterSize = "w342"
) => buildTmdbImageUrl(path, size);

export const tmdbBackdropUrl = (
  path: string | null | undefined,
  size: BackdropSize = "w780"
) => buildTmdbImageUrl(path, size);

export const tmdbProfileUrl = (
  path: string | null | undefined,
  size: ProfileSize = "w342"
) => buildTmdbImageUrl(path, size);

export const getPosterUrl = (
  path: string | null | undefined,
  size: PosterSize = "w500"
) => buildTmdbImageUrl(path, size);

export const getBackdropUrl = (
  path: string | null | undefined,
  size: BackdropSize = "w1280"
) => buildTmdbImageUrl(path, size);
