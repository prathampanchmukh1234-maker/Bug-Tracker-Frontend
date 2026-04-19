# Bug Tracker Frontend

React + Vite frontend for Bug Tracker Pro.

## Environment

Create a `.env` file and set:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Local Development

```bash
npm install
npm run dev
```

Default local URL: `http://localhost:3002`

## Deploy On Vercel

Set these environment variables in Vercel:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use your Render backend URL for `VITE_API_URL`, for example:

`https://your-backend.onrender.com`
