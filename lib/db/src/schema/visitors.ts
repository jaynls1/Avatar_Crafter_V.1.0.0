import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const visitorsTable = pgTable("visitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertVisitorSchema = createInsertSchema(visitorsTable).omit({
  id: true,
  createdAt: true,
});

export type Visitor = typeof visitorsTable.$inferSelect;
export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
