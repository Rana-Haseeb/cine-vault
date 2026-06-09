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
