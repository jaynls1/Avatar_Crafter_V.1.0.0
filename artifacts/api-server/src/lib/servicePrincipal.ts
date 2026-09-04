import crypto from "node:crypto";
import type { Request } from "express";
import { and, eq } from "drizzle-orm";
import { db, servicePrincipalsTable } from "@workspace/db";
import { parseServiceCredential } from "./identityCore";

const digest = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

/** Named machine clients only; capabilities are always read from the server. */
export async function authenticateService(
  req: Request,
  capability: string,
): Promise<{ id: string } | null> {
  const credential = parseServiceCredential(req.header("authorization"));
  if (!credential) return null;
  const { id, secret } = credential;
  const [service] = await db.select().from(servicePrincipalsTable).where(and(
    eq(servicePrincipalsTable.id, id),
    eq(servicePrincipalsTable.secretHash, digest(secret)),
    eq(servicePrincipalsTable.active, true),
  ));
  const capabilities = Array.isArray(service?.capabilities) ? service.capabilities : [];
  return service && capabilities.includes(capability) ? { id: service.id } : null;
}