"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Search, X, Film } from "lucide-react";
import MovieGrid from "@/components/MovieGrid";
import Pagination from "@/components/Pagination";
import MovieModal from "@/components/MovieModal";
import HScrollSection from "@/components/HScrollSection";
import {
  searchMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTrendingMovies,
  getMovieById,
  getBackdropUrl,
} from "@/lib/movieApi";
import type { Movie, MovieDetail } from "@/types/movie";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrendingWindow = "day" | "week";
type PopularTab = "popular" | "now_playing" | "upcoming";

interface SectionCache {
  trending_day: Movie[];
  trending_week: Movie[];
  popular: Movie[];
  now_playing: Movie[];
  upcoming: Movie[];
  top_rated: Movie[];
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({
  onSearchOpen,
}: {
  onSearchOpen: () => void;
}) {
  return (
    <nav className="sticky top-0 z-30 bg-[#0d1b30]/95 backdrop-blur-sm border-b border-white/5 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl flex items-center justify-between h-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Film className="h-5 w-5 text-sky-400" />
            <span className="text-lg font-extrabold tracking-tight">
              <span className="text-white">Cine</span>
              <span className="text-sky-400">Search</span>
            </span>
          </div>
        </div>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-1 text-sm font-medium">
          <a href="#trending" className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            Trending
          </a>
          <a href="#popular" className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            Popular
          </a>
          <a href="#top-rated" className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            Top Rated
          </a>
        </div>

        {/* Search icon */}
        <button
          type="button"
          onClick={onSearchOpen}
          aria-label="Open search"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({
  backdropUrl,
  searchValue,
  onSearchChange,
  onSearchClear,
  inputRef,
}: {
  backdropUrl: string | null;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchClear: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="relative overflow-hidden bg-[#0d1b30]" style={{ minHeight: "280px" }}>
      {/* Backdrop image */}
      {backdropUrl && (
        <Image
          src={backdropUrl}
          alt="Featured movie backdrop"
          fill
          sizes="100vw"
          className="object-cover object-center opacity-25"
          priority
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d1b30] via-[#0d1b30]/80 to-[#0d1b30]/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent" />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-2">
          Welcome.
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-xl">
          Millions of movies to discover. Explore now.
        </p>

        {/* Search bar */}
        <div className="relative max-w-2xl">
          <div className="flex items-center rounded-full overflow-hidden bg-white shadow-lg ring-2 ring-white/20 focus-within:ring-sky-400/60 transition-all">
            <Search className="ml-4 h-5 w-5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && onSearchClear()}
              placeholder="Search for a movie..."
              className="flex-1 px-3 py-3.5 text-slate-800 text-base bg-transparent outline-none placeholder:text-slate-400"
            />
            {searchValue && (
              <button
                type="button"
                onClick={onSearchClear}
                className="mr-2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {/* search fires via debounce */}}
              className="m-1.5 px-5 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-white/5" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  // ── Search state ────────────────────────────────────────────────────────────
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ── Section data cache ───────────────────────────────────────────────────────
  const [cache, setCache] = useState<Partial<SectionCache>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<keyof SectionCache>>(new Set());

  // ── Section tab states ───────────────────────────────────────────────────────
  const [trendingWindow, setTrendingWindow] = useState<TrendingWindow>("day");
  const [popularTab, setPopularTab] = useState<PopularTab>("popular");

  // ── Hero backdrop: first trending movie's backdrop ───────────────────────────
  const [heroBackdrop, setHeroBackdrop] = useState<string | null>(null);

  // ── Modal ────────────────────────────────────────────────────────────────────
  const [selectedMovie, setSelectedMovie] = useState<MovieDetail | Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const fetchIdRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isSearchMode = debouncedQuery.trim().length > 0;

  // ── Debounce search ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(rawQuery);
      setSearchPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // ── Fetch a single section (with caching) ────────────────────────────────────
  const fetchSection = useCallback(
    async (key: keyof SectionCache) => {
      if (cache[key] || loadingKeys.has(key)) return;

      setLoadingKeys((prev) => new Set(prev).add(key));
      try {
        let res;
        switch (key) {
          case "trending_day":   res = await getTrendingMovies("day");   break;
          case "trending_week":  res = await getTrendingMovies("week");  break;
          case "popular":        res = await getPopularMovies();          break;
          case "now_playing":    res = await getNowPlayingMovies();       break;
          case "upcoming":       res = await getUpcomingMovies();         break;
          case "top_rated":      res = await getTopRatedMovies();         break;
        }
        setCache((prev) => ({ ...prev, [key]: res.results }));

        // Set hero backdrop from first trending day movie
        if (key === "trending_day" && res.results.length > 0 && !heroBackdrop) {
          const backdrop = getBackdropUrl(res.results[0].backdrop_path, "w1280");
          if (backdrop) setHeroBackdrop(backdrop);
        }
      } catch {
        // silently fail — section just stays empty
      } finally {
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cache, loadingKeys]
  );

  // ── Initial load: fetch all sections in parallel ──────────────────────────────
  useEffect(() => {
    void Promise.all([
      fetchSection("trending_day"),
      fetchSection("popular"),
      fetchSection("top_rated"),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Lazy-fetch on tab change ──────────────────────────────────────────────────
  useEffect(() => {
    const key: keyof SectionCache =
      trendingWindow === "day" ? "trending_day" : "trending_week";
    fetchSection(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendingWindow]);

  useEffect(() => {
    const keyMap: Record<PopularTab, keyof SectionCache> = {
      popular: "popular",
      now_playing: "now_playing",
      upcoming: "upcoming",
    };
    fetchSection(keyMap[popularTab]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popularTab]);

  // ── Search fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setSearchTotalPages(1);
      setSearchTotalResults(0);
      return;
    }

    const id = ++fetchIdRef.current;
    setSearchLoading(true);
    setSearchError(null);

    searchMovies(debouncedQuery.trim(), searchPage)
      .then((res) => {
        if (id !== fetchIdRef.current) return;
        setSearchResults(res.results);
        setSearchTotalPages(res.total_pages);
        setSearchTotalResults(res.total_results);
      })
      .catch((err) => {
        if (id !== fetchIdRef.current) return;
        setSearchError(err instanceof Error ? err.message : "Search failed.");
        setSearchResults([]);
      })
      .finally(() => {
        if (id === fetchIdRef.current) setSearchLoading(false);
      });
  }, [debouncedQuery, searchPage]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((v: string) => setRawQuery(v), []);
  const handleSearchClear = useCallback(() => {
    setRawQuery("");
    setDebouncedQuery("");
  }, []);

  const handleSearchOpen = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleSelectMovie = useCallback(async (movie: Movie) => {
    setIsModalOpen(true);
    setIsModalLoading(true);
    setSelectedMovie(null);
    try {
      const detail = await getMovieById(movie.id);
      setSelectedMovie(detail);
    } catch {
      setSelectedMovie(movie);
    } finally {
      setIsModalLoading(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMovie(null);
  }, []);

  const handleTrendingTabChange = useCallback((id: string) => {
    setTrendingWindow(id as TrendingWindow);
  }, []);

  const handlePopularTabChange = useCallback((id: string) => {
    setPopularTab(id as PopularTab);
  }, []);

  const handleSearchPageChange = useCallback((page: number) => {
    setSearchPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Derived section movies ────────────────────────────────────────────────────
  const trendingMovies =
    trendingWindow === "day"
      ? cache.trending_day ?? []
      : cache.trending_week ?? [];
  const trendingLoading =
    trendingWindow === "day"
      ? loadingKeys.has("trending_day")
      : loadingKeys.has("trending_week");

  const popularKeyMap: Record<PopularTab, keyof SectionCache> = {
    popular: "popular",
    now_playing: "now_playing",
    upcoming: "upcoming",
  };
  const popularMovies = cache[popularKeyMap[popularTab]] ?? [];
  const popularLoading = loadingKeys.has(popularKeyMap[popularTab]);

  const topRatedMovies = cache.top_rated ?? [];
  const topRatedLoading = loadingKeys.has("top_rated");

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Sticky Nav */}
      <Nav onSearchOpen={handleSearchOpen} />

      {/* Hero */}
      <Hero
        backdropUrl={heroBackdrop}
        searchValue={rawQuery}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        inputRef={searchInputRef}
      />

      {/* ── Search Results Mode ──────────────────────────────────────────────── */}
      {isSearchMode ? (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <MovieGrid
            movies={searchResults}
            isLoading={searchLoading}
            error={searchError}
            query={debouncedQuery}
            skeletonCount={8}
            title={`Results for "${debouncedQuery}"`}
            totalResults={!searchLoading ? searchTotalResults : undefined}
            variant="default"
            onSelectMovie={handleSelectMovie}
          />

          {!searchLoading && !searchError && searchTotalPages > 1 && (
            <div className="mt-10">
              <Pagination
                currentPage={searchPage}
                totalPages={searchTotalPages}
                totalResults={searchTotalResults}
                onPageChange={handleSearchPageChange}
              />
            </div>
          )}
        </div>
      ) : (
        /* ── Browse Sections Mode ────────────────────────────────────────────── */
        <main className="pb-16">

          {/* ── Trending ────────────────────────────────────────────────────── */}
          <div id="trending">
            <HScrollSection
              title="Trending"
              tabs={[
                { id: "day",  label: "Today"     },
                { id: "week", label: "This Week"  },
              ]}
              activeTab={trendingWindow}
              onTabChange={handleTrendingTabChange}
              movies={trendingMovies}
              isLoading={trendingLoading && trendingMovies.length === 0}
              onSelectMovie={handleSelectMovie}
              className="pt-8"
            />
          </div>

          <SectionDivider />

          {/* ── What's Popular ──────────────────────────────────────────────── */}
          <div id="popular">
            <HScrollSection
              title="What's Popular"
              tabs={[
                { id: "popular",    label: "In Theaters"  },
                { id: "now_playing", label: "Now Playing"  },
                { id: "upcoming",   label: "Upcoming"     },
              ]}
              activeTab={popularTab}
              onTabChange={handlePopularTabChange}
              movies={popularMovies}
              isLoading={popularLoading && popularMovies.length === 0}
              onSelectMovie={handleSelectMovie}
            />
          </div>

          <SectionDivider />

          {/* ── Top Rated ───────────────────────────────────────────────────── */}
          <div id="top-rated">
            <HScrollSection
              title="Top Rated"
              movies={topRatedMovies}
              isLoading={topRatedLoading && topRatedMovies.length === 0}
              onSelectMovie={handleSelectMovie}
            />
          </div>

        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-sky-500/50" />
            <span className="font-semibold text-slate-500">CineSearch</span>
          </div>
          <p>
            Built with Next.js · TypeScript · Tailwind CSS ·{" "}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-sky-400 transition-colors"
            >
              TMDB API
            </a>
          </p>
        </div>
      </footer>

      {/* Movie Detail Modal */}
      {isModalOpen && (
        <MovieModal
          movie={selectedMovie}
          isLoading={isModalLoading}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
