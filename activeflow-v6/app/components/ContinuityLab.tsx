"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Professional = { id: string; name: string; role: string; skills: string[] };
type ServiceSession = { id: string; memberAlias: string; professionalId: string; serviceType: string; version: number };
type ContinuityState = { professionals: Professional[]; sessions: ServiceSession[]; audit: Array<{ id: string; eventType: string; correlationId: string }> };
type ProposalResult = {
  ok: boolean;
  correlationId: string;
  proposal: {
    explanation: string;
    businessRules: string[];
    proposedAction: {
      selectedCandidate: string;
      sessionUpdates: Array<{ sessionId: string; toProfessionalId: string; expectedVersion: number }>;
      scorecard?: Array<{ professionalId: string; score: number; reasons: string[]; fullCoverage?: boolean }>;
    };
  };
};
type AIExplanationResult = {
  ok: boolean;
  aiAvailable: boolean;
  model: string;
  explanation: { executiveSummary: string; whyItIsSafe: string; recruiterTakeaway: string };
};

const cases = [
  { id: "coverage", number: "01", title: "Trainer unavailable", short: "Protect three upcoming sessions", detail: "Alex cannot deliver three scheduled sessions. ActiveFlow must find the safest qualified replacement.", professionalId: "pro-alex", failure: false, expected: "A qualified trainer is proposed for approval." },
  { id: "specialist", number: "02", title: "Specialist match", short: "Preserve the required expertise", detail: "Giulia is unavailable for a mobility session. The replacement must have the right skill and time slot.", professionalId: "pro-giulia", failure: false, expected: "Only an eligible mobility specialist is proposed." },
  { id: "failure", number: "03", title: "Dependency failure", short: "Prove that the system stops safely", detail: "A required external service fails during orchestration. ActiveFlow must stop before changing any record.", professionalId: "pro-alex", failure: true, expected: "Zero records change and the failure is made visible." },
] as const;

