import { env } from "cloudflare:workers";

export type WearableEvent = { id: string; memberAlias: string; activity: string; startedAt: string; durationMinutes: number; distanceKm: number; status: "pending" | "linked" | "saved" | "review"; version: number };
export type ReconciliationState = { events: WearableEvent[]; appointments: Array<{ id: string; memberAlias: string; startsAt: string; durationMinutes: number; type: string; status: string }>; workouts: Array<{ id: string; memberAlias: string; startedAt: string; activity: string; source: string }>; audit: Array<{ id: string; eventType: string; correlationId: string }> };
type ProposalRow = { correlation_id: string; proposal_json: string; status: string };
function db() { const value = env.DB as D1Database | undefined; if (!value) throw new Error("ActiveFlow D1 binding is unavailable"); return value; }
function iso(day: number, hour: number, minute = 0) { const date = new Date(); date.setUTCDate(date.getUTCDate() + day); date.setUTCHours(hour, minute, 0, 0); return date.toISOString(); }

export async function ensureReconciliationStore() {
  const d1 = db();
  await d1.batch([
    d1.prepare("CREATE TABLE IF NOT EXISTS wearable_events (id TEXT PRIMARY KEY, member_alias TEXT NOT NULL, activity TEXT NOT NULL, started_at TEXT NOT NULL, duration_minutes INTEGER NOT NULL, distance_km REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending', version INTEGER NOT NULL DEFAULT 1)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS service_appointments (id TEXT PRIMARY KEY, member_alias TEXT NOT NULL, starts_at TEXT NOT NULL, duration_minutes INTEGER NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS recorded_workouts (id TEXT PRIMARY KEY, member_alias TEXT NOT NULL, started_at TEXT NOT NULL, activity TEXT NOT NULL, source TEXT NOT NULL)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS reconciliation_proposals (correlation_id TEXT PRIMARY KEY, event_id TEXT NOT NULL, proposal_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, decided_at TEXT)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS wearable_events_status_idx ON wearable_events (status)"),
  ]);
  const found = await d1.prepare("SELECT id FROM wearable_events LIMIT 1").first<{ id: string }>();
  if (!found) await seed(d1);
}
async function seed(d1: D1Database) {
  await d1.batch([
    d1.prepare("INSERT INTO wearable_events VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)").bind("event-run-1042", "Member Anna", "Outdoor run", iso(1, 18, 5), 42, 6.3),
    d1.prepare("INSERT INTO wearable_events VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)").bind("event-pt-1043", "Member Marco", "Strength workout", iso(2, 17, 0), 58, 0),
    d1.prepare("INSERT INTO wearable_events VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)").bind("event-dup-1044", "Member Sara", "Indoor cycle", iso(3, 7, 30), 35, 12.1),
    d1.prepare("INSERT INTO service_appointments VALUES (?, ?, ?, ?, ?, ?)").bind("apt-501", "Member Marco", iso(2, 16, 55), 60, "trainer session", "completed"),
    d1.prepare("INSERT INTO recorded_workouts VALUES (?, ?, ?, ?, ?)").bind("work-903", "Member Sara", iso(3, 7, 35), "Indoor cycle", "member app"),
  ]);
}
export async function getReconciliationState(): Promise<ReconciliationState> {
  await ensureReconciliationStore(); const d1 = db();
  const [events, appointments, workouts, audit] = await Promise.all([
    d1.prepare("SELECT * FROM wearable_events ORDER BY started_at").all<Record<string, unknown>>(), d1.prepare("SELECT * FROM service_appointments ORDER BY starts_at").all<Record<string, unknown>>(), d1.prepare("SELECT * FROM recorded_workouts ORDER BY started_at").all<Record<string, unknown>>(), d1.prepare("SELECT * FROM audit_events WHERE event_type LIKE 'reconciliation_%' ORDER BY created_at DESC LIMIT 12").all<Record<string, unknown>>(),
  ]);
  return { events: events.results.map(x => ({ id: String(x.id), memberAlias: String(x.member_alias), activity: String(x.activity), startedAt: String(x.started_at), durationMinutes: Number(x.duration_minutes), distanceKm: Number(x.distance_km), status: x.status as WearableEvent["status"], version: Number(x.version) })), appointments: appointments.results.map(x => ({ id: String(x.id), memberAlias: String(x.member_alias), startsAt: String(x.starts_at), durationMinutes: Number(x.duration_minutes), type: String(x.type), status: String(x.status) })), workouts: workouts.results.map(x => ({ id: String(x.id), memberAlias: String(x.member_alias), startedAt: String(x.started_at), activity: String(x.activity), source: String(x.source) })), audit: audit.results.map(x => ({ id: String(x.id), eventType: String(x.event_type), correlationId: String(x.correlation_id) })) };
}
export async function saveReconciliationProposal(input: { correlationId: string; eventId: string; proposal: unknown }) { await ensureReconciliationStore(); const now = new Date().toISOString(); const d1 = db(); await d1.batch([d1.prepare("INSERT INTO reconciliation_proposals (correlation_id, event_id, proposal_json, status, created_at) VALUES (?, ?, ?, 'pending', ?) ON CONFLICT(correlation_id) DO UPDATE SET proposal_json = excluded.proposal_json").bind(input.correlationId, input.eventId, JSON.stringify(input.proposal), now), d1.prepare("INSERT INTO audit_events (id, correlation_id, event_type, payload_json, created_at) VALUES (?, ?, 'reconciliation_proposal_created', ?, ?)").bind(crypto.randomUUID(), input.correlationId, JSON.stringify({ externalWrites: 0 }), now)]); }
export async function decideReconciliationProposal(correlationId: string, decision: "approve" | "reject") { await ensureReconciliationStore(); const d1 = db(); const row = await d1.prepare("SELECT * FROM reconciliation_proposals WHERE correlation_id = ?").bind(correlationId).first<ProposalRow>(); if (!row) throw new Error("Proposal not found"); if (row.status !== "pending") return { status: row.status, state: await getReconciliationState() }; const proposal = JSON.parse(row.proposal_json) as { proposedAction: { eventId: string; outcome: "save" | "link" | "review" } }; const status = decision === "approve" ? "approved" : "rejected"; const now = new Date().toISOString(); const changes = [d1.prepare("UPDATE reconciliation_proposals SET status = ?, decided_at = ? WHERE correlation_id = ?").bind(status, now, correlationId), d1.prepare("INSERT INTO audit_events (id, correlation_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), correlationId, `reconciliation_proposal_${status}`, JSON.stringify({ decision, externalWrites: decision === "approve" ? 1 : 0 }), now)]; if (decision === "approve") { const action = proposal.proposedAction; changes.push(d1.prepare("UPDATE wearable_events SET status = ?, version = version + 1 WHERE id = ?").bind(action.outcome === "save" ? "saved" : action.outcome === "link" ? "linked" : "review", action.eventId)); if (action.outcome === "save") changes.push(d1.prepare("INSERT OR IGNORE INTO recorded_workouts VALUES (?, ?, ?, ?, ?)").bind(`saved-${action.eventId}`, "Member Anna", now, "Outdoor run", "wearable reconciliation")); } await d1.batch(changes); return { status, state: await getReconciliationState() }; }
export async function resetReconciliationStore() { await ensureReconciliationStore(); const d1 = db(); await d1.batch([d1.prepare("DELETE FROM reconciliation_proposals"), d1.prepare("DELETE FROM wearable_events"), d1.prepare("DELETE FROM service_appointments"), d1.prepare("DELETE FROM recorded_workouts"), d1.prepare("DELETE FROM audit_events WHERE event_type LIKE 'reconciliation_%'")]); await seed(d1); return getReconciliationState(); }
