"use client";

import { useCallback, useEffect, useState } from "react";

type Plan = { memberAlias: string; objective: string; weekNumber: number; currentVersion: number; prescription: { exercise: string; weightKg: number; reps: number; targetRpe: number; note: string }; lastSession: { weightKg: number; reps: number; rpe: number; completedAt: string }; recovery: { averageSleepHours: number; adherencePercent: number; fatigueScore: number } };
type State = { plan: Plan; audit: Array<{ id: string; eventType: string; correlationId: string }> };
type Proposal = { ok: boolean; correlationId: string; proposal: { explanation: string; businessRules: string[]; proposedAction: { action: "progress" | "hold" | "deload"; targetWeightKg: number; targetReps: number; targetRpe: number; expectedPlanVersion: number; prescription: Plan["prescription"] } } };

const cases = [
  { id: "deload", number: "01", title: "Recovery is low", short: "Reduce load and volume", detail: "Week four, RPE 9.5, average sleep 6h 18m and fatigue 8/10.", expected: "Deload", patch: { weekNumber: 4, lastSession: { weightKg: 82.5, reps: 12, rpe: 9.5, completedAt: "2026-07-30T08:00:00.000Z" }, recovery: { averageSleepHours: 6.3, adherencePercent: 76, fatigueScore: 8 } } },
  { id: "hold", number: "02", title: "Effort is too high", short: "Hold and reassess", detail: "Week two, RPE 9.7 and fatigue 8/10 despite acceptable sleep.", expected: "Hold", patch: { weekNumber: 2, lastSession: { weightKg: 82.5, reps: 12, rpe: 9.7, completedAt: "2026-07-30T08:00:00.000Z" }, recovery: { averageSleepHours: 7.1, adherencePercent: 88, fatigueScore: 8 } } },
  { id: "progress", number: "03", title: "Recovery is good", short: "Progress conservatively", detail: "Week one, RPE 7.5, eight hours of sleep and fatigue 3/10.", expected: "Progress", patch: { weekNumber: 1, lastSession: { weightKg: 82.5, reps: 12, rpe: 7.5, completedAt: "2026-07-30T08:00:00.000Z" }, recovery: { averageSleepHours: 8, adherencePercent: 94, fatigueScore: 3 } } },
] as const;

