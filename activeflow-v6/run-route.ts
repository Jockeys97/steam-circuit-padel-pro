import { NextResponse } from "next/server";
import { getContinuityState, saveContinuityProposal } from "../../../../db/continuity";
import { getProgressionState, saveProgressionProposal } from "../../../../db/progression";
import { getReconciliationState, saveReconciliationProposal } from "../../../../db/reconciliation";

const DEFAULT_WEBHOOK_URL = "https://satyale.app.n8n.cloud/webhook/activeflow-demo";
const DEFAULT_CONTINUITY_WEBHOOK_URL = "https://satyale.app.n8n.cloud/webhook/activeflow-continuity-v2";
const DEFAULT_PROGRESSION_WEBHOOK_URL = "https://satyale.app.n8n.cloud/webhook/activeflow-progression-v1";
const DEFAULT_RECONCILIATION_WEBHOOK_URL = "https://satyale.app.n8n.cloud/webhook/activeflow-reconciliation-v1";
const ALLOWED_SCENARIOS = new Set(["onboarding", "continuity", "adaptation", "reconciliation"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      scenario?: string;
      requestId?: string;
      approvalDecision?: string;
      payload?: Record<string, unknown>;
    };

    if (!body.scenario || !ALLOWED_SCENARIOS.has(body.scenario)) {
      return NextResponse.json({ ok: false, message: "Unknown ActiveFlow scenario." }, { status: 400 });
    }

    let outgoingPayload = body.payload || {};
    if (body.scenario === "continuity") {
      const state = await getContinuityState();
      const unavailableProfessionalId = String(outgoingPayload.unavailableProfessionalId || "pro-alex");
      outgoingPayload = {
        ...outgoingPayload,
        unavailableProfessionalId,
        professionals: state.professionals,
        sessions: state.sessions,
      };
    }
    if (body.scenario === "adaptation") {
      const state = await getProgressionState();
      const override = outgoingPayload.planOverride;
      const safeOverride = override && typeof override === "object" ? override as Record<string, unknown> : {};
      outgoingPayload = {
        ...outgoingPayload,
        plan: {
          ...state.plan,
          ...safeOverride,
          prescription: { ...state.plan.prescription, ...(safeOverride.prescription as Record<string, unknown> || {}) },
          lastSession: { ...state.plan.lastSession, ...(safeOverride.lastSession as Record<string, unknown> || {}) },
          recovery: { ...state.plan.recovery, ...(safeOverride.recovery as Record<string, unknown> || {}) },
        },
      };
    }
    if (body.scenario === "reconciliation") {
      const state = await getReconciliationState();
      const eventId = String(outgoingPayload.eventId || "");
      const event = state.events.find((item) => item.id === eventId);
      if (!event) return NextResponse.json({ ok: false, message: "The selected wearable event is unavailable." }, { status: 400 });
      outgoingPayload = { event, appointments: state.appointments, workouts: state.workouts };
    }

    const webhookUrl = body.scenario === "continuity"
      ? process.env.N8N_ACTIVEFLOW_CONTINUITY_URL || DEFAULT_CONTINUITY_WEBHOOK_URL
      : body.scenario === "adaptation"
        ? process.env.N8N_ACTIVEFLOW_PROGRESSION_URL || DEFAULT_PROGRESSION_WEBHOOK_URL
        : body.scenario === "reconciliation"
          ? process.env.N8N_ACTIVEFLOW_RECONCILIATION_URL || DEFAULT_RECONCILIATION_WEBHOOK_URL
      : process.env.N8N_ACTIVEFLOW_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "ActiveFlow-Portfolio/1.0" },
        body: JSON.stringify({
          scenario: body.scenario,
          requestId: body.requestId,
          approvalDecision: body.approvalDecision || "approve",
          payload: outgoingPayload,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : { ok: false, message: await response.text() };

      if (!response.ok) {
        return NextResponse.json(
          { ok: false, message: "The n8n workflow is not active or returned an error.", details: result },
          { status: 502 },
        );
      }

      if (body.scenario === "continuity" && result && typeof result === "object") {
        const continuityResult = result as {
          correlationId?: string;
          requestId?: string;
          idempotencyKey?: string;
          audit?: { idempotencyKey?: string };
          proposal?: unknown;
        };
        if (continuityResult.correlationId && continuityResult.proposal) {
          await saveContinuityProposal({
            correlationId: continuityResult.correlationId,
            idempotencyKey: continuityResult.idempotencyKey || continuityResult.audit?.idempotencyKey || "generated-by-n8n",
            requestId: body.requestId || continuityResult.requestId || continuityResult.correlationId,
            proposal: continuityResult.proposal,
          });
        }
      }
      if (body.scenario === "adaptation" && result && typeof result === "object") {
        const progressionResult = result as {
          correlationId?: string;
          requestId?: string;
          idempotencyKey?: string;
          audit?: { idempotencyKey?: string };
          proposal?: unknown;
        };
        if (progressionResult.correlationId && progressionResult.proposal) {
          await saveProgressionProposal({
            correlationId: progressionResult.correlationId,
            idempotencyKey: progressionResult.idempotencyKey || progressionResult.audit?.idempotencyKey || "generated-by-n8n",
            requestId: body.requestId || progressionResult.requestId || progressionResult.correlationId,
            proposal: progressionResult.proposal,
          });
        }
      }
      if (body.scenario === "reconciliation" && result && typeof result === "object") {
        const reconciliationResult = result as { correlationId?: string; proposal?: { proposedAction?: { eventId?: string } } };
        const eventId = reconciliationResult.proposal?.proposedAction?.eventId;
        if (reconciliationResult.correlationId && reconciliationResult.proposal && eventId) await saveReconciliationProposal({ correlationId: reconciliationResult.correlationId, eventId, proposal: reconciliationResult.proposal });
      }

      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "The n8n workflow did not respond in time."
      : "ActiveFlow could not start the n8n workflow.";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
