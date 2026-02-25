# Deployment

## Recommended Host
Vercel (best fit for Next.js).

## Build Command
```powershell
npm run build
```

## Output Folder
Next.js server build output in `.next/` (no static export configured).

## Environment Variables
- `TMDB_API_KEY` (required)
- `NEXT_PUBLIC_BASE_URL` (recommended for hosted absolute URL resolution)
- `BASE_URL` (optional fallback)

## SPA Routing Notes
No SPA fallback rewrite is needed. Next.js handles app routes and API routes natively.
