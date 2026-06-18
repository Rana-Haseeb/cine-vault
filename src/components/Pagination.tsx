"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a window of page numbers with ellipsis markers */
function buildPageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];

  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  if (current < total - 2) pages.push("…");

  pages.push(total);
  return pages;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PageButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label": string;
  children: React.ReactNode;
}

function PageButton({
  onClick,
  disabled = false,
  active = false,
  "aria-label": ariaLabel,
  children,
}: PageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={`
        relative flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl
        px-2 text-sm font-medium transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
        disabled:cursor-not-allowed disabled:opacity-30
        ${
          active
            ? "bg-violet-600 text-white shadow-[0_2px_12px_rgba(139,92,246,0.4)] ring-1 ring-violet-500/50"
            : "text-slate-300 hover:bg-slate-700/70 hover:text-white disabled:hover:bg-transparent"
        }
      `}
    >
      {children}
    </button>
  );
}

function EllipsisMarker() {
  return (
    <span className="flex h-9 w-9 items-center justify-center text-sm text-slate-500 select-none">
      …
    </span>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults?: number;
  onPageChange: (page: number) => void;
  /** Show first/last jump buttons (default true) */
  showJumpButtons?: boolean;
  /** Show page number pills (default true) */
  showPageNumbers?: boolean;
  /** Show "Page X of Y" label (default true) */
  showLabel?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalResults,
  onPageChange,
  showJumpButtons = true,
  showPageNumbers = true,
  showLabel = true,
}: PaginationProps) {
  // Nothing to show for a single page
  if (totalPages <= 1) return null;

  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;
  const pageWindow = buildPageWindow(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center gap-3 py-2"
    >
      {/* Result summary label */}
      {showLabel && totalResults !== undefined && (
        <p className="text-xs text-slate-500">
          Page{" "}
          <span className="font-semibold text-slate-300">{currentPage}</span>{" "}
          of{" "}
          <span className="font-semibold text-slate-300">{totalPages}</span>
          {totalResults > 0 && (
            <>
              {" "}·{" "}
              <span className="font-semibold text-slate-300">
                {totalResults.toLocaleString()}
              </span>{" "}
              total result{totalResults !== 1 ? "s" : ""}
            </>
          )}
        </p>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-1 rounded-2xl bg-slate-800/60 p-1.5 ring-1 ring-white/5">
        {/* Jump to first */}
        {showJumpButtons && (
          <PageButton
            onClick={() => onPageChange(1)}
            disabled={isFirst}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" strokeWidth={2} />
          </PageButton>
        )}

        {/* Previous */}
        <PageButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirst}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          <span className="ml-0.5 hidden sm:inline">Prev</span>
        </PageButton>

        {/* Page number pills */}
        {showPageNumbers && (
          <div className="flex items-center gap-0.5 px-1">
            {pageWindow.map((p, i) =>
              p === "…" ? (
                <EllipsisMarker key={`ellipsis-${i}`} />
              ) : (
                <PageButton
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  active={p === currentPage}
                  aria-label={`Page ${p}`}
                >
                  {p}
                </PageButton>
              )
            )}
          </div>
        )}

        {/* Next */}
        <PageButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLast}
          aria-label="Next page"
        >
          <span className="mr-0.5 hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </PageButton>

        {/* Jump to last */}
        {showJumpButtons && (
          <PageButton
            onClick={() => onPageChange(totalPages)}
            disabled={isLast}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" strokeWidth={2} />
          </PageButton>
        )}
      </div>
    </nav>
  );
}
