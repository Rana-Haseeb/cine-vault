"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Search, X, Loader2 } from "lucide-react";

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  /** Called with the debounced query string (empty string on clear) */
  onSearch: (query: string) => void;
  /** Show a spinner inside the bar while a fetch is in flight */
  isLoading?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms (default 450) */
  debounceMs?: number;
  /** Initial value */
  defaultValue?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

// ─── SearchBar ────────────────────────────────────────────────────────────────

export default function SearchBar({
  onSearch,
  isLoading = false,
  placeholder = "Search movies, genres, directors…",
  debounceMs = 450,
  defaultValue = "",
  autoFocus = false,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(inputValue, debounceMs);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fire the callback whenever the debounced value changes
  useEffect(() => {
    onSearch(debouncedQuery.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setInputValue("");
    inputRef.current?.focus();
  }, []);

  // Allow pressing Escape to clear
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") handleClear();
    },
    [handleClear]
  );

  const hasValue = inputValue.length > 0;

  return (
    <div className="w-full">
      <div
        className={`
          group relative flex items-center overflow-hidden rounded-2xl
          bg-slate-800/70 ring-1 backdrop-blur-sm transition-all duration-200
          ${
            isFocused
              ? "ring-violet-500/70 shadow-[0_0_0_3px_rgba(139,92,246,0.15)]"
              : "ring-white/10 hover:ring-white/20"
          }
        `}
      >
        {/* Search icon / spinner */}
        <div className="pointer-events-none flex-shrink-0 pl-4 pr-1">
          {isLoading ? (
            <Loader2
              className="h-5 w-5 animate-spin text-violet-400"
              strokeWidth={2}
            />
          ) : (
            <Search
              className={`h-5 w-5 transition-colors duration-200 ${
                isFocused ? "text-violet-400" : "text-slate-400 group-hover:text-slate-300"
              }`}
              strokeWidth={2}
            />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search movies"
          className="
            min-w-0 flex-1 bg-transparent py-4 pl-3 pr-2 text-base
            text-white placeholder-slate-500 outline-none
            selection:bg-violet-500/40
          "
        />

        {/* Clear button — visible only when there's text */}
        <div
          className={`flex-shrink-0 pr-3 transition-all duration-150 ${
            hasValue ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="
              flex h-7 w-7 items-center justify-center rounded-full
              bg-slate-700 text-slate-400 transition-all duration-150
              hover:bg-slate-600 hover:text-white focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-violet-500
            "
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Live hint text */}
      {hasValue && !isLoading && (
        <p className="mt-2 pl-1 text-xs text-slate-500">
          Searching for{" "}
          <span className="font-medium text-slate-400">"{inputValue}"</span>
          …
        </p>
      )}
    </div>
  );
}
