// config/db.js

import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as schema from "../schema/schema.js";

neonConfig.fetchConnectionCache = true;
config({ path: ".env" });

export async function connectToDB() {
  try {
    const sql = neon(process.env.DATABASE_URL); 
    const db = drizzle(sql, { schema });         

    await sql`SELECT 1`;
    console.log("Connected to Neon DB");

    return db;
  } catch (e) {
    console.error("Error connecting to Neon DB:", e);
    throw e;
  }
}
