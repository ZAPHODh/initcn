import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas/drizzle.schema";

const globalForDb = globalThis as unknown as {
	client: postgres.Sql | undefined;
	db: ReturnType<typeof drizzle> | undefined;
};

const client =
	globalForDb.client ?? postgres(process.env.DATABASE_URL!, { max: 1 });
export const db = globalForDb.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
	globalForDb.client = client;
	globalForDb.db = db;
}
