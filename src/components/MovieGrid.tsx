"use client";

import { Film, SearchX, AlertTriangle } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import type { Movie } from "@/types/movie";

// --- Skeleton card ------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-slate-800/60 ring-1 ring-white/5">
      {/* Poster skeleton */}
      <div className="aspect-[2/3] w-full animate-pulse bg-gradient-to-br from-slate-700 to-slate-800" />
      {/* Footer skeleton */}
      <div className="flex flex-col gap-2 px-3 py-3">
        <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-slate-700" />
        <div className="h-3 w-2/5 animate-pulse rounded-full bg-slate-700/60" />
      </div>
    </div>
  );
}

// --- Empty state --------------------------------------------------------------

interface EmptyStateProps {
  query?: string;
}

function EmptyState({ query }: EmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 px-6 py-20 text-center">
      <div className="rounded-2xl bg-slate-700/50 p-5">
        {query ? (
          <SearchX className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
        ) : (
          <Film className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
        )}
      </div>
      <div className="max-w-xs">
        <h3 className="text-base font-semibold text-slate-200">
          {query ? "No results found" : "No movies here yet"}
        </h3>
        <p className="mt-1.5 text-sm text-slate-400">
          {query
            ? `We couldn't find any movies matching "${query}". Try a different title or keyword.`
            : "Start searching or explore popular movies to fill this grid."}
        </p>
      </div>
    </div>
  );
}

// --- Error state --------------------------------------------------------------

function ErrorState({ message }: { message: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-red-900/50 bg-red-950/20 px-6 py-20 text-center">
      <div className="rounded-2xl bg-red-900/30 p-5">
        <AlertTriangle className="h-10 w-10 text-red-400" strokeWidth={1.5} />
      </div>
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-red-300">
          Something went wrong
        </h3>
        <p className="mt-1.5 text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}

// --- Section header -----------------------------------------------------------

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  totalResults?: number;
}

function SectionHeader({ title, subtitle, totalResults }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        )}
      </div>
      {totalResults !== undefined && totalResults > 0 && (
        <span className="flex-shrink-0 rounded-full bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">
          {totalResults.toLocaleString()} result{totalResults !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

// --- Column count variants ----------------------------------------------------

type GridVariant = "default" | "compact" | "wide";

const GRID_CLASSES: Record<GridVariant, string> = {
  // 1 -> 2 -> 3 -> 4
  default:
    "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4",
  // 1 -> 2 -> 4 -> 5 (for search results)
  compact:
    "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5",
  // 1 -> 2 -> 3 (bigger cards, for featured sections)
  wide:
    "grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3",
};

// --- MovieGrid ----------------------------------------------------------------

interface MovieGridProps {
  movies: Movie[];
  isLoading?: boolean;
  error?: string | null;
  query?: string;
  skeletonCount?: number;
  showTrendingBadges?: boolean;
  showRanks?: boolean;
  title?: string;
  subtitle?: string;
  totalResults?: number;
  variant?: GridVariant;
  /** When provided, cards call this instead of navigating to /movie/:id */
  onSelectMovie?: (movie: Movie) => void;
}

export default function MovieGrid({
  movies,
  isLoading = false,
  error = null,
  query,
  skeletonCount = 8,
  showTrendingBadges = false,
  showRanks = false,
  title,
  subtitle,
  totalResults,
  variant = "default",
  onSelectMovie,
}: MovieGridProps) {
  const gridClass = GRID_CLASSES[variant];

  return (
    <section>
      {/* Section header */}
      {title && (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          totalResults={totalResults}
        />
      )}

      <div className={gridClass}>
        {/* -- Loading skeleton ------------------------------------------ */}
        {isLoading &&
          Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}

        {/* -- Error state ----------------------------------------------- */}
        {!isLoading && error && <ErrorState message={error} />}

        {/* -- Empty state ----------------------------------------------- */}
        {!isLoading && !error && movies.length === 0 && (
          <EmptyState query={query} />
        )}

        {/* -- Movie cards ------------------------------------------------ */}
        {!isLoading &&
          !error &&
          movies.map((movie, index) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              showTrendingBadge={showTrendingBadges && index < 3}
              rank={showRanks ? index + 1 : undefined}
              onSelect={onSelectMovie}
            />
          ))}
      </div>
    </section>
  );
}

// --- Named re-exports for convenience ----------------------------------------

export { SkeletonCard, EmptyState, ErrorState, SectionHeader };
