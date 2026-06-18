/**
 * /api/omdb — server-side OMDb proxy
 *
 * Same purpose as /api/tmdb: keeps OMDB_API_KEY server-side.
 *
 * Usage from client:
 *   GET /api/omdb?i=tt0816692          (by IMDb ID)
 *   GET /api/omdb?t=Inception&y=2010   (by title + year)
 */

import { NextRequest, NextResponse } from "next/server";

const OMDB_BASE = "https://www.omdbapi.com";
const OMDB_KEY = process.env.OMDB_API_KEY ?? "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!OMDB_KEY) {
    // Return a valid OMDb-style "not found" rather than crashing
    return NextResponse.json({ Response: "False", Error: "OMDb key not configured" });
  }

  const omdbUrl = new URL(OMDB_BASE);
  omdbUrl.searchParams.set("apikey", OMDB_KEY);
  omdbUrl.searchParams.set("plot", "short");
  searchParams.forEach((value, key) => omdbUrl.searchParams.set(key, value));

  const upstream = await fetch(omdbUrl.toString(), {
    next: { revalidate: 86400 }, // ISR cache: 24 hours (ratings don't change often)
  });

  if (!upstream.ok) {
    return NextResponse.json({ Response: "False", Error: `OMDb returned ${upstream.status}` });
  }

  const data = await upstream.json();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}
