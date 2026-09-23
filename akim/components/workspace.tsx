"use client";
import { useEffect, useRef, useState } from "react";
import { CityMap } from "@/components/city-map";
import { Icon } from "@/components/icon";
import { categories, examplePlan, formatScore, formatDelta, validatePlan, type Category, type Selection } from "@/lib/simulation";
import { api, message, selectionsOf, type Catalog, type Result, type Scenario, type User } from "@/lib/api";
import { ScenarioLibrary } from "./scenario-library";
import { ReportsPanel } from "./reports-panel";
import { DistrictInsightsPanel } from "./district-insights";
export function Workspace({ user, catalog, baseline, onLogout }: { user: User; catalog: Catalog; baseline: Result; onLogout: () => Promise<void> }) {
    const { districts, measures } = catalog;
    const metricNames = Object.fromEntries(catalog.metrics.map(m => [m.code, m.name]));
    const [selectedDistrict, setSelectedDistrict] = useState("nura");
    const [category, setCategory] = useState<Category | "all">("all");
    const [query, setQuery] = useState("");
    const [plan, setPlan] = useState<Selection[]>([]);
    const [panel, setPanel] = useState<"catalog" | "plan" | "district" | "metrics" | "advisor" | "saved" | "reports" | null>(null);
    const [uiHidden, setUiHidden] = useState(false);
    const [notice, setNotice] = useState("");
    const [modal, setModal] = useState<"help" | "results" | "reset">("help");
    const [result, setResult] = useState<Result>(baseline);
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [name, setName] = useState("Мой план развития");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [libraryVersion, setLibraryVersion] = useState(0);
    const lock = useRef(false);
    const finalized = scenario?.status === "FINAL";
    const dirty = scenario ? name !== scenario.name || JSON.stringify(plan) !== JSON.stringify(selectionsOf(scenario)) : plan.length > 0;
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);
    const dialog = useRef<HTMLDialogElement>(null);
    function closePanel() {
        setPanel(null);
        document.querySelector<HTMLButtonElement>(`[data-panel="${panel}"]`)?.focus();
    }
    useEffect(() => {
        if (panel) document.querySelector<HTMLButtonElement>('.floating-panel:not([hidden]) .overlay-close')?.focus();
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape" && !dialog.current?.open) {
                setUiHidden(false);
                setPanel(null);
                document.querySelector<HTMLButtonElement>(`[data-panel="${panel}"]`)?.focus();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [panel]);
    const spent = result.spent;
    const selected = result.districts.find(d => d.id === selectedDistrict)!;
    const before = baseline.districts.find(d => d.id === selectedDistrict)!;
    const complete = !validatePlan(plan, true, catalog);
    const filtered = measures.filter(m => (category === "all" || m.category === category) && `${m.name} ${m.description}`.toLowerCase().includes(query.toLowerCase()));
    function openModal(next: typeof modal) { setModal(next); dialog.current?.showModal(); }
    async function run(action: () => Promise<void>) {
        if (lock.current) return;
        lock.current = true; setBusy(true); setError("");
        try { await action(); } catch (error) { setError(message(error)); }
        finally { lock.current = false; setBusy(false); }
    }
    function changePlan(next: Selection[], notice: string) {
        if (finalized) return;
        const invalid = validatePlan(next, false, catalog);
        if (invalid) { setError(invalid); return; }
        void run(async () => {
            const preview = await api<Result>("akim/simulation/preview", "POST", { selections: next });
            setPlan(next); setResult(preview); setNotice(notice);
        });
    }
    function addMeasure(id: string) {
        const measure = measures.find(m => m.id === id)!;
        const next = [...plan, { id, ...(measure.city ? {} : { district: selectedDistrict }) }];
        changePlan(next, `${measure.name}: добавлено ${measure.city ? "для всего города" : `в район ${selected.name}`}.`);
    }
    function removeMeasure(id: string) { changePlan(plan.filter(s => s.id !== id), "Мероприятие удалено из сценария."); }
    function loadExample() { changePlan(examplePlan.map(s => ({ ...s })), "Загружен контрольный сценарий из задания: 5 мероприятий за 95 единиц."); setSelectedDistrict("nura"); }
    function applyScenario(saved: Scenario) { setScenario(saved); setPlan(selectionsOf(saved)); setName(saved.name); setResult(saved.result); }
    async function persist() {
        const saved = await api<Scenario>(scenario ? `akim/scenarios/${scenario.id}` : "akim/scenarios", scenario ? "PUT" : "POST", { name: name.trim(), selections: plan, ...(scenario ? { version: scenario.version } : {}) });
        applyScenario(saved); setLibraryVersion(v => v + 1); return saved;
    }
    function save() { void run(async () => { await persist(); setNotice("Черновик сохранён."); }); }
    function finalize() {
        void run(async () => {
            const saved = !scenario || dirty ? await persist() : scenario;
            const final = await api<Scenario>(`akim/scenarios/${saved.id}/finalize`, "POST", { version: saved.version });
            applyScenario(final); setLibraryVersion(v => v + 1); setNotice("Сценарий завершён и сохранён."); openModal("results");
        });
    }
    function openScenario(id: string) {
        if (dirty && !window.confirm("Открыть сохранённый сценарий? Несохранённые изменения текущего плана будут потеряны.")) return;
        void run(async () => { applyScenario(await api<Scenario>(`akim/scenarios/${id}`)); setPanel("plan"); setNotice("Сценарий загружен из базы."); });
    }
    function reset() { setPlan([]); setResult(baseline); setScenario(null); setName("Мой план развития"); setError(""); setNotice("Новый сценарий готов. Сохранённые планы остались в базе."); }
    function logout() {
        if (dirty && !window.confirm("Выйти? В текущем плане есть несохранённые изменения.")) return;
        void run(onLogout);
    }
    return <div className={`app-shell immersive-shell ${uiHidden ? "interface-hidden" : ""}`}>
      <CityMap selected={selectedDistrict} onSelect={id => { setSelectedDistrict(id); setPanel("district"); }} plan={plan} catalog={catalog} fullViewport uiHidden={uiHidden}/>
      <main className="map-interface" aria-label="Управление городом" hidden={uiHidden}>
        <header className="floating-brand"><span className="brand-mark"><Icon name="city" size={24}/></span><div><span className="eyebrow">ASTANA CITY LAB · HACKALEM 2026</span><h1>Аким на <span>5 часов</span></h1></div></header>
        <div className="floating-actions"><button className="icon-button" aria-label="Как играть" title="Как играть" onClick={() => openModal("help")}><Icon name="help" size={19}/></button><button className="icon-button" aria-label="Новый сценарий" title="Новый сценарий" disabled={busy || (!scenario && plan.length === 0)} onClick={() => openModal("reset")}><Icon name="reset" size={18}/></button></div>
        <section className="summary-strip" aria-label="Сводка сценария">
          <div className="summary-item budget-summary"><span className="summary-icon"><Icon name="wallet"/></span><div><span className="summary-label">Доступный бюджет</span><div className="summary-value">{100 - spent}<span>/ 100 ед.</span></div></div><div className="mini-budget" title={`Осталось ${100 - spent} единиц`}><span style={{ width: `${100 - spent}%` }}/></div></div>
          <div className="summary-item"><span className="summary-icon"><Icon name="layers"/></span><div><span className="summary-label">Ваши решения</span><div className="summary-value">{plan.length}<span>/ 5 выбрано</span></div></div><div className="decision-dots">{Array.from({ length: 5 }, (_, i) => <span className={i < plan.length ? "filled" : ""} key={i}/>)}</div></div>
          <div className="summary-item"><span className="summary-icon blue"><Icon name="clock"/></span><div><span className="summary-label">Горизонт планирования</span><div className="summary-value">2 года<span>8 кварталов</span></div></div></div>
          <div className="summary-item score-summary"><span className="summary-icon blue"><Icon name="chart"/></span><div><span className="summary-label">{finalized ? "Итоговый Score" : plan.length ? "Предпросмотр Score" : "Качество жизни · старт"}</span><div className="summary-value">{formatScore(result.score)}<span className={plan.length ? "score-delta" : ""}>{plan.length ? formatDelta(result.score - baseline.score) : "/ 100"}</span></div></div></div>
        </section>

<section hidden={panel !== "metrics"} id="overlay-metrics" className="panel floating-panel metrics-overview" aria-label="Показатели районов"><button className="overlay-close icon-button" aria-label="Закрыть показатели" onClick={closePanel}><Icon name="close"/></button><div className="metrics-heading"><h3>Как меняется город</h3><p>Оценки районов до и после ваших решений</p></div>{result.districts.map((d, i) => <button key={d.id} className={`district-comparison ${selectedDistrict === d.id ? "selected" : ""}`} onClick={() => setSelectedDistrict(d.id)}><span>{d.name}<small>{Math.round(d.population * 100)}% населения</small></span><div className="comparison-track"><i style={{ width: `${d.score}%` }}/><b style={{ width: `${baseline.districts[i].score}%` }}/></div><strong>{formatScore(d.score)}<small>было {formatScore(baseline.districts[i].score)}</small></strong></button>)}<div className="comparison-legend"><span /> Исходное значение <span /> Ваш сценарий</div></section>            <section hidden={panel !== "district"} id="overlay-district" className="panel floating-panel district-panel" aria-labelledby="district-title"><button className="overlay-close icon-button" aria-label="Закрыть район" onClick={closePanel}><Icon name="close"/></button><div className="district-heading"><div className="district-heading-left"><span className="district-icon"><Icon name="pin" size={21}/></span><div><div className="district-title-row"><h2 id="district-title">{selected.name}</h2><span className="subtle-badge">{Math.round(selected.population * 100)}% населения</span></div><p>{districts.find(d => d.id === selectedDistrict)?.note}</p></div></div><div className="district-score"><strong>{formatScore(selected.score)}</strong><span>оценка сценария</span></div></div>
              <div className="district-metrics">{categories.map((c, i) => { const val = (selected.values[i * 2] + selected.values[i * 2 + 1]) / 2; const old = (before.values[i * 2] + before.values[i * 2 + 1]) / 2; return <div className="district-metric" key={c.id}><div className="metric-label"><Icon name={c.id} size={14}/><span>{c.short}</span></div><div className="metric-number">{val.toFixed(1)}<span>{val !== old ? formatDelta(val - old, 1) : "/ 100"}</span></div><div className="metric-bar"><span style={{ width: `${val}%` }}/></div></div>; })}</div>
              {panel === "district" && <DistrictInsightsPanel key={selectedDistrict} district={selectedDistrict} />}<p className="metrics-explainer">По направлениям показано среднее двух показателей. Итоговая оценка учитывает веса из задания.</p>
            </section>

            {panel === "advisor" && <section className="panel floating-panel advisor-panel" id="ai-advisor" tabIndex={-1}><button className="overlay-close icon-button" aria-label="Закрыть AI-советника" onClick={closePanel}><Icon name="close"/></button><DistrictInsightsPanel key={selectedDistrict} district={selectedDistrict} advice /></section>}
          <aside hidden={panel !== "plan"} id="overlay-plan" className="panel floating-panel plan-panel" aria-labelledby="plan-title"><button className="overlay-close icon-button" aria-label="Закрыть сценарий" onClick={closePanel}><Icon name="close"/></button><div className="panel-heading"><div><h2 id="plan-title">Ваш сценарий</h2><p>Соберите план развития города</p></div><span className="count-badge purple">{plan.length}/5</span></div>
            <div className="scenario-editor"><label>Название сценария<input maxLength={120} value={name} disabled={busy || finalized} onChange={e => setName(e.target.value)}/></label><span className="record-status">{finalized ? "Завершён · только просмотр" : dirty ? "Есть несохранённые изменения" : scenario ? "Все изменения сохранены" : "Новый сценарий"}</span><div className="scenario-buttons">{!finalized && <><button className="button button-outline" disabled={busy || !name.trim() || (!!scenario && !dirty)} onClick={save}>{busy ? "Подождите…" : "Сохранить черновик"}</button><button className="button button-primary" disabled={busy || !complete || !name.trim()} onClick={finalize}>Завершить сценарий</button></>}{scenario && <button className="text-button" disabled={busy} onClick={() => openScenario(scenario.id)}>Перезагрузить из базы</button>}</div></div>
            <div className="plan-budget"><div><span>Бюджет сценария</span><strong>{spent}<small> / 100</small></strong></div><div className="budget-track"><span style={{ width: `${spent}%` }}/></div><div className="budget-caption"><span>Условные единицы</span><span>Осталось <b>{100 - spent}</b></span></div></div>
            <div className="plan-list">{Array.from({ length: 5 }, (_, i) => {
            const choice = plan[i];
            const m = choice ? measures.find(m => m.id === choice.id)! : null;
            return m && choice ? <div className="plan-slot filled" key={choice.id}><span className={`plan-slot-icon ${m.category}`}><Icon name={m.category} size={17}/></span><div><h3>{m.name}</h3><span>{m.city ? "Весь город" : districts.find(d => d.id === choice.district)!.name} <b>· {m.cost} ед.</b></span></div><button className="remove-button" aria-label={`Убрать ${m.name} из плана`} disabled={busy || finalized} onClick={() => removeMeasure(m.id)}><Icon name="close" size={14}/></button></div> : <div className="plan-slot empty" key={`empty-${i}`}><span className="slot-number">0{i + 1}</span><div><span>Ваше решение</span><small><button onClick={() => setPanel("catalog")}>Открыть инициативы →</button></small></div><Icon name="plus" size={14}/></div>;
        })}</div>
            <div className="plan-hint"><Icon name="layers" size={16}/><p>До 2 мер на направление.<br />Каждое решение имеет значение.</p></div>
            <div className="plan-notice" role="status" aria-live="polite">{notice}</div>
            <div className="plan-actions"><button className="button button-primary simulate-button" disabled={!complete || busy} onClick={() => openModal("results")}>Посмотреть результат<Icon name="arrow" size={17}/></button><p>{complete ? "Все условия соблюдены. Город готов к изменениям." : `Добавьте ещё ${5 - plan.length} ${5 - plan.length === 1 ? "решение" : 5 - plan.length === 5 ? "решений" : "решения"}, чтобы оценить сценарий`}</p><button className="example-button" disabled={busy || finalized} onClick={loadExample}><Icon name="sparkles" size={14}/> Загрузить пример из задания</button></div>
            <div className="score-note"><span className="score-note-icon"><Icon name="target" size={21}/></span><h3>Сильный город — для всех</h3><p>Итоговый балл учитывает качество жизни в самом слабом районе. Не оставляйте его позади.</p><span>70% среднее + 30% слабый район − штрафы</span></div>
          </aside>

          <section hidden={panel !== "catalog"} id="overlay-catalog" className="panel floating-panel catalog-panel" aria-labelledby="catalog-title"><button className="overlay-close icon-button" aria-label="Закрыть инициативы" onClick={closePanel}><Icon name="close"/></button>
            <div className="panel-heading"><div><h2 id="catalog-title">Городские инициативы</h2><p>Маленькие шаги. Большие изменения.</p></div><span className="count-badge">{measures.length}</span></div>
            <label className="search-box"><Icon name="search" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти мероприятие" aria-label="Поиск мероприятий"/></label>
            <div className="category-filter" aria-label="Фильтр по направлению"><button title="Все направления" aria-label="Все направления" aria-pressed={category === "all"} className={category === "all" ? "selected" : ""} onClick={() => setCategory("all")}><Icon name="grid" size={17}/></button>{categories.map(c => <button key={c.id} title={c.name} aria-label={c.name} aria-pressed={category === c.id} className={category === c.id ? "selected" : ""} onClick={() => setCategory(c.id)}><Icon name={c.id} size={17}/></button>)}</div>
            <div className="catalog-notice" role="status" aria-live="polite">{notice}</div><div className="catalog-caption"><span>{category === "all" ? "Все направления" : categories.find(c => c.id === category)!.short}</span><span>{filtered.length} из {measures.length}</span></div>
            <div className="measure-list">
              {filtered.map(m => {
            const added = plan.find(s => s.id === m.id);
            const candidate = [...plan, { id: m.id, ...(m.city ? {} : { district: selectedDistrict }) }];
            const unavailable = added ? null : validatePlan(candidate, false, catalog);
            return <article className={`measure-card ${added ? "measure-added" : ""}`} key={m.id}>
                  <div className="measure-top"><span className={`measure-category ${m.category}`}><Icon name={m.category} size={14}/>{categories.find(c => c.id === m.category)!.short}</span><span className="measure-id">{m.id}</span></div>
                  <h3>{m.name}</h3><p>{m.description}</p>
                  <div className="effect-chips">{Object.entries(m.effects).map(([metric, value]) => <span key={metric} className={value < 0 ? "negative" : ""} title={`${metricNames[metric as keyof typeof metricNames]}: полный эффект до учёта задержки`}>{metric} {value > 0 ? "+" : ""}{value}</span>)}</div>
                  <div className="measure-meta"><span><Icon name={m.city ? "city" : "pin"} size={12}/>{m.city ? "Весь город" : added ? districts.find(d => d.id === added.district)!.name : selected.name}</span><span><Icon name="clock" size={12}/>{m.lag} кв.</span></div>
                  <div className="measure-bottom"><strong>{m.cost}<span> ед.</span></strong><button className={`add-button ${added ? "is-added" : ""}`} aria-label={added ? `Удалить: ${m.name}` : `Добавить: ${m.name}`} title={unavailable ?? (added ? "Удалить из сценария" : "Добавить в сценарий")} disabled={busy || finalized || !!unavailable} data-unavailable={!!unavailable} onClick={() => added ? removeMeasure(m.id) : addMeasure(m.id)}><Icon name={added ? "check" : "plus"} size={14}/>{added ? "В плане" : "Добавить"}</button></div>
                </article>;
        })}
              {!filtered.length && <div className="search-empty"><Icon name="search" size={26}/><h3>Ничего не найдено</h3><p>Попробуйте другое название.</p><button className="text-button" onClick={() => { setQuery(""); setCategory("all"); }}>Сбросить поиск</button></div>}
            </div>
            <div className="catalog-footer"><label className="catalog-district-picker"><Icon name="pin" size={14}/><span>Район для новых мер:</span><select aria-label="Район для новых мероприятий" value={selectedDistrict} onChange={event => setSelectedDistrict(event.target.value)}>{districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label><span className="catalog-budget-summary">План {plan.length}/5 · Осталось {100 - spent} ед.</span><button className="catalog-to-plan" onClick={() => setPanel("plan")}>К сценарию <Icon name="arrow" size={13}/></button></div>
          </section>

        {panel === "saved" && <section id="overlay-saved" className="panel floating-panel saved-panel" aria-label="Сохранённые сценарии"><button className="overlay-close icon-button" aria-label="Закрыть сохранённые сценарии" onClick={closePanel}><Icon name="close"/></button><div className="panel-heading"><h2>Сохранённые сценарии</h2></div><ScenarioLibrary version={libraryVersion} busy={busy} onOpen={openScenario}/></section>}
        {panel === "reports" && <section id="overlay-reports" className="panel floating-panel reports-panel" aria-label="Обращения жителей"><button className="overlay-close icon-button" aria-label="Закрыть обращения" onClick={closePanel}><Icon name="close"/></button><div className="panel-heading"><h2>Обращения жителей</h2></div><ReportsPanel catalog={catalog}/></section>}
        <div className="workspace-account"><span>{user.displayName}</span><button disabled={busy} onClick={logout}>Выйти</button></div>
        {(error || busy) && <div className={`workspace-feedback ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}>{error || "Сервер обрабатывает запрос…"}{error && <button aria-label="Закрыть сообщение" onClick={() => setError("")}><Icon name="close" size={15}/></button>}</div>}
        <nav className="city-dock" aria-label="Панели управления">
          <button data-panel="catalog" aria-controls="overlay-catalog" aria-expanded={panel === "catalog"} className={`dock-primary ${panel === "catalog" ? "active" : ""}`} onClick={() => setPanel(panel === "catalog" ? null : "catalog")}><Icon name="plus" size={20}/><span>Инициативы</span></button>
          <button data-panel="plan" aria-controls="overlay-plan" aria-expanded={panel === "plan"} onClick={() => setPanel(panel === "plan" ? null : "plan")}><Icon name="layers" size={20}/><span>Сценарий</span><b>{plan.length}/5</b></button>
          <button data-panel="saved" aria-controls="overlay-saved" aria-expanded={panel === "saved"} onClick={() => setPanel(panel === "saved" ? null : "saved")}><Icon name="layers" size={19}/><span>Сохранённые</span></button>
          <button data-panel="reports" aria-controls="overlay-reports" aria-expanded={panel === "reports"} onClick={() => setPanel(panel === "reports" ? null : "reports")}><Icon name="services" size={19}/><span>Обращения</span></button>
          <span className="dock-divider"/>
          <button data-panel="district" aria-controls="overlay-district" aria-expanded={panel === "district"} onClick={() => setPanel(panel === "district" ? null : "district")}><Icon name="pin" size={19}/><span>{selected.name}</span></button>
          <button data-panel="metrics" aria-controls="overlay-metrics" aria-expanded={panel === "metrics"} onClick={() => setPanel(panel === "metrics" ? null : "metrics")}><Icon name="chart" size={20}/><span>Показатели</span></button>
          <button data-panel="advisor" aria-controls="ai-advisor" aria-expanded={panel === "advisor"} onClick={() => setPanel(panel === "advisor" ? null : "advisor")}><Icon name="sparkles" size={19}/><span>AI</span></button>
        </nav>
        <div className="map-data-note"><span className="live-dot"/> Общая база · Учебная модель</div>
      </main>
      <button className="interface-toggle" aria-label={uiHidden ? "Показать интерфейс" : "Скрыть интерфейс"} aria-pressed={uiHidden} onClick={() => setUiHidden(v => !v)}><Icon name={uiHidden ? "grid" : "expand"} size={17}/><span>{uiHidden ? "Показать панели" : "Только карта"}</span></button>
    <dialog ref={dialog} className="app-dialog" aria-labelledby="dialog-title" onClick={e => { if (e.target === dialog.current)
        dialog.current.close(); }}><div className="dialog-content"><button className="dialog-close icon-button" aria-label="Закрыть окно" onClick={() => dialog.current?.close()}><Icon name="close"/></button>
      {modal === "help" ? <><span className="dialog-eyebrow">ВАШ ГОРОД. ВАШИ РЕШЕНИЯ.</span><h2 id="dialog-title">Пять решений для Астаны</h2><p>Выберите ровно 5 мероприятий из каталога и уложитесь в 100 единиц. Для районных мер сначала выберите район на схеме или в переключателе.</p><ol className="rules-list"><li>Каждая мера используется один раз; максимум две из одного направления.</li><li>Остаток бюджета допустим. Городские меры действуют во всех районах.</li><li>Автобусные полосы и ЛРТ несовместимы. Парк со школой и чистое топливо с модернизацией сетей нельзя размещать в одном районе.</li><li>Эффект учитывает задержку: полный эффект × (8 − лаг) / 8. Синергии добавляются отдельно.</li></ol><div className="formula-box">Score = 0.7 × среднее по населению<br />+ 0.3 × худший район − критические показатели</div><p>За каждый показатель строго ниже 40 снимается один балл. Предпросмотр доступен во время выбора; итоговый сценарий должен содержать ровно 5 решений.</p><p className="dialog-footnote">Условная схема и синтетические данные. Результат — оценка игровой модели, а не прогноз реального развития Астаны.</p><button className="button button-primary" onClick={() => dialog.current?.close()}>Понятно, начнём<Icon name="arrow" size={16}/></button></> : modal === "reset" ? <><span className="dialog-eyebrow">НОВЫЙ СЦЕНАРИЙ</span><h2 id="dialog-title">Начать с чистого листа?</h2><p>Несохранённые изменения текущего плана будут потеряны. Сохранённые сценарии останутся в базе. Бюджет нового плана — 100 единиц.</p><div className="dialog-actions"><button className="button button-outline" onClick={() => dialog.current?.close()}>Продолжить текущий</button><button className="button button-primary" onClick={() => { reset(); dialog.current?.close(); }}>Начать заново</button></div></> : <><span className="dialog-eyebrow">РЕЗУЛЬТАТ ВАШЕГО СЦЕНАРИЯ</span><h2 id="dialog-title">Ваши решения в цифрах</h2><div className="result-hero"><span>Astana Quality of Life Score</span><strong>{formatScore(result.score)}<small>{formatDelta(result.score - baseline.score)}</small></strong><p>Начальный балл {formatScore(baseline.score)} · Бюджет {spent}/100 · Решений 5/5</p></div><div className="result-districts">{result.districts.map((d, i) => <div key={d.id}><span>{d.name}</span><span>{formatScore(baseline.districts[i].score)} <Icon name="arrow" size={12}/> <strong>{formatScore(d.score)}</strong></span></div>)}</div><div className="result-facts"><div><span>Среднее по городу</span><strong>{formatScore(result.average)}</strong></div><div><span>Худший район</span><strong>{formatScore(result.minimum)}</strong></div><div><span>Критических показателей</span><strong>{result.critical} <small>было {baseline.critical}</small></strong></div></div><p className="dialog-footnote">Рассчитано сервером по формуле из задания, с учётом задержек и синергий. {finalized ? "Сценарий завершён и сохранён." : "Это предпросмотр. Завершите сценарий, чтобы зафиксировать результат."}</p><button className="button button-primary" onClick={() => dialog.current?.close()}>Вернуться к сценарию<Icon name="arrow" size={16}/></button></>}
    </div></dialog>
  </div>;
}
