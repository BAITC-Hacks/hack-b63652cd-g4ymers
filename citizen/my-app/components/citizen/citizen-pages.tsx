"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CitizenIcon } from "@/components/citizen/icon";
import { CitizenPageHeader } from "@/components/citizen/citizen-shell";
import { ProblemCard } from "@/components/citizen/problem-card";
import { StatusTimeline } from "@/components/citizen/status-timeline";
import {
  categoryLabels, categoryTone, citizenApi, formatDate, getMergedComments, statusLabels, statusTone, timeAgo,
  type CitizenCategory, type CitizenProblem, type CitizenProfile,
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
  const mine = useMyReports();
  const recent = problems.slice(0, 3);
  return <>
    <section className="citizen-hero">
      <div className="hero-copy"><span className="citizen-eyebrow light">АСТАНА · ГОРОД РЯДОМ</span><h1>Сделаем город<br /><em>лучше вместе</em></h1><p>Сообщите о проблеме — городские службы уже увидят её.</p><div className="hero-actions"><Link className="citizen-button primary" href="/citizen/scan"><CitizenIcon name="plus" size={19} /> Сообщить о проблеме</Link><Link className="citizen-button ghost" href="/citizen/map"><CitizenIcon name="map" size={18} /> Открыть карту</Link></div></div>
      <div className="hero-art" aria-hidden="true"><div className="hero-sun" /><div className="hero-building building-one" /><div className="hero-building building-two" /><div className="hero-building building-three" /><div className="hero-tree tree-one" /><div className="hero-tree tree-two" /><div className="hero-road" /><span className="hero-pin"><CitizenIcon name="pin" size={18} /></span></div>
    </section>
    <section className="scan-prompt"><div className="scan-prompt-icon"><CitizenIcon name="qr" size={25} /></div><div><span className="citizen-eyebrow">QR-КОД НА УЛИЦЕ</span><h2>Узнайте, что происходило здесь</h2><p>История места, изменения акимата и быстрый переход к обращению.</p></div><Link className="citizen-button secondary" href="/citizen/scan">Сканировать <CitizenIcon name="arrow" size={15} /></Link></section>
    <section className="citizen-section compact-section"><div className="section-heading"><div><span className="citizen-eyebrow">МОЙ ГОРОД</span><h2>Результаты работы города</h2></div><Link href="/citizen/map">Вся карта <CitizenIcon name="arrow" size={15} /></Link></div><div className="stat-grid"><div className="stat-card resolved-stat"><span>В журнале решений</span><strong>{loading || error ? "—" : problems.length}</strong><small>публичная история</small></div><div className="stat-card reports-stat"><span>Мои решённые</span><strong>{mine.loading || mine.error ? "—" : mine.problems.filter(p => p.status === "RESOLVED").length}</strong><small>результат обращений</small></div><div className="stat-card reports-stat"><span>Мои обращения</span><strong>{mine.loading || mine.error ? "—" : mine.problems.length}</strong><small><Link href="/citizen/my-reports">Открыть список</Link></small></div></div></section>
    <section className="citizen-section"><div className="section-heading"><div><span className="citizen-eyebrow">ПУБЛИЧНЫЙ ЖУРНАЛ</span><h2>Решённые обращения</h2></div><Link href="/citizen/problems">Весь журнал <CitizenIcon name="arrow" size={15} /></Link></div>{error ? <ErrorState /> : loading ? <LoadingCards /> : <div className="problem-list">{recent.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}</div>}</section>
    <section className="citizen-tip"><div className="tip-icon"><CitizenIcon name="shield" size={23} /></div><div><strong>Активные обращения защищены</strong><p>Другие жители не видят ваши заявки. После решения обращение может появиться в общем журнале.</p></div><Link href="/citizen/help">Как это работает <CitizenIcon name="arrow" size={15} /></Link></section>
  </>;
}

