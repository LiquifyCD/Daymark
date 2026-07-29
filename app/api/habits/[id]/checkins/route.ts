import { and, eq, isNull } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { checkins, habits } from "../../../../../db/schema";

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

async function contextFor(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id)) return { error: Response.json({ error: "Invalid id" }, { status: 400 }) };
  const payload = (await request.json().catch(() => ({}))) as { timezone?: unknown };
  const timezone = typeof payload.timezone === "string" ? payload.timezone : "UTC";
  const db = getDb();
  const [habit] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.owner, user.email), isNull(habits.archivedAt)))
    .limit(1);
  if (!habit) return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  return { db, user, id, today: currentDate(timezone) };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await contextFor(request, context);
  if ("error" in result) return result.error;
  await result.db
    .insert(checkins)
    .values({ habitId: result.id, owner: result.user.email, checkedOn: result.today })
    .onConflictDoNothing({ target: [checkins.habitId, checkins.checkedOn] });
  return Response.json({ checked: true, checkedOn: result.today }, { status: 201 });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await contextFor(request, context);
  if ("error" in result) return result.error;
  await result.db
    .delete(checkins)
    .where(
      and(
        eq(checkins.habitId, result.id),
        eq(checkins.owner, result.user.email),
        eq(checkins.checkedOn, result.today),
      ),
    );
  return Response.json({ checked: false, checkedOn: result.today });
}
