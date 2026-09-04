import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessConversationOwner,
  canUseAdminPrivilege,
  isNamedServicePrincipal,
  officeEntitlementCode,
  ROUTE_AUTHORIZATION_MATRIX,
} from "./routeAuthorization";

test("route matrix keeps only intended entrance surfaces public", () => {
  assert.equal(ROUTE_AUTHORIZATION_MATRIX.about.access, "public");
  assert.equal(ROUTE_AUTHORIZATION_MATRIX.biographies.access, "public");
  assert.equal(ROUTE_AUTHORIZATION_MATRIX.entrance.access, "public");
  assert.equal(ROUTE_AUTHORIZATION_MATRIX.limitedDemo.access, "public");
  assert.notEqual(ROUTE_AUTHORIZATION_MATRIX.conversations.access, "public");
  assert.notEqual(ROUTE_AUTHORIZATION_MATRIX.rookSecurityAdministration.access, "public");
});

test("admin privilege rejects role-like client input", () => {
  assert.equal(canUseAdminPrivilege({ isAdmin: true }), true);
  assert.equal(canUseAdminPrivilege({ isAdmin: false }), false);
  assert.equal(canUseAdminPrivilege(null), false);
});

test("office entitlement is scoped to the normalized protected slug", () => {
  assert.equal(officeEntitlementCode(" Rook "), "office:rook");
  assert.notEqual(officeEntitlementCode("atlas"), officeEntitlementCode("rook"));
});

test("service authorization requires a named principal result", () => {
  assert.equal(isNamedServicePrincipal({ id: "office-sync" }), true);
  assert.equal(isNamedServicePrincipal({ id: "" }), false);
  assert.equal(isNamedServicePrincipal(null), false);
});

test("Member A cannot read Member B conversation", () => {
  assert.equal(canAccessConversationOwner("member-a", "member-a"), true);
  assert.equal(canAccessConversationOwner("member-a", "member-b"), false);
  assert.equal(canAccessConversationOwner("admin", "member-b"), false);
});
