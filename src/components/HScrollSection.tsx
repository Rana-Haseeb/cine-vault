"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPosterUrl } from "@/lib/movieApi";
import type { Movie } from "@/types/movie";

// ─── Rating Circle (TMDB-style SVG arc) ──────────────────────────────────────

function RatingCircle({ rating }: { rating: number }) {
  const pct = Math.round(rating * 10);
  const r = 15;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color =
    pct >= 70 ? "#21d07a" : pct >= 50 ? "#d2d531" : "#db2360";
  const track =
    pct >= 70 ? "#204529" : pct >= 50 ? "#423d0f" : "#571435";

  return (
    <div className="relative w-9 h-9 rounded-full flex items-center justify-center bg-[#081c22] shadow-md ring-1 ring-white/10">
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        className="absolute"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx="18" cy="18" r={r}
          fill="none" stroke={track} strokeWidth="2.5"
        />
        <circle
          cx="18" cy="18" r={r}
          fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${circ}`}
          strokeDashoffset={`${offset}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="relative z-10 text-[9px] font-bold text-white leading-none">
        {pct}<sup className="text-[6px]">%</sup>
      </span>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[130px] sm:w-[145px]">
      <div className="w-full aspect-[2/3] rounded-xl bg-slate-800/50 animate-pulse" />
      <div className="mt-5 space-y-2">
        <div className="h-3 bg-slate-800/50 rounded animate-pulse w-4/5" />
        <div className="h-2.5 bg-slate-800/50 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

// ─── Poster Card ──────────────────────────────────────────────────────────────

interface PosterCardProps {
  movie: Movie;
  onSelect: (m: Movie) => void;
}

function PosterCard({ movie, onSelect }: PosterCardProps) {
  const src = movie.poster_path?.startsWith("http")
    ? movie.poster_path
    : getPosterUrl(movie.poster_path, "medium");

  const releaseLabel = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <button
      type="button"
      onClick={() => onSelect(movie)}
      className="group flex-shrink-0 w-[130px] sm:w-[145px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl"
    >
      {/* Poster image */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-slate-800 shadow-lg ring-1 ring-white/8 transition-transform duration-200 group-hover:scale-[1.04] group-hover:shadow-2xl group-hover:ring-sky-400/30">
        <Image
          src={src}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 130px, 145px"
          className="object-cover"
        />
        {/* Subtle overlay on hover */}
        <div className="absolute inset-0 bg-sky-400/0 group-hover:bg-sky-400/8 transition-colors duration-200" />
      </div>

      {/* Rating circle — sits below poster, overlapping bottom edge */}
      <div className="-mt-[18px] ml-2 mb-1">
        <RatingCircle rating={movie.vote_average} />
      </div>

      {/* Title + date */}
      <div className="mt-1 px-0.5">
        <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-sky-300 transition-colors">
          {movie.title}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">{releaseLabel}</p>
      </div>
    </button>
  );
}

// ─── HScrollSection ───────────────────────────────────────────────────────────

export interface HScrollTab {
  id: string;
  label: string;
}

interface HScrollSectionProps {
  title: string;
  tabs?: HScrollTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  movies: Movie[];
  isLoading?: boolean;
  onSelectMovie: (movie: Movie) => void;
  className?: string;
}

export default function HScrollSection({
  title,
  tabs,
  activeTab,
  onTabChange,
  movies,
  isLoading = false,
  onSelectMovie,
  className = "",
}: HScrollSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "right" ? 600 : -600,
      behavior: "smooth",
    });
  };

  return (
    <section className={`py-6 ${className}`}>
      {/* Header row: title + tab pills */}
      <div className="flex items-center justify-between mb-5 px-4 sm:px-6 lg:px-8">
        <h2 className="text-[1.35rem] font-bold text-white tracking-tight">
          {title}
        </h2>

        {tabs && tabs.length > 0 && (
          <div className="flex items-center rounded-full border border-sky-400/40 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={`px-3.5 py-1 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none ${
                  activeTab === tab.id
                    ? "bg-sky-400 text-[#030d1a]"
                    : "text-sky-400 hover:bg-sky-400/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scroll row with arrow buttons */}
      <div className="relative group/row">
        {/* Left scroll arrow */}
        <button
          aria-label="Scroll left"
          onClick={() => scroll("left")}
          className="absolute left-0 top-[38%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#0d1b30]/90 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity shadow-xl hover:bg-sky-600/80 hover:border-sky-400/50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-6 pt-1"
        >
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            : movies.slice(0, 20).map((movie) => (
                <PosterCard
                  key={movie.id}
                  movie={movie}
                  onSelect={onSelectMovie}
                />
              ))}
        </div>

        {/* Right scroll arrow */}
        <button
          aria-label="Scroll right"
          onClick={() => scroll("right")}
          className="absolute right-0 top-[38%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#0d1b30]/90 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity shadow-xl hover:bg-sky-600/80 hover:border-sky-400/50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
