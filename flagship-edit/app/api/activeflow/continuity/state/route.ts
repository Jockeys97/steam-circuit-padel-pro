import { NextResponse } from "next/server";
import { getContinuityState } from "../../../../../db/continuity";

export async function GET() {
  try {
    const state = await getContinuityState();
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load continuity state" },
      { status: 500 },
    );
  }
}
