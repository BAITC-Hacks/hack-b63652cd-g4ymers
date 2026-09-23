"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CitizenIcon } from "@/components/citizen/icon";
import { CitizenPageHeader } from "@/components/citizen/citizen-shell";
import { ProblemCard } from "@/components/citizen/problem-card";
import { StatusTimeline } from "@/components/citizen/status-timeline";
import {
  categoryLabels, categoryTone, citizenApi, demoQrLocation, formatDate, getMergedComments, statusLabels, statusTone, timeAgo,
  type CitizenCategory, type CitizenProblem, type CitizenUrgency, type QrLocation,
} from "@/lib/citizen";

function useProblems() {
  const [problems, setProblems] = useState<CitizenProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => { citizenApi.getProblems().then(setProblems).catch(() => setError(true)).finally(() => setLoading(false)); }, []);
  return { problems, loading, error, setProblems };
}

function useMyReports() {
  const [problems, setProblems] = useState<CitizenProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => { citizenApi.getMyReports().then(setProblems).catch(() => setError(true)).finally(() => setLoading(false)); }, []);
  return { problems, loading, error };
}

function LoadingCards() { return <div className="citizen-loading-list" aria-label="Загрузка"><span /><span /><span /></div>; }
function ErrorState({ retry }: { retry?: () => void }) { return <div className="citizen-state"><div className="state-icon error"><CitizenIcon name="alert" size={24} /></div><h2>Не удалось загрузить данные</h2><p>Проверьте соединение и попробуйте ещё раз.</p>{retry && <button className="citizen-button secondary" onClick={retry}>Попробовать снова</button>}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="citizen-state"><div className="state-icon"><CitizenIcon name="reports" size={24} /></div><h2>{text}</h2><p>Когда появятся новые данные, они будут здесь.</p></div>; }

function CategoryMark({ category }: { category: CitizenCategory }) {
  return <span className={`category-mark ${categoryTone[category]}`}><CitizenIcon name={category === "SAFETY" ? "shield" : category === "TRANSPORT" ? "bus" : category === "GREEN_SPACES" ? "leaf" : category === "SOCIAL_INFRASTRUCTURE" ? "building" : "service"} size={16} /></span>;
}

export function CitizenHomePage() {
  const { problems, loading, error } = useProblems();
  const recent = problems.slice(0, 3);
  const active = problems.filter((problem) => problem.status !== "RESOLVED" && problem.status !== "REJECTED").length;
  return <>
    <section className="citizen-hero">
      <div className="hero-copy"><span className="citizen-eyebrow light">АСТАНА · НУРА</span><h1>Сделаем город<br /><em>лучше вместе</em></h1><p>Сообщите о проблеме — городские службы уже увидят её.</p><div className="hero-actions"><Link className="citizen-button primary" href="/report/ASTANA-NURA-LIGHT-001"><CitizenIcon name="plus" size={19} /> Сообщить о проблеме</Link><Link className="citizen-button ghost" href="/citizen/map"><CitizenIcon name="map" size={18} /> Открыть карту</Link></div></div>
      <div className="hero-art" aria-hidden="true"><div className="hero-sun" /><div className="hero-building building-one" /><div className="hero-building building-two" /><div className="hero-building building-three" /><div className="hero-tree tree-one" /><div className="hero-tree tree-two" /><div className="hero-road" /><span className="hero-pin"><CitizenIcon name="pin" size={18} /></span></div>
    </section>
    <section className="citizen-section compact-section"><div className="section-heading"><div><span className="citizen-eyebrow">ВАШ РАЙОН</span><h2>Что происходит рядом</h2></div><Link href="/citizen/map">Вся карта <CitizenIcon name="arrow" size={15} /></Link></div><div className="stat-grid"><div className="stat-card active-stat"><span>Активные проблемы</span><strong>{loading ? "—" : active || 24}</strong><small>в городе сейчас</small></div><div className="stat-card resolved-stat"><span>Решено за месяц</span><strong>8</strong><small>спасибо вашим сообщениям</small></div><div className="stat-card reports-stat"><span>Мои обращения</span><strong>2</strong><small><Link href="/citizen/my-reports">Открыть список</Link></small></div></div></section>
    <section className="citizen-section"><div className="section-heading"><div><span className="citizen-eyebrow">ПОСЛЕДНИЕ СООБЩЕНИЯ</span><h2>Проблемы жителей</h2></div><Link href="/citizen/problems">Все проблемы <CitizenIcon name="arrow" size={15} /></Link></div>{error ? <ErrorState /> : loading ? <LoadingCards /> : <div className="problem-list">{recent.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}</div>}</section>
    <section className="citizen-tip"><div className="tip-icon"><CitizenIcon name="shield" size={23} /></div><div><strong>Каждое сообщение имеет значение</strong><p>Подтверждайте уже известные проблемы, чтобы город видел их масштаб.</p></div><Link href="/citizen/problems">Посмотреть <CitizenIcon name="arrow" size={15} /></Link></section>
  </>;
}

