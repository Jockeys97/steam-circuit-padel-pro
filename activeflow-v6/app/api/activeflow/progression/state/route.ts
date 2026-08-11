import { NextResponse } from "next/server";
import { getProgressionState } from "../../../../../db/progression";

export async function GET() {
  try {
    return NextResponse.json(await getProgressionState(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load progression state" }, { status: 500 });
  }
}
