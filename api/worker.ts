import { createClient } from "@libsql/client/web";

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

const ALLOWED_ORIGINS = new Set([
  "https://liquifycd.github.io",
  "http://localhost:3000",
]);
const ALLOWED_ICONS = new Set(["💧", "✦", "☀️", "🌿", "📖", "🏃"]);

function cors(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://liquifycd.github.io",
    "access-control-allow-headers": "content-type,x-daymark-key",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors(request) });
}

async function ownerFor(request: Request) {
  const key = request.headers.get("x-daymark-key") || "";
  if (key.length < 32 || key.length > 256) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
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

    const owner = await ownerFor(request);
    if (!owner) return json(request, { error: "Unauthorized" }, 401);
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
