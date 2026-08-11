"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Professional = {
  id: string;
  name: string;
  role: string;
  skills: string[];
  availability: string[];
  priority: number;
  active: boolean;
};

type ServiceSession = {
  id: string;
  memberAlias: string;
  professionalId: string;
  startsAt: string;
  slot: string;
  serviceType: string;
  status: string;
  version: number;
};

type AuditEvent = {
  id: string;
  correlationId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type ContinuityState = {
  professionals: Professional[];
  sessions: ServiceSession[];
  audit: AuditEvent[];
};

type SessionUpdate = {
  sessionId: string;
  memberAlias: string;
  fromProfessionalId: string;
  toProfessionalId: string;
  expectedVersion: number;
};

type ProposalResult = {
  ok: boolean;
  status: string;
  correlationId: string;
  idempotencyKey?: string;
  message: string;
  proposal: {
    outcome: string;
    explanation: string;
    proposedAction: {
      selectedCandidate: string;
      fallbackCandidate?: string;
      sessionUpdates: SessionUpdate[];
      scorecard?: Array<{ professionalId: string; score: number; reasons: string[] }>;
    };
    businessRules: string[];
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

export default function ContinuityLab() {
  const [state, setState] = useState<ContinuityState | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState("pro-alex");
  const [proposal, setProposal] = useState<ProposalResult | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "running" | "review" | "committing" | "completed" | "error">("loading");
  const [error, setError] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);

  const loadState = useCallback(async () => {
    const response = await fetch("/api/activeflow/continuity/state", { cache: "no-store" });
    if (!response.ok) throw new Error("The synthetic operations database is unavailable.");
    const next = await response.json() as ContinuityState;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    loadState().then(() => setPhase("ready")).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Unable to load the sandbox.");
      setPhase("error");
    });
  }, [loadState]);

  const professionalById = useMemo(
    () => new Map((state?.professionals ?? []).map((professional) => [professional.id, professional])),
    [state],
  );
  const affectedSessions = useMemo(
    () => (state?.sessions ?? []).filter((session) => session.professionalId === selectedProfessional && session.status === "scheduled"),
    [selectedProfessional, state],
  );

  const runContinuity = async () => {
    setPhase("running");
    setError("");
    setProposal(null);
    try {
      const response = await fetch("/api/activeflow/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "continuity",
          requestId: `continuity-${Date.now()}`,
          approvalDecision: "pending",
          payload: { unavailableProfessionalId: selectedProfessional, simulateFailure },
        }),
      });
      const result = await response.json() as ProposalResult & { error?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || "n8n could not create a proposal.");
      setProposal(result);
      setPhase("review");
      await loadState();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The orchestration failed.");
      setPhase("error");
    }
  };

  const decide = async (decision: "approve" | "reject") => {
    if (!proposal) return;
    setPhase("committing");
    setError("");
    try {
      const response = await fetch("/api/activeflow/continuity/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correlationId: proposal.correlationId, decision }),
      });
      const result = await response.json() as { error?: string; state?: ContinuityState };
      if (!response.ok) throw new Error(result.error || "The decision could not be committed.");
      if (result.state) setState(result.state);
      else await loadState();
      setPhase("completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The decision could not be applied.");
      setPhase("error");
    }
  };

  const resetSandbox = async () => {
    setPhase("loading");
    setProposal(null);
    setError("");
    try {
      const response = await fetch("/api/activeflow/continuity/reset", { method: "POST" });
      if (!response.ok) throw new Error("Sandbox reset failed.");
      setState(await response.json() as ContinuityState);
      setSelectedProfessional("pro-alex");
      setPhase("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sandbox reset failed.");
      setPhase("error");
    }
  };

  const selectedCandidate = proposal ? professionalById.get(proposal.proposal.proposedAction.selectedCandidate) : null;

  return (
    <section className="continuity-lab" id="continuity-lab">
      <div className="lab-heading">
        <div><p className="kicker">LIVE RECRUITER WALKTHROUGH</p><h3>Keep the member journey running</h3><p>Simulate a trainer absence, review the recommendation and decide whether to apply it.</p></div>
        <div className={`lab-phase ${phase}`}><i />{phase.replace("committing", "applying decision")}</div>
      </div>

      <div className="demo-brief">
        <div><span>THE SITUATION</span><p>Alex cannot deliver three upcoming sessions. Cancelling them would interrupt the members&apos; programme and create manual work for operations.</p></div>
        <div><span>YOUR ROLE</span><p>You are the operations coordinator. Ask n8n for the safest qualified replacement, inspect why it was selected, then approve or reject the change.</p></div>
      </div>

      <div className="walkthrough-steps" aria-label="Demo progress">
        <div className={proposal ? "done" : phase === "ready" ? "current" : ""}><span>1</span><p><b>Report the absence</b><small>Choose the unavailable trainer</small></p></div>
        <i>→</i>
        <div className={proposal ? "done" : phase === "running" ? "current" : ""}><span>2</span><p><b>Let n8n compare options</b><small>Rules, availability and workload</small></p></div>
        <i>→</i>
        <div className={phase === "completed" ? "done" : phase === "review" ? "current" : ""}><span>3</span><p><b>Review the proposal</b><small>The database is still unchanged</small></p></div>
        <i>→</i>
        <div className={phase === "completed" ? "done" : phase === "committing" ? "current" : ""}><span>4</span><p><b>Approve the change</b><small>Commit records and write the audit</small></p></div>
      </div>

      <div className="lab-control-grid">
        <div className="incident-panel">
          <span className="lab-label">STEP 1 / REPORT THE PROBLEM</span>
          <label htmlFor="unavailable-professional">Who became unavailable?</label>
          <select id="unavailable-professional" value={selectedProfessional} onChange={(event) => { setSelectedProfessional(event.target.value); setProposal(null); setPhase("ready"); }}>
            {(state?.professionals ?? []).filter((professional) => professional.role === "trainer").map((professional) => (
              <option value={professional.id} key={professional.id}>{professional.name} · {professional.skills.join(" / ")}</option>
            ))}
          </select>
          <div className="incident-stats"><span><b>{affectedSessions.length}</b> sessions need cover</span><span><b>{state?.professionals.filter((item) => item.role === "trainer" && item.id !== selectedProfessional).length ?? 0}</b> possible substitutes</span></div>
          <label className="failure-toggle"><input type="checkbox" checked={simulateFailure} onChange={(event) => setSimulateFailure(event.target.checked)} /><span>Technical test: simulate a dependency failure</span></label>
          <button className="lab-run" onClick={runContinuity} disabled={phase === "loading" || phase === "running" || phase === "committing" || !affectedSessions.length}>{phase === "running" ? "n8n is comparing the team…" : "Find the safest replacement"}</button>
          <button className="lab-reset" onClick={resetSandbox} disabled={phase === "loading" || phase === "committing"}>Start the demo again</button>
        </div>

        <div className="sessions-panel">
          <div className="panel-head"><span className="lab-label">SESSIONS BEFORE THE DECISION</span><small>Highlighted rows need a replacement</small></div>
          <div className="session-table">
            <div className="session-row session-head"><span>MEMBER / SERVICE</span><span>CURRENT TRAINER</span><span>WHEN</span><span>RECORD</span></div>
            {(state?.sessions ?? []).map((session) => (
              <div className={`session-row ${session.professionalId === selectedProfessional ? "affected" : ""}`} key={session.id}>
                <span><b>{session.memberAlias}</b><small>{session.serviceType}</small></span>
                <span>{professionalById.get(session.professionalId)?.name ?? session.professionalId}</span>
                <span>{formatDate(session.startsAt)}</span>
                <span>v{session.version}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="lab-error"><b>Nothing was changed</b><span>{error}</span><small>The workflow stopped safely before touching the session records. Retry or restart the demo.</small></div>}

      {proposal && (
        <div className="review-panel">
          <div className="review-summary">
            <span className="lab-label">STEP 2 / N8N RECOMMENDATION</span>
            <h4>{selectedCandidate ? `${selectedCandidate.name} is the recommended replacement` : "Replacement proposal ready"}</h4>
            <p>{proposal.proposal.explanation}</p>
            <div className="rule-tags">{proposal.proposal.businessRules.map((rule) => <span key={rule}>{rule}</span>)}</div>
          </div>
          <div className="scorecards">
            {(proposal.proposal.proposedAction.scorecard ?? []).slice(0, 3).map((score) => (
              <div className={score.professionalId === proposal.proposal.proposedAction.selectedCandidate ? "score selected" : "score"} key={score.professionalId}>
                <div><b>{professionalById.get(score.professionalId)?.name ?? score.professionalId}</b><strong>{score.score}</strong></div>
                <p>{score.reasons.join(" · ")}</p>
              </div>
            ))}
          </div>
          <div className="approval-panel">
            <span className="lab-label">STEP 3 / YOUR DECISION</span>
            <p>{proposal.proposal.proposedAction.sessionUpdates.length} session changes are ready, but the current records are untouched until you approve.</p>
            {phase === "completed" ? <div className="decision-complete">✓ Approved: sessions updated and audit written</div> : <div className="approval-actions"><button onClick={() => decide("reject")} disabled={phase === "committing"}>Reject proposal</button><button className="approve" onClick={() => decide("approve")} disabled={phase === "committing"}>{phase === "committing" ? "Applying safely…" : "Approve and update sessions"}</button></div>}
            <code>{proposal.correlationId}</code>
          </div>
        </div>
      )}

      {phase === "completed" && proposal && (
        <div className="impact-strip">
          <div><b>{proposal.proposal.proposedAction.sessionUpdates.length}</b><span>member sessions preserved</span></div>
          <div><b>1</b><span>qualified replacement assigned</span></div>
          <div><b>0</b><span>manual database edits</span></div>
          <div><b>100%</b><span>changes traceable in the audit</span></div>
        </div>
      )}

      <div className="audit-panel">
        <div className="panel-head"><span className="lab-label">PROOF / AUDIT TRAIL</span><small>what happened and when</small></div>
        <div className="audit-list">
          {(state?.audit ?? []).length ? state?.audit.map((event) => (
            <div key={event.id}><i /><span><b>{event.eventType.replaceAll("_", " ")}</b><small>{event.correlationId}</small></span><time>{new Date(event.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time></div>
          )) : <p>No events yet. Run the demo to create the first trace.</p>}
        </div>
      </div>
    </section>
  );
}
