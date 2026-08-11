import { NextResponse } from "next/server";
import { resetReconciliationStore } from "../../../../../db/reconciliation";
export async function POST() { try { return NextResponse.json(await resetReconciliationStore(), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reset reconciliation state" }, { status: 500 }); } }
