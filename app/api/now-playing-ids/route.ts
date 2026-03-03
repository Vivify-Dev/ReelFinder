import { NextResponse } from "next/server";
import {
  getNowPlayingIds,
  NOW_PLAYING_REVALIDATE_SECONDS,
} from "@/lib/now-playing";

export const revalidate = 86400;

export async function GET() {
  const isDev = process.env.NODE_ENV !== "production";
  try {
    const ids = await getNowPlayingIds();
    return NextResponse.json({
      ids: [...ids],
      count: ids.size,
      sampled_pages: 4,
      cache_seconds: NOW_PLAYING_REVALIDATE_SECONDS,
    });
  } catch (error) {
    if (isDev) {
      console.error("Now playing ids API error:", error);
    }
    return NextResponse.json(
      {
        ids: [],
        count: 0,
        error: "TMDB_UNAVAILABLE",
        message: "Failed to load in-theaters markers.",
      },
      { status: 503 }
    );
  }
}
