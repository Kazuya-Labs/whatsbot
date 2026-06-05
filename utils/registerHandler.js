import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url"; // Diperlukan untuk dynamic import di Windows
import { addUser } from "./db-helper.js";

const Handler = {};
Handler.list = {};

Handler.loadPlugin = async (names, execute, opts = {}) => {
  try {
    const {
      tag = "all",
      owner = false,
      isAdmin = false, // Diubah ke false secara default agar lebih aman bagi user biasa
      isGroup = false,
    } = opts;

    if (!Array.isArray(names)) {
      Handler.list[names] = {
        execute,
        options: { owner, isAdmin, isGroup, tag },
      };
    } else {
      names.forEach((name) => {
        Handler.list[name] = {
          execute,
          options: { owner, isAdmin, isGroup, tag },
        };
      });
    }
  } catch (e) {
    console.error("Error loading plugin:", e);
    throw e;
  }
};

// Menambahkan parameter dirPath agar fungsi rekursif folder berjalan benar
Handler.register = async (dirPath = path.join(process.cwd(), "plugins")) => {
  try {
    const files = await fs.readdir(dirPath);
    await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(dirPath, file);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory() && file !== "utils") {
          // Rekursif untuk membaca sub-folder
          await Handler.register(fullPath);
        } else if (file.endsWith(".js")) {
          try {
            // ESM mewajibkan format URL untuk dynamic import (khususnya agar aman di Windows)
            const fileUrl = pathToFileURL(fullPath).href;

            // Mengganti require() dengan dynamic import()
            const plugin = await import(fileUrl);

            // Mengambil properti yang di-export dari file plugin
            const { names, execute, ...opts } = plugin.default || plugin;

            if (names && execute) {
              await Handler.loadPlugin(names, execute, opts);
              console.log(`Load plugin ${file}...`);
            }
          } catch (error) {
            console.error("Error importing file:", fullPath, error);
          }
        }
      }),
    );
  } catch (e) {
    console.error("Error registering plugins:", e);
  }
};

Handler.executeFn = async (command, opts) => {
  try {
    if (!command || !Handler.list[command]) return;

    const plugin = Handler.list[command];
    const { owner, isGroup, isAdmin } = plugin.options;

    if (owner && !opts.isOwner) {
      if (opts.m && typeof opts.m.reply === "function") {
        await opts.m.reply(
          "❌ Perintah ini hanya dapat digunakan oleh Owner Bot!",
        );
      }
      return;
    }

    if (isGroup && !opts.isGroup) {
      if (opts.m && typeof opts.m.reply === "function") {
        await opts.m.reply(
          "❌ Perintah ini hanya dapat digunakan di dalam Grup!",
        );
      }
      return; // Batalkan eksekusi
    }

    if (isAdmin && !opts.isAdmin) {
      if (opts.m && typeof opts.m.reply === "function") {
        await opts.m.reply(
          "❌ Perintah ini hanya dapat digunakan oleh Admin Grup!",
        );
      }
      return;
    }

    // Simpan ke database sqlite jika lolos semua validasi di atas
    const add_user = await addUser(opts.m.chatLid);

    // Jalankan plugin
    await plugin.execute(opts);
  } catch (e) {
    console.error("Error executing command:", e);
  }
};

export default Handler;
