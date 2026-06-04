import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const user = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phone: text("phone").unique().notNull(),
  saldo: integer("saldo").default(0).notNull(),
  saldo_hold: integer("saldo_hold").default(0).notNull(),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`), // 💡 Tips: Gunakan kurung dalam sql`(...)` agar SQLite mengevaluasinya dengan benar
});

const transaksi = sqliteTable("transaksi", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reff_id: text("reff_id").unique().notNull(),
  user_id: integer("user_id").references(() => user.id), // ✅ Ini sudah benar secara best practice
  produk: text("produk").notNull(),
  tujuan: text("tujuan").notNull(),
  harga: integer("harga").notNull(),
  status: text("status").default("pending").notNull(),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export { user, transaksi };