export function CitizenProblemsPage() {
  const { problems, loading, error } = useProblems();
  const [category, setCategory] = useState<"ALL" | CitizenCategory>("ALL");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "RESOLVED">("ALL");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => problems.filter((problem) => (category === "ALL" || problem.category === category) && (status === "ALL" || (status === "RESOLVED" ? problem.status === "RESOLVED" : problem.status !== "RESOLVED" && problem.status !== "REJECTED")) && `${problem.title} ${problem.district} ${problem.locationLabel}`.toLowerCase().includes(query.toLowerCase())), [problems, category, status, query]);
  return <><CitizenPageHeader eyebrow="ГОРОДСКАЯ КАРТА ОБРАЩЕНИЙ" title="Проблемы города" description="Смотрите, что происходит в районах, и поддерживайте сообщения соседей." /><div className="citizen-filter-row"><label className="citizen-search"><CitizenIcon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти проблему" /></label><div className="filter-scroll"><button className={status === "ALL" ? "selected" : ""} onClick={() => setStatus("ALL")}>Все</button><button className={status === "ACTIVE" ? "selected" : ""} onClick={() => setStatus("ACTIVE")}>Активные</button><button className={status === "RESOLVED" ? "selected" : ""} onClick={() => setStatus("RESOLVED")}>Решённые</button></div><div className="category-scroll"><button className={category === "ALL" ? "selected" : ""} onClick={() => setCategory("ALL")}>Все направления</button>{(Object.keys(categoryLabels) as CitizenCategory[]).map((key) => <button className={category === key ? "selected" : ""} key={key} onClick={() => setCategory(key)}><CategoryMark category={key} />{categoryLabels[key]}</button>)}</div></div>{error ? <ErrorState /> : loading ? <LoadingCards /> : filtered.length ? <div className="problem-list two-column">{filtered.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}</div> : <EmptyState text="В этом районе пока нет таких проблем" />}</>;
}

export function CitizenMapPage() {
  const { problems, loading, error } = useProblems();
  const [category, setCategory] = useState<"ALL" | CitizenCategory>("ALL");
  const [selected, setSelected] = useState<CitizenProblem | null>(null);
  const visible = problems.filter((problem) => category === "ALL" || problem.category === category);
  const markerPosition = [[28, 35], [47, 62], [67, 31], [37, 73], [74, 67], [60, 48]];
  return <><CitizenPageHeader eyebrow="АСТАНА · ОБЗОР" title="Карта города" description="Найдите проблему рядом с собой или посмотрите, что уже решается." /><div className="map-filter-bar"><div className="filter-scroll"><button className={category === "ALL" ? "selected" : ""} onClick={() => setCategory("ALL")}>Все</button>{(Object.keys(categoryLabels) as CitizenCategory[]).map((key) => <button className={category === key ? "selected" : ""} key={key} onClick={() => setCategory(key)}><CategoryMark category={key} />{categoryLabels[key]}</button>)}</div></div><div className="citizen-map-wrap"><div className="citizen-map-canvas" role="application" aria-label="Карта проблем Астаны"><div className="map-river" /><div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" /><div className="map-district-label nura">Нура</div><div className="map-district-label esil">Есиль</div><div className="map-district-label almaty">Алматы</div><div className="map-district-label saryarka">Сарыарка</div>{loading ? <div className="map-loading">Загрузка проблем…</div> : visible.map((problem, index) => <button key={problem.id} className={`map-marker ${statusTone[problem.status]} ${selected?.id === problem.id ? "selected" : ""}`} style={{ left: `${markerPosition[index % markerPosition.length][0]}%`, top: `${markerPosition[index % markerPosition.length][1]}%` }} onClick={() => setSelected(problem)} aria-label={`${problem.title}, ${statusLabels[problem.status]}`}><CitizenIcon name={problem.category === "SAFETY" ? "shield" : problem.category === "TRANSPORT" ? "bus" : "pin"} size={15} /></button>)}</div><div className="map-legend"><strong>Статус проблемы</strong><span><i className="new" /> Новая</span><span><i className="progress" /> В работе</span><span><i className="resolved" /> Решена</span></div></div>{error && <ErrorState />}{selected && <div className="map-preview"><button className="icon-close" onClick={() => setSelected(null)} aria-label="Закрыть"><CitizenIcon name="close" size={17} /></button><div className="problem-card-top"><span className={`category-pill ${categoryTone[selected.category]}`}>{categoryLabels[selected.category]}</span><span className={`status-pill ${statusTone[selected.status]}`}><i />{statusLabels[selected.status]}</span></div><h2>{selected.title}</h2><p><CitizenIcon name="pin" size={14} /> {selected.locationLabel}</p><div className="map-preview-footer"><span><CitizenIcon name="user" size={15} /> {selected.confirmations} подтверждений</span><Link href={`/citizen/problems/${selected.id}`}>Подробнее <CitizenIcon name="arrow" size={14} /></Link></div></div>}</>;
}

