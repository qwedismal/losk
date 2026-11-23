import { all, isoNow, newId, run } from "./db";

/**
 * Append-only audit trail. Every privileged or money-related action lands here;
 * the table is never updated, only inserted into and trimmed.
 */

export interface AuditInput {
  actor: string;
  action: string;
  target?: string;
  meta?: Record<string, string | number | boolean>;
  ipHash?: string;
}

const MAX_ROWS = 20_000;
const TRIM_TO = 15_000;

export function logAudit(input: AuditInput): void {
  try {
    run(
      `INSERT INTO audit (id, at, actor, action, target, meta_json, ip_hash)
       VALUES (?,?,?,?,?,?,?)`,
      [
        newId("aud"),
        isoNow(),
        input.actor.slice(0, 120),
        input.action.slice(0, 80),
        input.target ? input.target.slice(0, 80) : null,
        input.meta ? JSON.stringify(input.meta) : null,
        input.ipHash ?? null,
      ],
    );

    const row = all<{ n: number }>("SELECT COUNT(*) AS n FROM audit")[0];
    if (row && Number(row.n) > MAX_ROWS) {
      run("DELETE FROM audit WHERE id IN (SELECT id FROM audit ORDER BY at ASC LIMIT ?)", [
        Number(row.n) - TRIM_TO,
      ]);
    }
  } catch {
    // Auditing must never break the operation it is recording.
  }
}

export interface AuditEntryView {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string | null;
  meta: Record<string, unknown> | null;
}

export function recentAudit(limit = 50): AuditEntryView[] {
  return all<{
    id: string;
    at: string;
    actor: string;
    action: string;
    target: string | null;
    meta_json: string | null;
  }>("SELECT * FROM audit ORDER BY at DESC LIMIT ?", [limit]).map((row) => ({
    id: row.id,
    at: row.at,
    actor: row.actor,
    action: row.action,
    target: row.target,
    meta: row.meta_json ? (JSON.parse(row.meta_json) as Record<string, unknown>) : null,
  }));
}
