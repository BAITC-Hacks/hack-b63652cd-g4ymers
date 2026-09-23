"use client";

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CitizenApiError, citizenRequest, type CitizenCatalog, type CitizenUser } from "@/lib/citizen";
import { CitizenOnboardingProvider } from "./onboarding";

const AuthContext = createContext<{ user: CitizenUser; logout: () => Promise<void> } | null>(null);
export function useCitizenAuth() { return useContext(AuthContext); }

export function CitizenAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CitizenUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<CitizenCatalog>({ districts: [] });
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    const expired = () => { setUser(null); setError("Сессия истекла. Войдите снова."); };
    window.addEventListener("citizen-session-expired", expired);
    citizenRequest<CitizenUser>("auth/me").then(value => { if (active) setUser(value); })
      .catch(e => { if (active && (!(e instanceof CitizenApiError) || e.status !== 401)) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    citizenRequest<CitizenCatalog>("public/catalog").then(value => { if (active) setCatalog(value); }).catch(() => {});
    return () => { active = false; window.removeEventListener("citizen-session-expired", expired); };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = { iin: String(form.get("iin")), password: String(form.get("password")),
      ...(register ? { displayName: String(form.get("displayName")), districtId: String(form.get("districtId")) } : {}) };
    try { setUser(await citizenRequest<CitizenUser>(`auth/citizen/${register ? "register" : "login"}`, { method: "POST", body: JSON.stringify(payload) })); }
    catch (e) { setError(e instanceof CitizenApiError && e.status === 409 ? "Такой ИИН уже зарегистрирован. Используйте вход." : e instanceof Error ? e.message : "Не удалось войти"); }
    finally { lock.current = false; setBusy(false); }
  }
  async function logout() {
    try { await citizenRequest("auth/logout", { method: "POST" }); window.sessionStorage.removeItem("citizen-location"); setUser(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось выйти"); }
  }
  if (loading) return <div className="citizen-auth" role="status">Проверяем сессию…</div>;
  if (user) return <AuthContext.Provider value={{ user, logout }}><CitizenOnboardingProvider key={user.id} userId={user.id}>{error && <p className="auth-error" role="alert">{error}<button onClick={() => setError("")}>Закрыть</button></p>}{children}</CitizenOnboardingProvider></AuthContext.Provider>;
  return <main className="citizen-auth"><section className="citizen-auth-card"><span className="citizen-eyebrow">ҚАЛАҒА КӨМЕКТ · ЖИТЕЛЬ</span><h1>{register ? "Создать аккаунт" : "Войти в свой город"}</h1><p>Вход по ИИН и паролю. Обращения и их статусы сохраняются в вашем кабинете.</p>
    <div className="auth-tabs"><button type="button" aria-pressed={!register} onClick={() => { setRegister(false); setError(""); }}>Вход</button><button type="button" aria-pressed={register} onClick={() => { setRegister(true); setError(""); }}>Регистрация</button></div>
    <form onSubmit={submit}><label className="report-label">ИИН<input name="iin" inputMode="numeric" pattern="[0-9]{12}" minLength={12} maxLength={12} autoComplete="username" required placeholder="12 цифр" /></label>
      {register && <><label className="report-label">Как к вам обращаться<input name="displayName" required maxLength={80} autoComplete="name" /></label><label className="report-label">Район<select name="districtId" required defaultValue=""><option value="" disabled>Выберите район</option>{catalog.districts.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label>{!catalog.districts.length && <p role="alert">Не удалось загрузить районы. <button type="button" onClick={() => citizenRequest<CitizenCatalog>("public/catalog").then(setCatalog).catch(e => setError(e.message))}>Повторить</button></p>}</>}
      <label className="report-label">Пароль<input name="password" type="password" required minLength={register ? 10 : 1} maxLength={64} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "Не менее 10 символов" : "Ваш пароль"} /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}<button className="citizen-button primary full" disabled={busy || (register && !catalog.districts.length)}>{busy ? "Подождите…" : register ? "Зарегистрироваться" : "Войти"}</button>
    </form><p className="auth-note">ИИН используется как логин. Регистрация не подтверждает личность через государственные сервисы.</p></section></main>;
}
