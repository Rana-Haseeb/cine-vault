/**
 * movieApi.ts — Hybrid TMDB + OMDb Service Layer
 *
 * +- TMDB (The Movie Database) -----------------------------------------------+
 * |  All bulk operations: lists, search, pagination, images.                  |
 * |  Auth: Bearer token (TMDB_READ_ACCESS_TOKEN) with API key fallback.       |
 * |  Docs: https://developer.themoviedb.org/docs                              |
 * +---------------------------------------------------------------------------+
 * +- OMDb (Open Movie Database) ----------------------------------------------+
 * |  On-demand deep metadata for single movies only.                          |
 * |  Extracts: Rotten Tomatoes / IMDb / Metacritic scores, director,          |
 * |  cast, awards, box-office, content rating.                                |
 * |  Docs: https://www.omdbapi.com/                                           |
 * +---------------------------------------------------------------------------+
 * +- No keys? -----------------------------------------------------------------+
 * |  Falls back to rich mock data so the UI works instantly out-of-box.       |
 * +---------------------------------------------------------------------------+
 */

import type {
  Movie,
  MovieDetail,
  MovieListResponse,
  Genre,
  FilterOptions,
  CriticsRatings,
  CastMember,
  WatchProvider,
  WatchProviders,
} from "@/types/movie";

// --- Config -------------------------------------------------------------------

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const OMDB_BASE = "https://www.omdbapi.com";

// process.env vars are only available server-side in Next.js.
// Client components run in the browser where these are undefined -> mock data.
// Solution: detect server vs client and route client fetches through API proxies
// (/api/tmdb and /api/omdb) which read the credentials server-side.
const isServer = typeof window === "undefined";

const TMDB_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN ?? "";
const TMDB_KEY   = process.env.TMDB_API_KEY ?? "";
const OMDB_KEY   = process.env.OMDB_API_KEY ?? "";

// Server: check actual credentials. Client: always true (proxy handles it).
const HAS_TMDB = isServer ? Boolean(TMDB_TOKEN || TMDB_KEY) : true;
const HAS_OMDB = isServer ? Boolean(OMDB_KEY) : true;

// --- Image URL helpers --------------------------------------------------------

export const POSTER_SIZES = {
  small: "w185",
  medium: "w342",
  large: "w500",
  original: "original",
} as const;

/** Resolve a TMDB poster_path -> full URL, or a styled placeholder. */
export function getPosterUrl(
  poster_path: string | null,
  size: keyof typeof POSTER_SIZES = "medium"
): string {
  if (!poster_path)
    return `https://placehold.co/342x513/1a1a2e/e2e8f0?text=No+Poster`;
  if (poster_path.startsWith("http")) return poster_path;
  return `${TMDB_IMAGE_BASE}/${POSTER_SIZES[size]}${poster_path}`;
}

/** Resolve a TMDB backdrop_path -> full URL. */
export function getBackdropUrl(
  backdrop_path: string | null,
  size: "w780" | "w1280" | "original" = "w1280"
): string {
  if (!backdrop_path) return "";
  if (backdrop_path.startsWith("http")) return backdrop_path;
  return `${TMDB_IMAGE_BASE}/${size}${backdrop_path}`;
}

/** Resolve a TMDB profile_path -> full URL, or a styled placeholder. */
export function getProfileUrl(
  profile_path: string | null,
  size: "w185" | "h632" | "original" = "w185"
): string {
  if (!profile_path)
    return `https://placehold.co/185x278/1a1a2e/64748b?text=No+Photo`;
  if (profile_path.startsWith("http")) return profile_path;
  return `${TMDB_IMAGE_BASE}/${size}${profile_path}`;
}

/** Resolve a TMDB provider logo_path -> full URL. */
export function getProviderLogoUrl(
  logo_path: string | null,
  size: "w45" | "w92" | "w154" | "original" = "w92"
): string {
  if (!logo_path) return "";
  if (logo_path.startsWith("http")) return logo_path;
  return `${TMDB_IMAGE_BASE}/${size}${logo_path}`;
}

