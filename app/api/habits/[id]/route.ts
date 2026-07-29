import { and, eq, isNull, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { habits } from "../../../../db/schema";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  const result = await getDb()
    .update(habits)
    .set({ archivedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(habits.id, id), eq(habits.owner, user.email), isNull(habits.archivedAt)))
    .returning({ id: habits.id });
  if (!result.length) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ archived: true });
}
