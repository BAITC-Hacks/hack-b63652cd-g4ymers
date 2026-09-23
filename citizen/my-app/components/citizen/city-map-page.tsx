"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { citizenApi, categoryLabels, statusLabels, type CitizenCategory, type CitizenProblem, type CitizenUrgency } from "@/lib/citizen";
import { districtNames, type ReportPlace } from "@/lib/citizen-map";
import { CitizenCityMap } from "./city-map";
import { CitizenIcon } from "./icon";
import "@/app/citizen-map.css";

const urgencyLabels: Record<CitizenUrgency, string> = { NORMAL: "Обычная", IMPORTANT: "Важная", URGENT: "Срочная" };

export function CitizenCityMapPage() {
  const [place, setPlace] = useState<ReportPlace>();
  const [address, setAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CitizenCategory>("CITY_SERVICES");
  const [urgency, setUrgency] = useState<CitizenUrgency>("NORMAL");
  const [problems, setProblems] = useState<CitizenProblem[]>([]);
  const [ownIds, setOwnIds] = useState<string[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CitizenProblem>();
  const [listError, setListError] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ id: string; problemId: string }>();
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([citizenApi.getProblems(), citizenApi.getMyReports()]).then(([publicRows, myRows]) => {
      if (!active) return;
      const publicProblems = publicRows.status === "fulfilled" ? publicRows.value : [];
      const myProblems = myRows.status === "fulfilled" ? myRows.value : [];
      setProblems([...new Map([...publicProblems, ...myProblems].map(p => [p.id, p])).values()]);
      setOwnIds(myProblems.map(p => p.id));
      setListError(publicRows.status === "rejected" || myRows.status === "rejected" ? "Не все обращения загрузились. Создать новое обращение можно ниже." : "");
      setLoading(false);
    });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => { if (step > 0 || sent) heading.current?.focus({ preventScroll: true }); }, [step, sent]);

  function choosePlace(next: ReportPlace, label?: string) {
    if (busy) return;
    setPlace(next); setAddress(label ?? ""); setConfirmed(false); setSelectedProblem(undefined); setError(""); setStep(0);
  }
  const validPlace = Boolean(place && address.trim() && confirmed);
  const validDetails = Boolean(title.trim() && description.trim());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 0) { if (validPlace) setStep(1); return; }
    if (step === 1) { if (validDetails) setStep(2); return; }
    if (!place || !validPlace || !validDetails || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await citizenApi.createReport({ districtId: place.districtId, locationLabel: address.trim(), latitude: place.latitude, longitude: place.longitude,
        title: title.trim(), description: description.trim(), category, urgency });
      setSent(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось отправить обращение. Попробуйте ещё раз."); }
    finally { lock.current = false; setBusy(false); }
  }
  function startAgain() {
    setSent(undefined); setStep(0); setPlace(undefined); setAddress(""); setConfirmed(false); setTitle(""); setDescription(""); setError(""); setReload(v => v + 1);
  }

  if (sent) return <section className="report-success ccm-success"><div className="success-check"><CitizenIcon name="check" size={30} /></div><span className="citizen-eyebrow">ОБРАЩЕНИЕ ЗАРЕГИСТРИРОВАНО</span><h1 ref={heading} tabIndex={-1}>Обращение принято</h1><p>Обращение сохранено, доступно акимату и учитывается в рейтинге района по обращениям. Следите за ответом в разделе «Мои обращения».</p><strong>№ {sent.id.slice(-8).toUpperCase()}</strong><div className="ccm-success-place"><CitizenIcon name="pin" size={18} />{districtNames[place!.districtId]} · {address}</div><div className="success-actions"><Link className="citizen-button primary" href="/citizen/my-reports">Мои обращения <CitizenIcon name="arrow" size={16} /></Link><Link className="citizen-button secondary" href={`/citizen/problems/${sent.problemId}?private=1`}>Открыть обращение</Link></div><button className="ccm-text-button" onClick={startAgain}>Сообщить о другой проблеме</button></section>;

  return <div className={`ccm-page ccm-step-${step}`}>
    <header className="ccm-page-header"><div><span className="citizen-eyebrow">АСТАНА · КАРТА ГОРОДА</span><h1>Ваш район. Ваш голос.</h1><p>Укажите место — расскажите, что нужно исправить.</p></div><Link href="/citizen/scan" className="citizen-button secondary"><CitizenIcon name="qr" size={18} /> Есть QR-код</Link></header>
    <nav className="ccm-steps" aria-label="Шаги создания обращения">{["Место на карте", "Что случилось", "Проверка"].map((label, index) => <button key={label} aria-current={step === index ? "step" : undefined} disabled={busy || index > step} onClick={() => setStep(index)}><span>{index < step ? "✓" : index + 1}</span>{label}</button>)}</nav>
    <div className="ccm-layout">
      <div className="ccm-map-column"><CitizenCityMap place={place} onPlace={choosePlace} problems={problems} onProblem={setSelectedProblem} />
        <div className="ccm-map-caption"><span><i className="ccm-legend-dot" />Мои обращения</span><span><i className="ccm-legend-dot resolved" />Решено в городе</span><small>{loading ? "Загружаем обращения…" : `${problems.length} на карте города`}</small></div>
        {listError && <div className="ccm-list-error" role="status">{listError}<button onClick={() => { setLoading(true); setReload(v => v + 1); }}>Повторить</button></div>}
        {selectedProblem && <aside className="ccm-problem-preview"><button className="icon-close" aria-label="Закрыть обращение на карте" onClick={() => setSelectedProblem(undefined)}><CitizenIcon name="close" size={17} /></button><span className="citizen-eyebrow">{ownIds.includes(selectedProblem.id) ? "МОЁ ОБРАЩЕНИЕ" : "РЕШЕНО В ГОРОДЕ"} · {statusLabels[selectedProblem.status]}</span><h2>{selectedProblem.title}</h2><p>{selectedProblem.district} · {selectedProblem.locationLabel}</p><Link href={`/citizen/problems/${selectedProblem.id}${ownIds.includes(selectedProblem.id) ? "?private=1" : ""}`}>Открыть обращение <CitizenIcon name="arrow" size={15} /></Link></aside>}
      </div>
      <form className="ccm-report-panel" onSubmit={submit} aria-busy={busy}>
        <div className="ccm-panel-heading"><span className="citizen-eyebrow">ШАГ {step + 1} ИЗ 3 · БЕЗ QR-КОДА</span><h2 ref={heading} tabIndex={-1}>{["Где нужна помощь?", "Что нужно исправить?", "Всё верно?"][step]}</h2></div>
        <div className="ccm-panel-body">
          {step === 0 && <><p className="ccm-panel-intro">Нажмите на место на карте. Район определится автоматически. Можно начать с кнопки района и затем уточнить точку.</p><div className={`ccm-place-card ${place ? "has-place" : ""}`}><CitizenIcon name="pin" size={23} /><div><strong>{place ? `Район ${districtNames[place.districtId]}` : "Сначала выберите место"}</strong><span>{place ? `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}` : "На карте выделены 5 районов проекта"}</span></div></div><label className="report-label">Адрес или ориентир<input value={address} maxLength={200} disabled={!place} onChange={e => { setAddress(e.target.value); setConfirmed(false); }} placeholder="Улица, дом, ближайший ориентир" required /></label><p className="ccm-field-hint">Адрес нужен, чтобы служба быстро нашла проблему. Уточните место, если начали с выбора района.</p><label className="ccm-confirm"><input type="checkbox" checked={confirmed} disabled={!place || !address.trim()} onChange={e => setConfirmed(e.target.checked)} /><span>Место на карте и адрес указаны верно</span></label><div className="ccm-private-note"><CitizenIcon name="shield" size={17} /><span>Активное обращение увидите только вы и акимат.</span></div></>}
          {step === 1 && <><div className="ccm-place-summary"><CitizenIcon name="pin" size={17} /><span>{districtNames[place!.districtId]} · {address}</span><button type="button" onClick={() => setStep(0)}>Изменить</button></div><label className="report-label">Направление<select value={category} onChange={e => setCategory(e.target.value as CitizenCategory)}>{Object.entries(categoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="report-label">Что случилось<input value={title} maxLength={100} required onChange={e => setTitle(e.target.value)} placeholder="Например, не работает освещение" /></label><label className="report-label">Подробности<textarea value={description} maxLength={2000} rows={4} required onChange={e => setDescription(e.target.value)} placeholder="Где именно, как давно и кому мешает проблема?" /></label><label className="report-label">Срочность<select value={urgency} onChange={e => setUrgency(e.target.value as CitizenUrgency)}>{Object.entries(urgencyLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></>}
          {step === 2 && <><div className="ccm-review"><div><span>Район и место</span><strong>{districtNames[place!.districtId]} · {address}</strong></div><div><span>Проблема</span><strong>{title}</strong></div><div><span>Подробности</span><p>{description}</p></div><div><span>Направление</span><strong>{categoryLabels[category]}</strong></div><div><span>Срочность</span><strong>{urgencyLabels[urgency]}</strong></div></div><p className="ccm-private-note">После отправки обращение появится в вашем списке и у акимата. Его статус можно отслеживать в личном кабинете.</p></>}
          {error && <p role="alert" className="auth-error">{error}</p>}
        </div>
        <div className="ccm-panel-footer">{step > 0 && <button className="citizen-button secondary" type="button" disabled={busy} onClick={() => setStep(v => v - 1)}>Назад</button>}<button type="submit" className="citizen-button primary" disabled={busy || !validPlace || (step > 0 && !validDetails)}>{busy ? "Отправляем…" : ["Описать проблему", "Проверить обращение", "Отправить обращение"][step]}<CitizenIcon name={step === 2 ? "send" : "arrow"} size={16} /></button></div>
      </form>
    </div>
  </div>;
}
