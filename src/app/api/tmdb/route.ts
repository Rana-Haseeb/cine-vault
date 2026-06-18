/**
 * /api/tmdb — server-side TMDB proxy
 *
 * Why this exists:
 *   process.env credentials are only available server-side. Client components
 *   can't read them directly. This route reads the env vars on the server and
 *   proxies requests to TMDB, keeping the API token out of the browser bundle.
 *
 * Usage from client:
 *   GET /api/tmdb?endpoint=/movie/popular&page=1&language=en-US
 */

import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN ?? "";
const TMDB_KEY = process.env.TMDB_API_KEY ?? "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint param" }, { status: 400 });
  }

  if (!TMDB_TOKEN && !TMDB_KEY) {
    return NextResponse.json(
      { error: "TMDB credentials not configured on server" },
      { status: 500 }
    );
  }

  // Build upstream TMDB URL, forwarding all params except 'endpoint'
  const tmdbUrl = new URL(`${TMDB_BASE}${endpoint}`);
  searchParams.forEach((value, key) => {
    if (key !== "endpoint") tmdbUrl.searchParams.set(key, value);
  });

  // Auth
  const headers: Record<string, string> = { Accept: "application/json" };
  if (TMDB_TOKEN) {
    headers["Authorization"] = `Bearer ${TMDB_TOKEN}`;
  } else {
    tmdbUrl.searchParams.set("api_key", TMDB_KEY);
  }

  const upstream = await fetch(tmdbUrl.toString(), {
    headers,
    next: { revalidate: 300 }, // ISR cache: 5 minutes
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `TMDB returned ${upstream.status}` },
      { status: upstream.status }
    );
  }

  const data = await upstream.json();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
