import test from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";

// Both frontends must point to the same disposable test database.
test("map report appears for citizen and akim, lowers district rating, and recovers after resolution", { skip: process.env.CITY_FLOW_TEST !== "1" }, async () => {
  const citizenOrigin = process.env.CITIZEN_FRONTEND_URL ?? "http://localhost:3002";
  const akimOrigin = process.env.AKIM_FRONTEND_URL ?? "http://localhost:3003";
  const email = process.env.AKIM_TEST_EMAIL;
  const password = process.env.AKIM_TEST_PASSWORD;
  assert.ok(email && password, "Set test akim credentials");
  const call = (origin, cookie, path, method = "GET", body) => fetch(`${origin}/api/backend/${path}`, {
    method, headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  async function json(response, expected = 200) {
    assert.equal(response.status, expected, await response.clone().text());
    return response.json();
  }
  const login = await call(akimOrigin, "", "auth/login", "POST", { email, password });
  await json(login);
  const akimCookie = login.headers.get("set-cookie").split(";")[0];
  let citizenCookie = "";
  try {
    const register = await call(citizenOrigin, "", "auth/citizen/register", "POST", {
      iin: `9700${String(randomInt(100_000_000)).padStart(8, "0")}`,
      password: "Synthetic-map-flow-2026!", displayName: "Проверка карты", districtId: "nura",
    });
    await json(register);
    citizenCookie = register.headers.get("set-cookie").split(";")[0];
    const insights = () => call(akimOrigin, akimCookie, "akim/districts/nura/insights").then(response => json(response));
    const before = await insights();
    const payload = {
      title: "Мусор не вывозят у выбранной точки", description: "Контейнеры переполнены, нужен вывоз мусора.",
      districtId: "nura", locationLabel: "Тест карты: двор у Хан Шатыра", latitude: 51.1325, longitude: 71.404,
      category: "CITY_SERVICES", urgency: "IMPORTANT",
    };
    const created = await json(await call(citizenOrigin, citizenCookie, "citizen/reports", "POST", payload), 201);
    assert.equal(created.problemId, created.id);
    const own = await json(await call(citizenOrigin, citizenCookie, "citizen/my-reports"));
    assert.ok(own.some(row => row.id === created.id && row.status === "NEW"));
    const detail = await json(await call(citizenOrigin, citizenCookie, `citizen/my-reports/${created.id}`));
    assert.equal(detail.latitude, payload.latitude);
    assert.equal(detail.longitude, payload.longitude);
    assert.equal(detail.locationLabel, payload.locationLabel);
    const incoming = await json(await call(akimOrigin, akimCookie, "akim/problems?district=nura&status=NEW&size=50"));
    assert.ok(incoming.some(row => row.id === created.id && row.title === payload.title));
    const active = await insights();
    assert.equal(active.rating.active, before.rating.active + 1);
    assert.ok(active.rating.activePenalty > before.rating.activePenalty);
    assert.ok(active.rating.score < before.rating.score);
    assert.ok(active.recommendations.some(row => row.address === payload.locationLabel));
    let version = detail.version;
    for (const status of ["UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"]) {
      const updated = await json(await call(akimOrigin, akimCookie, `akim/problems/${created.id}/status`, "PATCH", {
        status, version, ...(status === "RESOLVED" ? { note: "Проверка интеграции: вывоз выполнен" } : {}),
      }));
      version = updated.version;
    }
    const resolved = await insights();
    assert.equal(resolved.rating.active, before.rating.active);
    assert.equal(resolved.rating.resolved, before.rating.resolved + 1);
    assert.ok(resolved.rating.score > active.rating.score);
    const afterOwn = await json(await call(citizenOrigin, citizenCookie, "citizen/my-reports"));
    assert.ok(afterOwn.some(row => row.id === created.id && row.status === "RESOLVED"));
    const publicDetail = await json(await call(citizenOrigin, "", `public/problems/${created.id}`));
    assert.equal(publicDetail.status, "RESOLVED");
  } finally {
    if (citizenCookie) assert.equal((await call(citizenOrigin, citizenCookie, "auth/logout", "POST", {})).status, 204);
    assert.equal((await call(akimOrigin, akimCookie, "auth/logout", "POST", {})).status, 204);
  }
});
