"use client";

import { useEffect, useState } from "react";
import { api, message, type DistrictInsights } from "@/lib/api";

export function DistrictInsightsPanel({ district, advice = false }: { district: string; advice?: boolean }) {
  const [data, setData] = useState<DistrictInsights>();
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api<DistrictInsights>(`akim/districts/${district}/insights`).then(result => { if(active) { setData(result); setError(""); } })
      .catch(e => { if(active) setError(message(e)); }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  }, [district, reload]);
  return <div className="district-insights"><div className="insights-top"><h3>{advice ? "Предложения ИИ" : "Рейтинг по обращениям"}</h3><button disabled={loading} className="text-button" onClick={() => { setLoading(true); setReload(v => v+1); }}>Обновить</button></div>
    {error && <p className="api-error" role="alert">{error}</p>}
    {loading ? <p role="status">Анализируем район…</p> : !error && data && <>
      <div className="live-rating"><div><strong>{data.rating.score.toFixed(2)}</strong><span>/ 100 · {data.districtName}</span></div><p>База {data.rating.baseline.toFixed(2)} − штраф {data.rating.activePenalty.toFixed(2)} + решения {data.rating.resolutionBonus.toFixed(2)}</p></div>
      <div className="insight-counts"><span><b>{data.rating.active}</b> активных</span><span><b>{data.rating.resolved}</b> решено за 90 дней</span><span><b>{data.rating.rejected}</b> отклонено за 90 дней</span></div>
      <details className="rating-method"><summary>Как считается рейтинг</summary><p>{data.ratingMethod}</p><p>Уровень обращений отражает также активность жителей. Это рабочий индикатор для акимата, не официальная оценка района.</p></details>
      {advice && <><p className="insights-context">Советы по повторяющимся темам и конкретным адресам. Подтвердите причину проверкой на месте.</p>{!data.recommendations.length && <p>Активных обращений в районе нет. Новые рекомендации появятся после сообщений жителей.</p>}
        {data.recommendations.map((item,i) => <article className="recommendation-card" key={`${item.topic}-${i}`}><h4>{item.address}</h4><p>{item.activeReports} активных обращений · {item.residents} разных жителей</p><small>{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</small><ul>{item.actions.map(action => <li key={action}>{action}</li>)}</ul><span className="recommendation-confidence">{item.topic === "OTHER" ? "Тема требует ручной проверки" : `Уверенность классификатора: ${Math.round(item.confidence*100)}%`}</span>{item.measureIds.length>0 && <p>Связанные меры каталога: {item.measureIds.join(", ")}. Их эффект проверяется в симуляторе.</p>}</article>)}
        <details className="rating-method"><summary>О модели</summary><p>{data.modelVersion} · {data.trainingSamples} примеров. {data.trainingSource}. Процент уверенности не является измеренной точностью.</p></details></>}
      <small>Обновлено {new Date(data.generatedAt).toLocaleString("ru-RU")}</small>
    </>}
  </div>;
}
