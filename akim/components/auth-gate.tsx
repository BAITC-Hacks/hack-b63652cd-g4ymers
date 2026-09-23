"use client";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, message, type User, type Catalog, type Result } from "@/lib/api";
import { Icon } from "./icon";
import { Workspace } from "./workspace";

export function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<{ catalog: Catalog; baseline: Result } | null>(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function load(user: User) {
    if (user.role !== "AKIM") throw new Error("Войдите с учётной записью акима");
    const [catalog, baseline] = await Promise.all([api<Catalog>("public/catalog"), api<Result>("public/baseline")]);
    setUser(user); setData({ catalog, baseline }); setExpired(false); setError("");
  }
  async function restore() {
    setLoading(true); setError("");
    try { await load(await api<User>("auth/me")); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) setError(message(error)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    api<User>("auth/me").then(async user => {
      if (user.role !== "AKIM") throw new Error("Войдите с учётной записью акима");
      const [catalog, baseline] = await Promise.all([api<Catalog>("public/catalog"), api<Result>("public/baseline")]);
      if (active) { setUser(user); setData({ catalog, baseline }); }
    }).catch(error => { if (active && !(error instanceof ApiError && error.status === 401)) setError(message(error)); }).finally(() => { if (active) setLoading(false); });
    const expire = () => { setExpired(true); };
    window.addEventListener("session-expired", expire);
    return () => { active = false; window.removeEventListener("session-expired", expire); };
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await load(await api<User>("auth/login", "POST", { email, password })); setPassword(""); }
    catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }
  async function logout() {
    await api("auth/logout", "POST", {}); setUser(null); setData(null); setExpired(false);
  }
  return <>
    {user && data && <div inert={expired || undefined}><Workspace key={user.id} user={user} catalog={data.catalog} baseline={data.baseline} onLogout={logout}/></div>}
    {(!user || !data || expired) && <div className="auth-screen"><form className="auth-card" onSubmit={login} aria-label="Вход акима">
      <span className="auth-mark"><Icon name="city" size={30}/></span><span className="eyebrow">ASTANA CITY LAB</span>
      <h1>{loading ? "Загружаем город" : expired && user ? "Войдите снова" : "Кабинет акима"}</h1>
      <p>{expired && user ? "Сессия завершилась. Ваш текущий план остаётся на экране после повторного входа." : "Решения для города. Обращения жителей. Один кабинет."}</p>
      {!loading && <><label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy}/></label><label>Пароль<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy}/></label>
      <button className="button button-primary" disabled={busy}>{busy ? "Входим…" : "Войти в кабинет"}<Icon name="arrow" size={17}/></button></>}
      {error && <div className="api-error" role="alert">{error}<button type="button" onClick={restore} disabled={busy}>Повторить подключение</button></div>}
      <small>Доступ предоставляется администратором проекта.</small>
    </form></div>}
  </>;
}
