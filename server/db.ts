import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Database connection
const connectionString = process.env.DATABASE_URL || "";
// SSL is already configured in the connection string for Neon
const sql = postgres(connectionString);
export const db = drizzle(sql);