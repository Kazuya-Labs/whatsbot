import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Campaign utama untuk fitur auto-blast.
 */
export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  footer: text("footer"),
  jeda: integer("jeda").notNull().default(5000),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

/**
 * Kartu pada campaign (carousel card) — 1 campaign punya N cards.
 */
export const cards = sqliteTable(
  "campaign_cards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    title: text("title"),
    body: text("body"),
    imageUrl: text("image_url"),
    buttons: text("buttons"),
  },
  (t) => [index("idx_cards_campaign").on(t.campaignId)],
);

/**
 * Grup target penerima blast — 1 campaign punya N targets.
 */
export const targets = sqliteTable(
  "campaign_targets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    jid: text("jid").notNull(),
  },
  (t) => [uniqueIndex("idx_targets_campaign_jid").on(t.campaignId, t.jid)],
);