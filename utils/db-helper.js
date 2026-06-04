import { db } from "../db/index.js";
import { user } from "../db/schema.js"; // 🛠️ 1. Wajib import objek skema tabel
import { eq } from "drizzle-orm"; // 🛠️ 2. Diperlukan untuk query pencarian nanti

const addUser = async (nomor) => {
  try {
    const parseNumber = nomor.split("@")[0];

    // 🛠️ 3. Ganti "users" dengan objek tabel 'user'
    // 🛠️ 4. Gunakan .onConflictDoNothing() karena phone bersifat unik.
    // Jika nomor sudah ada, database akan mengabaikan (tidak error) dan lanjut ke bawah.
    const result = await db
      .insert(user)
      .values({
        phone: parseNumber,
      })
      .onConflictDoNothing()
      .returning();

    // Jika ini user baru (berhasil insert), kembalikan id-nya
    if (result.length > 0) {
      return result[0].id;
    }

    // 💡 JIKA USER SUDAH ADA: Ambil ID user yang sudah terdaftar tersebut berdasarkan nomor HP
    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.phone, parseNumber))
      .get(); // .get() khusus SQLite untuk mengambil 1 baris data langsung berbentuk objek

    return existingUser ? existingUser.id : null;
  } catch (err) {
    throw err;
  }
};

class Database {
  constructor(tableName) {
    // Otomatis mengambil referensi tabel dari index.js berdasarkan namanya
    this.table = db._.fullSchema[tableName];
    if (!this.table) {
      throw new Error(
        `Tabel "${tableName}" tidak ditemukan di dalam skema database!`,
      );
    }
  }

  // --- 1. CREATE ---
  async create(data) {
    const [result] = await db.insert(this.table).values(data).returning();
    return result;
  }

  // --- 2. READ BY ID ---
  async findById(id) {
    return await db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .get(); // .get() khusus SQLite untuk mengambil 1 objek langsung
  }

  // --- 3. UPDATE BY ID ---
  async updateById(id, data) {
    const [result] = await db
      .update(this.table)
      .set(data)
      .where(eq(this.table.id, id))
      .returning();
    return result;
  }

  // --- 4. DELETE BY ID ---
  async deleteById(id) {
    const [result] = await db
      .delete(this.table)
      .where(eq(this.table.id, id))
      .returning();
    return result;
  }

  // --- 5. KOSTUMISASI CHAINING ---
  // Method ini mengembalikan query builder dasar Drizzle agar bisa di-chaining sesuka hati
  query() {
    return db.select().from(this.table);
  }

  // Mengekspos method update mentah untuk custom chaining update
  customUpdate() {
    return db.update(this.table);
  }

  async transaction(callback) {
    return await db.transaction(callback);
  }

  // Mengekspos method delete mentah untuk custom chaining delete
  customDelete() {
    return db.delete(this.table);
  }
}

export { addUser, Database };
