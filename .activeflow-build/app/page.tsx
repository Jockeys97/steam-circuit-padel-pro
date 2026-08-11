"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [scenarioId, setScenarioId] = useState("onboarding");
  const [selectedStepId, setSelectedStepId] = useState("map");
  const [runStep, setRunStep] = useState(-1);
  const [running, setRunning] = useState(false);
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
  };

  const runScenario = () => {
    setRunStep(-1);
    setRunning(true);
  };

  const resetScenario = () => {
    setRunStep(-1);
    setRunning(false);
  };

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <a className="brand" href="#top" aria-label="ActiveFlow home"><span>AF</span><div><b>ActiveFlow</b><small>Integration workbench</small></div></a>
        <div className="header-center"><span>CAPSTONE PROJECT</span><p>App → Operations → Automation → AI</p></div>
        <div className="header-status"><i />Sandbox ready</div>
      </header>

      <div className="project-frame" id="top">
        <aside className="scenario-rail">
          <div className="rail-intro"><p className="kicker">SCENARIO LIBRARY</p><h1>Real work,<br />rebuilt safely.</h1><span>Three original integration exercises derived from problems encountered while building a digital fitness ecosystem.</span></div>
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
            <div className="run-actions"><button className="ghost" onClick={resetScenario}>Reset</button><button className="run-button" onClick={runScenario} disabled={running}><span>{running ? "●" : "▶"}</span>{running ? "Running scenario" : "Run scenario"}</button></div>
          </div>

          <section className="outcome-strip"><span>BUSINESS OUTCOME</span><p>{scenario.outcome}</p><div className={runStep === scenario.steps.length - 1 ? "result complete" : "result"}>{runStep === scenario.steps.length - 1 ? "✓ Completed" : "○ Not executed"}</div></section>

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
              <div className="terminal"><div className="terminal-bar"><span /><span /><span /><p>activeflow / dry-run</p></div><pre>{runStep < 0 ? "$ Ready. Select “Run scenario” to execute the complete path." : scenario.steps.slice(0, runStep + 1).map((step, index) => `${String(index + 1).padStart(2, "0")}  ${step.id.padEnd(14)} ${index === runStep && running ? "PROCESSING" : "OK"}   → ${step.output}`).join("\n")}{runStep === scenario.steps.length - 1 ? "\n\n✓ Business outcome reached\n✓ Audit bundle written\n✓ No proprietary data used" : ""}</pre></div>
            </div>
          </section>

          <section className="learning-strip"><div><p className="kicker">WHAT THIS PROJECT DEMONSTRATES</p><h3>A year of practical lessons condensed into one system.</h3></div><div className="skill-cloud">{scenario.learned.map((skill) => <span key={skill}>{skill}</span>)}</div></section>
        </section>
      </div>

      <footer className="site-footer"><b>ActiveFlow</b><span>Original portfolio project by Alessio Fantini</span><p>Inspired by real operational challenges · Synthetic data · No proprietary implementation</p></footer>
    </main>
  );
}
