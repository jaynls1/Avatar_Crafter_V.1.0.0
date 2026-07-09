import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memorySyncLog = pgTable("memory_sync_log", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  conversationId: integer("conversation_id"),
  notionPageId: text("notion_page_id"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  status: text("status").notNull().default("success"),
  errorMsg: text("error_msg"),
});

export const insertMemorySyncLogSchema = createInsertSchema(memorySyncLog).omit({
  id: true,
  syncedAt: true,
});

export type MemorySyncLog = typeof memorySyncLog.$inferSelect;
export type InsertMemorySyncLog = z.infer<typeof insertMemorySyncLogSchema>;
