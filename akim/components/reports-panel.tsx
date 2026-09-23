"use client";
import { useEffect, useRef, useState } from "react";
import { api, message, statusLabels, transitions, categoryLabels, type Catalog, type Problem, type Status } from "@/lib/api";

type History = { fromStatus: Status | null; toStatus: Status; note: string; displayName: string; createdAt: string };
function ReportDetail({ id, onBack, onChange }: { id: string; onBack: () => void; onChange: () => void }) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [status, setStatus] = useState<Status | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.all([api<Problem>(`akim/problems/${id}`), api<History[]>(`akim/problems/${id}/history`)]).then(([problem, history]) => {
      if (active) { setProblem(problem); setHistory(history); setStatus(transitions[problem.status][0] ?? ""); setError(""); }
    }).catch(e => { if (active) setError(message(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, reload]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!problem || !status || lock.current) return;
    lock.current = true; setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await api<Problem>(`akim/problems/${id}/status`, "PATCH", { status, version: problem.version, note: note.trim() });
      setProblem(updated); setStatus(transitions[updated.status][0] ?? ""); setNote(""); setSuccess("Статус сохранён."); onChange();
      try { setHistory(await api<History[]>(`akim/problems/${id}/history`)); } catch { setError("Статус сохранён, но историю не удалось обновить. Обновите карточку."); }
    } catch (e) { setError(message(e)); }
    finally { lock.current = false; setSaving(false); }
  }
  return <div className="server-panel-content"><div className="record-top"><button className="text-button" onClick={onBack} disabled={saving}>← Все обращения</button><button className="text-button" disabled={saving || loading} onClick={() => { setLoading(true); setReload(v => v + 1); }}>Обновить карточку</button></div>
    {error && <p className="api-error" role="alert">{error}</p>}
    {success && <p className="api-success" role="status">{success}</p>}
    {loading ? <p role="status">Загружаем обращение…</p> : problem && <>
      <span className="record-status">{statusLabels[problem.status]}</span><h3>{problem.title}</h3><p className="report-description">{problem.description}</p><p>{problem.district} · {problem.locationLabel}</p><p>{categoryLabels[problem.category]} · {problem.confirmations} подтверждений</p>
      {transitions[problem.status].length > 0 && <form className="status-form" onSubmit={save}><label>Новый статус<select value={status} onChange={e => setStatus(e.target.value as Status)} disabled={saving}>{transitions[problem.status].map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label><label>Комментарий акима<textarea value={note} maxLength={1000} rows={3} required={status === "RESOLVED" || status === "REJECTED"} placeholder={status === "RESOLVED" || status === "REJECTED" ? "Укажите результат или причину закрытия" : "Что будет сделано"} onChange={e => setNote(e.target.value)} disabled={saving}/></label><button className="button button-primary" disabled={saving || !status || ((status === "RESOLVED" || status === "REJECTED") && !note.trim())}>{saving ? "Сохраняем…" : "Изменить статус"}</button></form>}
      <h3>История обращения</h3><ol className="report-history">{history.map((h, i) => <li key={i}><strong>{statusLabels[h.toStatus]}</strong><span>{h.displayName} · {new Date(h.createdAt).toLocaleString("ru-RU")}</span>{h.note && <p>{h.note}</p>}</li>)}</ol>
      {problem.comments.length > 0 && <><h3>Комментарии жителей</h3>{problem.comments.map(c => <p key={c.id}><b>{c.displayName}</b><br/>{c.text}</p>)}</>}
    </>}
  </div>;
}

export function ReportsPanel({ catalog }: { catalog: Catalog }) {
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState<Problem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setReload(value => value + 1); };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), size: "20", ...(district ? { district } : {}), ...(status ? { status } : {}), ...(category ? { category } : {}) });
    api<Problem[]>(`akim/problems?${query}`).then(rows => { if (active) { setRows(rows); setError(""); } }).catch(e => { if (active) setError(message(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [district, status, category, page, reload]);
  function refresh() { setLoading(true); setReload(v => v + 1); }
  if (selected) return <ReportDetail key={selected} id={selected} onBack={() => { setSelected(null); refresh(); }} onChange={refresh}/>;
  return <div className="server-panel-content"><p>Обращения из общей базы жителей и акима.</p><div className="report-filters">
    <label>Район<select value={district} onChange={e => { setDistrict(e.target.value); setPage(0); setLoading(true); }}><option value="">Все районы</option>{catalog.districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <label>Статус<select value={status} onChange={e => { setStatus(e.target.value); setPage(0); setLoading(true); }}><option value="">Все статусы</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label>Направление<select value={category} onChange={e => { setCategory(e.target.value); setPage(0); setLoading(true); }}><option value="">Все направления</option>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
  </div><button className="text-button" disabled={loading} onClick={refresh}>Обновить обращения</button>
    {error && <p className="api-error" role="alert">{error}</p>}
    {loading ? <p role="status">Загружаем обращения…</p> : !error && <>
      {!rows.length && <p className="empty-state">Обращений пока нет{district || status || category ? " по выбранным фильтрам" : ""}. Новые обращения жителей появятся здесь.</p>}
      {rows.map(p => <button className="saved-scenario" key={p.id} onClick={() => setSelected(p.id)}><span className="record-top"><strong>{p.title}</strong><span className="record-status">{statusLabels[p.status]}</span></span><span>{p.district} · {categoryLabels[p.category]}</span><span>{p.locationLabel}</span><span>{p.confirmations} подтверждений · {({ NORMAL: "Обычная", IMPORTANT: "Важная", URGENT: "Срочная" })[p.urgency]}</span></button>)}
      <div className="list-pagination"><button disabled={page === 0} onClick={() => { setPage(v => v - 1); setLoading(true); }}>← Назад</button><span>Страница {page + 1}</span><button disabled={rows.length < 20} onClick={() => { setPage(v => v + 1); setLoading(true); }}>Далее →</button></div>
    </>}
  </div>;
}
