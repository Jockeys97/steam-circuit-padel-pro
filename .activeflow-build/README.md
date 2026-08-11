# ActiveFlow — Integration Workbench

ActiveFlow is a portfolio capstone that condenses a year of practical experience with customer apps, operations software, API integrations, n8n workflows and AI-assisted processes into three executable integration exercises.

It is intentionally different from an operational intelligence dashboard: ActiveFlow is about **how a business process is designed, transformed and safely executed across systems**.

## Scenarios

1. **Member onboarding** — validate a profile, map it to a canonical model, match a service team, obtain approval and activate linked systems.
2. **Service continuity** — replace an unavailable professional while preserving role rules, calendar consistency and clear communications.
3. **Program adaptation** — normalize new wellbeing signals, apply deterministic progression logic, create an AI-assisted explanation and retain specialist approval.

Each scenario includes an interactive orchestration canvas, field mappings, a versioned data contract, input/output inspection, guardrails and a dry-run execution trace.

## What it demonstrates

- REST APIs, webhooks and canonical data models
- TypeScript transformations and explicit business rules
- n8n-style orchestration and reusable subflows
- Idempotency, validation, fallbacks and transaction thinking
- Human approval gates for sensitive actions
- AI assistance constrained by deterministic logic
- Translation between operational needs and technical architecture

## Portfolio safety

ActiveFlow contains original code and synthetic data only. It does not include proprietary code, production endpoints, credentials, customer information, business names or exact internal implementations. It retains only general lessons learned from solving real operational problems.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and use **Run scenario** to execute each workflow.
