import { env } from "cloudflare:workers";
import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function getDb() {
  const runtimeEnv = env as typeof env & {
    TURSO_DATABASE_URL?: string;
    TURSO_AUTH_TOKEN?: string;
  };
  if (!runtimeEnv.TURSO_DATABASE_URL || !runtimeEnv.TURSO_AUTH_TOKEN) {
    throw new Error(
      "Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the runtime environment.",
    );
  }

  const client = createClient({
    url: runtimeEnv.TURSO_DATABASE_URL,
    authToken: runtimeEnv.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}