export function CitizenProblemsPage() {
  const { problems, loading, error } = useProblems();
  const [category, setCategory] = useState<"ALL" | CitizenCategory>("ALL");
  const [status, setStatus] = useState<"ALL" | "RESOLVED">("ALL");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => problems.filter((problem) => (category === "ALL" || problem.category === category) && (status === "ALL" || problem.status === "RESOLVED") && `${problem.title} ${problem.district} ${problem.locationLabel}`.toLowerCase().includes(query.toLowerCase())), [problems, category, status, query]);
  return <><CitizenPageHeader eyebrow="ПУБЛИЧНЫЙ ЖУРНАЛ" title="Решённые обращения" description="Здесь видны результаты работы города. Активные заявки других жителей скрыты." /><div className="citizen-filter-row"><label className="citizen-search"><CitizenIcon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти решение" /></label><div className="filter-scroll"><button className={status === "ALL" ? "selected" : ""} onClick={() => setStatus("ALL")}>Все</button><button className={status === "RESOLVED" ? "selected" : ""} onClick={() => setStatus("RESOLVED")}>Решённые</button></div><div className="category-scroll"><button className={category === "ALL" ? "selected" : ""} onClick={() => setCategory("ALL")}>Все направления</button>{(Object.keys(categoryLabels) as CitizenCategory[]).map((key) => <button className={category === key ? "selected" : ""} key={key} onClick={() => setCategory(key)}><CategoryMark category={key} />{categoryLabels[key]}</button>)}</div></div>{error ? <ErrorState /> : loading ? <LoadingCards /> : filtered.length ? <div className="problem-list two-column">{filtered.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}</div> : <EmptyState text="В журнале пока нет таких решений" />}</>;
}

export function CitizenMapPage() {
  const { problems, loading, error } = useProblems();
  const [category, setCategory] = useState<"ALL" | CitizenCategory>("ALL");
  const [selected, setSelected] = useState<CitizenProblem | null>(null);
  const visible = problems.filter((problem) => category === "ALL" || problem.category === category);
  const markerPosition = [[28, 35], [47, 62], [67, 31], [37, 73], [74, 67], [60, 48]];
  return <><CitizenPageHeader eyebrow="ИСТОРИЯ ГОРОДА" title="Карта решений" description="Смотрите места, где городские службы уже завершили работу." /><div className="map-filter-bar"><div className="filter-scroll"><button className={category === "ALL" ? "selected" : ""} onClick={() => setCategory("ALL")}>Все</button>{(Object.keys(categoryLabels) as CitizenCategory[]).map((key) => <button className={category === key ? "selected" : ""} key={key} onClick={() => setCategory(key)}><CategoryMark category={key} />{categoryLabels[key]}</button>)}</div></div><div className="citizen-map-wrap"><div className="citizen-map-canvas" role="application" aria-label="Карта решённых обращений Астаны"><div className="map-river" /><div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" /><div className="map-district-label nura">Нура</div><div className="map-district-label esil">Есиль</div><div className="map-district-label almaty">Алматы</div><div className="map-district-label saryarka">Сарыарка</div>{loading ? <div className="map-loading">Загрузка журнала…</div> : visible.map((problem, index) => <button key={problem.id} className={`map-marker ${statusTone[problem.status]} ${selected?.id === problem.id ? "selected" : ""}`} style={{ left: `${markerPosition[index % markerPosition.length][0]}%`, top: `${markerPosition[index % markerPosition.length][1]}%` }} onClick={() => setSelected(problem)} aria-label={`${problem.title}, ${statusLabels[problem.status]}`}><CitizenIcon name="check" size={15} /></button>)}</div><div className="map-legend"><strong>Публичный журнал</strong><span><i className="resolved" /> Решено</span></div></div>{error && <ErrorState />}{selected && <div className="map-preview"><button className="icon-close" onClick={() => setSelected(null)} aria-label="Закрыть"><CitizenIcon name="close" size={17} /></button><div className="problem-card-top"><span className={`category-pill ${categoryTone[selected.category]}`}>{categoryLabels[selected.category]}</span><span className={`status-pill ${statusTone[selected.status]}`}><i />{statusLabels[selected.status]}</span></div><h2>{selected.title}</h2><p><CitizenIcon name="pin" size={14} /> {selected.locationLabel}</p><div className="map-preview-footer"><span>Завершено {formatDate(selected.updatedAt)}</span><Link href={`/citizen/problems/${selected.id}`}>История <CitizenIcon name="arrow" size={14} /></Link></div></div>}</>;
}

