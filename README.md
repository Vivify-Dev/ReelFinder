# ReelFinder

ReelFinder is a Next.js movie discovery app powered by TMDB. It supports search across titles and people, genre/keyword exploration, detailed movie/person pages, and local favorites.

## Features
- Search by titles, people, genres, and keywords.
- Browse trending/popular content with infinite scrolling.
- View movie details (overview, cast, runtime, status, release data).
- View person profiles and recent movie credits.
- Save favorites in browser local storage.
- Use server-side API routes as a TMDB proxy layer with typed responses.

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- ESLint

## Setup
1. Install dependencies:
   ```powershell
   npm ci
   ```
2. Create local environment file:
   ```powershell
   Copy-Item .env.example .env.local
   ```
3. Set required environment variables in `.env.local` (see below).
4. Start development server:
   ```powershell
   npm run dev
   ```

## Environment Variables
Use `.env.local` for local development.

- `TMDB_API_KEY` (required): TMDB API key used by server routes.
- `NEXT_PUBLIC_BASE_URL` (optional): absolute app URL used when client/server code needs explicit origin.
- `BASE_URL` (optional): server-side fallback origin if `NEXT_PUBLIC_BASE_URL` is not set.

Reference file: [`.env.example`](./.env.example)

## Build And Run
- Lint:
  ```powershell
  npm run lint
  ```
- Production build:
  ```powershell
  npm run build
  ```
- Start production server:
  ```powershell
  npm run start
  ```

## Known Limitations
- A valid `TMDB_API_KEY` is required for live API data.
- Search pagination is intentionally capped (`CAP_PAGES = 10`) to control API usage.
- Favorites are stored per browser via `localStorage` (not synced across devices).
- No authentication/user accounts are included.

## Deployment
Deploy on Vercel (recommended for Next.js). Configure `TMDB_API_KEY` in the deployment environment, and optionally set `NEXT_PUBLIC_BASE_URL` or `BASE_URL` for absolute URL resolution.

## Attribution
Camcorder icon: https://www.flaticon.com/free-icons/camcorder
