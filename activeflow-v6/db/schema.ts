import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const professionals = sqliteTable("professionals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  skillsJson: text("skills_json").notNull(),
  availabilityJson: text("availability_json").notNull(),
  priority: integer("priority").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  memberAlias: text("member_alias").notNull(),
  professionalId: text("professional_id").notNull(),
  startsAt: text("starts_at").notNull(),
  slot: text("slot").notNull(),
  serviceType: text("service_type").notNull(),
  status: text("status").notNull().default("scheduled"),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

export const continuityProposals = sqliteTable("continuity_proposals", {
  correlationId: text("correlation_id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestId: text("request_id").notNull(),
  proposalJson: text("proposal_json").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  decidedAt: text("decided_at"),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  correlationId: text("correlation_id").notNull(),
  eventType: text("event_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const trainingPlans = sqliteTable("training_plans", {
  id: text("id").primaryKey(),
  memberAlias: text("member_alias").notNull(),
  objective: text("objective").notNull(),
  weekNumber: integer("week_number").notNull(),
  currentVersion: integer("current_version").notNull().default(1),
  planJson: text("plan_json").notNull(),
  lastSessionJson: text("last_session_json").notNull(),
  recoveryJson: text("recovery_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const progressionProposals = sqliteTable("progression_proposals", {
  correlationId: text("correlation_id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestId: text("request_id").notNull(),
  proposalJson: text("proposal_json").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  decidedAt: text("decided_at"),
});

export const wearableEvents = sqliteTable("wearable_events", { id: text("id").primaryKey(), memberAlias: text("member_alias").notNull(), activity: text("activity").notNull(), startedAt: text("starts_at").notNull(), durationMinutes: integer("duration_minutes").notNull(), distanceKm: integer("distance_km").notNull(), status: text("status").notNull(), version: integer("version").notNull() });
export const serviceAppointments = sqliteTable("service_appointments", { id: text("id").primaryKey(), memberAlias: text("member_alias").notNull(), startsAt: text("starts_at").notNull(), durationMinutes: integer("duration_minutes").notNull(), type: text("type").notNull(), status: text("status").notNull() });
export const recordedWorkouts = sqliteTable("recorded_workouts", { id: text("id").primaryKey(), memberAlias: text("member_alias").notNull(), startedAt: text("starts_at").notNull(), activity: text("activity").notNull(), source: text("source").notNull() });
export const reconciliationProposals = sqliteTable("reconciliation_proposals", { correlationId: text("correlation_id").primaryKey(), eventId: text("event_id").notNull(), proposalJson: text("proposal_json").notNull(), status: text("status").notNull(), createdAt: text("created_at").notNull(), decidedAt: text("decided_at") });
