import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Database connection
const connectionString = process.env.DATABASE_URL || "";
// For performance reasons, we don't want to use SSL in development
const sql = postgres(connectionString, { ssl: 'require' });
export const db = drizzle(sql);