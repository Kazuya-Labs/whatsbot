import fs from "fs/promises";
import { pathToFileURL } from "url";
import { loadPlugins } from "./loadPlugins.js";
import path from "path";
import logs from "../utils/logs.js";

const registerPlugin = async (
  dirPath = path.join(process.cwd(), "plugins"),
) => {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const len = files.length;
    if (len === 0) return;

    const promises = [];

    for (let i = 0; i < len; i++) {
      const file = files[i];
      const fullPath = path.join(dirPath, file.name);

      if (file.isDirectory()) {
        if (file.name !== "utils") {
          promises.push(registerPlugin(fullPath));
        }
      } else if (file.isFile() && file.name.endsWith(".js")) {
        promises.push(
          (async () => {
            try {
              logs.info("proses register plugin ", fullPath);
              const plugin = await import(pathToFileURL(fullPath).href);
              const data = plugin.default || plugin;

              const names = data.names || data.name;
              if (names && data.execute) {
                loadPlugins(names, data.execute, data);
              }
            } catch (error) {
              console.error("Error importing file:", fullPath, error.message);
            }
          })(),
        );
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (e) {
    console.error("Error registering plugins:", e);
  }
};

export { registerPlugin };
