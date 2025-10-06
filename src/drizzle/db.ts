// import "dotenv/config"
// import { Client } from "pg"
// import {drizzle} from "drizzle-orm/node-postgres";
// import * as schema from "./schema"
 
 
// export const client = new Client({
//     connectionString: process.env.DATABASE_URL as string
// });
 
// const main = async () =>{
//     await client.connect(); //connect to the database  
// }
 
// main().catch(console.error)
 
// const db = drizzle(client,{schema, logger:true});
// export default db;

// import "dotenv/config";
// import { neon } from "@neondatabase/serverless"
// import { drizzle } from "drizzle-orm/neon-http"
// import * as schema from  "./schema";

// if (!process.env.DATABASE_URL) {
//   throw new Error("DATABASE_URL is not defined in environment variables");
// }

// const client = neon(process.env.DATABASE_URL);
// const db = drizzle(client, { schema, logger: true });

// export default db;


// src/drizzle/db.ts
import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

// Create a connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Optional: configure pool settings
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection
});

const db = drizzle(pool, { 
  schema, 
  logger: true 
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

export default db;