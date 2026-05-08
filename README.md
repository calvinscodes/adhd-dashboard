# ADHD Dashboard

A personal ADHD task dashboard with dopamine-driven reward mechanics, AI-assisted task breakdown, and cross-platform sync (Mac + iPhone PWA).

## Features

- Task management with categories, priorities, and due dates
- Sub-tasks with AI breakdown (Claude AI)
- AI memory: learns from completed tasks, fuzzy-matches templates
- Reward mechanics: animated checkboxes, confetti, XP system, level-up modal
- Daily streaks with flame badge
- Daily progress bar
- Brain dump scratchpad
- Completion heatmap + stats
- Dark mode (follows system preference)
- Electron desktop app (macOS)
- PWA for iPhone (install from Safari)
- Realtime sync via Supabase

---

## Prerequisites

- Node.js 20+ (install via `brew install node`)
- pnpm 9+ (install via `brew install pnpm`)
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic](https://console.anthropic.com) API key

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/adhd-dashboard.git
cd adhd-dashboard
pnpm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the **SQL Editor** in your Supabase dashboard
3. Run the migration file: `apps/web/supabase/migrations/001_initial.sql`
   - Paste the entire file content into the SQL editor and click **Run**
4. Go to **Settings > API** and copy:
   - `URL` (Project URL)
   - `anon public` key
   - `service_role` key (keep this secret!)

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

### 4. Run locally

```bash
pnpm dev
```

This starts:
- Vite dev server at `http://localhost:5173` (React PWA)
- Hono API server at `http://localhost:3001` (AI + XP routes)

Open `http://localhost:5173` in your browser.

### 5. Sign in

Enter your email on the `/auth` page. Check your inbox for the magic link. On first sign-in, your profile and default categories are created automatically.

---

## Running the Electron desktop app

Make sure the web dev server is running first:

```bash
# Terminal 1
pnpm dev:web

# Terminal 2
pnpm dev:electron
```

Or use the combined command:

```bash
pnpm --filter electron start
```

---

## iPhone PWA

1. Deploy to Vercel (see below) or run `pnpm build && pnpm preview` locally
2. Open the deployed URL in Safari on iPhone
3. Tap **Share > Add to Home Screen**
4. The app installs as a standalone PWA with full offline support

---

## Deployment to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Set these environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
4. Deploy

---

## Building the macOS DMG

```bash
# Build the web app first
pnpm build

# Then build the Electron DMG
pnpm build:electron
```

The DMG will be output to `apps/electron/dist/`.

For automated builds on push to `main`, set up these GitHub Secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `APPLE_CERT_P12` (optional: for code signing)
- `APPLE_CERT_PASSWORD` (optional)

---

## Project Structure

```
adhd-dashboard/
├── apps/
│   ├── web/                  # Vite React PWA + Hono API server
│   │   ├── src/
│   │   │   ├── components/   # UI, layout, task, reward components
│   │   │   ├── hooks/        # React Query hooks
│   │   │   ├── lib/          # Supabase client, utils, confetti
│   │   │   ├── pages/        # Route pages
│   │   │   ├── server/       # Hono API server (AI + XP routes)
│   │   │   └── store/        # Zustand stores
│   │   └── supabase/
│   │       └── migrations/   # SQL migration files
│   └── electron/             # Electron desktop shell
│       └── src/main.js       # Main process
└── packages/
    └── shared/               # Shared TypeScript types & utilities
```

---

## XP System

| Action | XP |
|--------|-----|
| Complete task (no subtasks) | +10 |
| Complete task (all subtasks done) | +25 |
| Complete before due date | +5 bonus |

Level formula: `level = floor(1 + sqrt(xp / 50))`

---

## Tech Stack

| Layer | Tech |
|-------|------|
| UI | React 18 + TypeScript |
| Build | Vite |
| Desktop | Electron 30 |
| Mobile/Web | PWA (vite-plugin-pwa) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| API | Hono |
| Database | Supabase (PostgreSQL + Realtime + RLS) |
| Auth | Supabase magic link |
| AI | Claude API (claude-sonnet-4-6) |
| State | Zustand + TanStack Query |
| Deployment | Vercel + GitHub Actions |
