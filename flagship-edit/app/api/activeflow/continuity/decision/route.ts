import { NextResponse } from "next/server";
import { decideContinuityProposal } from "../../../../../db/continuity";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { correlationId?: string; decision?: string };
    if (!body.correlationId || !["approve", "reject"].includes(body.decision || "")) {
      return NextResponse.json({ error: "correlationId and a valid decision are required" }, { status: 400 });
    }
    const result = await decideContinuityProposal(body.correlationId, body.decision as "approve" | "reject");
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Decision could not be applied";
    const status = message === "Proposal not found" ? 404 : message.includes("changed") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
