import logs from "../utils/logs.js";

const Handler = {
  list: new Map(),
};

const message = {
  onlyOwner: "❌ Perintah ini hanya dapat digunakan oleh Owner Bot!",
  onlyGrup: "❌ Perintah ini hanya dapat digunakan di dalam Grup!",
  onlyAdmin: "❌ Perintah ini hanya dapat digunakan oleh Admin Grup!",
};

const executeFn = async (command, opts) => {
  try {
    console.log("🚀 ~ executeFn ~ command:", command)
    if (!command || !opts) return;

    // 🌟 LOGIKA 1: Jika teks masuk tidak ada di daftar command, langsung KELUAR (Return)
    // Ini menghemat memori & mencegah spam dari obrolan/grup biasa
    const plugin = Handler.list.get(command);
    console.log("🚀 ~ executeFn ~ plugin:", plugin)
    if (!plugin) return;

    const options = plugin.options;
    //console.log("🚀 ~ executeFn ~ options:", options)
    const m = opts.m;
    console.log("🚀 ~ executeFn ~ m:", m)
    if (!m?.sender) return;

    // Abaikan proteksi pendaftaran jika eksekutor adalah Owner Bot
    if (!m?.isOwner) {
      console.log("🚀 ~ executeFn ~ isOwner:", m?.isOwner)
      //   // Cek status pendaftaran di database SQLite
      //   const isRegistered = await .isRegister(m.senderJid);
      //   const isRegisterCommand = command.toLowerCase().includes("daftar");

      //   if (!isRegistered) {
      //     if (isRegisterCommand) {
      //       await RegisterHelper.registered(m.senderJid).catch(() => null);
      //     } else {
      //       await RegisterHelper.message(m);
      //       return;
      //     }
      return;
    }

    // Validasi Hak Akses Fitur Owner
    // console.log("🚀 ~ executeFn gagal")
    if (options.owner && !m.isOwner) return m.reply(onlyOwner);

    // // Validasi Hak Akses Fitur Grup
    // if (options.isGroup && !m.isGroup) return m.reply(onlyGrup);
    // // Validasi Hak Akses Fitur Admin Grup
    // if (options.isAdmin && !m.isAdmin) return m.reply(onlyAdmin);
    logs.debug('execute')
    await plugin.execute(opts);
  } catch (e) {
    console.error("Error executing command:", e);
  }
};

export { Handler,executeFn };
