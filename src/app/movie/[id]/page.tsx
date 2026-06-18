import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Star,
  Clock,
  Calendar,
  Globe,
  Users,
  TrendingUp,
  Award,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { getMovieById, getPosterUrl, getBackdropUrl } from "@/lib/movieApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatRuntime(mins: number | null | undefined) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatCurrency(n: number) {
  if (!n) return "N/A";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

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
    <div className="flex flex-col gap-1.5 rounded-xl bg-white/5 px-5 py-4 ring-1 ring-white/8">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;
  const movieId = parseInt(id, 10);

  if (isNaN(movieId)) notFound();

  let movie;
  try {
    movie = await getMovieById(movieId);
  } catch {
    notFound();
  }

  const posterSrc = movie.poster_path?.startsWith("http")
    ? movie.poster_path
    : getPosterUrl(movie.poster_path, "large");

  const backdropSrc = movie.backdrop_path?.startsWith("http")
    ? movie.backdrop_path
    : getBackdropUrl(movie.backdrop_path, "w1280");

  const rating = movie.vote_average ?? 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* ── Backdrop hero ─────────────────────────────────────────────── */}
      <div className="relative h-72 w-full overflow-hidden sm:h-96 lg:h-[28rem]">
        {backdropSrc ? (
          <Image
            src={backdropSrc}
            alt={`${movie.title} backdrop`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {/* Back button */}
        <div className="absolute left-4 top-4 sm:left-8 sm:top-8">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-300 ring-1 ring-white/10 backdrop-blur-sm transition-all hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Back
          </Link>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* Poster + title row */}
        <div className="flex gap-6 -mt-24 relative z-10 sm:-mt-32 sm:gap-8">
          {/* Poster */}
          <div className="relative h-44 w-[7.5rem] flex-shrink-0 overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] ring-2 ring-white/10 sm:h-60 sm:w-40 lg:h-72 lg:w-48">
            <Image
              src={posterSrc}
              alt={`${movie.title} poster`}
              fill
              sizes="(max-width: 640px) 120px, (max-width: 1024px) 160px, 192px"
              className="object-cover"
              priority
            />
          </div>

          {/* Title + meta */}
          <div className="flex flex-col justify-end gap-3 pb-1 min-w-0 pt-28 sm:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              {movie.genres?.slice(0, 3).map((g) => (
                <span
                  key={g.id}
                  className="rounded-full bg-violet-500/15 px-3 py-0.5 text-xs font-medium text-violet-300 ring-1 ring-violet-500/25"
                >
                  {g.name}
                </span>
              ))}
            </div>

            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="text-sm italic text-slate-400">
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {/* Rating */}
            <div className="flex items-center gap-3">
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

              {movie.vote_count > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5" strokeWidth={2} />
                  {movie.vote_count.toLocaleString()} votes
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatPill
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Released"
            value={formatDate(movie.release_date)}
          />
          <StatPill
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Runtime"
            value={formatRuntime(movie.runtime)}
          />
          <StatPill
            icon={<Globe className="h-3.5 w-3.5" />}
            label="Language"
            value={movie.original_language.toUpperCase()}
          />
          <StatPill
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Popularity"
            value={movie.popularity.toFixed(0)}
          />
          {movie.budget > 0 && (
            <StatPill
              icon={<Award className="h-3.5 w-3.5" />}
              label="Budget"
              value={formatCurrency(movie.budget)}
            />
          )}
          {movie.revenue > 0 && (
            <StatPill
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Revenue"
              value={formatCurrency(movie.revenue)}
            />
          )}
        </div>

        {/* Critics Scores — from OMDb */}
        {movie.criticsRatings && (() => {
          const r = movie.criticsRatings!;
          const hasScores = r.imdb || r.rottenTomatoes || r.metacritic;
          if (!hasScores) return null;
          return (
            <div className="mt-8">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Critics Scores
              </h2>
              <div className="flex flex-wrap gap-3">
                {r.imdb && (
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-yellow-400/8 px-5 py-3.5 ring-1 ring-yellow-400/20 min-w-[6rem]">
                    <span className="text-2xl font-extrabold tabular-nums text-yellow-400">{r.imdb}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">IMDb</span>
                  </div>
                )}
                {r.rottenTomatoes && (
                  <div className={`flex flex-col items-center gap-1.5 rounded-xl px-5 py-3.5 ring-1 min-w-[6rem] ${parseInt(r.rottenTomatoes) >= 60 ? "bg-emerald-400/8 ring-emerald-400/20" : "bg-red-400/8 ring-red-400/20"}`}>
                    <span className={`text-2xl font-extrabold tabular-nums ${parseInt(r.rottenTomatoes) >= 60 ? "text-emerald-400" : "text-red-400"}`}>{r.rottenTomatoes}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Rotten Tomatoes</span>
                  </div>
                )}
                {r.metacritic && (
                  <div className={`flex flex-col items-center gap-1.5 rounded-xl px-5 py-3.5 ring-1 min-w-[6rem] ${parseInt(r.metacritic) >= 61 ? "bg-emerald-400/8 ring-emerald-400/20" : parseInt(r.metacritic) >= 40 ? "bg-yellow-400/8 ring-yellow-400/20" : "bg-red-400/8 ring-red-400/20"}`}>
                    <span className={`text-2xl font-extrabold tabular-nums ${parseInt(r.metacritic) >= 61 ? "text-emerald-400" : parseInt(r.metacritic) >= 40 ? "text-yellow-400" : "text-red-400"}`}>{r.metacritic}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Metacritic</span>
                  </div>
                )}
                {r.rated && (
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 px-5 py-3.5 ring-1 ring-white/10 min-w-[5rem]">
                    <span className="text-2xl font-extrabold tabular-nums text-slate-300">{r.rated}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Rated</span>
                  </div>
                )}
              </div>
              {r.boxOffice && (
                <p className="mt-3 text-sm text-slate-500">
                  Box Office: <span className="font-semibold text-slate-300">{r.boxOffice}</span>
                </p>
              )}
            </div>
          );
        })()}

        {/* Overview */}
        {movie.overview && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Overview
            </h2>
            <p className="text-base leading-relaxed text-slate-300 max-w-3xl">
              {movie.overview}
            </p>
          </div>
        )}

        {/* Director + Cast — from OMDb */}
        {movie.criticsRatings?.director && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Director</h2>
            <p className="text-sm text-slate-300">{movie.criticsRatings.director}</p>
          </div>
        )}
        {movie.criticsRatings?.actors && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Cast</h2>
            <p className="text-sm text-slate-300">{movie.criticsRatings.actors}</p>
          </div>
        )}
        {movie.criticsRatings?.awards && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Awards</h2>
            <p className="text-sm text-slate-300">{movie.criticsRatings.awards}</p>
          </div>
        )}

        {/* Production companies */}
        {movie.production_companies?.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Production
            </h2>
            <p className="text-sm text-slate-400">
              {movie.production_companies
                .slice(0, 4)
                .map((c) => c.name)
                .join(" · ")}
            </p>
          </div>
        )}

        {/* Languages */}
        {movie.spoken_languages?.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Spoken Languages
            </h2>
            <p className="text-sm text-slate-400">
              {movie.spoken_languages.map((l) => l.english_name).join(", ")}
            </p>
          </div>
        )}

        {/* TMDB link */}
        <div className="mt-10">
          <a
            href={`https://www.themoviedb.org/movie/${movie.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600/20 px-5 py-3 text-sm font-medium text-violet-300 ring-1 ring-violet-500/30 transition-all hover:bg-violet-600/30 hover:text-violet-200"
          >
            View on TMDB
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </main>
  );
}
