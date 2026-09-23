import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const cookieName = "akim_session";
const backend = (process.env.BACKEND_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "");
const allowed: Record<string, RegExp[]> = {
  GET: [/^auth\/me$/, /^public\/(catalog|baseline)$/, /^akim\/scenarios(?:\/[a-f0-9-]{36})?$/, /^akim\/problems(?:\/[a-f0-9-]{36}(?:\/history)?)?$/],
  POST: [/^auth\/(login|logout)$/, /^akim\/simulation\/preview$/, /^akim\/scenarios(?:\/[a-f0-9-]{36}\/finalize)?$/],
  PUT: [/^akim\/scenarios\/[a-f0-9-]{36}$/],
  PATCH: [/^akim\/problems\/[a-f0-9-]{36}\/status$/],
};
function error(status: number, detail: string) { return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } }); }

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!allowed[request.method]?.some(pattern => pattern.test(path))) return error(404, "Запрос не поддерживается");
  if (request.method !== "GET" && request.headers.get("origin") !== request.nextUrl.origin) return error(403, "Недопустимый источник запроса");
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  const login = path === "auth/login";
  const logout = path === "auth/logout";
  if (!login && !token) return error(401, "Войдите в кабинет акима");
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && new TextEncoder().encode(body).length > 32768) return error(413, "Слишком большой запрос");
    const response = await fetch(`${backend}/api/${path}${request.nextUrl.search}`, {
      method: request.method, cache: "no-store", signal: AbortSignal.timeout(12000),
      headers: { "Content-Type": "application/json", ...(!login && token ? { Authorization: `Bearer ${token}` } : {}) }, body,
    });
    if (logout && (response.ok || response.status === 401)) {
      jar.delete(cookieName); return new NextResponse(null, { status: 204 });
    }
    if (response.status === 401 && !login) jar.delete(cookieName);
    if (login && response.ok) {
      const session = await response.json();
      if (session.user.role !== "AKIM") {
        await fetch(`${backend}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(5000) });
        return error(403, "Этот кабинет доступен только акиму. Используйте учётную запись акима.");
      }
      jar.set(cookieName, session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:", path: "/", expires: new Date(session.expiresAt) });
      return NextResponse.json(session.user, { headers: { "Cache-Control": "no-store" } });
    }
    return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return error(503, "Сервер недоступен. Проверьте соединение и повторите запрос.");
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH };
