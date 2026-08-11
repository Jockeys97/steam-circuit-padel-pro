import { NextResponse } from "next/server";
import { resetContinuityStore } from "../../../../../db/continuity";

export async function POST() {
  try {
    const state = await resetContinuityStore();
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sandbox reset failed" },
      { status: 500 },
    );
  }
}
