import test from "node:test";
import assert from "node:assert/strict";

test("akim proxy authenticates, protects mutations and persists server scenarios", { skip: process.env.AKIM_API_TEST !== "1" }, async () => {
  const origin = process.env.AKIM_FRONTEND_URL ?? "http://localhost:3000";
  const email = process.env.AKIM_TEST_EMAIL;
  const password = process.env.AKIM_TEST_PASSWORD;
  assert.ok(email && password, "Set AKIM_TEST_EMAIL and AKIM_TEST_PASSWORD for a test akim account");
  let cookie = "";
  async function call(path, method = "GET", body, overrideOrigin = origin) {
    return fetch(`${origin}/api/backend/${path}`, { method, headers: { "Content-Type": "application/json", Origin: overrideOrigin, Cookie: cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  assert.equal((await call("auth/me")).status, 401);
  assert.equal((await call("auth/login", "POST", { email, password }, "https://untrusted.example")).status, 403);
  const login = await call("auth/login", "POST", { email, password });
  assert.equal(login.status, 200);
  const user = await login.json();
  assert.equal(user.role, "AKIM"); assert.equal(user.token, undefined);
  const setCookie = login.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=lax/i);
  cookie = setCookie.split(";")[0];
  try {
    assert.equal((await call("auth/me")).status, 200);
    assert.equal((await call("auth/register", "POST", {})).status, 404);
    const catalog = await (await call("public/catalog")).json();
    assert.equal(catalog.districts.length, 5); assert.equal(catalog.measures.length, 14);
    const selections = [{ id: "M7", district: "nura" }, { id: "M8", district: "nura" }, { id: "M10", district: "nura" }, { id: "M12" }, { id: "M5", district: "saryarka" }];
    const preview = await (await call("akim/simulation/preview", "POST", { selections })).json();
    assert.ok(Math.abs(preview.score - 56.54307) < .000001);
    const created = await call("akim/scenarios", "POST", { name: "Проверка API фронтенда", selections });
    assert.equal(created.status, 201);
    const draft = await created.json();
    assert.equal((await call(`akim/scenarios/${draft.id}`)).status, 200);
    const updated = await call(`akim/scenarios/${draft.id}`, "PUT", { name: "Проверка сохранения", selections, version: draft.version });
    assert.equal(updated.status, 200);
    const saved = await updated.json();
    assert.equal((await call(`akim/scenarios/${draft.id}`, "PUT", { name: "Stale", selections, version: draft.version })).status, 409);
    const final = await call(`akim/scenarios/${draft.id}/finalize`, "POST", { version: saved.version });
    assert.equal(final.status, 200); assert.equal((await final.json()).status, "FINAL");
    assert.equal((await call(`akim/scenarios/${draft.id}`, "PUT", { name: "Locked", selections, version: saved.version + 1 })).status, 409);
    assert.equal((await call("akim/problems?district=nura&status=NEW")).status, 200);
    const insights = await (await call("akim/districts/nura/insights")).json();
    assert.equal(insights.districtId, "nura");
    assert.ok(insights.rating.score >= 0 && insights.rating.score <= 100);
    assert.ok(Math.abs(insights.rating.baseline - 49.18) < .000001);
    assert.ok(insights.trainingSamples >= 32);
    assert.ok(Array.isArray(insights.recommendations));
  } finally { assert.equal((await call("auth/logout", "POST", {})).status, 204); }
  assert.equal((await call("auth/me")).status, 401);
});
