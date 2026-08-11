import { NextResponse } from "next/server";
import { resetProgressionStore } from "../../../../../db/progression";

export async function POST() {
  try {
    return NextResponse.json(await resetProgressionStore(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reset progression state" }, { status: 500 });
  }
}
