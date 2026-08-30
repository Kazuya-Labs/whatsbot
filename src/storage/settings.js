import { eq } from "drizzle-orm";
import { groupSettings } from "./schema.js";
import { db } from "./db.js";

/** Default setting grup bila belum pernah disimpan. */
export const DEFAULT_GROUP_SETTINGS = Object.freeze({
  antilink: { enabled: false, mode: "invite", kick: false },
  badword: { enabled: false, words: [] },
});

/** @typedef {ReturnType<typeof makeSettingsRepo>} SettingsRepo */

/**
 * Pabrik repository setting grup, menerima `db` supaya mudah diuji
 * (SQLite in-memory). Setting disimpan sebagai satu blob JSON per grup.
 *
 * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} injectedDb
 */
export const makeSettingsRepo = (injectedDb) => {
  const parseSettings = (settings) => {
    try {
      return JSON.parse(settings);
    } catch {
      return null;
    }
  };

  /**
   * Ambil setting grup; kembalikan defaults kalau belum ada (tanpa menulis DB).
   * @param {string} groupJid
   * @returns {Promise<object>}
   */
  const getSettings = async (groupJid) => {
    const rows = await injectedDb
      .select({ settings: groupSettings.settings })
      .from(groupSettings)
      .where(eq(groupSettings.groupJid, groupJid))
      .all();

    const current = rows[0] ? parseSettings(rows[0].settings) : null;
    if (!current) return JSON.parse(JSON.stringify(DEFAULT_GROUP_SETTINGS));

    return {
      antilink: { ...DEFAULT_GROUP_SETTINGS.antilink, ...current.antilink },
      badword: { ...DEFAULT_GROUP_SETTINGS.badword, ...current.badword },
    };
  };

  /**
   * Simpan setting grup (merge per kunci utama: antilink/badword). Upsert.
   * @param {string} groupJid
   * @param {object} patch - contoh `{ antilink: { kick: true } }`.
   */
  const updateSettings = async (groupJid, patch = {}) => {
    const current = await getSettings(groupJid);
    const next = {
      antilink: { ...current.antilink, ...patch.antilink },
      badword: { ...current.badword, ...patch.badword },
    };

    injectedDb
      .insert(groupSettings)
      .values({
        groupJid,
        settings: JSON.stringify(next),
      })
      .onConflictDoUpdate({
        target: groupSettings.groupJid,
        set: {
          settings: JSON.stringify(next),
          updatedAt: new Date().toISOString(),
        },
      })
      .run();

    return next;
  };

  /** Hapus baris setting grup. */
  const deleteSettings = (groupJid) => {
    injectedDb
      .delete(groupSettings)
      .where(eq(groupSettings.groupJid, groupJid))
      .run();
  };

  return { getSettings, updateSettings, deleteSettings };
};

/** Instance default memakai DB utama aplikasi. */
export const settingsRepo = makeSettingsRepo(db);