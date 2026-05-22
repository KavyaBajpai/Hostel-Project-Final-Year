import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./schema/schema.js",
  out: "./drizzle",   // where migration files will be stored
  dbCredentials: {
    url: process.env.DATABASE_URL,  // use your .env Neon DB URL
  },
});


