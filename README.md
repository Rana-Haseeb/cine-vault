<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

# 🎬 CineSearch — Movie Discovery App

A modern, full-featured movie discovery platform built with **Next.js 16**, **React 19**, and **TypeScript**. CineSearch provides a premium, cinema-grade browsing experience powered by a hybrid **TMDB + OMDb** API architecture.

> **Live at:** [cine-vault-wine.vercel.app](https://cine-vault-wine.vercel.app/) — or deploy to Vercel in one click.

---

## ✨ Features

### 🔍 Discovery & Search
- **Trending Movies** — Daily and weekly trending lists via TMDB
- **What's Popular** — Tabbed views: In Theaters · Now Playing · Upcoming
- **Top Rated** — All-time highest rated films
- **Instant Search** — Debounced search-as-you-type with full pagination
- **Discover & Filter** — Filter by genre, year, minimum rating, and sort order

### 🎯 Hybrid API Architecture
| API   | Role | Endpoints Used |
|-------|------|----------------|
| **TMDB** | All bulk tasks | `/movie/popular`, `/trending/movie/{window}`, `/search/movie`, `/discover/movie`, `/movie/{id}`, `/movie/{id}/credits`, `/movie/{id}/watch/providers`, `/genre/movie/list` |
| **OMDb** | On-demand deep metadata | `?i={imdb_id}` or `?t={title}&y={year}` — Rotten Tomatoes, IMDb, Metacritic scores, awards, director |

### 🎬 Rich Movie Detail Modal
- **High-res backdrop banner** with gradient overlay
- **Critics Scores** — IMDb, Rotten Tomatoes, and Metacritic badges (via OMDb)
- **Top 10 Cast Carousel** — Horizontal scrolling actor headshots with names & character roles (via TMDB Credits)
- **Where to Watch** — Streaming (Stream), Rent, and Buy platform logos with color-coded badges (via TMDB Watch Providers)
- **Awards Highlight** — Gold-themed panel with trophy icon showcasing Oscar wins and nominations
- **Production Info** — Studios, spoken languages, budget & revenue stats

### 🛡️ Resilient by Design
- **Graceful degradation** — Every API call has a fallback; if TMDB/OMDb keys are missing or invalid, the app runs on rich built-in mock data
- **Server-side API proxies** — `/api/tmdb` and `/api/omdb` route handlers keep API keys out of the browser bundle
- **ISR caching** — TMDB responses cached for 5 minutes, OMDb for 24 hours
- **Parallel fetching** — Credits, Watch Providers, and OMDb fire simultaneously via `Promise.all`

### 🎨 Design & UX
- **Dark cinematic theme** with glassmorphism effects
- **Responsive layout** — Optimized for mobile, tablet, and desktop
- **Horizontal scroll sections** with smooth drag-to-scroll
- **Micro-animations** — Hover effects, skeleton loading states, modal transitions
- **Accessible** — ARIA labels, focus trapping, keyboard navigation (Escape to close)

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── tmdb/route.ts        # Server proxy — keeps TMDB credentials safe
│   │   └── omdb/route.ts        # Server proxy — keeps OMDb key safe
│   ├── movie/[id]/              # Dynamic movie route (reserved for SSR detail pages)
│   ├── layout.tsx               # Root layout with Geist font + metadata
│   ├── page.tsx                 # Main page — Hero, Trending, Popular, Top Rated, Search
│   └── globals.css              # Global styles & Tailwind base
├── components/
│   ├── HScrollSection.tsx       # Reusable horizontal scroll section with tabs
│   ├── MovieCard.tsx            # Movie poster card with rating badge
│   ├── MovieGrid.tsx            # Responsive grid layout for search results
│   ├── MovieModal.tsx           # Detail modal — critics, cast carousel, watch providers
│   ├── Pagination.tsx           # Page navigation component
│   └── SearchBar.tsx            # Debounced search input
├── lib/
│   └── movieApi.ts              # Hybrid TMDB + OMDb service layer with mock fallback
└── types/
    └── movie.ts                 # TypeScript interfaces for all data shapes
```

### Data Flow

```
User clicks movie card
       │
       ▼
  getMovieById(id)
       │
       ├──► TMDB /movie/{id}  →  core metadata + imdb_id
       │
       └──► Promise.all([
              TMDB /movie/{id}/credits         →  top 10 cast
              TMDB /movie/{id}/watch/providers  →  streaming availability
              OMDb ?i={imdb_id}                 →  critics scores + awards
            ])
       │
       ▼
  Merged MovieDetail object  →  Modal renders everything
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.17
- **npm**, **yarn**, **pnpm**, or **bun**

### 1. Clone the repository

```bash
git clone https://github.com/your-username/movie-search-app.git
cd movie-search-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and add your API keys:

| Variable | Where to get it | Purpose |
|----------|----------------|---------|
| `TMDB_API_KEY` | [TMDB Settings → API](https://www.themoviedb.org/settings/api) | Movie lists, search, images |
| `TMDB_READ_ACCESS_TOKEN` | Same page (v4 auth Bearer token) | Preferred auth method |
| `OMDB_API_KEY` | [OMDb API Key](https://www.omdbapi.com/apikey.aspx) | Critics scores & awards |

> **⚠️ OMDb Note:** After requesting your key, you **must click the activation link** in the email they send you. The key won't work until activated.

> **💡 No keys?** The app works immediately with built-in mock data. You can add keys later.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint across the codebase |

---

## 🔒 Security

- **API keys are server-side only** — Next.js environment variables without `NEXT_PUBLIC_` prefix are never exposed to the browser
- **Proxy routes** (`/api/tmdb`, `/api/omdb`) relay requests through the server, adding credentials server-side
- **`.env.local` is gitignored** — secrets never enter version control
- **`.env.local.example`** is committed as a setup template with placeholder values only

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Next.js](https://nextjs.org/) | 16.2 | React framework with App Router, API routes, ISR |
| [React](https://react.dev/) | 19.2 | UI component library |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Type safety across the entire codebase |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Utility-first styling |
| [Lucide React](https://lucide.dev/) | 1.17 | Beautiful, consistent icon set |
| [TMDB API](https://developer.themoviedb.org/) | v3 | Movie data, images, credits, watch providers |
| [OMDb API](https://www.omdbapi.com/) | — | Critics scores (RT, IMDb, Metacritic), awards |

---

## 📝 API Attribution

This product uses the [TMDB API](https://www.themoviedb.org/) but is not endorsed or certified by TMDB.

Watch provider data is powered by [JustWatch](https://www.justwatch.com/).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
