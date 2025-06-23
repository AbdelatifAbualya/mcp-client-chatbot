import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Create a new Pool instance with the required SSL configuration
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Pass the configured pool to Drizzle
export const pgDb = drizzlePg(pool);
