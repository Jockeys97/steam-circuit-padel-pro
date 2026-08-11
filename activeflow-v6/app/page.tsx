"use client";

import { useState } from "react";
import ContinuityLab from "./components/ContinuityLab";
import ProgressionLab from "./components/ProgressionLab";
import ReconciliationLab from "./components/ReconciliationLab";

export default function Home() {
  const [demo, setDemo] = useState<"continuity" | "progression" | "reconciliation">("continuity");

  return <main className="experience-shell">
    <header className="experience-header"><a href="#top"><span>AF</span><b>ActiveFlow</b></a><p>AI integration & automation portfolio</p><div><i />Live n8n workflows</div></header>

    <section className="experience-hero" id="top">
      <div className="experience-copy"><span>PORTFOLIO CAPSTONE · ALESSIO FANTINI</span><h1>See an operational problem.<br /><em>Watch ActiveFlow solve it.</em></h1><p>A live, portfolio-safe demonstration of how I connect business rules, APIs, n8n workflows and human approval into one reliable service.</p><a href="#live-demo">Try the interactive demo <b>↓</b></a></div>
      <div className="experience-visual" aria-label="How ActiveFlow works"><div><span>01</span><b>Problem</b><small>A real operational signal arrives</small></div><i>→</i><div><span>02</span><b>Decision</b><small>Rules and data are evaluated</small></div><i>→</i><div><span>03</span><b>Human check</b><small>A person remains accountable</small></div><i>→</i><div className="final"><span>04</span><b>Safe outcome</b><small>The change is versioned and audited</small></div></div>
      <div className="experience-proof"><span>● LIVE n8n Cloud</span><span>● Synthetic data</span><span>● Human-in-the-loop</span><span>● Persistent audit</span></div>
    </section>

    <section className="demo-hub" id="live-demo">
      <div className="demo-hub-heading"><span>INTERACTIVE DEMOS</span><h2>Choose one story to explore.</h2><p>No login. About one minute. Every button runs a real workflow.</p></div>
      <div className="demo-switcher"><button className={demo === "continuity" ? "active" : ""} onClick={() => setDemo("continuity")}><span>01</span><div><b>Service continuity</b><small>Keep member sessions running</small></div></button><button className={demo === "progression" ? "active" : ""} onClick={() => setDemo("progression")}><span>02</span><div><b>Adaptive training</b><small>Turn signals into a reviewed plan</small></div></button><button className={demo === "reconciliation" ? "active" : ""} onClick={() => setDemo("reconciliation")}><span>03</span><div><b>Wearable reconciliation</b><small>Prevent duplicate activity records</small></div></button></div>
      {demo === "continuity" ? <ContinuityLab /> : demo === "progression" ? <ProgressionLab /> : <ReconciliationLab />}
    </section>

    <section className="engineering-proof">
      <div className="proof-heading"><span>WHAT THIS PROVES</span><h2>More than a polished screen.</h2><p>The visible story is simple. Underneath it, the project demonstrates the engineering patterns recruiters expect.</p></div>
      <div className="proof-grid"><article><span>01</span><h3>Real orchestration</h3><p>n8n receives validated inputs, applies explicit policies and returns structured proposals.</p></article><article><span>02</span><h3>Safe state changes</h3><p>Nothing is written before approval. Version checks prevent stale proposals from overwriting newer data.</p></article><article><span>03</span><h3>Failure handling</h3><p>Dependency errors stop safely, produce a visible outcome and leave operational records untouched.</p></article><article><span>04</span><h3>Business translation</h3><p>The workflow connects technical logic to concrete service outcomes a non-technical stakeholder can understand.</p></article></div>
      <details><summary>View the technical architecture <span>＋</span></summary><div className="architecture-line"><div><b>Member app / operations</b><small>workouts · schedules · service signals</small></div><i>→</i><div><b>ActiveFlow</b><small>contracts · policy · n8n orchestration</small></div><i>→</i><div><b>Human team</b><small>review · approval · accountable outcome</small></div></div><div className="architecture-tags"><span>REST APIs</span><span>n8n Cloud</span><span>TypeScript</span><span>D1 persistence</span><span>Optimistic locking</span><span>Audit trail</span></div></details>
    </section>

    <footer className="experience-footer"><b>ActiveFlow</b><span>Original portfolio project by Alessio Fantini</span><small>Synthetic data · No proprietary code · Inspired by real operational challenges</small></footer>
  </main>;
}
