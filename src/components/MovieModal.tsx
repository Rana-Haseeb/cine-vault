"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  X,
  Star,
  Clock,
  Calendar,
  Globe,
  Users,
  TrendingUp,
  Award,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { getPosterUrl, getBackdropUrl, getProfileUrl, getProviderLogoUrl } from "@/lib/movieApi";
import type { Movie, MovieDetail, CastMember, WatchProvider } from "@/types/movie";

// --- Helpers ------------------------------------------------------------------

function getRatingColor(r: number) {
  if (r >= 8) return "text-emerald-400";
  if (r >= 6.5) return "text-yellow-400";
  if (r >= 5) return "text-orange-400";
  return "text-red-400";
}

function getRatingBg(r: number) {
  if (r >= 8) return "bg-emerald-400/10 ring-emerald-400/30";
  if (r >= 6.5) return "bg-yellow-400/10 ring-yellow-400/30";
  if (r >= 5) return "bg-orange-400/10 ring-orange-400/30";
  return "bg-red-400/10 ring-red-400/30";
}

function formatRuntime(mins: number | null | undefined): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatCurrency(n: number): string {
  if (!n || n === 0) return "N/A";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function formatDate(d: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// --- Stat pill ----------------------------------------------------------------

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/8 min-w-[6rem]">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}

// --- Loading skeleton ---------------------------------------------------------

function ModalSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Backdrop skeleton */}
      <div className="h-56 w-full animate-pulse bg-slate-800 sm:h-72" />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex gap-4">
          <div className="h-36 w-24 flex-shrink-0 animate-pulse rounded-xl bg-slate-800" />
          <div className="flex flex-col gap-3 flex-1 pt-1">
            <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-800" />
            <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-slate-800" />
            <div className="flex gap-2 mt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-slate-800" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-3 animate-pulse rounded-full bg-slate-800 ${
                i === 4 ? "w-2/3" : "w-full"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Critics ratings panel ---------------------------------------------------

import type { CriticsRatings } from "@/types/movie";

interface ScoreBadgeProps {
  label: string;
  value: string;
  color: string;
  bg: string;
}

function ScoreBadge({ label, value, color, bg }: ScoreBadgeProps) {
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 ring-1 ${bg}`}>
      <span className={`text-xl font-extrabold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </span>
    </div>
  );
}

function CriticsRatingsPanel({ ratings }: { ratings: CriticsRatings }) {
  const hasAny = ratings.imdb || ratings.rottenTomatoes || ratings.metacritic;
  if (!hasAny) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        Critics Scores
      </h3>
      <div className="flex flex-wrap gap-3">
        {ratings.imdb && (
          <ScoreBadge
            label="IMDb"
            value={ratings.imdb}
            color="text-yellow-400"
            bg="bg-yellow-400/8 ring-yellow-400/20"
          />
        )}
        {ratings.rottenTomatoes && (
          <ScoreBadge
            label="Rotten Tomatoes"
            value={ratings.rottenTomatoes}
            color={
              parseInt(ratings.rottenTomatoes) >= 60
                ? "text-emerald-400"
                : "text-red-400"
            }
            bg={
              parseInt(ratings.rottenTomatoes) >= 60
                ? "bg-emerald-400/8 ring-emerald-400/20"
                : "bg-red-400/8 ring-red-400/20"
            }
          />
        )}
        {ratings.metacritic && (
          <ScoreBadge
            label="Metacritic"
            value={ratings.metacritic}
            color={
              parseInt(ratings.metacritic) >= 61
                ? "text-emerald-400"
                : parseInt(ratings.metacritic) >= 40
                ? "text-yellow-400"
                : "text-red-400"
            }
            bg={
              parseInt(ratings.metacritic) >= 61
                ? "bg-emerald-400/8 ring-emerald-400/20"
                : parseInt(ratings.metacritic) >= 40
                ? "bg-yellow-400/8 ring-yellow-400/20"
                : "bg-red-400/8 ring-red-400/20"
            }
          />
        )}
        {ratings.rated && (
          <ScoreBadge
            label="Rated"
            value={ratings.rated}
            color="text-slate-300"
            bg="bg-white/5 ring-white/10"
          />
        )}
      </div>
      {ratings.boxOffice && (
        <p className="text-xs text-slate-500">
          Box Office: <span className="font-semibold text-slate-300">{ratings.boxOffice}</span>
        </p>
      )}
    </div>
  );
}

// --- Modal content ------------------------------------------------------------

