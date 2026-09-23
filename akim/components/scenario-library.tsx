"use client";
import { useEffect, useState } from "react";
import { api, message, type Scenario } from "@/lib/api";

export function ScenarioLibrary({ version, busy, onOpen }: { version: number; busy: boolean; onOpen: (id: string) => void }) {
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<Scenario[]>(`akim/scenarios?page=${page}`).then(rows => { if (active) { setRows(rows); setError(""); } }).catch(e => { if (active) setError(message(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, version, reload]);
  function refresh() { setLoading(true); setReload(v => v + 1); }
  function go(page: number) { setLoading(true); setPage(page); }
  return <div className="server-panel-content"><p>Ваши планы сохраняются в общей базе и доступны после повторного входа.</p>
    <button className="text-button" onClick={refresh} disabled={loading || busy}>Обновить список</button>
    {error && <p className="api-error" role="alert">{error}</p>}
    {loading ? <p role="status">Загружаем сценарии…</p> : !error && <>
      {!rows.length && <p className="empty-state">Пока нет сохранённых сценариев. Соберите план и нажмите «Сохранить черновик».</p>}
      {rows.map(s => <button className="saved-scenario" key={s.id} disabled={busy} onClick={() => onOpen(s.id)}><span className="record-top"><strong>{s.name}</strong><span className="record-status">{s.status === "FINAL" ? "Завершён" : "Черновик"}</span></span><span>{s.selections.length}/5 решений · {s.budget}/100 ед.</span><b>Score {s.result.score.toFixed(2)}</b></button>)}
      <div className="list-pagination"><button disabled={page === 0 || busy} onClick={() => go(page - 1)}>← Назад</button><span>Страница {page + 1}</span><button disabled={rows.length < 20 || busy} onClick={() => go(page + 1)}>Далее →</button></div>
    </>}
  </div>;
}
