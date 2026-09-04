import type { NextFunction, Request, Response } from "express";

export const AUTHORIZATION_ORGANIZATION =
  process.env.AUTHORIZATION_ORGANIZATION?.trim() || "next-level";

export const CAPABILITIES = {
  CONVERSATIONS_USE: "conversations:use",
  PRIVATE_MEMORY_READ: "memory:private:read",
  PROJECTS_ACCESS: "projects:access",
  AGENT_TOOLS_OPERATE: "agent-tools:operate",
  OFFICES_MANAGE: "offices:manage",
  ADMIN_OPERATE: "admin:operate",
  ROOK_SECURITY_ADMIN: "rook:security:admin",
} as const;

export type AuthorizationPolicy =
  | { access: "public"; description: string }
  | { access: "entitled"; entitlement: string; description: string }
  | { access: "admin"; description: string };

/** Declarative inventory. Enforcement resolves protected access server-side. */
export const ROUTE_AUTHORIZATION_MATRIX = {
  entrance: { access: "public", description: "Entrance and visitor registration" },
  about: { access: "public", description: "About content" },
  biographies: { access: "public", description: "Public agent biographies" },
  limitedDemo: { access: "public", description: "Explicitly limited, non-member demo" },
  conversations: {
    access: "entitled", entitlement: CAPABILITIES.CONVERSATIONS_USE,
    description: "Private conversations",
  },
  privateMemory: {
    access: "entitled", entitlement: CAPABILITIES.PRIVATE_MEMORY_READ,
    description: "Private memory",
  },
  projects: {
    access: "entitled", entitlement: CAPABILITIES.PROJECTS_ACCESS,
    description: "Member projects",
  },
  agentTools: {
    access: "entitled", entitlement: CAPABILITIES.AGENT_TOOLS_OPERATE,
    description: "Operational agent tools",
  },
  purchasedOffice: {
    access: "entitled", entitlement: "office:<slug>",
    description: "Purchased office entry",
  },
  officeAdministration: {
    access: "entitled", entitlement: CAPABILITIES.OFFICES_MANAGE,
    description: "Canonical office administration",
  },
  rookSecurityAdministration: {
    access: "entitled", entitlement: CAPABILITIES.ROOK_SECURITY_ADMIN,
    description: "Rook security administration",
  },
  adminOperations: { access: "admin", description: "Administrative operations" },
} as const satisfies Record<string, AuthorizationPolicy>;

export function officeEntitlementCode(slug: string): string {
  return `office:${slug.trim().toLowerCase()}`;
}

export function canUseAdminPrivilege(user: { isAdmin?: unknown } | null): boolean {
  return user?.isAdmin === true;
}

export function isNamedServicePrincipal(service: { id?: unknown } | null): service is { id: string } {
  return typeof service?.id === "string" && service.id.trim().length > 0;
}

export function canAccessConversationOwner(
  actorId: string,
  ownerId: string | null,
): boolean {
  return ownerId !== null && ownerId === actorId;
}

export function authorizePublic(policy: AuthorizationPolicy) {
  if (policy.access !== "public") {
    throw new Error("Protected policies require server-side authorization context");
  }
  return (_req: Request, _res: Response, next: NextFunction) => next();
}
