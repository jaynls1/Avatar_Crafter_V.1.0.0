import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const agentSettings = pgTable("agent_settings", {
  agentId: text("agent_id").primaryKey(),
  memoryEnabled: boolean("memory_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AgentSetting = typeof agentSettings.$inferSelect;