// --- TMDB fetch ---------------------------------------------------------------

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  // -- Client-side: route through our API proxy so credentials stay server-side
  if (!isServer) {
    const url = new URL("/api/tmdb", window.location.origin);
    url.searchParams.set("endpoint", endpoint);
    url.searchParams.set("language", "en-US");
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TMDB proxy ${res.status} (${endpoint})`);
    return res.json() as Promise<T>;
  }

  // -- Server-side: call TMDB directly with credentials
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("language", "en-US");

  const headers: Record<string, string> = { Accept: "application/json" };
  if (TMDB_TOKEN) {
    headers["Authorization"] = `Bearer ${TMDB_TOKEN}`;
  } else {
    url.searchParams.set("api_key", TMDB_KEY);
  }

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers,
    next: { revalidate: 300 }, // ISR: cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${res.statusText} (${endpoint})`);
  }
  return res.json() as Promise<T>;
}

// --- OMDb fetch ---------------------------------------------------------------

interface OmdbRating {
  Source: string;
  Value: string;
}

interface OmdbResponse {
  Response: "True" | "False";
  Error?: string;
  Title?: string;
  Year?: string;
  Rated?: string;
  Director?: string;
  Actors?: string;
  Genre?: string;
  Awards?: string;
  BoxOffice?: string;
  imdbRating?: string;
  imdbID?: string;
  Metascore?: string;
  Ratings?: OmdbRating[];
}

async function omdbFetch(params: Record<string, string>): Promise<OmdbResponse | null> {
  try {
    // -- Client-side: route through proxy
    if (!isServer) {
      const url = new URL("/api/omdb", window.location.origin);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = (await res.json()) as OmdbResponse;
      return data.Response === "True" ? data : null;
    }

    // -- Server-side: direct OMDb call
    const url = new URL(OMDB_BASE);
    url.searchParams.set("apikey", OMDB_KEY);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      next: { revalidate: 86400 }, // cache OMDb data for 24 hours
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OmdbResponse;
    return data.Response === "True" ? data : null;
  } catch {
    return null;
  }
}

/** Fetch OMDb data for a movie. Tries by IMDb ID first, then by title + year. */
async function fetchOmdbData(
  imdbId: string | null,
  title: string,
  releaseDate: string
): Promise<OmdbResponse | null> {
  if (!HAS_OMDB) return null;

  // Primary: IMDb ID is the most reliable lookup
  if (imdbId) {
    const byId = await omdbFetch({ i: imdbId, plot: "short" });
    if (byId) return byId;
  }

  // Fallback: title + year
  const year = releaseDate ? new Date(releaseDate).getFullYear().toString() : "";
  return omdbFetch({ t: title, ...(year ? { y: year } : {}), plot: "short" });
}

/** Parse an OMDb response into our CriticsRatings shape. */
function parseOmdbRatings(data: OmdbResponse): CriticsRatings {
  const find = (source: string): string | null =>
    data.Ratings?.find((r) => r.Source.toLowerCase().includes(source.toLowerCase()))
      ?.Value ?? null;

  return {
    imdb: find("Internet Movie Database") ?? (data.imdbRating ? `${data.imdbRating}/10` : null),
    rottenTomatoes: find("Rotten Tomatoes"),
    metacritic:
      find("Metacritic") ??
      (data.Metascore && data.Metascore !== "N/A"
        ? `${data.Metascore}/100`
        : null),
    rated: data.Rated && data.Rated !== "N/A" ? data.Rated : null,
    omdbGenre: data.Genre && data.Genre !== "N/A" ? data.Genre : null,
    director: data.Director && data.Director !== "N/A" ? data.Director : null,
    actors: data.Actors && data.Actors !== "N/A" ? data.Actors : null,
    awards: data.Awards && data.Awards !== "N/A" ? data.Awards : null,
    boxOffice: data.BoxOffice && data.BoxOffice !== "N/A" ? data.BoxOffice : null,
  };
}

// --- Public API — TMDB list/search (bulk) ------------------------------------

/**
 * Search movies by title query with pagination.
 */
export async function searchMovies(
  query: string,
  page = 1
): Promise<MovieListResponse> {
  if (!query.trim()) return emptyPage(page);
  if (!HAS_TMDB) return mockSearch(query, page);
  return tmdbFetch<MovieListResponse>("/search/movie", { query, page });
}

/**
 * Fetch popular movies with pagination.
 */
