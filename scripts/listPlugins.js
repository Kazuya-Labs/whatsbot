#!/usr/bin/env node
import { Handler } from "#plugin/handler.js";
import { registerPlugin } from "#plugin/register.js";

const pad = (text, width) => String(text ?? "").padEnd(width);

const main = async () => {
  await registerPlugin();

  const rows = [...Handler.list.entries()].map(([command, plugin]) => ({
    command,
    access: plugin.options.access || "all",
    tag: plugin.options.tag || "user",
    file: plugin.options.file || "",
  }));

  rows.sort(
    (a, b) => a.access.localeCompare(b.access) || a.command.localeCompare(b.command),
  );

  if (rows.length === 0) {
    console.log("Belum ada plugin terdaftar.");
    process.exit(0);
  }

  console.log(pad("COMMAND", 16) + pad("ACCESS", 10) + pad("TAG", 8) + "FILE");
  console.log("-".repeat(60));

  for (const row of rows) {
    console.log(
      pad(row.command, 16) +
        pad(row.access, 10) +
        pad(row.tag, 8) +
        row.file,
    );
  }

  console.log("-".repeat(60));
  console.log(`Total ${rows.length} command terdaftar.`);
  process.exit(0);
};

main();