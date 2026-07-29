import { createClient } from "@libsql/client/web";

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  DAYMARK_PASSWORD: string;
  SESSION_SECRET: string;
}

const ALLOWED_ORIGINS = new Set([
  "https://liquifycd.github.io",
  "http://localhost:3000",
]);
const ALLOWED_ICONS = new Set(["💧", "✦", "☀️", "🌿", "📖", "🏃"]);

const USERNAME = "Liquify";
const OWNER = "liquify";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function cors(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://liquifycd.github.io",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors(request) });
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function signingKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSession(secret: string) {
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({
    sub: OWNER,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

async function validSession(request: Request, secret: string) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      decodeBase64Url(signature),
      new TextEncoder().encode(payload),
    );
    if (!valid) return false;
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as { sub?: unknown; exp?: unknown };
    return claims.sub === OWNER && typeof claims.exp === "number" && claims.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

async function sameSecret(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

function currentDate(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
    const url = new URL(request.url);
    if (url.pathname === "/health") return json(request, { ok: true });

    if (url.pathname === "/login" && request.method === "POST") {
      const payload = await request.json().catch(() => ({})) as { username?: unknown; password?: unknown };
      const username = typeof payload.username === "string" ? payload.username : "";
      const password = typeof payload.password === "string" ? payload.password : "";
      if (username !== USERNAME || !(await sameSecret(password, env.DAYMARK_PASSWORD))) {
        return json(request, { error: "Invalid username or password" }, 401);
      }
      return json(request, { token: await createSession(env.SESSION_SECRET), username: USERNAME });
    }

    if (!(await validSession(request, env.SESSION_SECRET))) return json(request, { error: "Unauthorized" }, 401);
    const owner = OWNER;
    const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

    if (url.pathname === "/habits" && request.method === "GET") {
      const timezone = url.searchParams.get("tz") || "UTC";
      const [habitRows, checkinRows] = await Promise.all([
        db.execute({
          sql: "SELECT id, title, note, icon, created_at AS createdAt FROM habits WHERE owner = ? AND archived_at IS NULL ORDER BY created_at DESC",
          args: [owner],
        }),
        db.execute({
          sql: "SELECT id, habit_id AS habitId, checked_on AS checkedOn FROM checkins WHERE owner = ? ORDER BY checked_on DESC LIMIT 1000",
          args: [owner],
        }),
      ]);
      return json(request, { habits: habitRows.rows, checkins: checkinRows.rows, today: currentDate(timezone) });
    }

    if (url.pathname === "/habits" && request.method === "POST") {
      const payload = await request.json() as { title?: unknown; note?: unknown; icon?: unknown };
      const title = typeof payload.title === "string" ? payload.title.trim() : "";
      const note = typeof payload.note === "string" ? payload.note.trim() : "";
      const icon = typeof payload.icon === "string" && ALLOWED_ICONS.has(payload.icon) ? payload.icon : "✦";
      if (!title || title.length > 80 || note.length > 160) return json(request, { error: "Invalid promise" }, 400);
      const result = await db.execute({
        sql: "INSERT INTO habits (owner, title, note, icon) VALUES (?, ?, ?, ?) RETURNING id, title, note, icon, created_at AS createdAt",
        args: [owner, title, note, icon],
      });
      return json(request, { habit: result.rows[0] }, 201);
    }

    const checkinMatch = url.pathname.match(/^\/habits\/(\d+)\/checkins$/);
    if (checkinMatch && (request.method === "POST" || request.method === "DELETE")) {
      const id = Number(checkinMatch[1]);
      const payload = await request.json().catch(() => ({})) as { timezone?: unknown };
      const timezone = typeof payload.timezone === "string" ? payload.timezone : "UTC";
      const today = currentDate(timezone);
      const habit = await db.execute({
        sql: "SELECT id FROM habits WHERE id = ? AND owner = ? AND archived_at IS NULL LIMIT 1",
        args: [id, owner],
      });
      if (!habit.rows.length) return json(request, { error: "Not found" }, 404);
      if (request.method === "POST") {
        await db.execute({
          sql: "INSERT INTO checkins (habit_id, owner, checked_on) VALUES (?, ?, ?) ON CONFLICT(habit_id, checked_on) DO NOTHING",
          args: [id, owner, today],
        });
        return json(request, { checked: true, checkedOn: today }, 201);
      }
      await db.execute({
        sql: "DELETE FROM checkins WHERE habit_id = ? AND owner = ? AND checked_on = ?",
        args: [id, owner, today],
      });
      return json(request, { checked: false, checkedOn: today });
    }

    const habitMatch = url.pathname.match(/^\/habits\/(\d+)$/);
    if (habitMatch && request.method === "DELETE") {
      const result = await db.execute({
        sql: "UPDATE habits SET archived_at = CURRENT_TIMESTAMP WHERE id = ? AND owner = ? AND archived_at IS NULL RETURNING id",
        args: [Number(habitMatch[1]), owner],
      });
      if (!result.rows.length) return json(request, { error: "Not found" }, 404);
      return json(request, { archived: true });
    }

    return json(request, { error: "Not found" }, 404);
  },
};

export default worker;
