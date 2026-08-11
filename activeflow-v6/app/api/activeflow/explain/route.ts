import { NextResponse } from "next/server";

const DEFAULT_AI_WEBHOOK_URL = "https://satyale.app.n8n.cloud/webhook/activeflow-ai-explanation-v1";

type ScoreItem = { professionalId?: unknown; score?: unknown; reasons?: unknown };
type ProposedAction = { selectedCandidate?: unknown; sessionUpdates?: unknown; scorecard?: unknown };
type Proposal = { explanation?: unknown; businessRules?: unknown; proposedAction?: ProposedAction };

function fallback(explanation: string) {
  return {
    ok: true,
    aiAvailable: false,
    model: "deterministic-fallback",
    explanation: {
      executiveSummary: explanation,
      whyItIsSafe: "The proposal is version-checked and blocked until a human approves it.",
      recruiterTakeaway: "ActiveFlow combines explainable automation, safe orchestration and human control.",
    },
    guardrails: ["AI explains but does not decide", "human approval remains mandatory"],
  };
}

export async function POST(request: Request) {
  let deterministicExplanation = "The deterministic policy created a proposal for human review.";

  try {
    const body = await request.json() as { scenario?: unknown; selectedCandidateName?: unknown; proposal?: Proposal };
    const proposal = body.proposal;
    if (!proposal || typeof proposal !== "object") {
      return NextResponse.json({ ok: false, message: "A valid proposal is required." }, { status: 400 });
    }

    deterministicExplanation = String(proposal.explanation || deterministicExplanation).slice(0, 800);
    const action = proposal.proposedAction && typeof proposal.proposedAction === "object" ? proposal.proposedAction : {};
    const sessionUpdates = Array.isArray(action.sessionUpdates)
      ? action.sessionUpdates.slice(0, 10).map((item) => ({ sessionId: String((item as { sessionId?: unknown }).sessionId || "").slice(0, 50) }))
      : [];
    const scorecard = Array.isArray(action.scorecard)
      ? action.scorecard.slice(0, 5).map((raw) => {
          const item = raw as ScoreItem;
          return {
            professionalId: String(item.professionalId || "").slice(0, 50),
            score: Number(item.score || 0),
            reasons: Array.isArray(item.reasons) ? item.reasons.slice(0, 4).map((reason) => String(reason).slice(0, 100)) : [],
          };
        })
      : [];

    const safePayload = {
      scenario: body.scenario === "adaptation" ? "adaptation" : "continuity",
      selectedCandidateName: String(body.selectedCandidateName || action.selectedCandidate || "recommended option").slice(0, 80),
      proposal: {
        explanation: deterministicExplanation,
        businessRules: Array.isArray(proposal.businessRules) ? proposal.businessRules.slice(0, 6).map((rule) => String(rule).slice(0, 100)) : [],
        proposedAction: {
          selectedCandidate: String(action.selectedCandidate || "").slice(0, 50),
          sessionUpdates,
          scorecard,
        },
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 16_000);
    try {
      const response = await fetch(process.env.N8N_ACTIVEFLOW_AI_URL || DEFAULT_AI_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "ActiveFlow-Portfolio/1.0" },
        body: JSON.stringify(safePayload),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) return NextResponse.json(fallback(deterministicExplanation));
      const result = await response.json();
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return NextResponse.json(fallback(deterministicExplanation));
  }
}