export async function getPopularMovies(page = 1): Promise<MovieListResponse> {
  if (!HAS_TMDB) return mockPopular(page);
  return tmdbFetch<MovieListResponse>("/movie/popular", { page });
}

/**
 * Fetch top-rated movies with pagination.
 */
export async function getTopRatedMovies(page = 1): Promise<MovieListResponse> {
  if (!HAS_TMDB) return mockTopRated(page);
  return tmdbFetch<MovieListResponse>("/movie/top_rated", { page });
}

/**
 * Fetch now-playing movies.
 */
export async function getNowPlayingMovies(page = 1): Promise<MovieListResponse> {
  if (!HAS_TMDB) return mockNowPlaying(page);
  return tmdbFetch<MovieListResponse>("/movie/now_playing", { page });
}

/**
 * Fetch upcoming movies.
 */
export async function getUpcomingMovies(page = 1): Promise<MovieListResponse> {
  if (!HAS_TMDB) return mockUpcoming(page);
  return tmdbFetch<MovieListResponse>("/movie/upcoming", { page });
}

/**
 * Fetch trending movies (day window by default).
 */
export async function getTrendingMovies(
  window: "day" | "week" = "day",
  page = 1
): Promise<MovieListResponse> {
  if (!HAS_TMDB) return mockPopular(page);
  return tmdbFetch<MovieListResponse>(`/trending/movie/${window}`, { page });
}

/**
 * Discover movies with optional filters.
 */
export async function discoverMovies(
  filters: FilterOptions = {},
  page = 1
): Promise<MovieListResponse> {
  if (!HAS_TMDB) return mockPopular(page);
  const params: Record<string, string | number> = { page };
  if (filters.genre) params.with_genres = filters.genre;
  if (filters.year) params.primary_release_year = filters.year;
  if (filters.minRating) params["vote_average.gte"] = filters.minRating;
  if (filters.sort) params.sort_by = filters.sort;
  return tmdbFetch<MovieListResponse>("/discover/movie", params);
}

/**
 * Fetch all available genres.
 */
export async function getGenres(): Promise<Genre[]> {
  if (!HAS_TMDB) return MOCK_GENRES;
  const res = await tmdbFetch<{ genres: Genre[] }>("/genre/movie/list");
  return res.genres;
}

// --- Public API — Hybrid single-movie detail ---------------------------------

/** TMDB /movie/{id}/credits response shape (partial — we only need cast). */
interface TmdbCreditsResponse {
  id: number;
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }>;
}

/**
 * Fetch the top 10 cast members for a movie via TMDB /movie/{id}/credits.
 * Returns an empty array on failure so the UI degrades gracefully.
 */
async function fetchCast(movieId: number): Promise<CastMember[]> {
  try {
    const credits = await tmdbFetch<TmdbCreditsResponse>(
      `/movie/${movieId}/credits`
    );
    return (credits.cast ?? [])
      .sort((a, b) => a.order - b.order)
      .slice(0, 10)
      .map(({ id, name, character, profile_path, order }) => ({
        id,
        name,
        character,
        profile_path,
        order,
      }));
  } catch {
    return [];
  }
}

/** TMDB /movie/{id}/watch/providers response shape. */
interface TmdbWatchProvidersResponse {
  id: number;
  results: Record<
    string, // ISO 3166-1 country code
    {
      link?: string;
      flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
      rent?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
      buy?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
    }
  >;
}

/**
 * Fetch streaming / rent / buy providers for a movie.
 * Uses the user's region (defaults to "US").
 * Returns null on failure so the UI degrades gracefully.
 */
