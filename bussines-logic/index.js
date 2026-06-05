import dotenv from "dotenv";
import gateway from "../utils/gateway.js";
import { createOrderSecure } from "../utils/order-helper.js";
import { addUser } from "../utils/db-helper.js";
dotenv.config();

const Produk = {};
const MAX_ORDER = 10;
const DELAY_MS = 2000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseMultiOrder = (text) => {
  const baris = text
    .trim()
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (baris.length === 0) return false;

  const regexFormat = /^[A-Z0-9]+\.(08|62)\d+$/i;
  const dataPesanan = [];

  for (const b of baris) {
    if (!regexFormat.test(b)) {
      if (process.env.DEBUG)
        console.log(
          `-> [AUDIT-FAIL] Baris "${b}" tidak cocok format KODE.NOMOR`,
        );
      return false;
    }

    const [code, nomor] = b.split(".");
    const productCode = code.toUpperCase();
    const statusProduk = Produk[productCode] ?? null;

    dataPesanan.push({
      code: productCode,
      nomor,
      isValidProduct: !!statusProduk,
      harga: statusProduk?.harga ?? 0,
    });
  }

  return dataPesanan;
};

const registerProduk = async () => {
  try {
    const produk = await gateway.listProduk(null);
    const filtered =
      produk?.data?.filter((item) => !item.stok && !item.gangguan) || [];

    for (const key in Produk) delete Produk[key];
    for (const item of filtered) {
      if (item.kode) {
        Produk[item.kode.toUpperCase()] = item;
      }
    }
  } catch (err) {
    throw err;
  }
};

const handlerProduk = async (m) => {
  try {
    if (!m.text) return;

    const lines = m.text.trim().split(/\r?\n/);
    const firstLine = lines[0] ? lines[0].trim() : "";

    const [cmd] = firstLine.split(".");
    if (!cmd) return;

    const productCode = cmd.toUpperCase();
    const isCode = Produk[productCode];
    if (!isCode) return;

    if (process.env.DEBUG) {
      console.log(
        `-> [AUDIT-MATCH] Validasi awal lolos untuk kode: [${productCode}].`,
      );
    }

    const listOrder = parseMultiOrder(m.text);
    if (!listOrder) {
      if (process.env.DEBUG)
        console.log(
          "-> [AUDIT-FAIL] Format atau struktur baris multi-order rusak.",
        );
      return;
    }

    if (listOrder.length > MAX_ORDER) {
      if (process.env.DEBUG)
        console.log(
          `-> [AUDIT-FAIL] Order sebanyak ${listOrder.length} baris ditolak karena melebihi batas maksimal.`,
        );
      return m.reply(
        `❌ *Transaksi Dibatalkan!*\nMaksimal pemesanan adalah ${MAX_ORDER} baris dalam satu pesan.`,
      );
    }

    const phoneUser = m.senderJid.split("@")[0];
    await addUser(m.senderJid);

    const produkTidakTersedia = listOrder.filter(
      (item) => !item.isValidProduct,
    );
    if (produkTidakTersedia.length > 0) {
      const kodeGagal = produkTidakTersedia.map((i) => i.code).join(", ");
      if (process.env.DEBUG)
        console.log(
          `-> [AUDIT-FAIL] Produk tidak terdaftar/sedang gangguan: [${kodeGagal}]`,
        );
      return m.reply(
        `❌ *Transaksi Dibatalkan!*\nProduk [${kodeGagal}] tidak tersedia atau gangguan.`,
      );
    }

    // Eksekusi untuk 1 baris transaksi saja (Single Transaction)
    if (listOrder.length === 1) {
      const singleItem = listOrder[0];
      if (process.env.DEBUG)
        console.log(
          `-> [AUDIT-EXEC] Menjalankan single order senilai Rp ${singleItem.harga}`,
        );

      // isMultiOrder bernilai false (Akan mengirim balasan pesan "TRANSAKSI DIPROSES" bawaan helper)
      await createOrderSecure(
        m,
        phoneUser,
        singleItem.code,
        singleItem.nomor,
        singleItem.harga,
        false,
      );
      return;
    }

    // Eksekusi untuk banyak baris transaksi (Multi-Order)
    if (process.env.DEBUG)
      console.log(
        `-> [AUDIT-EXEC] Menjalankan multi-order untuk ${listOrder.length} baris.`,
      );

    let laporanSukses = `📝 *Laporan Multi-Order*\nPengirim: @${phoneUser}\n\n`;
    let totalItem = 0;

    for (let i = 0; i < listOrder.length; i++) {
      const item = listOrder[i];
      try {
        if (i > 0) {
          if (process.env.DEBUG)
            console.log(
              `-> [AUDIT-DELAY] Jeda ${DELAY_MS}ms sebelum memproses baris ke-${i + 1}`,
            );
          await delay(DELAY_MS);
        }

        //NOTE:  isMultiOrder bernilai true (Senyap / tidak membalas pesan "TRANSAKSI DIPROSES" per nomor)
        await createOrderSecure(
          m,
          phoneUser,
          item.code,
          item.nomor,
          item.harga,
          true,
        );

        laporanSukses += `✅ ${item.code} ➔ ${item.nomor} (Sukses)\n`;
        totalItem++;
      } catch (orderError) {
        laporanSukses += `❌ ${item.code} ➔ ${item.nomor} (Gagal: ${orderError.message})\n`;
      }
    }

    if (process.env.DEBUG)
      console.log(
        `-> [AUDIT-DONE] Multi-order rampung. Sukses: ${totalItem}/${listOrder.length}`,
      );
    await m.reply(
      `${laporanSukses}\nTotal: ${totalItem}/${listOrder.length} berhasil diproses.`,
    );
  } catch (error) {
    console.error("Error handlerProduk:", error);
    return m.reply("⚠️ Terjadi kesalahan internal saat memproses pesanan.");
  }
};

export { registerProduk, handlerProduk };
