# ReelFinder

ReelFinder is a movie discovery app built with Next.js App Router and TMDB data. It supports search, detail browsing, and local favorites in a production-style frontend architecture.

## Features
- Search titles, people, genres, and keywords with debounced input.
- Browse trending results and quick genre shortcuts.
- View movie and person detail pages with cast and credits.
- Save and remove favorites with browser-local persistence.
- Use server-side TMDB proxy routes with retry and error handling.

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- ESLint

## Local Development
```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `TMDB_API_KEY` in `.env.local` before starting the app.

## Build
```powershell
npm run build
npm run start
```

## Deployment Overview
Deploy to Vercel for native Next.js hosting. Configure `TMDB_API_KEY` as a required environment variable, and set `NEXT_PUBLIC_BASE_URL` or `BASE_URL` when your deployment needs explicit absolute URL resolution.

## Attribution
Camcorder icon: https://www.flaticon.com/free-icons/camcorder
