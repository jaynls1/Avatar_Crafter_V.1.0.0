import crypto from "node:crypto";
import { db, securityAuditTable } from "@workspace/db";
import { redactAudit } from "./identityCore";

export async function securityAudit(input: {
  requestId: string;
  event: string;
  outcome: "accepted" | "rejected" | "ignored";
  actor?: string;
  correlationId?: string;
  detail?: Record<string, unknown>;
}) {
  const detail = redactAudit(input.detail ?? {});
  await db.insert(securityAuditTable).values({
    requestId: input.requestId,
    event: input.event,
    outcome: input.outcome,
    actorHash: input.actor
      ? crypto.createHash("sha256").update(input.actor).digest("hex")
      : null,
    correlationId: input.correlationId?.slice(0, 256),
    detail,
  });
}