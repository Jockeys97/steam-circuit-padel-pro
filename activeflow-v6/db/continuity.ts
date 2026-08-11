import { env } from "cloudflare:workers";

export type Professional = {
  id: string;
  name: string;
  role: string;
  skills: string[];
  availability: string[];
  priority: number;
  active: boolean;
};

export type ServiceSession = {
  id: string;
  memberAlias: string;
  professionalId: string;
  startsAt: string;
  slot: string;
  serviceType: string;
  status: string;
  version: number;
  updatedAt: string;
};

type ProposalRecord = {
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

function futureIso(days: number, hour: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

export async function ensureContinuityStore() {
  const db = getD1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS professionals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      skills_json TEXT NOT NULL,
      availability_json TEXT NOT NULL,
      priority INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      member_alias TEXT NOT NULL,
      professional_id TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      slot TEXT NOT NULL,
      service_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS continuity_proposals (
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
    db.prepare("CREATE INDEX IF NOT EXISTS sessions_professional_idx ON sessions (professional_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_correlation_idx ON audit_events (correlation_id, created_at)"),
  ]);

  const [professionalCount, sessionCount] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS total FROM professionals").first<{ total: number }>(),
    db.prepare("SELECT COUNT(*) AS total FROM sessions").first<{ total: number }>(),
  ]);

  // This is a portfolio sandbox: an interrupted first seed must never leave the
  // public demo with professionals but no sessions to protect.
  if (!professionalCount?.total || !sessionCount?.total) {
    await db.batch([
      db.prepare("DELETE FROM audit_events"),
      db.prepare("DELETE FROM continuity_proposals"),
      db.prepare("DELETE FROM sessions"),
      db.prepare("DELETE FROM professionals"),
    ]);
    await seedContinuityStore(db);
  }
}

async function seedContinuityStore(db: D1Database) {
  const now = new Date().toISOString();
  const professionals: Array<[string, string, string, string[], string[], number]> = [
    ["pro-alex", "Alex R.", "trainer", ["strength", "wellbeing"], ["morning", "evening"], 90],
    ["pro-giulia", "Giulia M.", "trainer", ["wellbeing", "mobility"], ["afternoon", "evening"], 96],
    ["pro-luca", "Luca B.", "trainer", ["strength", "conditioning"], ["morning", "evening"], 91],
    ["pro-marta", "Marta C.", "trainer", ["mobility", "strength"], ["morning", "afternoon"], 87],
    ["pro-nadia", "Nadia F.", "nutritionist", ["nutrition", "wellbeing"], ["afternoon"], 93],
  ];
  const sessions: Array<[string, string, string, string, string, string]> = [
    ["sess-101", "Member A", "pro-alex", futureIso(2, 17), "evening", "wellbeing"],
    ["sess-102", "Member B", "pro-alex", futureIso(3, 8), "morning", "strength"],
    ["sess-103", "Member C", "pro-alex", futureIso(5, 17), "evening", "strength"],
    ["sess-104", "Member D", "pro-giulia", futureIso(4, 13), "afternoon", "mobility"],
  ];
  await db.batch([
    ...professionals.map(([id, name, role, skills, availability, priority]) =>
      db.prepare("INSERT INTO professionals (id, name, role, skills_json, availability_json, priority, active) VALUES (?, ?, ?, ?, ?, ?, 1)")
        .bind(id, name, role, JSON.stringify(skills), JSON.stringify(availability), priority)),
    ...sessions.map(([id, memberAlias, professionalId, startsAt, slot, serviceType]) =>
      db.prepare("INSERT INTO sessions (id, member_alias, professional_id, starts_at, slot, service_type, status, version, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', 1, ?)")
        .bind(id, memberAlias, professionalId, startsAt, slot, serviceType, now)),
  ]);
}