function ModalContent({
  movie,
}: {
  movie: MovieDetail | Movie;
}) {
  const isDetail = "runtime" in movie;
  const detail = isDetail ? (movie as MovieDetail) : null;

  const posterSrc = movie.poster_path?.startsWith("http")
    ? movie.poster_path
    : getPosterUrl(movie.poster_path, "large");

  const backdropSrc = movie.backdrop_path?.startsWith("http")
    ? movie.backdrop_path
    : getBackdropUrl(movie.backdrop_path, "w1280");

  const rating = movie.vote_average ?? 0;

  return (
    <div className="flex flex-col">
      {/* -- Backdrop banner ------------------------------------------- */}
      <div className="relative h-52 w-full overflow-hidden sm:h-72 lg:h-80">
        {backdropSrc ? (
          <Image
            src={backdropSrc}
            alt={`${movie.title} backdrop`}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950 to-slate-900" />
        )}
        {/* Gradient overlay so title text reads cleanly */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />

        {/* Runtime + status badge on banner */}
        {detail && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            {detail.status && (
              <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10 backdrop-blur-sm">
                {detail.status}
              </span>
            )}
          </div>
        )}
      </div>

      {/* -- Body ------------------------------------------------------ */}
      <div className="flex flex-col gap-6 px-5 pb-8 pt-0 sm:px-7">

        {/* Poster + header */}
        <div className="flex gap-5 -mt-16 relative z-10">
          {/* Poster thumbnail */}
          <div className="relative h-32 w-[5.5rem] flex-shrink-0 overflow-hidden rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] ring-2 ring-white/10 sm:h-40 sm:w-[6.5rem]">
            <Image
              src={posterSrc}
              alt={`${movie.title} poster`}
              fill
              sizes="120px"
              className="object-cover"
            />
          </div>

          {/* Title block */}
          <div className="flex flex-col justify-end gap-2 pb-1 min-w-0">
            <h2 className="text-xl font-extrabold leading-tight text-white sm:text-2xl line-clamp-2">
              {movie.title}
            </h2>
            {detail?.tagline && (
              <p className="text-sm italic text-slate-400 line-clamp-1">
                &ldquo;{detail.tagline}&rdquo;
              </p>
            )}
            {movie.original_title !== movie.title && (
              <p className="text-xs text-slate-500 line-clamp-1">
                {movie.original_title}
              </p>
            )}
          </div>
        </div>

        {/* Rating + quick stats row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Big rating badge */}
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ring-1 ${getRatingBg(rating)}`}
          >
            <Star
              className={`h-5 w-5 fill-current ${getRatingColor(rating)}`}
              strokeWidth={0}
            />
            <span className={`text-xl font-bold ${getRatingColor(rating)}`}>
              {rating.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">/ 10</span>
          </div>

          {/* Vote count */}
          {movie.vote_count > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Users className="h-3.5 w-3.5" strokeWidth={2} />
              {movie.vote_count.toLocaleString()} votes
            </span>
          )}

          {/* Popularity */}
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
            {movie.popularity.toFixed(0)} popularity
          </span>
        </div>

        {/* Genre pills */}
        {movie.genres?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {movie.genres.map((g) => (
              <span
                key={g.id}
                className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300 ring-1 ring-violet-500/25"
              >
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* Stat pills */}
        <div className="flex flex-wrap gap-3">
          <StatPill
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Released"
            value={formatDate(movie.release_date)}
          />
          {isDetail && detail && (
            <>
              <StatPill
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Runtime"
                value={formatRuntime(detail.runtime)}
              />
              {detail.budget > 0 && (
                <StatPill
                  icon={<Award className="h-3.5 w-3.5" />}
                  label="Budget"
                  value={formatCurrency(detail.budget)}
                />
              )}
              {detail.revenue > 0 && (
                <StatPill
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label="Revenue"
                  value={formatCurrency(detail.revenue)}
                />
              )}
            </>
          )}
          <StatPill
            icon={<Globe className="h-3.5 w-3.5" />}
            label="Language"
            value={movie.original_language.toUpperCase()}
          />
        </div>

        {/* Critics ratings — from OMDb */}
        {isDetail && detail?.criticsRatings && (
          <CriticsRatingsPanel ratings={detail.criticsRatings} />
        )}

        {/* Overview */}
        {movie.overview && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Overview
            </h3>
            <p className="text-sm leading-relaxed text-slate-300">
              {movie.overview}
            </p>
          </div>
        )}

        {/* Director (from OMDb) */}
        {isDetail && detail?.criticsRatings?.director && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Director
            </h3>
            <p className="text-sm text-slate-300">{detail.criticsRatings.director}</p>
          </div>
        )}

        {/* -- Cast carousel (from TMDB /credits) ----------------------- */}
        {isDetail && detail?.cast && detail.cast.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Top Cast
            </h3>
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {detail.cast.map((actor: CastMember) => {
                const headshot = actor.profile_path?.startsWith("http")
                  ? actor.profile_path
                  : getProfileUrl(actor.profile_path, "w185");
                return (
                  <div
                    key={actor.id}
                    className="flex flex-col items-center gap-2 flex-shrink-0 w-[5.5rem] group"
                  >
                    {/* Headshot */}
                    <div className="relative h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full ring-2 ring-white/10 group-hover:ring-violet-500/40 transition-all shadow-lg">
                      <Image
                        src={headshot}
                        alt={actor.name}
                        fill
                        sizes="88px"
                        className="object-cover"
                      />
                    </div>
                    {/* Name + character */}
                    <div className="flex flex-col items-center text-center gap-0.5 min-w-0 w-full">
                      <span className="text-xs font-semibold text-slate-200 leading-tight line-clamp-2">
                        {actor.name}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                        {actor.character}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Awards highlight (from OMDb) */}
        {isDetail && detail?.criticsRatings?.awards && (
          <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent p-4 ring-1 ring-amber-500/20">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/30">
                <Trophy className="h-4.5 w-4.5 text-amber-400" strokeWidth={2} />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">
                  Awards
                </h3>
                <p className="text-sm leading-relaxed text-slate-200">
                  {detail.criticsRatings.awards}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* -- Where to Watch (from TMDB /watch/providers) -------------- */}
        {isDetail && detail?.watchProviders && (
          (() => {
            const wp = detail.watchProviders;
            const hasAny = wp.flatrate.length > 0 || wp.rent.length > 0 || wp.buy.length > 0;
            if (!hasAny) return null;

            const ProviderRow = ({ label, providers, color }: { label: string; providers: WatchProvider[]; color: string }) => {
              if (providers.length === 0) return null;
              return (
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${color}`}>
                    {label}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {providers.map((p) => {
                      const logoSrc = getProviderLogoUrl(p.logo_path, "w92");
                      return logoSrc ? (
                        <div key={p.provider_id} className="group relative">
                          <div className="h-9 w-9 overflow-hidden rounded-lg ring-1 ring-white/10 transition-all group-hover:ring-white/30 group-hover:scale-110">
                            <Image
                              src={logoSrc}
                              alt={p.provider_name}
                              width={36}
                              height={36}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          {/* Tooltip */}
                          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-200 opacity-0 ring-1 ring-white/10 transition-opacity group-hover:opacity-100">
                            {p.provider_name}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            };

            return (
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Where to Watch
                </h3>
                <div className="flex flex-col gap-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/8">
                  <ProviderRow
                    label="Stream"
                    providers={wp.flatrate}
                    color="text-sky-400 bg-sky-500/10 ring-sky-500/25"
                  />
                  <ProviderRow
                    label="Rent"
                    providers={wp.rent}
                    color="text-amber-400 bg-amber-500/10 ring-amber-500/25"
                  />
                  <ProviderRow
                    label="Buy"
                    providers={wp.buy}
                    color="text-emerald-400 bg-emerald-500/10 ring-emerald-500/25"
                  />
                  {wp.link && (
                    <p className="text-[10px] text-slate-600">
                      Powered by{" "}
                      <a
                        href={wp.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-400 transition-colors underline underline-offset-2"
                      >
                        JustWatch
                      </a>
                    </p>
                  )}
                </div>
              </div>
            );
          })()
        )}

        {/* Production companies */}
        {isDetail && detail && detail.production_companies?.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Production
            </h3>
            <p className="text-sm text-slate-400">
              {detail.production_companies
                .slice(0, 3)
                .map((c) => c.name)
                .join(" · ")}
            </p>
          </div>
        )}

        {/* Spoken languages */}
        {isDetail && detail && detail.spoken_languages?.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Languages
            </h3>
            <p className="text-sm text-slate-400">
              {detail.spoken_languages.map((l) => l.english_name).join(", ")}
            </p>
          </div>
        )}

        {/* TMDB link */}
        <a
          href={`https://www.themoviedb.org/movie/${movie.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-2 rounded-xl bg-violet-600/20 px-4 py-2.5 text-sm font-medium text-violet-300 ring-1 ring-violet-500/30 transition-all hover:bg-violet-600/30 hover:text-violet-200"
        >
          View on TMDB
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </a>
      </div>
    </div>
  );
}

// --- MovieModal ---------------------------------------------------------------

interface MovieModalProps {
  /** Movie detail object — if null + isLoading, shows skeleton */
  movie: MovieDetail | Movie | null;
  isLoading?: boolean;
  onClose: () => void;
}

export default function MovieModal({
  movie,
  isLoading = false,
  onClose,
}: MovieModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Guard: don't render portal until we're on the client.
  // createPortal(…, document.body) crashes during SSR because document is undefined.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape key closes the modal
  useEffect(() => {
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Click on backdrop (not the panel) closes modal
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  // Trap focus inside modal
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last?.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first?.focus();
        e.preventDefault();
      }
    },
    []
  );

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={movie?.title ?? "Movie details"}
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/75 px-4 py-6 backdrop-blur-sm
        animate-[modal-fade-in_0.2s_ease_both]
        sm:px-6 lg:px-8
      "
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="
          relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
          rounded-3xl bg-slate-900 shadow-[0_32px_80px_rgba(0,0,0,0.7)]
          ring-1 ring-white/10 outline-none
          animate-[modal-zoom-in_0.2s_ease_both]
        "
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close movie details"
          className="
            absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center
            rounded-full bg-slate-900/80 text-slate-400 ring-1 ring-white/10
            backdrop-blur-sm transition-all hover:bg-slate-800 hover:text-white
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
          "
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>

        {/* Content */}
        {isLoading || !movie ? (
          <ModalSkeleton />
        ) : (
          <ModalContent movie={movie} />
        )}
      </div>
    </div>,
    document.body
  );
}
