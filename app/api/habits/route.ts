import { and, desc, eq, isNull } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { checkins, habits } from "../../../db/schema";

const ALLOWED_ICONS = new Set(["💧", "✦", "☀️", "🌿", "📖", "🏃"]);

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

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const timezone = new URL(request.url).searchParams.get("tz") || "UTC";
  const db = getDb();
  const [habitRows, checkinRows] = await Promise.all([
    db
      .select()
      .from(habits)
      .where(and(eq(habits.owner, user.email), isNull(habits.archivedAt)))
      .orderBy(desc(habits.createdAt)),
    db
      .select()
      .from(checkins)
      .where(eq(checkins.owner, user.email))
      .orderBy(desc(checkins.checkedOn))
      .limit(1000),
  ]);
  return Response.json({ habits: habitRows, checkins: checkinRows, today: currentDate(timezone) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = (await request.json()) as { title?: unknown; note?: unknown; icon?: unknown };
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const icon = typeof payload.icon === "string" && ALLOWED_ICONS.has(payload.icon) ? payload.icon : "✦";
  if (!title || title.length > 80 || note.length > 160) {
    return Response.json({ error: "Invalid promise" }, { status: 400 });
  }
  const [habit] = await getDb()
    .insert(habits)
    .values({ owner: user.email, title, note, icon })
    .returning();
  return Response.json({ habit }, { status: 201 });
}
