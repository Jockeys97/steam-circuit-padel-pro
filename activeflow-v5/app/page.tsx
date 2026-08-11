"use client";

import { useEffect, useMemo, useState } from "react";
import ContinuityLab from "./components/ContinuityLab";

type Step = {
  id: string;
  kind: "trigger" | "api" | "transform" | "rule" | "human" | "workflow" | "output";
  title: string;
  tool: string;
  description: string;
  input: string;
  output: string;
};

type Scenario = {
  id: string;
  number: string;
  name: string;
  subtitle: string;
  outcome: string;
  learned: string[];
  mappings: { source: string; canonical: string; destination: string; rule: string }[];
  steps: Step[];
};

type LiveExecutionResult = {
  ok: boolean;
  status: string;
  correlationId: string;
  message: string;
};

const scenarios: Scenario[] = [
  {
    id: "onboarding",
    number: "01",
    name: "Member onboarding",
    subtitle: "From first form to an activated service team",
    outcome: "A validated member profile, assigned professionals, enabled access and a traceable welcome flow.",
    learned: ["REST APIs", "n8n", "Data mapping", "Approvals", "Idempotency"],
    mappings: [
      { source: "form.email", canonical: "member.contact.email", destination: "crm.primaryEmail", rule: "normalize + validate" },
      { source: "form.goal", canonical: "member.goal.type", destination: "profile.objective", rule: "enum mapping" },
      { source: "form.availability[]", canonical: "service.timeWindows[]", destination: "booking.preferences[]", rule: "timezone safe" },
      { source: "consent.marketing", canonical: "consent.channels.marketing", destination: "crm.optIn", rule: "explicit only" },
    ],
    steps: [
      { id: "intake", kind: "trigger", title: "Profile intake", tool: "Webhook", description: "Receives a new profile from the customer experience layer and assigns a correlation ID.", input: "form_submission", output: "raw_member_payload" },
      { id: "validate", kind: "api", title: "Validate contract", tool: "JSON Schema", description: "Rejects incomplete requests before they can create inconsistent records downstream.", input: "raw_member_payload", output: "validated_payload" },
      { id: "map", kind: "transform", title: "Canonical mapper", tool: "TypeScript", description: "Translates product-specific fields into a stable, system-independent member model.", input: "validated_payload", output: "canonical_member" },
      { id: "match", kind: "rule", title: "Team matcher", tool: "Rules engine", description: "Matches objective, location, availability and service constraints to eligible professionals.", input: "canonical_member", output: "team_proposal" },
      { id: "approval", kind: "human", title: "Ops approval", tool: "Human gate", description: "A specialist reviews the proposed team before any customer-facing assignment is confirmed.", input: "team_proposal", output: "approved_assignment" },
      { id: "activate", kind: "workflow", title: "Activate services", tool: "n8n", description: "Creates linked records, enables access and coordinates the welcome sequence through reusable subflows.", input: "approved_assignment", output: "activation_receipts" },
      { id: "deliver", kind: "output", title: "Sync destinations", tool: "REST + Webhooks", description: "Updates operations CRM, booking and the member portal, then records every acknowledgement.", input: "activation_receipts", output: "onboarding_completed" },
    ],
  },
  {
    id: "continuity",
    number: "02",
    name: "Service continuity",
    subtitle: "Replace an unavailable trainer without breaking the journey",
    outcome: "Future sessions are safely reassigned, calendars stay aligned and the member receives one coherent update.",
    learned: ["Business rules", "Role logic", "Calendar sync", "Fallbacks", "Notifications"],
    mappings: [
      { source: "absence.specialistId", canonical: "assignment.currentOwnerId", destination: "schedule.ownerId", rule: "active phase only" },
      { source: "team.backups[]", canonical: "assignment.candidates[]", destination: "matcher.pool[]", rule: "ordered priority" },
      { source: "session.startAt", canonical: "schedule.slot.start", destination: "calendar.start.dateTime", rule: "Europe/Rome" },
      { source: "replacement.reason", canonical: "audit.changeReason", destination: "history.note", rule: "no health data" },
    ],
    steps: [
      { id: "change", kind: "trigger", title: "Availability change", tool: "Webhook", description: "Receives a verified unavailability event scoped to a professional and a time window.", input: "availability_event", output: "affected_window" },
      { id: "sessions", kind: "api", title: "Load affected sessions", tool: "REST API", description: "Retrieves only future appointments inside the affected service phase.", input: "affected_window", output: "session_set" },
      { id: "eligibility", kind: "rule", title: "Eligibility rules", tool: "Policy engine", description: "Filters replacements by role, assignment priority, skills and actual availability.", input: "session_set", output: "eligible_candidates" },
      { id: "fallback", kind: "transform", title: "Fallback planner", tool: "TypeScript", description: "Builds the smallest safe change set and prevents duplicate or retroactive reassignment.", input: "eligible_candidates", output: "replacement_plan" },
      { id: "confirm", kind: "human", title: "Coordinator check", tool: "Human gate", description: "Operations confirms the proposal when more than one valid option exists.", input: "replacement_plan", output: "confirmed_plan" },
      { id: "calendar", kind: "workflow", title: "Calendar transaction", tool: "n8n", description: "Updates linked appointments and rolls back the batch if a required destination fails.", input: "confirmed_plan", output: "calendar_receipts" },
      { id: "notify", kind: "output", title: "Notify once", tool: "Channel adapter", description: "Delivers one clear update after all systems agree on the new assignment.", input: "calendar_receipts", output: "continuity_completed" },
    ],
  },
  {
    id: "adaptation",
    number: "03",
    name: "Program adaptation",
    subtitle: "Turn new wellbeing signals into a reviewed plan update",
    outcome: "Deterministic rules and AI assistance produce a safe proposal that remains under specialist control.",
    learned: ["Health signals", "Deterministic logic", "LLM guardrails", "Versioning", "Human-in-the-loop"],
    mappings: [
      { source: "health.sleep.duration", canonical: "recovery.sleepMinutes", destination: "assessment.sleepScore", rule: "minimum sample" },
      { source: "workout.rpe", canonical: "training.effort.rpe", destination: "progression.lastRpe", rule: "range 1–10" },
      { source: "workout.sets[]", canonical: "training.performance[]", destination: "progression.history[]", rule: "last 3 sessions" },
      { source: "plan.version", canonical: "program.currentVersion", destination: "release.parentVersion", rule: "optimistic lock" },
    ],
    steps: [
      { id: "signals", kind: "trigger", title: "Collect signals", tool: "API adapters", description: "Combines recent training, recovery and adherence signals without exposing unnecessary personal data.", input: "source_signals", output: "signal_bundle" },
      { id: "normalise", kind: "transform", title: "Normalize units", tool: "TypeScript", description: "Aligns units, dates and source quality before any decision logic is applied.", input: "signal_bundle", output: "normalized_signals" },
      { id: "progression", kind: "rule", title: "Progression engine", tool: "Deterministic JS", description: "Applies explicit progression, hold and deload rules that remain explainable and testable.", input: "normalized_signals", output: "rule_result" },
      { id: "draft", kind: "api", title: "AI explanation", tool: "LLM API", description: "Turns the deterministic result into a readable proposal; it cannot change protected values.", input: "rule_result", output: "draft_explanation" },
      { id: "review", kind: "human", title: "Specialist review", tool: "Approval gate", description: "A qualified professional accepts, edits or rejects the proposed change.", input: "draft_explanation", output: "approved_program" },
      { id: "version", kind: "workflow", title: "Version & publish", tool: "n8n", description: "Creates a new immutable version, preserves the previous plan and schedules delivery.", input: "approved_program", output: "published_version" },
      { id: "member", kind: "output", title: "Deliver to member", tool: "App API", description: "Refreshes the customer experience and returns a signed delivery acknowledgement.", input: "published_version", output: "adaptation_completed" },
    ],
  },
];

