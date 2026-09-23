"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { citizenApi, categoryLabels, formatDate, type CitizenCategory, type CitizenLocation, type CitizenUrgency, type QrLocation } from "@/lib/citizen";
import { CitizenIcon } from "./icon";
import { LocationPermission } from "./location-permission";

export function CitizenReportPage() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [place, setPlace] = useState<QrLocation>();
  const [coordinates, setCoordinates] = useState<CitizenLocation>();
  const [manual, setManual] = useState(false);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CitizenCategory>("CITY_SERVICES");
  const [urgency, setUrgency] = useState<CitizenUrgency>("NORMAL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [sent, setSent] = useState<{ id: string; problemId: string }>();
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    citizenApi.getPlaceHistory(qrCode, coordinates).then(context => { if (active) { setPlace(context.location); setError(""); } })
      .catch(e => { if (active) { setPlace(undefined); setError(e.message); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [qrCode, coordinates, reload]);
  const placeConfirmed = !!place && (coordinates ? place.locationVerified : manual);
  async function submit() {
    if (!placeConfirmed || !title.trim() || !description.trim() || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { setSent(await citizenApi.createReport({ qrCode, title: title.trim(), description: description.trim(), category, urgency, location: coordinates })); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось отправить обращение"); }
    finally { lock.current = false; setBusy(false); }
  }
  if (sent) return <section className="report-success"><div className="success-check"><CitizenIcon name="check" size={30} /></div><h1>Обращение принято</h1><p>Оно сохранено в базе, доступно акимату и учитывается в рейтинге района по обращениям. Статус можно проверить в личном кабинете.</p><strong>№ {sent.id.slice(-8).toUpperCase()}</strong><div className="success-actions"><Link className="citizen-button primary" href="/citizen/my-reports">Мои обращения</Link><Link className="citizen-button secondary" href={`/citizen/problems/${sent.problemId}?private=1`}>Открыть обращение</Link></div></section>;
  return <div className="report-flow"><div className="report-flow-top"><Link href="/citizen/scan" className="citizen-back">← Сканер</Link><span>Обращение в акимат</span><span>{step+1} / 3</span></div>
    <LocationPermission onLocation={setCoordinates} />
    {error && <p className="auth-error" role="alert">{error}</p>}
    {loading ? <p role="status">Загружаем место…</p> : !place ? <div className="citizen-state"><h2>QR-объект не найден или недоступен</h2><p>Проверьте код. Обращение можно создать только для существующего объекта.</p><button className="citizen-button secondary" onClick={() => { setLoading(true); setReload(v => v+1); }}>Повторить</button></div> : <>
      <section className="report-card">
        {step === 0 && <><span className="citizen-eyebrow">МЕСТО ИЗ QR-КОДА</span><h1>{place.streetName || place.objectName}</h1><p>{place.district} · {place.objectName}</p>
          <div className="qr-location-card"><CitizenIcon name="pin" /><div><strong>{place.locationVerified ? "Вы рядом с объектом" : coordinates ? "Местоположение не совпало или точность низкая" : "Подтвердите адрес"}</strong><small>{coordinates ? `Расстояние: ${Math.round(place.distanceMeters ?? 0)} м · точность: ±${coordinates.accuracy} м` : "Можно разрешить геолокацию или проверить адрес на табличке."}</small></div></div>
          {!coordinates && <label className="manual-place"><input type="checkbox" checked={manual} onChange={e => setManual(e.target.checked)} /> Адрес на табличке совпадает. Подтверждаю вручную без GPS.</label>}
          <div className="place-history-card"><h2>Журнал завершённых работ</h2>{place.recentChanges?.length ? place.recentChanges.map(change => <article className="history-change" key={change.id}><div><time>{formatDate(change.date)}</time><strong>{change.title}</strong><p>{change.description}</p></div><span className="history-change-status done">Готово</span></article>) : <p>По этому объекту пока нет завершённых работ в журнале.</p>}</div>
        </>}
        {step === 1 && <><h1>Что нужно исправить?</h1><label className="report-label">Направление<select value={category} onChange={e => setCategory(e.target.value as CitizenCategory)}>{Object.entries(categoryLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="report-label">Заголовок<input maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, переполнены мусорные баки" /></label><label className="report-label">Описание<textarea rows={5} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Что случилось, как давно и где именно?" /></label><label className="report-label">Срочность<select value={urgency} onChange={e => setUrgency(e.target.value as CitizenUrgency)}><option value="NORMAL">Обычная</option><option value="IMPORTANT">Важная</option><option value="URGENT">Срочная</option></select></label><p>Прикрепление фотографий пока недоступно. Укажите детали в описании.</p></>}
        {step === 2 && <><h1>Проверьте обращение</h1><div className="preview-card"><div><span>Адрес</span><strong>{place.streetName || place.objectName}</strong></div><div><span>Проблема</span><strong>{title}</strong></div><div><span>Описание</span><strong>{description}</strong></div><div><span>Направление</span><strong>{categoryLabels[category]}</strong></div></div><p>Активное обращение видите только вы и акимат. После решения результат попадёт в публичный журнал.</p></>}
      </section><div className="report-actions">{step>0 && <button className="citizen-button secondary" disabled={busy} onClick={() => setStep(step-1)}>Назад</button>}{step<2 ? <button className="citizen-button primary" disabled={!placeConfirmed || (step===1 && (!title.trim() || !description.trim()))} onClick={() => setStep(step+1)}>{step===0 ? "Обратиться в акимат" : "Проверить"}</button> : <button className="citizen-button primary" disabled={busy || !placeConfirmed} onClick={submit}>{busy ? "Отправляем…" : "Отправить"}</button>}</div>
    </>}
  </div>;
}
