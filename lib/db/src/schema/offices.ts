import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const officesTable = pgTable("offices", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  url: text("url").notNull(),
  wing: text("wing").notNull().default("A"),
  accentColor: text("accent_color").notNull().default("#4a9eff"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertOfficeSchema = createInsertSchema(officesTable).omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export type Office = typeof officesTable.$inferSelect;
export type InsertOffice = z.infer<typeof insertOfficeSchema>;
