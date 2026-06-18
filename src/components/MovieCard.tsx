"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Calendar, ImageOff, TrendingUp } from "lucide-react";
import { getPosterUrl } from "@/lib/movieApi";
import type { Movie } from "@/types/movie";

// --- Helpers ------------------------------------------------------------------

function getRatingColor(rating: number): string {
  if (rating >= 8) return "text-emerald-400 border-emerald-400/40 bg-emerald-400/10";
  if (rating >= 6.5) return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
  if (rating >= 5) return "text-orange-400 border-orange-400/40 bg-orange-400/10";
  return "text-red-400 border-red-400/40 bg-red-400/10";
}

function getRatingRingColor(rating: number): string {
  if (rating >= 8) return "ring-emerald-400/60";
  if (rating >= 6.5) return "ring-yellow-400/60";
  if (rating >= 5) return "ring-orange-400/60";
  return "ring-red-400/60";
}

function formatYear(date: string): string {
  if (!date) return "—";
  return new Date(date).getFullYear().toString();
}

function truncateOverview(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

// --- Poster fallback ----------------------------------------------------------

function PosterFallback({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      <div className="rounded-xl bg-slate-700/60 p-4 ring-1 ring-slate-600/40">
        <ImageOff className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
      </div>
      <p className="line-clamp-3 text-center text-xs font-medium leading-snug text-slate-400">
        {title}
      </p>
    </div>
  );
}

// --- Genre pills --------------------------------------------------------------

function GenrePills({ genres }: { genres: Movie["genres"] }) {
  if (!genres?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {genres.slice(0, 2).map((g) => (
        <span
          key={g.id}
          className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/80 backdrop-blur-sm"
        >
          {g.name}
        </span>
      ))}
    </div>
  );
}

// --- Shared card inner markup -------------------------------------------------

interface CardInnerProps {
  movie: Movie;
  showTrendingBadge: boolean;
  rank?: number;
  imgError: boolean;
  imgLoaded: boolean;
  posterSrc: string | null;
  ratingColor: string;
  ratingRing: string;
  ratingLabel: string;
  year: string;
  onImgError: () => void;
  onImgLoad: () => void;
}

function CardInner({
  movie,
  showTrendingBadge,
  rank,
  imgError,
  imgLoaded,
  posterSrc,
  ratingColor,
  ratingRing,
  ratingLabel,
  year,
  onImgError,
  onImgLoad,
}: CardInnerProps) {
  return (
    <>
      {/* -- Poster area ----------------------------------------------- */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
        {/* Shimmer while loading */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-700 to-slate-800" />
        )}

        {posterSrc ? (
          <Image
            src={posterSrc}
            alt={`${movie.title} poster`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-all duration-500 group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onError={onImgError}
            onLoad={onImgLoad}
          />
        ) : (
          <PosterFallback title={movie.title} />
        )}

        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-70" />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-end gap-2 bg-gradient-to-t from-slate-900/98 via-slate-900/80 to-slate-900/20 p-4 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
          <GenrePills genres={movie.genres} />
          <p className="line-clamp-4 text-xs leading-relaxed text-slate-200">
            {truncateOverview(movie.overview)}
          </p>
          <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-600/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            View Details &rarr;
          </span>
        </div>

        {/* Rank badge */}
        {rank !== undefined && (
          <div className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur-sm">
            {rank}
          </div>
        )}

        {/* Trending badge */}
        {showTrendingBadge && (
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-violet-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
            Hot
          </div>
        )}

        {/* Rating badge */}
        <div
          className={`absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold backdrop-blur-md transition-opacity duration-300 group-hover:opacity-0 ${ratingColor}`}
        >
          <Star className="h-3 w-3 fill-current" strokeWidth={0} />
          {ratingLabel}
        </div>
      </div>

      {/* -- Card footer ----------------------------------------------- */}
      <div className="flex flex-col gap-1 px-3 py-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white transition-colors group-hover:text-violet-300">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3 flex-shrink-0" strokeWidth={2} />
            {year}
          </span>
          <span
            className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-bold ring-1 ${ratingColor} ${ratingRing}`}
          >
            <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
            {ratingLabel}
          </span>
        </div>
      </div>
    </>
  );
}

// --- MovieCard ----------------------------------------------------------------

interface MovieCardProps {
  movie: Movie;
  showTrendingBadge?: boolean;
  rank?: number;
  /**
   * When provided the card renders as a <button> and calls this handler
   * instead of navigating — used by the homepage to open the detail modal.
   */
  onSelect?: (movie: Movie) => void;
}

export default function MovieCard({
  movie,
  showTrendingBadge = false,
  rank,
  onSelect,
}: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const posterSrc = imgError
    ? null
    : movie.poster_path?.startsWith("http")
    ? movie.poster_path
    : getPosterUrl(movie.poster_path, "medium");

  const handleImgError = useCallback(() => setImgError(true), []);
  const handleImgLoad = useCallback(() => setImgLoaded(true), []);

  const year = formatYear(movie.release_date);
  const rating = movie.vote_average ?? 0;
  const ratingLabel = rating.toFixed(1);
  const ratingColor = getRatingColor(rating);
  const ratingRing = getRatingRingColor(rating);

  const sharedClass =
    "group relative flex flex-col overflow-hidden rounded-2xl bg-slate-800/60 ring-1 ring-white/5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:ring-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer text-left w-full";

  const innerProps: CardInnerProps = {
    movie,
    showTrendingBadge,
    rank,
    imgError,
    imgLoaded,
    posterSrc,
    ratingColor,
    ratingRing,
    ratingLabel,
    year,
    onImgError: handleImgError,
    onImgLoad: handleImgLoad,
  };

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(movie)}
        className={sharedClass}
        aria-label={`View details for ${movie.title}`}
      >
        <CardInner {...innerProps} />
      </button>
    );
  }

  return (
    <Link
      href={`/movie/${movie.id}`}
      className={sharedClass}
      aria-label={`View details for ${movie.title}`}
    >
      <CardInner {...innerProps} />
    </Link>
  );
}