export default function ContinuityLab() {
  const [state, setState] = useState<ContinuityState | null>(null);
  const [caseId, setCaseId] = useState<(typeof cases)[number]["id"]>("coverage");
  const [proposal, setProposal] = useState<ProposalResult | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "running" | "review" | "committing" | "completed" | "safe" | "error">("loading");
  const [error, setError] = useState("");
  const [runStep, setRunStep] = useState(-1);
  const [aiExplanation, setAiExplanation] = useState<AIExplanationResult | null>(null);
  const [aiPhase, setAiPhase] = useState<"idle" | "loading" | "ready">("idle");

  const selectedCase = cases.find((item) => item.id === caseId) ?? cases[0];
  const professionals = useMemo(() => new Map((state?.professionals ?? []).map((item) => [item.id, item])), [state]);
  const affected = (state?.sessions ?? []).filter((item) => item.professionalId === selectedCase.professionalId);

  const load = useCallback(async () => {
    const response = await fetch("/api/activeflow/continuity/state", { cache: "no-store" });
    if (!response.ok) throw new Error("The demo data could not be loaded.");
    const next = await response.json() as ContinuityState;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    const startWithFreshContinuityCase = async () => {
      const current = await load();
      // A visitor may have approved a prior run. This portfolio sandbox always
      // starts with a meaningful interruption instead of an empty scenario.
      if (!current.sessions.some((session) => session.professionalId === "pro-alex")) {
        const response = await fetch("/api/activeflow/continuity/reset", { method: "POST" });
        if (!response.ok) throw new Error("The synthetic demo data could not be restored.");
        setState(await response.json() as ContinuityState);
      }
      setPhase("ready");
    };
    startWithFreshContinuityCase().catch(() => setPhase("error"));
  }, [load]);
  useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => setRunStep((value) => Math.min(4, value + 1)), 420);
    return () => window.clearInterval(timer);
  }, [phase]);

  const choose = (next: (typeof cases)[number]["id"]) => {
    setCaseId(next); setProposal(null); setAiExplanation(null); setAiPhase("idle"); setError(""); setRunStep(-1); setPhase("ready");
  };

  const explain = async (result: ProposalResult) => {
    setAiPhase("loading");
    try {
      const selectedId = result.proposal.proposedAction.selectedCandidate;
      const response = await fetch("/api/activeflow/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "continuity", selectedCandidateName: professionals.get(selectedId)?.name ?? selectedId, proposal: result.proposal }),
      });
      const narrative = await response.json() as AIExplanationResult;
      if (response.ok && narrative.ok) setAiExplanation(narrative);
    } finally {
      setAiPhase("ready");
    }
  };

  const run = async () => {
    setPhase("running"); setProposal(null); setError(""); setRunStep(0);
    try {
      const request = fetch("/api/activeflow/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "continuity", requestId: `continuity-${Date.now()}`, approvalDecision: "pending", payload: { unavailableProfessionalId: selectedCase.professionalId, simulateFailure: selectedCase.failure } }),
      });
      const [response] = await Promise.all([request, new Promise<void>((resolve) => window.setTimeout(resolve, 2200))]);
      const result = await response.json() as ProposalResult & { message?: string; error?: string };
      if (!response.ok || !result.ok) {
        if (selectedCase.failure) { setPhase("safe"); await load(); return; }
        throw new Error(result.message || result.error || "The workflow could not create a proposal.");
      }
      setProposal(result); setPhase("review"); void explain(result); await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The workflow could not be reached."); setPhase("error");
    }
  };

  const decide = async (decision: "approve" | "reject") => {
    if (!proposal) return;
    setPhase("committing");
    const response = await fetch("/api/activeflow/continuity/decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correlationId: proposal.correlationId, decision }) });
    const result = await response.json() as { error?: string; state?: ContinuityState };
    if (!response.ok) { setError(result.error || "The decision could not be saved."); setPhase("error"); return; }
    if (result.state) setState(result.state); else await load();
    setPhase("completed");
  };

  const reset = async () => {
    setPhase("loading"); setProposal(null); setAiExplanation(null); setAiPhase("idle"); setError(""); setRunStep(-1);
    const response = await fetch("/api/activeflow/continuity/reset", { method: "POST" });
    if (response.ok) setState(await response.json() as ContinuityState);
    setCaseId("coverage"); setPhase("ready");
  };

  const candidate = proposal ? professionals.get(proposal.proposal.proposedAction.selectedCandidate) : null;
  const ranking = proposal?.proposal.proposedAction.scorecard ?? [];
  const selectedScore = ranking.find((item) => item.professionalId === proposal?.proposal.proposedAction.selectedCandidate)?.score ?? 0;
  const executionSteps = selectedCase.failure
    ? ["Validate incident", "Contact dependency", "Detect controlled failure", "Cancel pending writes", "Return safety proof"]
      : ["Validate incident", "Load future sessions", "Evaluate eligibility", "Rank candidates", "Create approval gate"];
  const executionFinished = phase === "review" || phase === "completed" || phase === "safe";

  return <section className="story-demo story-continuity">
    <div className="story-demo-title"><div><span>LIVE DEMO 01</span><h2>Keep the service running</h2><p>See how ActiveFlow handles a real operational interruption.</p></div><div className={`story-live ${phase}`}><i />{phase === "ready" ? "Ready to try" : phase === "safe" ? "Safety confirmed" : phase}</div></div>

    <div className="story-progress"><div className="active"><b>1</b><span>Choose a problem</span></div><i>→</i><div className={phase !== "ready" && phase !== "loading" ? "active" : ""}><b>2</b><span>Run ActiveFlow</span></div><i>→</i><div className={proposal ? "active" : ""}><b>3</b><span>Review the decision</span></div><i>→</i><div className={phase === "completed" || phase === "safe" ? "active" : ""}><b>4</b><span>See the outcome</span></div></div>

    <div className="story-question"><span>START HERE</span><h3>What should ActiveFlow handle?</h3><p>Pick one situation. The demo changes its data and expected outcome.</p></div>
    <div className="story-case-grid">{cases.map((item) => <button key={item.id} onClick={() => choose(item.id)} className={item.id === caseId ? "selected" : ""}><span>{item.number}</span><h4>{item.title}</h4><p>{item.short}</p><small>{item.id === caseId ? "Selected ✓" : "Choose case"}</small></button>)}</div>

    <div className="story-stage">
      <div className="story-problem"><span>THE PROBLEM</span><h3>{selectedCase.title}</h3><p>{selectedCase.detail}</p><div className="story-facts"><div><b>{affected.length}</b><small>records involved</small></div><div><b>{selectedCase.failure ? "1" : "3"}</b><small>{selectedCase.failure ? "failed dependency" : "eligible alternatives"}</small></div></div></div>
      <div className="story-arrow">→</div>
      <div className="story-solution"><span>WHAT ACTIVEFLOW WILL DO</span><h3>{selectedCase.failure ? "Stop before writing" : "Prepare a safe proposal"}</h3><ul>{selectedCase.failure ? <><li>Detect the failed dependency</li><li>Cancel every pending write</li><li>Return a visible, traceable stop</li></> : <><li>Load only affected future sessions</li><li>Compare skills, availability and role</li><li>Wait for human approval</li></>}</ul><p><b>Expected:</b> {selectedCase.expected}</p></div>
    </div>

    <button className="story-primary" onClick={run} disabled={phase === "loading" || phase === "running" || phase === "committing"}>{phase === "running" ? "ActiveFlow is evaluating the case…" : selectedCase.failure ? "Run the safe-stop test" : "Run this case"}<span>→</span></button>

    {runStep >= 0 && <div className="live-execution"><div className="execution-head"><span>LIVE EXECUTION</span><b>{phase === "running" ? "n8n is working through the decision" : phase === "safe" ? "Stopped safely" : phase === "error" ? "Execution failed" : "Proposal ready"}</b><small>{Math.min(runStep + 1, executionSteps.length)} / {executionSteps.length}</small></div><div className="execution-track">{executionSteps.map((step, index) => <div key={step} className={index < runStep || executionFinished ? "passed" : index === runStep ? "current" : ""}><i>{index < runStep || executionFinished ? "✓" : index + 1}</i><span>{step}</span></div>)}</div></div>}

    {phase === "safe" && <div className="story-outcome safe"><div>✓</div><span><b>Safety test passed</b><p>The dependency failed as planned. ActiveFlow stopped before writing: <strong>0 records changed.</strong></p></span><button onClick={reset}>Try another case</button></div>}
    {error && <div className="story-outcome error"><div>!</div><span><b>Unexpected problem</b><p>{error}</p></span><button onClick={reset}>Reset demo</button></div>}

    {proposal && <div className="story-decision">
      <div className="decision-main"><span>ACTIVEFLOW RECOMMENDS</span><h3>{candidate?.name ?? "A qualified replacement"}</h3><p>{proposal.proposal.explanation}</p><div className="decision-tags">{proposal.proposal.businessRules.slice(0, 4).map((rule) => <i key={rule}>✓ {rule}</i>)}</div></div>
      <div className="decision-change"><span>PROPOSED CHANGE</span><b>{proposal.proposal.proposedAction.sessionUpdates.length}</b><p>sessions reassigned</p><small>Nothing has changed yet.</small></div>
      <div className="decision-actions">{phase === "completed" ? <div className="approved-result">✓ Approved<br /><small>Records updated and audit written.</small></div> : <><button onClick={() => decide("reject")}>Reject</button><button className="approve" onClick={() => decide("approve")}>{phase === "committing" ? "Applying…" : "Approve change"}</button></>}</div>
    </div>}

    {proposal && <div className={`ai-explanation ${aiPhase}`}>
      <div className="ai-explanation-head"><span><i>✦</i> GEMINI EXPLANATION LAYER</span><b>{aiPhase === "loading" ? "Translating the decision…" : aiExplanation?.aiAvailable ? "Live AI explanation" : "Safe fallback explanation"}</b><small>AI explains · deterministic n8n logic decides</small></div>
      {aiPhase === "loading" ? <div className="ai-thinking"><i /><i /><i /><p>Gemini is turning the operational scorecard into a clear business explanation.</p></div> : aiExplanation && <div className="ai-explanation-grid"><article><span>WHAT HAPPENED</span><p>{aiExplanation.explanation.executiveSummary}</p></article><article><span>WHY IT IS SAFE</span><p>{aiExplanation.explanation.whyItIsSafe}</p></article><article><span>WHAT THIS PROVES</span><p>{aiExplanation.explanation.recruiterTakeaway}</p></article></div>}
    </div>}

    {proposal && <div className="decision-intelligence">
      <div className="candidate-ranking"><div className="intelligence-title"><span>DECISION INTELLIGENCE</span><h3>Why this candidate wins</h3><p>Every alternative is scored with the same transparent policy.</p></div><div className="ranking-list">{ranking.map((item, index) => <div key={item.professionalId} className={item.professionalId === proposal.proposal.proposedAction.selectedCandidate ? "winner" : ""}><span className="rank-number">0{index + 1}</span><div className="rank-person"><b>{professionals.get(item.professionalId)?.name ?? item.professionalId}</b><small>{item.reasons.join(" · ")}</small><div><i style={{ width: `${item.score}%` }} /></div></div><strong>{item.score}</strong></div>)}</div></div>
      <div className="impact-simulation"><div className="intelligence-title"><span>BEFORE YOU APPROVE</span><h3>Simulated business impact</h3><p>ActiveFlow previews the consequences without changing live records.</p></div><div className="impact-grid"><div><b>{proposal.proposal.proposedAction.sessionUpdates.length}</b><span>sessions protected</span></div><div><b>{selectedScore}%</b><span>match confidence</span></div><div><b>{ranking.length}</b><span>candidates compared</span></div><div><b>0</b><span>writes before approval</span></div></div><div className="impact-verdict"><i>✓</i><p><b>Low-risk change set</b><span>Future sessions only · version checked · rollback-safe</span></p></div></div>
    </div>}

    <details className="story-proof"><summary>See the records and audit proof <span>＋</span></summary><div className="story-records">{(state?.sessions ?? []).map((session) => <div key={session.id}><b>{session.memberAlias}</b><span>{session.serviceType}</span><small>{professionals.get(session.professionalId)?.name} · v{session.version}</small></div>)}</div><div className="story-audit">{state?.audit.length ? state.audit.map((event) => <span key={event.id}>✓ {event.eventType.replaceAll("_", " ")}</span>) : <span>No audit events yet.</span>}</div></details>
  </section>;
}
