// ─── Genre ───────────────────────────────────────────────────────────────────

export interface Genre {
  id: number;
  name: string;
}

// ─── Core Movie object ────────────────────────────────────────────────────────

export interface Movie {
  id: number;
  title: string;
  overview: string;
  /** Relative path returned by TMDB, e.g. "/abc123.jpg" — use getPosterUrl() to resolve */
  poster_path: string | null;
  /** Fully-resolved poster URL (populated by the API layer for mock data or pre-built) */
  poster_url?: string;
  release_date: string;          // ISO-8601 date string: "YYYY-MM-DD"
  vote_average: number;          // 0–10
  vote_count: number;
  popularity: number;
  genres: Genre[];
  genre_ids?: number[];          // present in list responses, absent in detail responses
  original_language: string;
  original_title: string;
  adult: boolean;
  backdrop_path: string | null;
}

// ─── Critics ratings (sourced from OMDb on demand) ───────────────────────────

export interface CriticsRatings {
  /** e.g. "8.8/10"  — from Internet Movie Database via OMDb */
  imdb: string | null;
  /** e.g. "87%"     — from Rotten Tomatoes via OMDb */
  rottenTomatoes: string | null;
  /** e.g. "74/100"  — from Metacritic via OMDb */
  metacritic: string | null;
  /** Rated classification, e.g. "PG-13" */
  rated: string | null;
  /** e.g. "Action, Sci-Fi" — OMDb genre string */
  omdbGenre: string | null;
  /** e.g. "Christopher Nolan" */
  director: string | null;
  /** Top-billed cast, comma-separated */
  actors: string | null;
  /** OMDb awards string, e.g. "Won 4 Oscars." */
  awards: string | null;
  /** Box-office gross, e.g. "$677,471,339" */
  boxOffice: string | null;
}

// ─── Cast member (from TMDB /movie/{id}/credits) ─────────────────────────────

export interface CastMember {
  id: number;
  name: string;                  // Actor's real name
  character: string;             // Character name in the movie
  /** Relative path returned by TMDB, e.g. "/abc123.jpg" — use getProfileUrl() */
  profile_path: string | null;
  order: number;                 // Billing order (0 = top-billed)
}

// ─── Watch providers (from TMDB /movie/{id}/watch/providers) ─────────────────

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  /** Relative path — use getProviderLogoUrl() to resolve */
  logo_path: string;
}

export interface WatchProviders {
  /** Subscription streaming (e.g. Netflix, Disney+) */
  flatrate: WatchProvider[];
  /** Available to rent digitally */
  rent: WatchProvider[];
  /** Available to buy digitally */
  buy: WatchProvider[];
  /** TMDB attribution link — "JustWatch" powered */
  link: string | null;
}

// ─── Detail view (extends Movie with extra fields from /movie/:id) ────────────

export interface MovieDetail extends Movie {
  runtime: number | null;        // minutes
  tagline: string;
  status: string;                // "Released" | "In Production" | ...
  revenue: number;
  budget: number;
  homepage: string | null;
  imdb_id: string | null;
  production_companies: ProductionCompany[];
  spoken_languages: SpokenLanguage[];
  /** Populated by the OMDb fetch; null when OMDb key is absent or fetch fails */
  criticsRatings: CriticsRatings | null;
  /** Top 10 cast members from TMDB credits; empty array if fetch fails */
  cast: CastMember[];
  /** Streaming / rent / buy availability; null if fetch fails */
  watchProviders: WatchProviders | null;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type MovieListResponse = PaginatedResponse<Movie>;

// ─── Search state (used by UI) ────────────────────────────────────────────────

export interface SearchState {
  query: string;
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
  isLoading: boolean;
  error: string | null;
}

// ─── Filter / sort options ────────────────────────────────────────────────────

export type SortOption =
  | "popularity.desc"
  | "popularity.asc"
  | "vote_average.desc"
  | "release_date.desc"
  | "release_date.asc"
  | "title.asc"
  | "title.desc";

export interface FilterOptions {
  genre?: number;
  year?: number;
  minRating?: number;
  sort?: SortOption;
}
