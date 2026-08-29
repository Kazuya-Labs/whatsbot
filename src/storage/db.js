import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.js";

const dbFile = path.join(process.cwd(), "src", "storage", "whatsend.db");
const migrationsFolder = path.join(process.cwd(), "drizzle");

export const sqlite = new Database(dbFile);
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

/** Terapkan migration (idempotent, via tabel `__drizzle_migrations`). */
export const runMigrations = () => {
  migrate(db, { migrationsFolder });
};