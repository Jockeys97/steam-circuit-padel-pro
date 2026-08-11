import { NextResponse } from "next/server";
import { getReconciliationState } from "../../../../../db/reconciliation";
export async function GET() { try { return NextResponse.json(await getReconciliationState(), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load reconciliation state" }, { status: 500 }); } }
