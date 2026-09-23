import test from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";

// Run only against a disposable test database: this creates two residents and a report.
test("citizen proxy: IIN auth, cookie, private reports, points and logout", { skip: process.env.CITIZEN_API_TEST !== "1" }, async () => {
  const origin = process.env.CITIZEN_FRONTEND_URL ?? "http://localhost:3001";
  const call = (path, cookie = "", method = "GET", body, source = origin) => fetch(`${origin}/api/backend/${path}`, {
    method, headers: { "Content-Type": "application/json", Origin: source, Cookie: cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const account = () => ({ iin: `9700${String(randomInt(100_000_000)).padStart(8, "0")}`, password: "Synthetic-proxy-test-123", displayName: "Тест интерфейса", districtId: "nura" });
  assert.equal((await call("auth/me")).status, 401);
  assert.equal((await call("auth/citizen/register", "", "POST", account(), "https://untrusted.example")).status, 403);
  const resident = account();
  const register = await call("auth/citizen/register", "", "POST", resident);
  assert.equal(register.status, 200);
  const user = await register.json();
  assert.equal(user.role, "CITIZEN"); assert.equal(user.iin, undefined); assert.equal(user.token, undefined);
  assert.equal((await call("auth/logout", register.headers.get("set-cookie").split(";")[0], "POST", {})).status, 204);
  // The proxy deliberately returns a plain user with HTTP 200 after either auth operation.
  const login = await call("auth/citizen/login", "", "POST", { iin: resident.iin, password: resident.password });
  assert.equal(login.status, 200);
  const header = login.headers.get("set-cookie");
  assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=lax/i);
  const cookie = header.split(";")[0];
  const otherRegister = await call("auth/citizen/register", "", "POST", account());
  const other = otherRegister.headers.get("set-cookie").split(";")[0];
  try {
    assert.equal((await call("auth/me", cookie)).status, 200);
    assert.equal((await call("akim/problems", cookie)).status, 404);
    const created = await call("citizen/reports", cookie, "POST", { title: "Переполнены баки", description: "Не вывозят мусор возле дома", category: "CITY_SERVICES", urgency: "NORMAL", districtId: "nura", locationLabel: "Тестовый адрес прокси", latitude: 51.1, longitude: 71.4 });
    assert.equal(created.status, 201);
    const { id } = await created.json();
    assert.equal((await call(`citizen/my-reports/${id}`, cookie)).status, 200);
    for (const path of [`public/problems/${id}?private=1`, `citizen/my-reports/${id}`, `citizen/problems/${id}/comments`, `citizen/problems/${id}/history`]) {
      assert.equal((await call(path, other)).status, 404);
    }
    assert.equal((await (await call("citizen/my-reports", other)).json()).length, 0);
    const journal = await (await call("public/problems", other)).json();
    assert.ok(journal.every(row => row.status === "RESOLVED" && row.id !== id));
    const profile = await (await call("citizen/profile", cookie)).json();
    assert.equal(profile.reports, 1); assert.equal(profile.points, 10);
    assert.equal((await call("public/qr/UNKNOWN-PROXY", cookie)).status, 404);
  } finally {
    assert.equal((await call("auth/logout", cookie, "POST", {})).status, 204);
    assert.equal((await call("auth/logout", other, "POST", {})).status, 204);
  }
  assert.equal((await call("auth/me", cookie)).status, 401);
});
