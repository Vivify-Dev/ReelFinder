const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_BASE_ORIGIN = "https://api.themoviedb.org";

const MAX_CONCURRENT = 4;
const TIMEOUT_MS = 10000;
const RETRY_DELAYS_MS = [300, 1000, 2000];
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

type FetchParams = Record<string, string | number | boolean | undefined>;

const isV4Token = (token: string) => token.trim().startsWith("eyJ");

type FetchOptions = {
  revalidateSeconds?: number;
  allow404?: boolean;
};

let active = 0;
const queue: Array<() => void> = [];

const acquire = () =>
  new Promise<void>((resolve) => {
    if (active < MAX_CONCURRENT) {
      active += 1;
      resolve();
      return;
    }
    queue.push(resolve);
  });

const release = () => {
  active = Math.max(0, active - 1);
  const next = queue.shift();
  if (next) {
    active += 1;
    next();
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveTmdbUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith("/3/")) {
    return `${TMDB_BASE_ORIGIN}${path}`;
  }
  if (path.startsWith("/")) {
    return `${TMDB_BASE_URL}${path}`;
  }
  return `${TMDB_BASE_URL}/${path}`;
};

export class TmdbFetchError extends Error {
  status?: number;
  body?: string;

  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "TmdbFetchError";
    this.status = status;
    this.body = body;
  }
}

const withApiKey = (url: string, apiKey: string) => {
  if (isV4Token(apiKey)) {
    return url;
  }
  const urlObj = new URL(url);
  if (!urlObj.searchParams.has("api_key")) {
    urlObj.searchParams.set("api_key", apiKey);
  }
  return urlObj.toString();
};

const buildHeaders = (apiKey: string, initHeaders?: HeadersInit) => {
  const headers = new Headers(initHeaders ?? {});
  headers.set("accept", "application/json");
  if (isV4Token(apiKey)) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }
  return headers;
};

export async function tmdbFetchJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    throw new TmdbFetchError(
      "TMDB_API_KEY is missing. Add it to your .env.local file."
    );
  }

  const resolvedUrl = withApiKey(resolveTmdbUrl(path), apiKey);
  const headers = buildHeaders(apiKey, init.headers);

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    await acquire();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response | null = null;
    let retryDelay: number | null = null;

    try {
      response = await fetch(resolvedUrl, {
        ...init,
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < RETRY_DELAYS_MS.length) {
        retryDelay = RETRY_DELAYS_MS[attempt];
      } else {
        throw new TmdbFetchError(`TMDB request failed: ${message}`);
      }
    } finally {
      clearTimeout(timeout);
      release();
    }

    if (retryDelay !== null) {
      await sleep(retryDelay);
      continue;
    }

    if (!response) {
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      if (RETRY_STATUS.has(response.status) && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new TmdbFetchError(
        `TMDB request failed (${response.status}): ${body || response.statusText}`,
        response.status,
        body
      );
    }

    return (await response.json()) as T;
  }

  throw new TmdbFetchError("TMDB request failed after retries.");
}

export async function fetchFromTmdb<T>(
  path: string,
  params: FetchParams = {},
  options: FetchOptions = {}
): Promise<T | null> {
  const url = new URL(resolveTmdbUrl(path));

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  try {
    return await tmdbFetchJson<T>(url.toString(), {
      next: { revalidate: options.revalidateSeconds ?? 60 },
    });
  } catch (error) {
    if (
      options.allow404 &&
      error instanceof TmdbFetchError &&
      error.status === 404
    ) {
      return null;
    }
    throw error;
  }
}

export const imageBase = "https://image.tmdb.org/t/p/w500";
