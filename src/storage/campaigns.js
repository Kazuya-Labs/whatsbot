import fs from "node:fs/promises";
import path from "node:path";
import { and, count, eq, inArray } from "drizzle-orm";
import { db, runMigrations } from "./db.js";
import { campaigns, cards, targets } from "./schema.js";
import logs from "#utils/logger.js";
import { getConfig } from "#utils/config.js";

/**
 * Uraikan baris `buttons` (TEXT JSON) menjadi array.
 * @param {string|null} raw
 * @returns {Array<object>}
 */
const parseButtons = (raw) => {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

/**
 * Rakit objek campaign dari row DB.
 * @param {typeof campaigns.$inferSelect} camp
 * @param {Array<typeof cards.$inferSelect>} cardRows
 * @param {Array<typeof targets.$inferSelect>} targetRows
 */
const assemble = (camp, cardRows, targetRows) => ({
  id: camp.id,
  text: camp.text,
  footer: camp.footer,
  jeda: camp.jeda,
  enabled: camp.enabled,
  cards: cardRows.map((row) => ({
    title: row.title,
    body: row.body,
    imageUrl: row.imageUrl,
    buttons: parseButtons(row.buttons),
  })),
  targets: targetRows.map((row) => row.jid),
});

/**
 * Ambil satu campaign lengkap (cards + targets).
 * @param {string} id
 */
export const getCampaign = async (id) => {
  const [camp] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);

  if (!camp) return null;

  const [cardRows, targetRows] = await Promise.all([
    db
      .select()
      .from(cards)
      .where(eq(cards.campaignId, id))
      .orderBy(cards.position),
    db.select().from(targets).where(eq(targets.campaignId, id)),
  ]);

  return assemble(camp, cardRows, targetRows);
};

/**
 * Daftar semua campaign lengkap.
 * @returns {Promise<Array<{id: string, text: string, footer: string|null, jeda: number, enabled: boolean, cards: Array, targets: string[]}>>}
 */
export const listCampaigns = async () => {
  const campRows = await db.select().from(campaigns);
  if (campRows.length === 0) return [];

  const ids = campRows.map((c) => c.id);
  const [cardRows, targetRows] = await Promise.all([
    db.select().from(cards).where(inArray(cards.campaignId, ids)).orderBy(cards.position),
    db.select().from(targets).where(inArray(targets.campaignId, ids)),
  ]);

  const cardByCampaign = groupBy(cardRows, (r) => r.campaignId);
  const targetByCampaign = groupBy(targetRows, (r) => r.campaignId);

  return campRows.map((camp) =>
    assemble(camp, cardByCampaign.get(camp.id) ?? [], targetByCampaign.get(camp.id) ?? []),
  );
};

/** @param {any[]} rows @param {(r: any) => string} key */
const groupBy = (rows, key) => {
  const map = new Map();
  for (const row of rows) {
    const k = key(row);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
};

/**
 * Buat campaign baru (transaction driver sync — body TIDAK boleh async).
 * @param {{id: string, text: string, footer?: string|null, cards?: Array, targets?: string[], jeda?: number, enabled?: boolean}} data
 */
export const createCampaign = async (data) => {
  await db.transaction((tx) => {
    tx.insert(campaigns)
      .values({
        id: data.id,
        text: data.text,
        footer: data.footer ?? null,
        jeda: data.jeda ?? getConfig().bot?.defaultJeda ?? 5000,
        enabled: data.enabled ?? true,
      })
      .run();

    for (const [i, card] of (data.cards ?? []).entries()) {
      tx.insert(cards)
        .values({
          campaignId: data.id,
          position: i,
          title: card.title ?? null,
          body: card.body ?? null,
          imageUrl: card.imageUrl ?? null,
          buttons: JSON.stringify(card.buttons ?? []),
        })
        .run();
    }

    for (const jid of data.targets ?? []) {
      tx.insert(targets).values({ campaignId: data.id, jid }).run();
    }
  });
};

/**
 * Tambah target grup ke campaign (ada guard duplikat).
 * @param {string} id
 * @param {string} jid
 * @returns {Promise<{ok: boolean, reason?: 'not_found'|'duplicate', count?: number}>}
 */
export const addTarget = async (id, jid) => {
  const campaign = await getCampaign(id);
  if (!campaign) return { ok: false, reason: "not_found" };
  if (campaign.targets.includes(jid)) return { ok: false, reason: "duplicate" };

  await db.insert(targets).values({ campaignId: id, jid });
  return { ok: true, count: campaign.targets.length + 1 };
};

/**
 * Hapus target grup dari campaign.
 * @returns {Promise<{ok: boolean}>}
 */
export const removeTarget = async (id, jid) => {
  await db.delete(targets).where(and(eq(targets.jid, jid), eq(targets.campaignId, id)));
  return { ok: true };
};

/**
 * Seed sekali jalan dari autoblast.json bila tabel campaign masih kosong.
 * @param {string} jsonPath
 */
export const seedFromJsonIfEmpty = async (jsonPath) => {
  const [{ total }] = await db.select({ total: count() }).from(campaigns);
  if (total > 0) return;

  let raw;
  try {
    raw = await fs.readFile(jsonPath, "utf-8");
  } catch {
    return;
  }

  const { campaigns: data } = JSON.parse(raw);
  for (const [id, camp] of Object.entries(data ?? {})) {
    await createCampaign({
      id,
      text: camp.text,
      footer: camp.footer,
      jeda: camp.jeda,
      enabled: camp.enabled,
      cards: camp.cards ?? [],
      targets: camp.targets ?? [],
    });
  }

  if (total === 0 && data) {
    logs.info(`Seeded ${Object.keys(data).length} campaign dari autoblast.json`);
  }
};

/**
 * Inisialisasi storage dari entrypoint bot: migrate dulu, lalu seed bila perlu.
 */
export const initStorage = async () => {
  runMigrations();
  await seedFromJsonIfEmpty(
    path.join(process.cwd(), "src", "storage", "autoblast.json"),
  );
};