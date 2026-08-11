import { env } from "cloudflare:workers";

export type ProgressionState = {
  plan: {
    memberAlias: string;
    objective: string;
    weekNumber: number;
    currentVersion: number;
    prescription: { exercise: string; weightKg: number; reps: number; targetRpe: number; note: string };
    lastSession: { weightKg: number; reps: number; rpe: number; completedAt: string };
    recovery: { averageSleepHours: number; adherencePercent: number; fatigueScore: number };
    updatedAt: string;
  };
  audit: Array<{ id: string; correlationId: string; eventType: string; payload: Record<string, unknown>; createdAt: string }>;
  proposals: Array<{ correlation_id: string; status: string; created_at: string; decided_at: string | null }>;
};

type PlanRow = {
  id: string;
  member_alias: string;
  objective: string;
  week_number: number;
  current_version: number;
  plan_json: string;
  last_session_json: string;
  recovery_json: string;
  updated_at: string;
};

type ProposalRow = {
  correlation_id: string;
  idempotency_key: string;
  request_id: string;
  proposal_json: string;
  status: string;
  created_at: string;
  decided_at: string | null;
};

function getD1() {
  const database = env.DB as D1Database | undefined;
  if (!database) throw new Error("ActiveFlow D1 binding is unavailable");
  return database;
}

function parsePlan(row: PlanRow): ProgressionState["plan"] {
  return {
    memberAlias: row.member_alias,
    objective: row.objective,
    weekNumber: Number(row.week_number),
    currentVersion: Number(row.current_version),
    prescription: JSON.parse(row.plan_json),
    lastSession: JSON.parse(row.last_session_json),
    recovery: JSON.parse(row.recovery_json),
    updatedAt: row.updated_at,
  };
}

export async function ensureProgressionStore() {
  const db = getD1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS training_plans (
      id TEXT PRIMARY KEY,
      member_alias TEXT NOT NULL,
      objective TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      current_version INTEGER NOT NULL DEFAULT 1,
      plan_json TEXT NOT NULL,
      last_session_json TEXT NOT NULL,
      recovery_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS progression_proposals (
      correlation_id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL,
      request_id TEXT NOT NULL,
      proposal_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      decided_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      correlation_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS progression_audit_idx ON audit_events (event_type, created_at)"),
  ]);

  const existing = await db.prepare("SELECT id FROM training_plans WHERE id = 'plan-demo-001'").first<{ id: string }>();
  if (!existing) await seedProgressionStore(db);
}

async function seedProgressionStore(db: D1Database) {
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO training_plans
    (id, member_alias, objective, week_number, current_version, plan_json, last_session_json, recovery_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      "plan-demo-001", "Member E", "hypertrophy", 4, 1,
      JSON.stringify({ exercise: "Barbell bench press", weightKg: 82.5, reps: 12, targetRpe: 8, note: "Build reps before increasing load." }),
      JSON.stringify({ weightKg: 82.5, reps: 12, rpe: 9.5, completedAt: now }),
      JSON.stringify({ averageSleepHours: 6.3, adherencePercent: 76, fatigueScore: 8 }),
      now,
    ).run();
}

export async function getProgressionState(): Promise<ProgressionState> {
  await ensureProgressionStore();
  const db = getD1();
  const [plan, audit, proposals] = await Promise.all([
    db.prepare("SELECT * FROM training_plans WHERE id = 'plan-demo-001'").first<PlanRow>(),
    db.prepare("SELECT * FROM audit_events WHERE event_type LIKE 'progression_%' ORDER BY created_at DESC LIMIT 12").all<Record<string, unknown>>(),
    db.prepare("SELECT correlation_id, status, created_at, decided_at FROM progression_proposals ORDER BY created_at DESC LIMIT 8").all<Record<string, unknown>>(),
  ]);
  if (!plan) throw new Error("Progression demo plan is unavailable");
  return {
    plan: parsePlan(plan),
    audit: audit.results.map((row) => ({
      id: String(row.id), correlationId: String(row.correlation_id), eventType: String(row.event_type),
      payload: JSON.parse(String(row.payload_json)), createdAt: String(row.created_at),
    })),
    proposals: proposals.results.map((row) => ({
      correlation_id: String(row.correlation_id), status: String(row.status), created_at: String(row.created_at),
      decided_at: row.decided_at ? String(row.decided_at) : null,
    })),
  };
}

export async function saveProgressionProposal(input: { correlationId: string; idempotencyKey: string; requestId: string; proposal: unknown }) {
  await ensureProgressionStore();
  const db = getD1();
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`INSERT INTO progression_proposals
      (correlation_id, idempotency_key, request_id, proposal_json, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
      ON CONFLICT(correlation_id) DO UPDATE SET proposal_json = excluded.proposal_json`)
      .bind(input.correlationId, input.idempotencyKey, input.requestId, JSON.stringify(input.proposal), now),
    db.prepare("INSERT INTO audit_events (id, correlation_id, event_type, payload_json, created_at) VALUES (?, ?, 'progression_proposal_created', ?, ?)")
      .bind(crypto.randomUUID(), input.correlationId, JSON.stringify({ requestId: input.requestId, externalWrites: 0 }), now),
  ]);
}

export async function decideProgressionProposal(correlationId: string, decision: "approve" | "reject") {
  await ensureProgressionStore();
  const db = getD1();
  const record = await db.prepare("SELECT * FROM progression_proposals WHERE correlation_id = ?").bind(correlationId).first<ProposalRow>();
  if (!record) throw new Error("Proposal not found");
  if (record.status !== "pending") return { status: record.status, alreadyDecided: true, state: await getProgressionState() };

  const proposal = JSON.parse(record.proposal_json) as { proposedAction?: { expectedPlanVersion: number; prescription: unknown } };
  const nextStatus = decision === "approve" ? "approved" : "rejected";
  const now = new Date().toISOString();
  const statements = [];

  if (decision === "approve") {
    const action = proposal.proposedAction;
    if (!action) throw new Error("Proposal contains no plan update");
    const current = await db.prepare("SELECT current_version FROM training_plans WHERE id = 'plan-demo-001'").first<{ current_version: number }>();
    if (!current || Number(current.current_version) !== Number(action.expectedPlanVersion)) {
      throw new Error("The plan changed after this proposal was created");
    }
    statements.push(
      db.prepare("UPDATE training_plans SET current_version = current_version + 1, plan_json = ?, updated_at = ? WHERE id = 'plan-demo-001' AND current_version = ?")
        .bind(JSON.stringify(action.prescription), now, action.expectedPlanVersion),
    );
  }

  statements.push(
    db.prepare("UPDATE progression_proposals SET status = ?, decided_at = ? WHERE correlation_id = ? AND status = 'pending'")
      .bind(nextStatus, now, correlationId),
    db.prepare("INSERT INTO audit_events (id, correlation_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), correlationId, `progression_proposal_${nextStatus}`, JSON.stringify({ decision, externalWrites: 0 }), now),
  );
  await db.batch(statements);
  return { status: nextStatus, alreadyDecided: false, state: await getProgressionState() };
}

export async function resetProgressionStore() {
  await ensureProgressionStore();
  const db = getD1();
  await db.batch([
    db.prepare("DELETE FROM audit_events WHERE event_type LIKE 'progression_%'"),
    db.prepare("DELETE FROM progression_proposals"),
    db.prepare("DELETE FROM training_plans WHERE id = 'plan-demo-001'"),
  ]);
  await seedProgressionStore(db);
  return getProgressionState();
}
