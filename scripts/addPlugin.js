#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const VALID_ACCESS = ["owner", "admin", "groups", "private", "all"];
const PLUGIN_DIR = path.join(process.cwd(), "src", "plugins");

const USAGE = `
Usage:
  npm run add:plugin -- <name> [--access=<owner|admin|groups|private|all>]

  name    Nama plugin (alfanumerik + dash). Menjadi command word tanpa prefix.
  access  Hak akses (default: all). Plugin dibuat di src/plugins/<access>/<name>.js
            owner   = hanya owner bot
            admin   = admin grup + owner
            groups  = hanya di dalam grup
            private = hanya di chat private (owner & publik)
            all     = semua bisa akses
`;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = { name: null, access: "all" };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--access=")) {
      result.access = arg.slice("--access=".length);
    } else if (arg === "--access") {
      result.access = args[++i];
    } else if (arg.startsWith("-a=")) {
      result.access = arg.slice(3);
    } else if (!arg.startsWith("-") && !result.name) {
      result.name = arg;
    }
  }

  return result;
};

const main = () => {
  const { name, access } = parseArgs();

  if (!name || !/^[a-z0-9-]+$/.test(name) || name.startsWith("-") || name.endsWith("-")) {
    console.error("Nama plugin tidak valid. Gunakan huruf kecil, angka, dan dash.");
    console.error(USAGE);
    process.exit(1);
  }

  if (!VALID_ACCESS.includes(access)) {
    console.error(
      `Access tidak valid: "${access}". Opsi: ${VALID_ACCESS.join(", ")}.`,
    );
    process.exit(1);
  }

  const filePath = path.join(PLUGIN_DIR, access, `${name}.js`);
  if (fs.existsSync(filePath)) {
    console.error(`File sudah ada: ${filePath}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const template = `import { createPlugin } from "#utils/plugin.js";

export default createPlugin({
  names: ["${name}"],
  access: "${access}",
  description: "${name}",
  run: async ({ m, sock }) => {
    return m.reply(\`Command *${name}* aktif (access: ${access}).\`);
  },
});
`;

  fs.writeFileSync(filePath, template);
  console.log(`✅ Plugin dibuat: ${filePath}`);
  console.log(`   Command: .${name} (prefix ! atau .) | access: ${access}`);
  console.log("   Restart bot untuk mendaftarkan plugin.");
};

main();