"use client";
import { useEffect, useRef, useState } from "react";
import { CityMap } from "@/components/city-map";
import { Icon } from "@/components/icon";
import { BrandLogo } from "./brand-logo";
import { categories, examplePlan, formatScore, formatDelta, validatePlan, type Selection } from "@/lib/simulation";
import { api, message, selectionsOf, type Catalog, type Result, type Scenario, type User } from "@/lib/api";
import { ScenarioLibrary } from "./scenario-library";
import { ReportsPanel } from "./reports-panel";
import { ScenarioFlow, type ScenarioStage } from "./scenario-flow";
import { DistrictInsightsPanel } from "./district-insights";
export function Workspace({ user, catalog, baseline, onLogout }: { user: User; catalog: Catalog; baseline: Result; onLogout: () => Promise<void> }) {
    const { districts, measures } = catalog;
    const [selectedDistrict, setSelectedDistrict] = useState("nura");
    const [plan, setPlan] = useState<Selection[]>([]);
    const [panel, setPanel] = useState<"flow" | "district" | "metrics" | "advisor" | "saved" | "reports" | null>("flow");
    const [stage, setStage] = useState<ScenarioStage>("start");
    const [uiHidden, setUiHidden] = useState(false);
    const [notice, setNotice] = useState("");
    const [modal, setModal] = useState<"help" | "reset">("help");
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
    function openModal(next: typeof modal) { setModal(next); dialog.current?.showModal(); }
    async function run(action: () => Promise<void>) {
        if (lock.current) return;
        lock.current = true; setBusy(true); setError("");
        try { await action(); } catch (error) { setError(message(error)); }
        finally { lock.current = false; setBusy(false); }
    }
    function changePlan(next: Selection[], notice: string, onSuccess?: () => void) {
        if (finalized) return;
        const invalid = validatePlan(next, false, catalog);
        if (invalid) { setError(invalid); return; }
        void run(async () => {
            const preview = await api<Result>("akim/simulation/preview", "POST", { selections: next });
            setPlan(next); setResult(preview); setNotice(notice);
            onSuccess?.();
        });
    }
    function addMeasure(id: string) {
        const measure = measures.find(m => m.id === id)!;
        const next = [...plan, { id, ...(measure.city ? {} : { district: selectedDistrict }) }];
        changePlan(next, `${measure.name}: добавлено ${measure.city ? "для всего города" : `в район ${selected.name}`}.`);
    }
    function removeMeasure(id: string) { changePlan(plan.filter(s => s.id !== id), "Мероприятие удалено из сценария."); }
    function loadExample() { changePlan(examplePlan.map(s => ({ ...s })), "Готовый пример: 5 инициатив за 95 единиц. Проверьте план или замените инициативы.", () => { setSelectedDistrict("nura"); setStage("build"); setPanel("flow"); }); }
    function applyScenario(saved: Scenario) { setScenario(saved); setPlan(selectionsOf(saved)); setName(saved.name); setResult(saved.result); }
    async function persist() {
        const saved = await api<Scenario>(scenario ? `akim/scenarios/${scenario.id}` : "akim/scenarios", scenario ? "PUT" : "POST", { name: name.trim(), selections: plan, ...(scenario ? { version: scenario.version } : {}) });
        applyScenario(saved); setLibraryVersion(v => v + 1); return saved;
    }
    function save() { void run(async () => { await persist(); setNotice("Черновик сохранён."); }); }
    function finalize() {
        const invalid = validatePlan(plan, true, catalog);
        if (invalid || !name.trim()) { setError(invalid ?? "Укажите название сценария."); return; }
        void run(async () => {
            const saved = !scenario || dirty ? await persist() : scenario;
            const final = await api<Scenario>(`akim/scenarios/${saved.id}/finalize`, "POST", { version: saved.version });
            applyScenario(final); setLibraryVersion(v => v + 1); setNotice("Сценарий завершён и сохранён."); setStage("result"); setPanel("flow");
        });
    }
    function openScenario(id: string) {
        if (dirty && !window.confirm("Открыть сохранённый сценарий? Несохранённые изменения текущего плана будут потеряны.")) return;
        void run(async () => {
            const saved = await api<Scenario>(`akim/scenarios/${id}`);
            applyScenario(saved);
            setStage(saved.status === "FINAL" ? "result" : validatePlan(saved.selections, true, catalog) ? "build" : "review");
            setPanel("flow"); setNotice("Сценарий загружен из базы.");
        });
    }
    function reset() { setPlan([]); setResult(baseline); setScenario(null); setName("Мой план развития"); setError(""); setNotice(""); setStage("build"); setPanel("flow"); }
    function openFlow() {
        if (stage === "start") { setStage("build"); setPanel("flow"); return; }
        if (panel === "flow") { closePanel(); return; }
        setPanel("flow");
    }
    function logout() {
        if (dirty && !window.confirm("Выйти? В текущем плане есть несохранённые изменения.")) return;
        void run(onLogout);
    }
    return <div className={`app-shell immersive-shell ${uiHidden ? "interface-hidden" : ""}`}>
      <CityMap selected={selectedDistrict} onSelect={id => { setSelectedDistrict(id); setPanel(current => current === "flow" || current === "advisor" ? current : "district"); }} plan={plan} catalog={catalog} fullViewport uiHidden={uiHidden}/>
      <main className="map-interface" aria-label="Управление городом" hidden={uiHidden}>
        <header className="floating-brand"><BrandLogo compact/><div><span className="eyebrow">АКИМ НА 5 ЧАСОВ · HACKALEM 2026</span><h1>E-Akim<span>AI</span></h1></div></header>
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
        {panel === "flow" && <ScenarioFlow
          stage={stage} onStage={setStage} catalog={catalog} baseline={baseline} result={result}
          plan={plan} selectedDistrict={selectedDistrict} onDistrict={setSelectedDistrict}
          name={name} onName={setName} busy={busy} finalized={finalized}
          saved={!!scenario} dirty={dirty} error={error} notice={notice}
          onAdd={addMeasure} onRemove={removeMeasure} onExample={loadExample}
          onSave={save} onFinalize={finalize} onNew={() => openModal("reset")}
          onReload={scenario ? () => openScenario(scenario.id) : undefined} onClose={closePanel}
        />}

        {panel === "saved" && <section id="overlay-saved" className="panel floating-panel saved-panel" aria-label="Сохранённые сценарии"><button className="overlay-close icon-button" aria-label="Закрыть сохранённые сценарии" onClick={closePanel}><Icon name="close"/></button><div className="panel-heading"><h2>Сохранённые сценарии</h2></div><ScenarioLibrary version={libraryVersion} busy={busy} onOpen={openScenario}/></section>}
        {panel === "reports" && <section id="overlay-reports" className="panel floating-panel reports-panel" aria-label="Обращения жителей"><button className="overlay-close icon-button" aria-label="Закрыть обращения" onClick={closePanel}><Icon name="close"/></button><div className="panel-heading"><h2>Обращения жителей</h2></div><ReportsPanel catalog={catalog}/></section>}
        <div className="workspace-account"><span>{user.displayName}</span><button disabled={busy} onClick={logout}>Выйти</button></div>
        {panel !== "flow" && (error || busy) && <div className={`workspace-feedback ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}>{error || "Сервер обрабатывает запрос…"}{error && <button aria-label="Закрыть сообщение" onClick={() => setError("")}><Icon name="close" size={15}/></button>}</div>}
        <nav className="city-dock" aria-label="Панели управления">
          <button data-panel="flow" aria-controls="overlay-flow" aria-expanded={panel === "flow"} className="dock-primary" onClick={openFlow}><Icon name={finalized ? "chart" : "layers"} size={20}/><span>{finalized ? "Результат" : stage === "start" ? "Начать сценарий" : "Мой сценарий"}</span>{stage !== "start" && <b>{plan.length}/5</b>}</button>
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
      {modal === "help" ? <>
        <span className="dialog-eyebrow">ВАШ ГОРОД. ВАШИ РЕШЕНИЯ.</span>
        <h2 id="dialog-title">Три шага к плану развития</h2>
        <ol className="rules-list"><li>Нажмите «Начать сценарий». Выберите район и добавьте инициативы — текущий план и остаток бюджета всегда рядом.</li><li>Когда выбрано 5 инициатив, нажмите «Проверить план». Здесь можно изменить название и проверить районы и стоимость.</li><li>Нажмите «Завершить и сохранить», чтобы увидеть итог и вернуться к нему позже через «Сохранённые».</li></ol>
        <p>Бюджет — 100 единиц, ровно 5 уникальных инициатив, максимум 2 одного направления. Городские меры действуют во всех районах. Недоступные сочетания отмечены прямо в каталоге.</p>
        <div className="formula-box">Score = 0.7 × среднее по населению<br />+ 0.3 × худший район − критические показатели</div>
        <p className="dialog-footnote">Показатели синтетические. Это оценка учебной модели, а не прогноз реального развития города.</p>
        <button className="button button-primary" onClick={() => { dialog.current?.close(); if (stage === "start") setStage("build"); setPanel("flow"); }}>{stage === "start" ? "Начать сценарий" : "Вернуться к сценарию"}<Icon name="arrow" size={16}/></button>
      </> : <>
        <span className="dialog-eyebrow">НОВЫЙ СЦЕНАРИЙ</span><h2 id="dialog-title">Начать с чистого листа?</h2>
        <p>Несохранённые изменения текущего плана будут потеряны. Сохранённые сценарии останутся в базе. Бюджет нового плана — 100 единиц.</p>
        <div className="dialog-actions"><button className="button button-outline" onClick={() => dialog.current?.close()}>Продолжить текущий</button><button className="button button-primary" disabled={busy} onClick={() => { reset(); dialog.current?.close(); }}>Начать новый сценарий</button></div>
      </>}
    </div></dialog>
  </div>;
}
