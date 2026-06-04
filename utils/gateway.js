import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.APIKEY_MRF;
const API_SECRET = process.env.SCREET_KEY;
const BASE_URL =
  process.env.PPOB_BASE_URL || "https://integrasimrfmedia.my.id/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15 detik batas waktu maksimal request
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
    "X-API-Secret": API_SECRET,
  },
});

/**
 * Helper terisolasi untuk mengekstrak pesan error Axios secara bersih
 * Menghindari kebocoran memori stack trace besar bawaan Axios
 */
const handleAxiosError = (error, context) => {
  const serverMessage =
    error.response?.data?.message || error.response?.data || error.message;
  const statusCode = error.response?.status || "NO_RESPONSE";

  console.error(
    `💥 [GATEWAY_ERROR] di ${context} [HTTP ${statusCode}]:`,
    serverMessage,
  );

  // Lempar pesan ringkas berupa string/objek bersih yang bisa langsung dibaca oleh m.reply bot
  throw new Error(
    typeof serverMessage === "string"
      ? serverMessage
      : `Gagal memproses ${context}`,
  );
};

class Ppob {
  /**
   * Membuat Transaksi Baru (Pulsa/PPOB)
   */
  async create_trx(refId, kode_produk, tujuan) {
    try {
      const { data } = await apiClient.post("/transaction", {
        refId,
        kode_produk,
        tujuan,
      });
      return data;
    } catch (err) {
      handleAxiosError(err, "create_trx");
    }
  }

  /**
   * Mengecek Status Transaksi berdasarkan RefID
   */
  async status_trx(refId) {
    try {
      const { data } = await apiClient.get("/status", {
        params: { refId },
      });

      // Baileys & Drizzle membutuhkan kepastian status boolean yang valid
      if (!data || data.status === false) {
        throw new Error(
          data?.message || "Status transaksi menunjukkan kegagalan.",
        );
      }

      return data;
    } catch (err) {
      handleAxiosError(err, "status_trx");
    }
  }

  /**
   * Mengambil Profil & Saldo Akun Pusat
   */
  async profile() {
    try {
      const { data } = await apiClient.get("/profile");

      if (!data || data.status === false) {
        throw new Error(data?.message || "Gagal memuat profil server pusat.");
      }

      return data;
    } catch (err) {
      handleAxiosError(err, "profile");
    }
  }
}

export default new Ppob();