export function CitizenProblemPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const privateView = searchParams.get("private") === "1";
  const [problem, setProblem] = useState<CitizenProblem>();
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [commentSent, setCommentSent] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [detailError, setDetailError] = useState("");
  const router = useRouter();
  useEffect(() => { citizenApi.getProblem(params.id, privateView).then(setProblem).catch(e => setDetailError(e.message)).finally(() => setLoading(false)); }, [params.id, privateView]);
  if (loading) return <LoadingCards />;
  if (detailError) return <ErrorState />;
  if (!problem) return <EmptyState text="Проблема не найдена" />;
  const currentProblem = problem;
  const comments = getMergedComments(currentProblem);
  async function submitComment(event: FormEvent) {
    event.preventDefault(); if (!comment.trim() || commentBusy) return;
    setCommentBusy(true); setCommentError(""); setCommentSent(false);
    try {
      const saved = await citizenApi.addComment(currentProblem.id, comment.trim());
      setProblem({ ...currentProblem, comments: [...currentProblem.comments, saved] });
      setComment(""); setCommentSent(true);
    } catch (e) { setCommentError(e instanceof Error ? e.message : "Не удалось отправить комментарий"); }
    finally { setCommentBusy(false); }
  }
  return <><div className="detail-top"><button className="citizen-back" onClick={() => router.back()}><CitizenIcon name="back" size={18} /> Назад</button><Link className="citizen-button primary small" href="/citizen/scan"><CitizenIcon name="plus" size={16} /> Сообщить</Link></div><section className="problem-detail-hero"><div className="detail-title-row"><CategoryMark category={problem.category} /><div><span className={`category-pill ${categoryTone[problem.category]}`}>{categoryLabels[problem.category]}</span><h1>{problem.title}</h1></div></div><div className="detail-meta"><span><CitizenIcon name="pin" size={15} /> {problem.district} · {problem.locationLabel}</span><span className={`status-pill ${statusTone[problem.status]}`}><i />{statusLabels[problem.status]}</span></div></section><section className="detail-grid"><div><div className="detail-card"><div className="detail-card-heading"><h2>Описание</h2><span>Обновлено {timeAgo(problem.updatedAt)}</span></div><p className="detail-description">{problem.description}</p><div className="detail-location"><CitizenIcon name="pin" size={18} /><div><strong>{problem.locationLabel}</strong><span>{problem.district} район · приблизительная локация</span></div></div></div><div className="detail-card"><h2>{problem.status === "RESOLVED" ? "Как решали обращение" : "Как движется обращение"}</h2><StatusTimeline status={problem.status} /></div><div className="detail-card"><div className="detail-card-heading"><h2>Переписка по обращению</h2><span>{comments.length}</span></div><div className="comment-list">{comments.length ? comments.map((item) => <div className="comment" key={item.id}><span className="comment-avatar">{item.displayName.slice(0, 1)}</span><div><div className="comment-heading"><strong>{item.displayName}</strong><time>{timeAgo(item.createdAt)}</time></div><p>{item.text}</p></div></div>) : <p className="muted-copy">История комментариев отсутствует.</p>}</div>{(privateView && problem.status !== "RESOLVED" && problem.status !== "REJECTED") && <><form className="comment-form" onSubmit={submitComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Добавить комментарий…" aria-label="Комментарий" maxLength={500} /><button type="submit" disabled={commentBusy} aria-label="Отправить комментарий"><CitizenIcon name="send" size={17} /></button></form>{commentError && <p role="alert" className="auth-error">{commentError}</p>}{commentSent && <span className="form-success"><CitizenIcon name="check" size={14} /> Комментарий добавлен</span>}</>}</div></div><aside><div className="detail-aside-card"><span className="citizen-eyebrow">{problem.status === "RESOLVED" ? "ИСТОРИЯ РЕШЕНИЯ" : "МОЁ ОБРАЩЕНИЕ"}</span><strong>#{problem.id.slice(-6).toUpperCase()}</strong><p>{problem.status === "RESOLVED" ? "Результат работы городских служб доступен в публичном журнале." : "Сообщение зарегистрировано в системе городских служб."}</p><div className="aside-stat"><span>Сообщений жителей</span><b>{problem.reportCount}</b></div><div className="aside-stat"><span>Подтверждений</span><b>{problem.confirmations}</b></div><Link className="citizen-button secondary full" href="/citizen/map">Открыть на карте <CitizenIcon name="map" size={16} /></Link></div><div className="detail-safe-note"><CitizenIcon name="shield" size={18} /><span>{problem.status === "RESOLVED" ? "Публичная история" : "Приватное обращение"}<br /><small>{problem.status === "RESOLVED" ? "Личные данные жителей скрыты" : "Видно только вам и акимату"}</small></span></div></aside></section></>;
}

export function CitizenReportsPage() {
  const { problems, loading, error } = useMyReports();
  const [filter, setFilter] = useState<"ALL" | "NEW" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const filtered = problems.filter((problem) => filter === "ALL" || (filter === "NEW" ? problem.status === "NEW" : filter === "IN_PROGRESS" ? ["UNDER_REVIEW", "PLANNED", "IN_PROGRESS"].includes(problem.status) : problem.status === "RESOLVED"));
  return <><CitizenPageHeader eyebrow="ЛИЧНЫЙ РАЗДЕЛ" title="Мои обращения" description="Только здесь видны ваши активные заявки и их статусы. Другие жители их не видят." /><div className="report-filter filter-scroll"><button className={filter === "ALL" ? "selected" : ""} onClick={() => setFilter("ALL")}>Все</button><button className={filter === "NEW" ? "selected" : ""} onClick={() => setFilter("NEW")}>Новые</button><button className={filter === "IN_PROGRESS" ? "selected" : ""} onClick={() => setFilter("IN_PROGRESS")}>В работе</button><button className={filter === "RESOLVED" ? "selected" : ""} onClick={() => setFilter("RESOLVED")}>Решённые</button></div>{error ? <ErrorState /> : loading ? <LoadingCards /> : filtered.length ? <div className="my-report-list">{filtered.map((problem) => <Link className="my-report-card" href={`/citizen/problems/${problem.id}?private=1`} key={problem.id}><div className="my-report-heading"><CategoryMark category={problem.category} /><div><h2>{problem.title}</h2><span>{categoryLabels[problem.category]} · {problem.district}</span></div><span className={`status-pill ${statusTone[problem.status]}`}><i />{statusLabels[problem.status]}</span></div><StatusTimeline status={problem.status} /><footer><span>Создано: {formatDate(problem.createdAt)}</span><span>№ {problem.id.slice(-6).toUpperCase()} <CitizenIcon name="arrow" size={14} /></span></footer></Link>)}</div> : <EmptyState text="Вы пока не отправляли обращения" />}<Link className="citizen-button primary centered" href="/citizen/scan"><CitizenIcon name="plus" size={18} /> Сообщить о проблеме</Link></>;
}

export function CitizenProfilePage() {
  const [profile, setProfile] = useState<CitizenProfile>();
  const [profileError, setProfileError] = useState(false);
  useEffect(() => { citizenApi.getProfile().then(setProfile).catch(() => setProfileError(true)); }, []);
  if (profileError) return <ErrorState />;
  if (!profile) return <LoadingCards />;
  return <><CitizenPageHeader eyebrow="ЛИЧНЫЙ РАЗДЕЛ" title="Мой профиль" description="Ваш вклад помогает городу замечать важное." /><section className="profile-card"><div className="profile-avatar">{profile.displayName.slice(0, 1)}</div><div><h2>{profile.displayName}</h2><span><CitizenIcon name="pin" size={14} /> {profile.district} район</span></div></section><section className="contribution-card"><div className="contribution-top"><div><span className="citizen-eyebrow light">ВАШ ВКЛАД В ГОРОД</span><strong>{profile.points}<small> баллов</small></strong><span className="contribution-level"><CitizenIcon name="shield" size={14} /> {profile.level}</span><span className="contribution-streak"><CitizenIcon name="clock" size={13} /> Серия активности: {profile.streakDays ?? 0} дней</span></div><div className="contribution-orbit"><span>+</span><span>+</span><span>+</span></div></div><div className="progress-label"><span>До уровня «Городской помощник»</span><span>{Math.min(profile.points, 500)} / 500</span></div><div className="contribution-progress"><span style={{ width: `${Math.min(100, profile.points / 5)}%` }} /></div><p>Обращение +10 · Решённое обращение +20</p></section><section className="reward-section"><div className="section-heading"><div><span className="citizen-eyebrow">АКТИВНОСТЬ</span><h2>Задания для города</h2></div><span className="reward-month">{profile.reportsThisMonth ?? 0} обращений в этом месяце</span></div><div className="reward-missions"><Link className="reward-mission" href="/citizen/scan"><span className="reward-icon"><CitizenIcon name="qr" size={19} /></span><span><strong>Проверьте место</strong><small>Узнайте адрес и историю места</small></span><CitizenIcon name="arrow" size={15} /></Link><Link className="reward-mission" href="/citizen/scan"><span className="reward-icon"><CitizenIcon name="plus" size={19} /></span><span><strong>Сообщите о проблеме</strong><small>Помогите службам быстрее её найти · +10 баллов</small></span><CitizenIcon name="arrow" size={15} /></Link><Link className="reward-mission" href="/citizen/problems"><span className="reward-icon"><CitizenIcon name="shield" size={19} /></span><span><strong>Посмотрите результат</strong><small>Журнал завершённых работ</small></span><CitizenIcon name="arrow" size={15} /></Link></div></section><section className="badges-section"><div className="section-heading"><div><span className="citizen-eyebrow">ДОСТИЖЕНИЯ</span><h2>Ваши значки</h2></div></div><div className="reward-badges">{(profile.badges ?? []).map((badge) => <div className={`reward-badge ${badge.earned ? "earned" : ""}`} key={badge.id}><span className="badge-icon"><CitizenIcon name={badge.icon === "scan" ? "qr" : badge.icon === "report" ? "plus" : badge.icon === "community" ? "shield" : "check"} size={18} /></span><strong>{badge.title}</strong><small>{badge.earned ? badge.description : "Ещё один шаг до награды"}</small></div>)}</div></section><div className="profile-stats"><div><strong>{profile.reports}</strong><span>Мои обращения</span></div><div><strong>{profile.confirmedProblems}</strong><span>Подтверждено проблем</span></div><div><strong>{profile.resolvedReports}</strong><span>Решено</span></div></div><div className="profile-note"><CitizenIcon name="shield" size={18} /><div><strong>Ваши баллы — только для добрых дел</strong><p>Они не влияют на государственные услуги, права, льготы или приоритет обращений.</p></div></div></>;
}

export function CitizenSupportPage() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const questions = [
    ["Зачем нужна геолокация?", "Она помогает сопоставить QR-код с улицей и не дать отправить обращение не по тому адресу. Точные координаты не публикуются другим жителям."],
    ["Кто видит мою заявку?", "Активную заявку видите вы и городские службы. В публичном журнале она появляется только после решения и без личных данных."],
    ["Что делать, если камера не работает?", "Введите код с таблички вручную на странице сканирования. Используйте только код нужного зарегистрированного объекта."],
  ];
  return <><CitizenPageHeader eyebrow="ПОДДЕРЖКА" title="Как пользоваться приложением" description="Короткая инструкция по безопасному обращению в акимат." /><section className="support-hero"><div className="support-hero-icon"><CitizenIcon name="shield" size={24} /></div><div><h2>Ваши данные под защитой</h2><p>Геолокация нужна только для подтверждения места. Активные обращения других жителей вам не показываются.</p></div></section><section className="support-steps"><div className="section-heading"><div><span className="citizen-eyebrow">ИНСТРУКЦИЯ</span><h2>Три шага до обращения</h2></div></div><div className="support-step"><span>1</span><div><strong>Разрешите геолокацию</strong><p>Приложение проверит, что вы действительно рядом с нужной улицей.</p></div></div><div className="support-step"><span>2</span><div><strong>Отсканируйте QR-код</strong><p>Откроются история места, изменения акимата и кнопка «Сообщить о проблеме».</p></div></div><div className="support-step"><span>3</span><div><strong>Опишите ситуацию</strong><p>Добавьте описание и срочность. Фото пока недоступны. Активное обращение видите вы и акимат.</p></div></div><Link className="citizen-button primary centered" href="/citizen/scan"><CitizenIcon name="qr" size={17} /> Перейти к сканированию</Link></section><section className="support-faq"><div className="section-heading"><div><span className="citizen-eyebrow">ЧАСТЫЕ ВОПРОСЫ</span><h2>Нужна помощь?</h2></div></div>{questions.map(([question, answer], index) => <div className={`support-question ${openQuestion === index ? "open" : ""}`} key={question}><button onClick={() => setOpenQuestion(openQuestion === index ? null : index)}><strong>{question}</strong><CitizenIcon name="chevron" size={17} /></button>{openQuestion === index && <p>{answer}</p>}</div>)}</section><section className="support-contact"><CitizenIcon name="send" size={19} /><div><strong>Нужно обратиться в акимат?</strong><p>Отсканируйте табличку нужного места и опишите ситуацию.</p></div><a href="/citizen/scan">Сканировать</a></section></>;
}


export { CitizenReportPage } from "./report-form";