export default function ProgressionLab() {
  const [state, setState] = useState<State | null>(null);
  const [caseId, setCaseId] = useState<(typeof cases)[number]["id"]>("deload");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "running" | "review" | "committing" | "completed" | "error">("loading");
  const [error, setError] = useState("");
  const selectedCase = cases.find((item) => item.id === caseId) ?? cases[0];
  const display = state?.plan ? { ...state.plan, ...selectedCase.patch } : null;

  const load = useCallback(async () => { const response = await fetch("/api/activeflow/progression/state", { cache: "no-store" }); if (!response.ok) throw new Error("The plan could not be loaded."); const next = await response.json() as State; setState(next); return next; }, []);
  useEffect(() => { load().then(() => setPhase("ready")).catch(() => setPhase("error")); }, [load]);
  const choose = (next: (typeof cases)[number]["id"]) => { setCaseId(next); setProposal(null); setError(""); setPhase("ready"); };

  const run = async () => {
    setPhase("running"); setProposal(null); setError("");
    try {
      const response = await fetch("/api/activeflow/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: "adaptation", requestId: `progression-${Date.now()}`, approvalDecision: "pending", payload: { planOverride: selectedCase.patch } }) });
      const result = await response.json() as Proposal & { message?: string; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || "The policy could not create a proposal.");
      setProposal(result); setPhase("review"); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The workflow could not be reached."); setPhase("error"); }
  };

  const decide = async (decision: "approve" | "reject") => {
    if (!proposal) return;
    setPhase("committing");
    const response = await fetch("/api/activeflow/progression/decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correlationId: proposal.correlationId, decision }) });
    const result = await response.json() as { error?: string; state?: State };
    if (!response.ok) { setError(result.error || "The decision could not be saved."); setPhase("error"); return; }
    if (result.state) setState(result.state); else await load();
    setPhase("completed");
  };

  const reset = async () => { setPhase("loading"); setProposal(null); setError(""); const response = await fetch("/api/activeflow/progression/reset", { method: "POST" }); if (response.ok) setState(await response.json() as State); setCaseId("deload"); setPhase("ready"); };
  const action = proposal?.proposal.proposedAction;

  return <section className="story-demo story-progression">
    <div className="story-demo-title"><div><span>LIVE DEMO 02</span><h2>Adapt the next session</h2><p>Watch signals become an explainable proposal—not an automatic decision.</p></div><div className={`story-live ${phase}`}><i />{phase === "ready" ? "Ready to try" : phase}</div></div>
    <div className="story-progress"><div className="active"><b>1</b><span>Choose signals</span></div><i>→</i><div className={phase !== "ready" && phase !== "loading" ? "active" : ""}><b>2</b><span>Apply the policy</span></div><i>→</i><div className={proposal ? "active" : ""}><b>3</b><span>Review the plan</span></div><i>→</i><div className={phase === "completed" ? "active" : ""}><b>4</b><span>Publish a version</span></div></div>
    <div className="story-question"><span>START HERE</span><h3>What signal pattern should ActiveFlow interpret?</h3><p>Each case produces a different, explainable decision.</p></div>
    <div className="story-case-grid">{cases.map((item) => <button key={item.id} onClick={() => choose(item.id)} className={item.id === caseId ? "selected" : ""}><span>{item.number}</span><h4>{item.title}</h4><p>{item.short}</p><small>{item.id === caseId ? "Selected ✓" : "Choose case"}</small></button>)}</div>

    {display && <div className="story-stage">
      <div className="story-problem"><span>SIGNALS RECEIVED</span><h3>{selectedCase.title}</h3><p>{selectedCase.detail}</p><div className="signal-story"><div><b>{display.lastSession.rpe}</b><small>last RPE</small></div><div><b>{display.recovery.averageSleepHours}h</b><small>sleep</small></div><div><b>{display.recovery.fatigueScore}/10</b><small>fatigue</small></div></div></div>
      <div className="story-arrow">→</div>
      <div className="story-solution"><span>POLICY WILL CHECK</span><h3>Progress, hold or deload?</h3><ul><li>Training-block week</li><li>Effort and recovery thresholds</li><li>Current plan version</li></ul><p><b>Expected:</b> {selectedCase.expected}</p></div>
    </div>}
    <button className="story-primary blue" onClick={run} disabled={phase === "loading" || phase === "running" || phase === "committing"}>{phase === "running" ? "ActiveFlow is interpreting the signals…" : "Run this case"}<span>→</span></button>
    {error && <div className="story-outcome error"><div>!</div><span><b>Unexpected problem</b><p>{error}</p></span><button onClick={reset}>Reset demo</button></div>}

    {proposal && action && <div className="story-decision blue">
      <div className="decision-main"><span>ACTIVEFLOW RECOMMENDS</span><h3>{action.action === "deload" ? "Schedule a deload" : action.action === "hold" ? "Hold the prescription" : "Progress the next session"}</h3><p>{proposal.proposal.explanation}</p><div className="decision-tags">{proposal.proposal.businessRules.slice(0, 4).map((rule) => <i key={rule}>✓ {rule}</i>)}</div></div>
      <div className="plan-compare"><span>CURRENT → PROPOSED</span><div><b>{display?.prescription.weightKg} kg × {display?.prescription.reps}</b><i>→</i><strong>{action.targetWeightKg} kg × {action.targetReps}</strong></div><small>Target RPE {action.targetRpe} · version {action.expectedPlanVersion + 1}</small></div>
      <div className="decision-actions">{phase === "completed" ? <div className="approved-result">✓ Version published<br /><small>The previous plan remains traceable.</small></div> : <><button onClick={() => decide("reject")}>Reject</button><button className="approve blue" onClick={() => decide("approve")}>{phase === "committing" ? "Publishing…" : "Approve version"}</button></>}</div>
    </div>}

    <details className="story-proof"><summary>See plan versions and audit proof <span>＋</span></summary><div className="proof-plan"><b>Current version {state?.plan.currentVersion}</b><span>{state?.plan.prescription.weightKg} kg × {state?.plan.prescription.reps} · target RPE {state?.plan.prescription.targetRpe}</span></div><div className="story-audit">{state?.audit.length ? state.audit.map((event) => <span key={event.id}>✓ {event.eventType.replaceAll("_", " ")}</span>) : <span>No plan events yet.</span>}</div></details>
  </section>;
}