async function fetchWatchProviders(
  movieId: number,
  region = "US"
): Promise<WatchProviders | null> {
  try {
    const data = await tmdbFetch<TmdbWatchProvidersResponse>(
      `/movie/${movieId}/watch/providers`
    );
    const country = data.results?.[region];
    if (!country) return null;

    const mapProviders = (
      arr?: Array<{ provider_id: number; provider_name: string; logo_path: string }>
    ): WatchProvider[] =>
      (arr ?? []).map(({ provider_id, provider_name, logo_path }) => ({
        provider_id,
        provider_name,
        logo_path,
      }));

    return {
      flatrate: mapProviders(country.flatrate),
      rent: mapProviders(country.rent),
      buy: mapProviders(country.buy),
      link: country.link ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch full movie details.
 *
 * Flow:
 *  1. TMDB /movie/{id}                    -> core metadata, imdb_id
 *  2. In parallel:
 *     a. TMDB /movie/{id}/credits         -> top 10 cast members
 *     b. TMDB /movie/{id}/watch/providers  -> streaming availability
 *     c. OMDb ?i={imdb_id}                -> critics scores, director, awards
 *        +- fallback: OMDb ?t={title}&y={year} if imdb_id is missing
 *  3. Merge into a single MovieDetail object.
 *
 * All sub-fetches are silent on failure — cast=[], watchProviders=null, criticsRatings=null.
 */
export async function getMovieById(id: number): Promise<MovieDetail> {
  if (!HAS_TMDB) return mockMovieDetail(id);

  // Step 1 — TMDB detail (we need imdb_id before we can call OMDb)
  const tmdb = await tmdbFetch<MovieDetail>(`/movie/${id}`);

  // Step 2 — Credits + Providers + OMDb in parallel for speed
  const [cast, watchProviders, omdb] = await Promise.all([
    fetchCast(id),
    fetchWatchProviders(id),
    fetchOmdbData(tmdb.imdb_id, tmdb.title, tmdb.release_date),
  ]);

  return {
    ...tmdb,
    cast,
    watchProviders,
    criticsRatings: omdb ? parseOmdbRatings(omdb) : null,
  };
}

// --- Helpers ------------------------------------------------------------------

function emptyPage(page: number): MovieListResponse {
  return { page, results: [], total_pages: 0, total_results: 0 };
}

// --- Mock data ----------------------------------------------------------------

const MOCK_GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
];

/** Pre-populated critics ratings for mock movies */
const MOCK_RATINGS: Record<number, CriticsRatings> = {
  1: { // Interstellar
    imdb: "8.7/10", rottenTomatoes: "73%", metacritic: "74/100",
    rated: "PG-13", omdbGenre: "Adventure, Drama, Sci-Fi",
    director: "Christopher Nolan",
    actors: "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
    awards: "Won 1 Oscar. 44 wins & 148 nominations total.",
    boxOffice: "$188,020,017",
  },
  2: { // Inception
    imdb: "8.8/10", rottenTomatoes: "87%", metacritic: "74/100",
    rated: "PG-13", omdbGenre: "Action, Adventure, Sci-Fi",
    director: "Christopher Nolan",
    actors: "Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page",
    awards: "Won 4 Oscars. 157 wins & 220 nominations total.",
    boxOffice: "$292,576,195",
  },
  3: { // The Dark Knight
    imdb: "9.0/10", rottenTomatoes: "94%", metacritic: "84/100",
    rated: "PG-13", omdbGenre: "Action, Crime, Drama",
    director: "Christopher Nolan",
    actors: "Christian Bale, Heath Ledger, Aaron Eckhart",
    awards: "Won 2 Oscars. 159 wins & 163 nominations total.",
    boxOffice: "$534,858,444",
  },
  4: { // Dune Part Two
    imdb: "8.5/10", rottenTomatoes: "93%", metacritic: "79/100",
    rated: "PG-13", omdbGenre: "Action, Adventure, Drama",
    director: "Denis Villeneuve",
    actors: "Timothée Chalamet, Zendaya, Rebecca Ferguson",
    awards: "Nominated for 5 Oscars. 49 wins & 232 nominations total.",
    boxOffice: "$282,014,227",
  },
  5: { // Oppenheimer
    imdb: "8.3/10", rottenTomatoes: "93%", metacritic: "88/100",
    rated: "R", omdbGenre: "Biography, Drama, History",
    director: "Christopher Nolan",
    actors: "Cillian Murphy, Emily Blunt, Matt Damon",
    awards: "Won 7 Oscars. 348 wins & 578 nominations total.",
    boxOffice: "$326,706,660",
  },
  6: { // Parasite
    imdb: "8.5/10", rottenTomatoes: "99%", metacritic: "96/100",
    rated: "R", omdbGenre: "Comedy, Drama, Thriller",
    director: "Bong Joon Ho",
    actors: "Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong",
    awards: "Won 4 Oscars. 305 wins & 263 nominations total.",
    boxOffice: "$53,367,844",
  },
  7: { // Everything Everywhere All at Once
    imdb: "8.0/10", rottenTomatoes: "95%", metacritic: "81/100",
    rated: "R", omdbGenre: "Action, Adventure, Comedy",
    director: "Daniel Kwan, Daniel Scheinert",
    actors: "Michelle Yeoh, Stephanie Hsu, Ke Huy Quan",
    awards: "Won 7 Oscars. 292 wins & 286 nominations total.",
    boxOffice: "$69,960,788",
  },
  8: { // The Shawshank Redemption
    imdb: "9.3/10", rottenTomatoes: "91%", metacritic: "80/100",
    rated: "R", omdbGenre: "Drama",
    director: "Frank Darabont",
    actors: "Tim Robbins, Morgan Freeman, Bob Gunton",
    awards: "Nominated for 7 Oscars. 21 wins & 43 nominations total.",
    boxOffice: "$16,000,000",
  },
  9: { // Spider-Man: Across the Spider-Verse
    imdb: "8.6/10", rottenTomatoes: "95%", metacritic: "86/100",
    rated: "PG", omdbGenre: "Animation, Action, Adventure",
    director: "Joaquim Dos Santos, Kemp Powers, Justin K. Thompson",
    actors: "Shameik Moore, Hailee Steinfeld, Oscar Isaac",
    awards: "Won 1 Oscar. 98 wins & 175 nominations total.",
    boxOffice: "$381,311,319",
  },
  10: { // The Godfather
    imdb: "9.2/10", rottenTomatoes: "97%", metacritic: "100/100",
    rated: "R", omdbGenre: "Crime, Drama",
    director: "Francis Ford Coppola",
    actors: "Marlon Brando, Al Pacino, James Caan",
    awards: "Won 3 Oscars. 30 wins & 31 nominations total.",
    boxOffice: "$134,966,411",
  },
  11: { // Avengers: Endgame
    imdb: "8.4/10", rottenTomatoes: "94%", metacritic: "78/100",
    rated: "PG-13", omdbGenre: "Action, Adventure, Drama",
    director: "Anthony Russo, Joe Russo",
    actors: "Robert Downey Jr., Chris Evans, Mark Ruffalo",
    awards: "Nominated for 1 Oscar. 70 wins & 131 nominations total.",
    boxOffice: "$858,373,000",
  },
  12: { // The Matrix
    imdb: "8.7/10", rottenTomatoes: "88%", metacritic: "73/100",
    rated: "R", omdbGenre: "Action, Sci-Fi",
    director: "Lana Wachowski, Lilly Wachowski",
    actors: "Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss",
    awards: "Won 4 Oscars. 38 wins & 50 nominations total.",
    boxOffice: "$171,479,930",
  },
};

const MOCK_MOVIES: Movie[] = [
  {
    id: 1, title: "Interstellar",
    overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival. Breathtaking visuals and a deeply emotional story make this a modern sci-fi masterpiece.",
    poster_path: "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    release_date: "2014-11-05", vote_average: 8.6, vote_count: 34210,
    popularity: 98.4, genres: [{ id: 18, name: "Drama" }, { id: 878, name: "Science Fiction" }],
    genre_ids: [18, 878], original_language: "en", original_title: "Interstellar",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
  },
  {
    id: 2, title: "Inception",
    overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    poster_path: "https://image.tmdb.org/t/p/w342/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    release_date: "2010-07-16", vote_average: 8.8, vote_count: 35012,
    popularity: 95.1, genres: [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }, { id: 53, name: "Thriller" }],
    genre_ids: [28, 878, 53], original_language: "en", original_title: "Inception",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
  },
  {
    id: 3, title: "The Dark Knight",
    overview: "When the menace known as The Joker emerges from his mysterious past, he wreaks havoc and chaos on the people of Gotham. Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    poster_path: "https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    release_date: "2008-07-18", vote_average: 9.0, vote_count: 31200,
    popularity: 110.2, genres: [{ id: 28, name: "Action" }, { id: 80, name: "Crime" }, { id: 18, name: "Drama" }],
    genre_ids: [28, 80, 18], original_language: "en", original_title: "The Dark Knight",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/hkBaDkMWbLaf8B1lsWsqX7An9O8.jpg",
  },
  {
    id: 4, title: "Dune: Part Two",
    overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe.",
    poster_path: "https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    release_date: "2024-03-01", vote_average: 8.4, vote_count: 5900,
    popularity: 130.6, genres: [{ id: 878, name: "Science Fiction" }, { id: 12, name: "Adventure" }],
    genre_ids: [878, 12], original_language: "en", original_title: "Dune: Part Two",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
  },
  {
    id: 5, title: "Oppenheimer",
    overview: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
    poster_path: "https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    release_date: "2023-07-21", vote_average: 8.3, vote_count: 8120,
    popularity: 88.5, genres: [{ id: 18, name: "Drama" }, { id: 36, name: "History" }],
    genre_ids: [18, 36], original_language: "en", original_title: "Oppenheimer",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
  },
  {
    id: 6, title: "Parasite",
    overview: "All unemployed, Ki-taek's family takes a peculiar interest in the wealthy and seemingly perfect Park family. One by one, the Ki family members infiltrate the Park household.",
    poster_path: "https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    release_date: "2019-05-30", vote_average: 8.5, vote_count: 17500,
    popularity: 72.8, genres: [{ id: 35, name: "Comedy" }, { id: 53, name: "Thriller" }, { id: 18, name: "Drama" }],
    genre_ids: [35, 53, 18], original_language: "ko", original_title: "기생충",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
  },
  {
    id: 7, title: "Everything Everywhere All at Once",
    overview: "An aging Chinese immigrant is swept up in an insane adventure, where she alone can save the world by exploring other universes connecting with the lives she could have led.",
    poster_path: "https://image.tmdb.org/t/p/w342/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    release_date: "2022-03-25", vote_average: 8.1, vote_count: 9420,
    popularity: 65.3, genres: [{ id: 28, name: "Action" }, { id: 12, name: "Adventure" }, { id: 878, name: "Science Fiction" }],
    genre_ids: [28, 12, 878], original_language: "en", original_title: "Everything Everywhere All at Once",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/feSiISwgEpVzR1v3zv2n2NSa2l7.jpg",
  },
  {
    id: 8, title: "The Shawshank Redemption",
    overview: "Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison, where he puts his accounting skills to work.",
    poster_path: "https://image.tmdb.org/t/p/w342/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg",
    release_date: "1994-09-23", vote_average: 9.3, vote_count: 26000,
    popularity: 80.1, genres: [{ id: 18, name: "Drama" }, { id: 80, name: "Crime" }],
    genre_ids: [18, 80], original_language: "en", original_title: "The Shawshank Redemption",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
  },
  {
    id: 9, title: "Spider-Man: Across the Spider-Verse",
    overview: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash on how to handle a new threat, Miles must redefine what it means to be a hero.",
    poster_path: "https://image.tmdb.org/t/p/w342/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    release_date: "2023-06-02", vote_average: 8.7, vote_count: 7800,
    popularity: 92.4, genres: [{ id: 16, name: "Animation" }, { id: 28, name: "Action" }, { id: 12, name: "Adventure" }],
    genre_ids: [16, 28, 12], original_language: "en", original_title: "Spider-Man: Across the Spider-Verse",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/4HodYYQcTs8lVPreGQYox6Mn4RT.jpg",
  },
  {
    id: 10, title: "The Godfather",
    overview: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son. A landmark of American cinema and storytelling.",
    poster_path: "https://image.tmdb.org/t/p/w342/3bhkrj58Vtu7enYsLLeHjTAVxDl.jpg",
    release_date: "1972-03-24", vote_average: 9.2, vote_count: 19600,
    popularity: 77.6, genres: [{ id: 18, name: "Drama" }, { id: 80, name: "Crime" }],
    genre_ids: [18, 80], original_language: "en", original_title: "The Godfather",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
  },
  {
    id: 11, title: "Avengers: Endgame",
    overview: "After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more to reverse Thanos' actions.",
    poster_path: "https://image.tmdb.org/t/p/w342/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    release_date: "2019-04-26", vote_average: 8.4, vote_count: 23100,
    popularity: 105.9, genres: [{ id: 28, name: "Action" }, { id: 12, name: "Adventure" }, { id: 878, name: "Science Fiction" }],
    genre_ids: [28, 12, 878], original_language: "en", original_title: "Avengers: Endgame",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
  },
  {
    id: 12, title: "The Matrix",
    overview: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    poster_path: "https://image.tmdb.org/t/p/w342/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    release_date: "1999-03-31", vote_average: 8.7, vote_count: 24500,
    popularity: 84.3, genres: [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
    genre_ids: [28, 878], original_language: "en", original_title: "The Matrix",
    adult: false, backdrop_path: "https://image.tmdb.org/t/p/w1280/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
  },
];

// --- Mock implementation functions -------------------------------------------

const PAGE_SIZE = 6;

function paginateMock(items: Movie[], page: number): MovieListResponse {
  const total = items.length;
  const total_pages = Math.ceil(total / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const results = items.slice(start, start + PAGE_SIZE);
  return { page, results, total_pages, total_results: total };
}

function mockSearch(query: string, page: number): MovieListResponse {
  const q = query.toLowerCase();
  const filtered = MOCK_MOVIES.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.overview.toLowerCase().includes(q)
  );
  return paginateMock(filtered, page);
}

function mockPopular(page: number): MovieListResponse {
  const sorted = [...MOCK_MOVIES].sort((a, b) => b.popularity - a.popularity);
  return paginateMock(sorted, page);
}

function mockTopRated(page: number): MovieListResponse {
  const sorted = [...MOCK_MOVIES].sort((a, b) => b.vote_average - a.vote_average);
  return paginateMock(sorted, page);
}

function mockNowPlaying(page: number): MovieListResponse {
  const recent = [...MOCK_MOVIES]
    .filter((m) => new Date(m.release_date) >= new Date("2022-01-01"))
    .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
  return paginateMock(recent, page);
}

function mockUpcoming(page: number): MovieListResponse {
  const upcoming = [...MOCK_MOVIES]
    .filter((m) => new Date(m.release_date) >= new Date("2023-01-01"))
    .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
  return paginateMock(upcoming, page);
}

/** Mock cast data for fallback when API keys are missing. */
const MOCK_CAST: CastMember[] = [
  { id: 1, name: "Leonardo DiCaprio", character: "Dom Cobb", profile_path: null, order: 0 },
  { id: 2, name: "Joseph Gordon-Levitt", character: "Arthur", profile_path: null, order: 1 },
  { id: 3, name: "Elliot Page", character: "Ariadne", profile_path: null, order: 2 },
  { id: 4, name: "Tom Hardy", character: "Eames", profile_path: null, order: 3 },
  { id: 5, name: "Ken Watanabe", character: "Saito", profile_path: null, order: 4 },
];

function mockMovieDetail(id: number): MovieDetail {
  const movie = MOCK_MOVIES.find((m) => m.id === id) ?? MOCK_MOVIES[0];
  return {
    ...movie,
    runtime: 148,
    tagline: "The adventure of a lifetime.",
    status: "Released",
    revenue: 700_000_000,
    budget: 165_000_000,
    homepage: null,
    imdb_id: null,
    production_companies: [
      { id: 1, name: "Legendary Pictures", logo_path: null, origin_country: "US" },
    ],
    spoken_languages: [{ english_name: "English", iso_639_1: "en", name: "English" }],
    criticsRatings: MOCK_RATINGS[id] ?? null,
    cast: MOCK_CAST,
    watchProviders: {
      flatrate: [
        { provider_id: 8, provider_name: "Netflix", logo_path: "/pbpMk2JmcoNnQwB5JGpXAbmLg4V.jpg" },
        { provider_id: 337, provider_name: "Disney Plus", logo_path: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg" },
      ],
      rent: [
        { provider_id: 2, provider_name: "Apple TV", logo_path: "/9ghgSC0MA082EL6HLCW3GalykFD.jpg" },
      ],
      buy: [
        { provider_id: 3, provider_name: "Google Play Movies", logo_path: "/tbEdFQDwx5LEVr8WpSeXQSIirVq.jpg" },
      ],
      link: "https://www.themoviedb.org/movie/157336/watch",
    },
  };
}
