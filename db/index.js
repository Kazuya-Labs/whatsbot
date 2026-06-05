import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const sqlite = new Database("bot.db");

// ⚡ Optimasi performa untuk aplikasi chat/bot (Sudah ada di kode Anda)
sqlite.pragma("journal_mode = WAL");

// 🛡️ WAJIB: Aktifkan pengecekan Foreign Key agar Drizzle-ORM berjalan normal
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
