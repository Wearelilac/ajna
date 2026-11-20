# Ajna Web Dashboard (Shareable Prototype)

Fully interactive staff dashboard for Population Health, Crisis Reviews, and Care-Gap Review.

## Demo mode (default)

No env vars required. Data lives in the browser (`localStorage`) so workflows work end-to-end:

- Assign / transition / close crisis reviews
- Reveal contact (audited reason)
- Approve / edit / reject outreach drafts
- Browse K-anonymous population aggregates (suppressed cells where K &lt; 10)

## Run locally

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000

## Connect a real API later

```bash
# apps/web/.env.local
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_API_URL=https://your-api.example.com
```

## Deploy

From `apps/web`:

```bash
npx vercel --yes
```

Or connect the `apps/web` directory as the Vercel project root.