export function CitizenProblemPage() {
  const params = useParams<{ id: string }>();
  const [problem, setProblem] = useState<CitizenProblem>();
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [commentSent, setCommentSent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  useEffect(() => { citizenApi.getProblem(params.id).then(setProblem).finally(() => setLoading(false)); }, [params.id]);
  if (loading) return <LoadingCards />;
  if (!problem) return <EmptyState text="Проблема не найдена" />;
  const currentProblem = problem;
  const comments = getMergedComments(currentProblem);
  async function confirm() { if (currentProblem.confirmedByMe || confirming) return; setConfirming(true); const updated = await citizenApi.confirmProblem(currentProblem.id); if (updated) setProblem(updated); setConfirming(false); }
  async function submitComment(event: FormEvent) { event.preventDefault(); if (!comment.trim()) return; const saved = await citizenApi.addComment(currentProblem.id, comment.trim()); setProblem({ ...currentProblem, comments: [...currentProblem.comments, saved] }); setComment(""); setCommentSent(true); setTimeout(() => setCommentSent(false), 2500); }
  return <><div className="detail-top"><button className="citizen-back" onClick={() => router.back()}><CitizenIcon name="back" size={18} /> Назад</button><Link className="citizen-button primary small" href="/report/ASTANA-NURA-LIGHT-001"><CitizenIcon name="plus" size={16} /> Сообщить</Link></div><section className="problem-detail-hero"><div className="detail-title-row"><CategoryMark category={problem.category} /><div><span className={`category-pill ${categoryTone[problem.category]}`}>{categoryLabels[problem.category]}</span><h1>{problem.title}</h1></div></div><div className="detail-meta"><span><CitizenIcon name="pin" size={15} /> {problem.district} · {problem.locationLabel}</span><span className={`status-pill ${statusTone[problem.status]}`}><i />{statusLabels[problem.status]}</span></div><div className="confirmation-banner"><div><strong>{problem.confirmations}</strong><span>жителей подтвердили проблему</span></div><button className={problem.confirmedByMe ? "confirmed" : ""} onClick={confirm} disabled={problem.confirmedByMe || confirming}>{problem.confirmedByMe ? <><CitizenIcon name="check" size={17} /> Вы подтвердили</> : <><CitizenIcon name="plus" size={17} /> У меня такая же проблема</>}</button></div></section><section className="detail-grid"><div><div className="detail-card"><div className="detail-card-heading"><h2>Описание</h2><span>Обновлено {timeAgo(problem.updatedAt)}</span></div><p className="detail-description">{problem.description}</p><div className="detail-location"><CitizenIcon name="pin" size={18} /><div><strong>{problem.locationLabel}</strong><span>{problem.district} район · приблизительная локация</span></div></div></div><div className="detail-card"><h2>Как движется обращение</h2><StatusTimeline status={problem.status} /></div><div className="detail-card"><div className="detail-card-heading"><h2>Комментарии жителей</h2><span>{comments.length}</span></div><div className="comment-list">{comments.length ? comments.map((item) => <div className="comment" key={item.id}><span className="comment-avatar">{item.displayName.slice(0, 1)}</span><div><div className="comment-heading"><strong>{item.displayName}</strong><time>{timeAgo(item.createdAt)}</time></div><p>{item.text}</p></div></div>) : <p className="muted-copy">Пока нет комментариев. Поделитесь наблюдением.</p>}</div><form className="comment-form" onSubmit={submitComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Добавить комментарий…" aria-label="Комментарий" maxLength={500} /><button type="submit" aria-label="Отправить комментарий"><CitizenIcon name="send" size={17} /></button></form>{commentSent && <span className="form-success"><CitizenIcon name="check" size={14} /> Комментарий добавлен</span>}</div></div><aside><div className="detail-aside-card"><span className="citizen-eyebrow">ОБРАЩЕНИЕ</span><strong>#{problem.id.slice(-6).toUpperCase()}</strong><p>Сообщение зарегистрировано в системе городских служб.</p><div className="aside-stat"><span>Сообщений жителей</span><b>{problem.reportCount}</b></div><div className="aside-stat"><span>Подтверждений</span><b>{problem.confirmations}</b></div><Link className="citizen-button secondary full" href="/citizen/map">Открыть на карте <CitizenIcon name="map" size={16} /></Link></div><div className="detail-safe-note"><CitizenIcon name="shield" size={18} /><span>Публичная информация<br /><small>Личные данные жителей скрыты</small></span></div></aside></section></>;
}

export function CitizenReportsPage() {
  const { problems, loading, error } = useMyReports();
  const [filter, setFilter] = useState<"ALL" | "NEW" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const filtered = problems.filter((problem) => filter === "ALL" || (filter === "NEW" ? problem.status === "NEW" : filter === "IN_PROGRESS" ? ["UNDER_REVIEW", "PLANNED", "IN_PROGRESS"].includes(problem.status) : problem.status === "RESOLVED"));
  return <><CitizenPageHeader eyebrow="ЛИЧНЫЙ РАЗДЕЛ" title="Мои обращения" description="Следите за сообщениями, которые вы отправили в городские службы." /><div className="report-filter filter-scroll"><button className={filter === "ALL" ? "selected" : ""} onClick={() => setFilter("ALL")}>Все</button><button className={filter === "NEW" ? "selected" : ""} onClick={() => setFilter("NEW")}>Новые</button><button className={filter === "IN_PROGRESS" ? "selected" : ""} onClick={() => setFilter("IN_PROGRESS")}>В работе</button><button className={filter === "RESOLVED" ? "selected" : ""} onClick={() => setFilter("RESOLVED")}>Решённые</button></div>{error ? <ErrorState /> : loading ? <LoadingCards /> : filtered.length ? <div className="my-report-list">{filtered.map((problem) => <Link className="my-report-card" href={`/citizen/problems/${problem.id}`} key={problem.id}><div className="my-report-heading"><CategoryMark category={problem.category} /><div><h2>{problem.title}</h2><span>{categoryLabels[problem.category]} · {problem.district}</span></div><span className={`status-pill ${statusTone[problem.status]}`}><i />{statusLabels[problem.status]}</span></div><StatusTimeline status={problem.status} /><footer><span>Создано: {formatDate(problem.createdAt)}</span><span>№ {problem.id.slice(-6).toUpperCase()} <CitizenIcon name="arrow" size={14} /></span></footer></Link>)}</div> : <EmptyState text="Вы пока не отправляли обращения" />}<Link className="citizen-button primary centered" href="/report/ASTANA-NURA-LIGHT-001"><CitizenIcon name="plus" size={18} /> Сообщить о проблеме</Link></>;
}

export function CitizenProfilePage() {
  const [profile, setProfile] = useState<{ displayName: string; district: string; reports: number; confirmedProblems: number; resolvedReports: number; points: number; level: string }>();
  useEffect(() => { citizenApi.getProfile().then(setProfile); }, []);
  if (!profile) return <LoadingCards />;
  return <><CitizenPageHeader eyebrow="ЛИЧНЫЙ РАЗДЕЛ" title="Мой профиль" description="Ваш вклад помогает городу замечать важное." /><section className="profile-card"><div className="profile-avatar">{profile.displayName.slice(0, 1)}</div><div><h2>{profile.displayName}</h2><span><CitizenIcon name="pin" size={14} /> {profile.district} район</span></div><button className="profile-edit" aria-label="Настройки профиля"><CitizenIcon name="menu" size={18} /></button></section><section className="contribution-card"><div className="contribution-top"><div><span className="citizen-eyebrow light">ВАШ ВКЛАД В ГОРОД</span><strong>{profile.points}<small> баллов</small></strong><span className="contribution-level"><CitizenIcon name="shield" size={14} /> {profile.level}</span></div><div className="contribution-orbit"><span>+</span><span>+</span><span>+</span></div></div><div className="progress-label"><span>До уровня «Городской помощник»</span><span>{Math.min(profile.points, 500)} / 500</span></div><div className="contribution-progress"><span style={{ width: `${Math.min(100, profile.points / 5)}%` }} /></div><p>Сообщение +10 · Подтверждение +2 · Подтверждение решения +5</p></section><div className="profile-stats"><div><strong>{profile.reports}</strong><span>Мои обращения</span></div><div><strong>{profile.confirmedProblems}</strong><span>Подтверждено проблем</span></div><div><strong>{profile.resolvedReports}</strong><span>Решено</span></div></div><div className="profile-note"><CitizenIcon name="shield" size={18} /><div><strong>Ваши баллы — только для добрых дел</strong><p>Они не влияют на государственные услуги, права, льготы или приоритет обращений.</p></div></div></>;
}

const urgencyLabels: Record<CitizenUrgency, string> = { NORMAL: "Обычная", IMPORTANT: "Важная", URGENT: "Срочная" };
const reportSteps = ["Место", "Проблема", "Фото", "Важность", "Проверка"];

export function CitizenReportPage() {
  const params = useParams<{ qrCode: string }>();
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState<QrLocation>();
  const [category, setCategory] = useState<CitizenCategory>("SAFETY");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<CitizenUrgency>("NORMAL");
  const [photoName, setPhotoName] = useState("");
  const [duplicateChoice, setDuplicateChoice] = useState<"confirm" | "new" | null>(null);
  const [sent, setSent] = useState<{ id: string; problemId: string }>();
  const [loading, setLoading] = useState(true);
  useEffect(() => { citizenApi.getQrLocation(params.qrCode).then((data) => setLocation(data ?? demoQrLocation)).finally(() => setLoading(false)); }, [params.qrCode]);
  if (sent) return <div className="report-success"><div className="success-check"><CitizenIcon name="check" size={30} /></div><span className="citizen-eyebrow">ГОТОВО</span><h1>Спасибо!</h1><p>Ваше сообщение зарегистрировано и передано городским службам.</p><div className="success-ticket"><span>Номер обращения</span><strong>#{sent.id.slice(-8).toUpperCase()}</strong><div><CategoryMark category={category} /><span><b>{title || "Новое сообщение"}</b><small>{location?.district} район · {location?.objectName}</small></span></div><span className="status-pill new"><i /> Получено</span></div><div className="success-actions"><Link className="citizen-button primary" href={`/citizen/problems/${sent.problemId}`}>Посмотреть обращение <CitizenIcon name="arrow" size={16} /></Link><Link className="citizen-button secondary" href="/citizen">На главную</Link></div></div>;
  const possibleDuplicate = category === "SAFETY" && /фонар|освещ/i.test(`${title} ${description}`);
  async function submit() {
    if (possibleDuplicate && duplicateChoice === "confirm") {
      await citizenApi.confirmProblem("problem-lighting-nura");
      setSent({ id: `confirmation-${Date.now()}`, problemId: "problem-lighting-nura" });
      return;
    }
    const result = await citizenApi.createReport({ qrCode: params.qrCode, title, description, category, urgency, photoUrl: photoName });
    setSent(result);
  }
  const canNext = step === 0 || step === 1 ? (step === 0 ? !!location : !!title.trim() && !!description.trim()) : true;
  const canSubmit = !possibleDuplicate || duplicateChoice !== null;
  if (loading) return <LoadingCards />;
  return <div className="report-flow"><div className="report-flow-top"><Link className="citizen-back" href="/citizen"><CitizenIcon name="close" size={18} /> Отмена</Link><span>Новое сообщение</span><span className="step-count">{step + 1} из {reportSteps.length}</span></div><div className="report-progress">{reportSteps.map((label, index) => <div className={`${index <= step ? "active" : ""}`} key={label}><i />{label}</div>)}</div><section className="report-card"><span className="citizen-eyebrow">СООБЩИТЕ О ПРОБЛЕМЕ</span>{step === 0 && <><h1>Где это произошло?</h1><p>Мы уже определили место по QR-коду. Проверьте данные.</p><div className="qr-location-card"><div className="qr-location-icon"><CitizenIcon name="pin" size={25} /></div><div><span>{location?.district} район</span><strong>{location?.objectName}</strong><small>{location?.objectType}</small></div><CitizenIcon name="check" size={19} className="location-check" /></div><div className="report-mini-map"><div className="mini-map-dot" /><span>Местоположение определено автоматически</span></div></>}{step === 1 && <><h1>Что случилось?</h1><p>Опишите проблему простыми словами — это поможет быстрее разобраться.</p><label className="report-label">Направление<select value={category} onChange={(event) => setCategory(event.target.value as CitizenCategory)}>{(Object.keys(categoryLabels) as CitizenCategory[]).map((key) => <option key={key} value={key}>{categoryLabels[key]}</option>)}</select></label><label className="report-label">Коротко о проблеме<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, не работает фонарь" maxLength={100} /></label><label className="report-label">Подробнее<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Фонарь не работает уже несколько дней…" rows={5} maxLength={600} /></label></>}{step === 2 && <><h1>Добавьте фото</h1><p>Фото поможет городским службам быстрее понять ситуацию. Это необязательно.</p><label className="photo-upload"><CitizenIcon name="camera" size={28} /><strong>{photoName || "Прикрепить фото"}</strong><span>{photoName ? "Фото выбрано" : "JPG, PNG до 10 МБ"}</span><input type="file" accept="image/*" onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")} /></label><button className="skip-button" onClick={() => setStep(3)}>Пропустить</button></>}{step === 3 && <><h1>Насколько это важно?</h1><p>Выберите ощущение срочности. Приоритет определят городские службы.</p><div className="urgency-list">{(Object.keys(urgencyLabels) as CitizenUrgency[]).map((key) => <button className={`${urgency === key ? "selected" : ""} ${key.toLowerCase()}`} key={key} onClick={() => setUrgency(key)}><span>{key === "NORMAL" ? "○" : key === "IMPORTANT" ? "!" : "!!"}</span><strong>{urgencyLabels[key]}</strong><small>{key === "NORMAL" ? "Можно решить в плановом порядке" : key === "IMPORTANT" ? "Мешает жителям каждый день" : "Опасно или требует быстрой помощи"}</small>{urgency === key && <CitizenIcon name="check" size={18} />}</button>)}</div></>}{step === 4 && <><h1>Проверьте сообщение</h1><p>Убедитесь, что всё верно перед отправкой.</p>{possibleDuplicate && <div className="duplicate-warning"><div><CitizenIcon name="alert" size={18} /><strong>Похоже, об этой проблеме уже сообщили</strong></div><p>«Не работает уличное освещение» · 23 сообщения · рядом с вами</p><div><button className={duplicateChoice === "confirm" ? "selected" : ""} onClick={() => setDuplicateChoice("confirm")}><CitizenIcon name="check" size={15} /> У меня та же проблема</button><button className={duplicateChoice === "new" ? "selected" : ""} onClick={() => setDuplicateChoice("new")}>Это другая проблема</button></div></div>}<div className="preview-card"><div><span>Проблема</span><strong>{title}</strong></div><div><span>Место</span><strong>{location?.district} · {location?.objectName}</strong></div><div><span>Направление</span><strong>{categoryLabels[category]}</strong></div><div><span>Описание</span><strong>{description}</strong></div><div><span>Фото</span><strong>{photoName || "Не добавлено"}</strong></div></div></>}</section><div className="report-actions">{step > 0 && <button className="citizen-button secondary" onClick={() => setStep((current) => current - 1)}>Назад</button>}{step < 4 ? <button className="citizen-button primary" disabled={!canNext} onClick={() => setStep((current) => current + 1)}>Продолжить <CitizenIcon name="arrow" size={17} /></button> : <button className="citizen-button primary" disabled={!canSubmit} onClick={submit}><CitizenIcon name="send" size={17} /> Отправить</button>}</div><p className="report-privacy"><CitizenIcon name="shield" size={14} /> Отправляя сообщение, вы соглашаетесь на обработку данных обращения.</p></div>;
}
