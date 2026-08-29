import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/storage/schema.js",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./src/storage/whatsend.db",
  },
});