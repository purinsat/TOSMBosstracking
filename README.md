# TOSM Boss Tracker (Room Collaboration V1)

Realtime room-based boss tracking app built with Next.js + Tailwind + Supabase.

## Features

- Landing page with **Create Room** and **Join Room**
- Shared room board at `/room/[code]`
- Realtime tracker sync across users in same room
- Shared room settings (phase timings + alarm mute/volume)
- Three editable timing presets (Preset 1-3) with optional per-command preset selection
- Countdown sorting and color labels
- Automatic room cleanup after 24h inactivity (hourly scheduled job)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill your Supabase values:

```bash
cp .env.example .env.local
```

3. Apply SQL migration in your Supabase project:
   - File: `supabase/migrations/202604060001_room_collab_v1.sql`

4. Run dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional for server-side admin operations)

## Deployment (Vercel)

1. Push this project to GitHub.
2. Import repo in Vercel.
3. Add the same environment variables in Vercel project settings.
4. Deploy.

## Realtime Notes

- Countdown is computed client-side from `target_at`.
- Realtime events sync tracker/settings CRUD for the room.
- V1 policies are intentionally open for anonymous room-code access.
