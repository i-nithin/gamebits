import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString, max: 10 })
  : null;

export function getDb() {
  if (!pool) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(pool, { schema });
}

export function hasDatabase() {
  return Boolean(connectionString);
}
