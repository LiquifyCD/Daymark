import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("contains the signed-out Daymark experience", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Daymark — Daily check-ins/);
  assert.match(page, /Keep your word/);
  assert.match(page, /Sign in to Daymark/);
  assert.match(page, /launch-background\.mp4/);
  assert.match(css, /font-size:\s*16px/);
  assert.doesNotMatch(`${page}${layout}`, /codex-preview|react-loading-skeleton/i);
});

test("ships an installable manifest and versioned offline shell", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url)));
  const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.at(-1).purpose, "maskable");
  assert.match(sw, /daymark-shell-v2/);
  assert.match(sw, /\/api\//);
  assert.doesNotMatch(sw, /cache\.put\("\/"/);
});

test("enforces per-user, per-day check-ins", async () => {
  const [schema, checkinRoute] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/habits/[id]/checkins/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /checkins_habit_day_unique/);
  assert.match(checkinRoute, /eq\(habits\.owner,\s*user\.email\)/);
  assert.match(checkinRoute, /onConflictDoNothing/);
});