export async function getContinuityState() {
  await ensureContinuityStore();
  const db = getD1();
  const [professionalsResult, sessionsResult, auditResult, proposalsResult] = await Promise.all([
    db.prepare("SELECT * FROM professionals ORDER BY role, priority DESC").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM sessions ORDER BY starts_at").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 12").all<Record<string, unknown>>(),
    db.prepare("SELECT correlation_id, status, created_at, decided_at FROM continuity_proposals ORDER BY created_at DESC LIMIT 8").all<Record<string, unknown>>(),
  ]);

  const professionals = professionalsResult.results.map((row) => ({
    id: String(row.id), name: String(row.name), role: String(row.role),
    skills: JSON.parse(String(row.skills_json)) as string[],
    availability: JSON.parse(String(row.availability_json)) as string[],
    priority: Number(row.priority), active: Boolean(row.active),
  }));
  const sessions = sessionsResult.results.map((row) => ({
    id: String(row.id), memberAlias: String(row.member_alias), professionalId: String(row.professional_id),
    startsAt: String(row.starts_at), slot: String(row.slot), serviceType: String(row.service_type),
    status: String(row.status), version: Number(row.version), updatedAt: String(row.updated_at),
  }));
  const audit = auditResult.results.map((row) => ({
    id: String(row.id), correlationId: String(row.correlation_id), eventType: String(row.event_type),
    payload: JSON.parse(String(row.payload_json)), createdAt: String(row.created_at),
  }));
  return { professionals, sessions, audit, proposals: proposalsResult.results };
}

export async function saveContinuityProposal(input: {
  correlationId: string;
  idempotencyKey: string;
  requestId: string;
  proposal: unknown;
}) {
  await ensureContinuityStore();
  const db = getD1();
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`INSERT INTO continuity_proposals
      (correlation_id, idempotency_key, request_id, proposal_json, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
      ON CONFLICT(correlation_id) DO UPDATE SET proposal_json = excluded.proposal_json`)
      .bind(input.correlationId, input.idempotencyKey, input.requestId, JSON.stringify(input.proposal), now),
    db.prepare("INSERT INTO audit_events (id, correlation_id, event_type, payload_json, created_at) VALUES (?, ?, 'proposal_created', ?, ?)")
      .bind(crypto.randomUUID(), input.correlationId, JSON.stringify({ requestId: input.requestId }), now),
  ]);
}

export async function decideContinuityProposal(correlationId: string, decision: "approve" | "reject") {
  await ensureContinuityStore();
  const db = getD1();
  const record = await db.prepare("SELECT * FROM continuity_proposals WHERE correlation_id = ?")
    .bind(correlationId).first<ProposalRecord>();
  if (!record) throw new Error("Proposal not found");
  if (record.status !== "pending") return { status: record.status, alreadyDecided: true, state: await getContinuityState() };

  const proposal = JSON.parse(record.proposal_json) as {
    proposedAction?: { sessionUpdates?: Array<{ sessionId: string; toProfessionalId: string; expectedVersion: number }> };
  };
  const now = new Date().toISOString();
  const nextStatus = decision === "approve" ? "approved" : "rejected";
  const statements = [];

  if (decision === "approve") {
    const updates = proposal.proposedAction?.sessionUpdates ?? [];
    if (!updates.length) throw new Error("Proposal contains no session updates");
    for (const update of updates) {
      const current = await db.prepare("SELECT version FROM sessions WHERE id = ?").bind(update.sessionId).first<{ version: number }>();
      if (!current || Number(current.version) !== Number(update.expectedVersion)) {
        throw new Error(`Session ${update.sessionId} changed after the proposal was created`);
      }
      statements.push(
        db.prepare("UPDATE sessions SET professional_id = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?")
          .bind(update.toProfessionalId, now, update.sessionId, update.expectedVersion),
      );
    }
  }

  statements.push(
    db.prepare("UPDATE continuity_proposals SET status = ?, decided_at = ? WHERE correlation_id = ? AND status = 'pending'")
      .bind(nextStatus, now, correlationId),
    db.prepare("INSERT INTO audit_events (id, correlation_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), correlationId, `proposal_${nextStatus}`, JSON.stringify({ decision, externalWrites: 0 }), now),
  );
  await db.batch(statements);
  return { status: nextStatus, alreadyDecided: false, state: await getContinuityState() };
}

export async function resetContinuityStore() {
  await ensureContinuityStore();
  const db = getD1();
  await db.batch([
    db.prepare("DELETE FROM audit_events"),
    db.prepare("DELETE FROM continuity_proposals"),
    db.prepare("DELETE FROM sessions"),
    db.prepare("DELETE FROM professionals"),
  ]);
  await seedContinuityStore(db);
  return getContinuityState();
}