const kindLabel: Record<Step["kind"], string> = {
  trigger: "TRIGGER", api: "API", transform: "TRANSFORM", rule: "RULE", human: "APPROVAL", workflow: "WORKFLOW", output: "OUTPUT",
};

export default function Home() {
  const [scenarioId, setScenarioId] = useState("continuity");
  const [selectedStepId, setSelectedStepId] = useState("eligibility");
  const [runStep, setRunStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const [calling, setCalling] = useState(false);
  const [liveResult, setLiveResult] = useState<LiveExecutionResult | null>(null);
  const [executionError, setExecutionError] = useState("");
  const [activePanel, setActivePanel] = useState<"mapping" | "contract">("mapping");

  const scenario = useMemo(() => scenarios.find((item) => item.id === scenarioId) ?? scenarios[0], [scenarioId]);
  const selectedStep = useMemo(() => scenario.steps.find((step) => step.id === selectedStepId) ?? scenario.steps[0], [scenario, selectedStepId]);

  useEffect(() => {
    if (!running) return;
    if (runStep >= scenario.steps.length - 1) {
      setRunning(false);
      return;
    }
    const timer = window.setTimeout(() => setRunStep((value) => value + 1), 520);
    return () => window.clearTimeout(timer);
  }, [running, runStep, scenario.steps.length]);

  const chooseScenario = (id: string) => {
    const next = scenarios.find((item) => item.id === id) ?? scenarios[0];
    setScenarioId(id);
    setSelectedStepId(next.steps[0].id);
    setRunStep(-1);
    setRunning(false);
    setCalling(false);
    setLiveResult(null);
    setExecutionError("");
  };

  const runScenario = async () => {
    setRunStep(-1);
    setRunning(false);
    setCalling(true);
    setLiveResult(null);
    setExecutionError("");

    const payloadByScenario: Record<string, Record<string, unknown>> = {
      onboarding: { goal: "wellbeing", availability: ["weekday-evening"], locationZone: "remote" },
      continuity: { role: "trainer", affectedSessions: 3 },
      adaptation: { sleepMinutes: 390, rpe: 8, adherence: 72 },
    };

    try {
      const response = await fetch("/api/activeflow/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: scenario.id,
          requestId: `site-${scenario.id}-${Date.now()}`,
          approvalDecision: "approve",
          payload: payloadByScenario[scenario.id],
        }),
      });
      const result = await response.json() as LiveExecutionResult & { error?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || "Workflow execution failed");
      setLiveResult(result);
      setCalling(false);
      setRunning(true);
      setRunStep(0);
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : "The live workflow could not be reached.");
      setCalling(false);
      setRunning(false);
    }
  };

  const resetScenario = () => {
    setRunStep(-1);
    setRunning(false);
    setCalling(false);
    setLiveResult(null);
    setExecutionError("");
  };

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <a className="brand" href="#top" aria-label="ActiveFlow home"><span>AF</span><div><b>ActiveFlow</b><small>Integration workbench</small></div></a>
        <div className="header-center"><span>PORTFOLIO CAPSTONE</span><p>A digital wellbeing service that keeps working when operations change</p></div>
        <div className="header-status"><i />n8n live orchestration</div>
      </header>

      <section className="recruiter-hero" id="top">
        <div className="hero-copy">
          <p className="kicker">THE 30-SECOND EXPLANATION</p>
          <h1>One service. Many moving parts.<br /><em>ActiveFlow keeps them aligned.</em></h1>
          <p>It is a portfolio-safe operations platform inspired by a year spent working across a mobile app, a management system, APIs and n8n. The live demo below solves one concrete problem: a trainer becomes unavailable, but the member must not lose their sessions.</p>
          <div className="hero-actions">
            <button onClick={() => document.getElementById("continuity-lab")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Try the live case <span>↓</span></button>
            <span>About 60 seconds · no login · synthetic data</span>
          </div>
        </div>
        <div className="hero-story" aria-label="ActiveFlow service continuity story">
          <div><span>1</span><p><b>A trainer is unavailable</b><small>Three future member sessions are at risk.</small></p></div>
          <i>→</i>
          <div><span>2</span><p><b>n8n evaluates the team</b><small>Availability, role, skills and workload are checked.</small></p></div>
          <i>→</i>
          <div><span>3</span><p><b>A human approves</b><small>No operational record changes automatically.</small></p></div>
          <i>→</i>
          <div className="story-result"><span>4</span><p><b>Service continues</b><small>Sessions are reassigned and every change is audited.</small></p></div>
        </div>
        <div className="hero-proof">
          <span><b>LIVE</b> n8n Cloud workflow</span>
          <span><b>PERSISTENT</b> versioned operations data</span>
          <span><b>SAFE</b> human approval gate</span>
          <span><b>ORIGINAL</b> synthetic portfolio implementation</span>
        </div>
      </section>

      <div className="project-frame">
        <aside className="scenario-rail">
          <div className="rail-intro"><p className="kicker">EXPLORE THE SYSTEM</p><h1>Three business<br />problems solved.</h1><span>Start with Service continuity for the complete live demo. The other scenarios show the wider platform vision.</span></div>
          <div className="scenario-list">
            {scenarios.map((item) => (
              <button key={item.id} className={item.id === scenarioId ? "scenario active" : "scenario"} onClick={() => chooseScenario(item.id)}>
                <span className="scenario-number">{item.number}</span><div><b>{item.name}</b><small>{item.subtitle}</small></div><span className="arrow">↗</span>
              </button>
            ))}
          </div>
          <div className="privacy-note"><b>Portfolio-safe by design</b><p>Synthetic identities, invented endpoints and original code. Only general architectural lessons are retained.</p></div>
        </aside>

        <section className="workbench">
          <div className="scenario-head">
            <div><p className="kicker">ACTIVE EXERCISE / {scenario.number}</p><h2>{scenario.name}</h2><p className="scenario-subtitle">{scenario.subtitle}</p></div>
            {scenario.id === "continuity" ? <div className="run-actions"><button className="run-button" onClick={() => document.getElementById("continuity-lab")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>↘</span>Open flagship lab</button></div> : <div className="run-actions"><button className="ghost" onClick={resetScenario}>Reset</button><button className="run-button" onClick={runScenario} disabled={calling || running}><span>{calling || running ? "●" : "▶"}</span>{calling ? "Calling n8n" : running ? "Rendering result" : "Run live scenario"}</button></div>}
          </div>

          <section className="outcome-strip"><span>WHY IT MATTERS</span><p>{executionError || scenario.outcome}</p><div className={scenario.id === "continuity" ? "result flagship" : executionError ? "result error" : runStep === scenario.steps.length - 1 ? "result complete" : "result"}>{scenario.id === "continuity" ? "◆ Live case study" : executionError ? "× n8n unavailable" : runStep === scenario.steps.length - 1 ? "✓ Live run completed" : calling ? "● Calling n8n" : running ? "● Rendering trace" : "○ Not executed"}</div></section>

          {scenario.id === "continuity" && <ContinuityLab />}

          <section className="canvas-card">
            <div className="section-title"><div><p className="kicker">ORCHESTRATION CANVAS</p><h3>Follow the data, not the screens</h3></div><div className="legend"><span><i className="automated" />Automated</span><span><i className="approval" />Human control</span></div></div>
            <div className="workflow-canvas">
              {scenario.steps.map((step, index) => {
                const state = index < runStep ? "done" : index === runStep ? "processing" : "idle";
                return <div className="node-wrap" key={step.id}>
                  <button className={`flow-node ${step.kind} ${selectedStepId === step.id ? "selected" : ""} ${state}`} onClick={() => setSelectedStepId(step.id)}>
                    <span className="node-kind">{kindLabel[step.kind]}</span><span className="node-icon">{["↘", "{}", "⇄", "◇", "✓", "↯", "↗"][index]}</span><b>{step.title}</b><small>{step.tool}</small><span className="node-state">{state === "done" ? "✓ passed" : state === "processing" ? "● running" : `0${index + 1}`}</span>
                  </button>
                  {index < scenario.steps.length - 1 && <div className={`wire ${index < runStep ? "active" : ""}`}><span>›</span></div>}
                </div>;
              })}
            </div>
            <div className="canvas-footer"><span>Correlation: <b>af_demo_{scenario.number}42</b></span><span>Contract: <b>v1.4</b></span><span>Mode: <b>dry-run</b></span><span>PII policy: <b>minimized</b></span></div>
          </section>

          <div className="work-grid">
            <section className="inspector-card">
              <div className="section-title compact"><div><p className="kicker">STEP INSPECTOR</p><h3>{selectedStep.title}</h3></div><span className={`type-badge ${selectedStep.kind}`}>{kindLabel[selectedStep.kind]}</span></div>
              <p className="step-description">{selectedStep.description}</p>
              <div className="io-flow"><div><span>INPUT</span><code>{selectedStep.input}</code></div><i>→</i><div><span>OUTPUT</span><code>{selectedStep.output}</code></div></div>
              <div className="guardrail-list">
                <div><span>01</span><p><b>Validate before acting</b><small>Malformed or incomplete payloads stop here.</small></p></div>
                <div><span>02</span><p><b>Replay without duplication</b><small>Every mutation uses a stable idempotency key.</small></p></div>
                <div><span>03</span><p><b>Keep a human accountable</b><small>Sensitive decisions cannot bypass approval.</small></p></div>
              </div>
            </section>

            <section className="mapping-card">
              <div className="mapping-tabs"><button className={activePanel === "mapping" ? "active" : ""} onClick={() => setActivePanel("mapping")}>Field mapping</button><button className={activePanel === "contract" ? "active" : ""} onClick={() => setActivePanel("contract")}>Data contract</button><span>{activePanel === "mapping" ? `${scenario.mappings.length} transformations` : "Schema valid"}</span></div>
              {activePanel === "mapping" ? <div className="mapping-table">
                <div className="mapping-row map-head"><span>SOURCE</span><span>CANONICAL MODEL</span><span>DESTINATION</span><span>RULE</span></div>
                {scenario.mappings.map((mapping) => <div className="mapping-row" key={mapping.canonical}><code>{mapping.source}</code><code>{mapping.canonical}</code><code>{mapping.destination}</code><span>{mapping.rule}</span></div>)}
              </div> : <div className="contract-view"><div className="code-lines"><span>01</span><code>{`{`}</code><span>02</span><code>  &quot;event&quot;: &quot;{scenario.id}.requested&quot;,</code><span>03</span><code>  &quot;version&quot;: &quot;1.4&quot;,</code><span>04</span><code>  &quot;correlationId&quot;: &quot;af_demo_0142&quot;,</code><span>05</span><code>  &quot;payload&quot;: {`{ /* minimized */ }`}</code><span>06</span><code>{`}`}</code></div><div className="contract-checks"><span>✓ required fields</span><span>✓ enum constraints</span><span>✓ no secrets</span><span>✓ versioned schema</span></div></div>}
            </section>
          </div>

          <section className="test-card">
            <div className="section-title compact"><div><p className="kicker">EXECUTION TRACE</p><h3>What happens when the scenario runs</h3></div><span className="test-count">{Math.max(0, runStep + 1)} / {scenario.steps.length} steps</span></div>
            <div className="trace-grid">
              <div className="trace-list">
                {scenario.steps.map((step, index) => <div className={`trace-row ${index < runStep ? "passed" : index === runStep ? "current" : ""}`} key={step.id}><span>{index < runStep ? "✓" : index === runStep ? "●" : "○"}</span><code>{step.id}.execute()</code><small>{index < runStep ? "passed" : index === runStep ? "running" : "waiting"}</small></div>)}
              </div>
              <div className="terminal"><div className="terminal-bar"><span /><span /><span /><p>activeflow / n8n live dry-run</p></div><pre>{executionError ? `$ n8n request failed\n× ${executionError}\n\nNo external system was modified.` : runStep < 0 ? calling ? "$ Calling the ActiveFlow webhook on n8n Cloud…" : "$ Ready. Select “Run live scenario” to execute the n8n workflow." : scenario.steps.slice(0, runStep + 1).map((step, index) => `${String(index + 1).padStart(2, "0")}  ${step.id.padEnd(14)} ${index === runStep && running ? "PROCESSING" : "OK"}   → ${step.output}`).join("\n")}{runStep === scenario.steps.length - 1 && liveResult ? `\n\n✓ n8n execution completed\n✓ Correlation: ${liveResult.correlationId}\n✓ Audit bundle returned\n✓ No proprietary data used` : ""}</pre></div>
            </div>
          </section>

          <section className="ecosystem-card">
            <div className="ecosystem-intro">
              <p className="kicker">THE WIDER PRODUCT VISION</p>
              <h3>Built from the operating patterns of a complete digital wellbeing ecosystem.</h3>
              <p>ActiveFlow goes beyond a single automation. These modules show how the same integration layer can connect the member app, specialists, schedules, plans and daily signals.</p>
            </div>
            <div className="ecosystem-grid">
              <article><span>TRAIN</span><div className="module-icon">01</div><h4>Adaptive training</h4><p>Combine completed sessions, effort and progression history to prepare a reviewed plan update.</p><small>Workout history · RPE · plan versions</small></article>
              <article><span>NOURISH</span><div className="module-icon">02</div><h4>Nutrition & smart shopping</h4><p>Turn a weekly food plan into one consolidated shopping list with quantities, alternatives and delivery status.</p><small>Meal plan · ingredients · shopping workflow</small></article>
              <article><span>RECOVER</span><div className="module-icon">03</div><h4>Recovery-aware service</h4><p>Use sleep and wellbeing signals as context for a specialist, never as an unsupervised medical decision.</p><small>Sleep · check-in · human review</small></article>
              <article><span>SUPPORT</span><div className="module-icon">04</div><h4>Human team continuity</h4><p>Coordinate the primary trainer, qualified backups, appointments and one clear member notification.</p><small>Team roles · calendar · notifications</small></article>
            </div>
            <div className="ecosystem-map">
              <div><b>MEMBER APP</b><small>workouts · meals · recovery · goals</small></div><i>→</i><div><b>ACTIVEFLOW</b><small>contracts · rules · orchestration · audit</small></div><i>→</i><div><b>HUMAN TEAM</b><small>trainer · nutrition · movement specialist</small></div>
            </div>
          </section>

          <section className="learning-strip"><div><p className="kicker">WHAT THIS PROJECT DEMONSTRATES</p><h3>A year of practical lessons condensed into one system.</h3></div><div className="skill-cloud">{scenario.learned.map((skill) => <span key={skill}>{skill}</span>)}</div></section>
        </section>
      </div>

      <footer className="site-footer"><b>ActiveFlow</b><span>Original portfolio project by Alessio Fantini</span><p>Inspired by real operational challenges · Synthetic data · No proprietary implementation</p></footer>
    </main>
  );
}
