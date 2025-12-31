import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./schema";

// Content Page Schema
export const contentPages = pgTable("content_pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // URL path for the page
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("page"), // e.g., page, marketing, legal, company
  status: text("status").notNull().default("published"), // published, draft, archive
  createdById: integer("created_by_id").references(() => users.id),
  updatedById: integer("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content Page Relations
export const contentPagesRelations = relations(contentPages, ({ many }) => ({
  translations: many(contentTranslations),
}));

// Content Translation Schema
export const contentTranslations = pgTable("content_translations", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().references(() => contentPages.id, { onDelete: "cascade" }),
  languageCode: text("language_code").notNull(), // e.g., en, es, fr, etc.
  content: text("content").notNull(), // JSON content stored as text
  updatedById: integer("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Ensure unique combinations of pageId and languageCode
    langIdx: uniqueIndex("content_translations_page_lang_idx").on(table.pageId, table.languageCode),
  };
});

// Content Translation Relations
export const contentTranslationsRelations = relations(contentTranslations, ({ one }) => ({
  page: one(contentPages, {
    fields: [contentTranslations.pageId],
    references: [contentPages.id],
  }),
}));

// Zod Insert Schemas
export const insertContentPageSchema = createInsertSchema(contentPages)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertContentTranslationSchema = createInsertSchema(contentTranslations)
  .omit({ id: true, updatedAt: true });

// TypeScript Types
export type ContentPage = typeof contentPages.$inferSelect;
export type InsertContentPage = z.infer<typeof insertContentPageSchema>;

export type ContentTranslation = typeof contentTranslations.$inferSelect;
export type InsertContentTranslation = z.infer<typeof insertContentTranslationSchema>;