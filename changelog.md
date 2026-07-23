### 🚀 Release Notes & Changelog
📝 Ringkasan Perubahan
Pembaruan ini menghadirkan fitur manajemen target campaign WhatsApp secara dinamis via chat, serta memperbaiki bug krusial pada penanganan pesan di grup yang menyebabkan perintah dari akun bot sendiri (fromMe) gagal terdeteksi.

✨ Detail Perubahan
## 1. 🚀 Fitur Baru: Dynamic Target Management (addidBlast)
Command Baru: .addidblast <campaign_id> | <group_jid>

Auto Group Detection: Cukup ketik .addidblast <campaign_id> di dalam grup target.

Safety & Validation:

Menolak JID yang bukan merupakan ID grup WhatsApp (@g.us).

Mengecek ketersediaan campaign_id di database.

Mencegah duplikasi ID grup dalam satu campaign.

Storage Update: Otomatis melakukan write-back ke src/storage/autoblast.json dengan format JSON terstruktur (null, 2).

 ## 2. 🐛 Perbaikan Bug: Message Upsert & Self-Command Detection
Bot Self-Command Fix (fromMe): Memperbaiki kegagalan resolusi JID pengirim saat bot mengeksekusi perintahnya sendiri di dalam grup dengan menambahkan fallback ke sock.user.id.

Fix Logic isGroup: Mengubah evaluasi isGroup agar dipanggil sebagai fungsi isGroup(key?.remoteJid), bukan lagi mengecek eksistensi referensi objek fungsi.

Fix Crash isAdmin: Menggunakan optional chaining (participant?.admin) dan pembersihan Device JID (:xx@s.whatsapp.net) untuk mencegah error TypeError: Cannot read properties of undefined (reading 'admin') yang menghentikan eksekusi pesan.

## 📁 File Terkait
src/plugins/addidblast.js (File Baru)

src/storage/autoblast.json (Struktur Data Target)

src/handlers/messageUpsert.js (Perbaikan Event Listener & Bug Fix)