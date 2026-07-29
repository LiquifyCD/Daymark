import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("contains the single-user Daymark login", async () => {
  const [auth, layout, css] = await Promise.all([
    readFile(new URL("../app/auth-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Daymark — Daily check-ins/);
  assert.match(auth, /Keep your word/);
  assert.match(auth, /Enter Daymark/);
  assert.match(auth, /launch-background\.mp4/);
  assert.match(auth, /defaultValue="Liquify"/);
  assert.match(auth, /current-password/);
  assert.match(css, /font-size:\s*16px/);
});

test("ships a GitHub Pages PWA with a versioned offline shell", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url)));
  const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/Daymark/");
  assert.equal(manifest.icons.at(-1).purpose, "maskable");
  assert.match(sw, /daymark-shell-v4/);
  assert.match(config, /output:\s*"export"/);
});

test("keeps Turso behind a separate owner-isolated API", async () => {
  const [worker, dashboard, workflow] = await Promise.all([
    readFile(new URL("../api/worker.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"),
  ]);
  assert.match(worker, /TURSO_AUTH_TOKEN/);
  assert.match(worker, /SESSION_SECRET/);
  assert.match(worker, /crypto\.subtle\.sign\("HMAC"/);
  assert.match(worker, /username !== USERNAME/);
  assert.match(worker, /ON CONFLICT\(habit_id, checked_on\) DO NOTHING/);
  assert.match(dashboard, /daymark-api\.liquifycd\.workers\.dev/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
