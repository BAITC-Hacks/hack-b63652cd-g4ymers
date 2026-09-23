"use client";
import { useRef, useState } from "react";
import { CityMap } from "@/components/city-map";
import { Icon } from "@/components/icon";
import { baseline, categories, costOf, districts, examplePlan, formatScore, formatDelta, measures, metricNames, simulate, validatePlan, type Category, type Selection } from "@/lib/simulation";
export default function Home() {
    const [selectedDistrict, setSelectedDistrict] = useState("nura");
    const [category, setCategory] = useState<Category | "all">("all");
    const [query, setQuery] = useState("");
    const [plan, setPlan] = useState<Selection[]>([]);
    const [view, setView] = useState<"city" | "metrics">("city");
    const [notice, setNotice] = useState("");
    const [modal, setModal] = useState<"help" | "results" | "reset">("help");
    const dialog = useRef<HTMLDialogElement>(null);
    const result = simulate(plan);
    const spent = costOf(plan);
    const selected = result.districts.find(d => d.id === selectedDistrict)!;
    const before = baseline.districts.find(d => d.id === selectedDistrict)!;
    const complete = !validatePlan(plan);
    const filtered = measures.filter(m => (category === "all" || m.category === category) && `${m.name} ${m.description}`.toLowerCase().includes(query.toLowerCase()));
    function openModal(next: typeof modal) { setModal(next); dialog.current?.showModal(); }
    function addMeasure(id: string) {
        const measure = measures.find(m => m.id === id)!;
        const next = [...plan, { id, ...(measure.city ? {} : { district: selectedDistrict }) }];
        const error = validatePlan(next, false);
        if (error) {
            setNotice(error);
            return;
        }
        setPlan(next);
        setNotice(`${measure.name}: добавлено ${measure.city ? "для всего города" : `в район ${selected.name}`}.`);
    }
    function removeMeasure(id: string) { setPlan(plan.filter(s => s.id !== id)); setNotice("Мероприятие удалено из сценария."); }
    function loadExample() { setPlan(examplePlan.map(s => ({ ...s }))); setSelectedDistrict("nura"); setNotice("Загружен контрольный сценарий из задания: 5 мероприятий за 95 единиц."); }
    return <div className="app-shell">
    <aside className="sidebar" aria-label="Главная навигация">
      <a className="brand-mark" href="#" aria-label="Аким — на главную"><Icon name="city" size={25}/><span className="brand-dot"/></a>
      <div className="sidebar-rule"/>
      <nav className="sidebar-nav">
        <button className={`nav-button ${view === "city" ? "active" : ""}`} title="Город" aria-label="Город" aria-pressed={view === "city"} onClick={() => setView("city")}><Icon name="grid"/></button>
        <button className={`nav-button ${view === "metrics" ? "active" : ""}`} title="Показатели районов" aria-label="Показатели районов" aria-pressed={view === "metrics"} onClick={() => setView("metrics")}><Icon name="chart"/></button>
        <button className="nav-button" title="AI-советник" aria-label="Перейти к AI-советнику" onClick={() => document.getElementById("ai-advisor")?.scrollIntoView({ behavior: "smooth", block: "center" })}><Icon name="sparkles"/></button>
      </nav>
      <div className="sidebar-bottom"><button className="nav-button" aria-label="Правила симулятора" title="Правила" onClick={() => openModal("help")}><Icon name="help"/></button><span className="team-avatar" title="Команда g4ymers">G4</span></div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <div className="breadcrumbs"><span>Рабочее пространство</span><Icon name="chevron" size={13}/><strong>Симулятор города</strong></div>
        <div className="topbar-right"><span className="event-label">HACKALEM AI <b>2026</b></span><span className="topbar-divider"/><span className="dataset-status"><span className="live-dot"/> Синтетические данные</span></div>
      </header>

      <main>
        <section className="page-heading">
          <div><div className="eyebrow"><span /> ASTANA INNOVATIONS · CITY LAB</div><h1>Аким на <span>5 часов</span><span className="beta-badge">СИМУЛЯТОР</span></h1><p>Один бюджет. Пять решений. Город, который меняете вы.</p></div>
          <div className="heading-actions"><button className="button button-ghost" onClick={() => openModal("help")}><Icon name="help" size={16}/> Как играть</button><button className="button button-outline" disabled={plan.length === 0} onClick={() => openModal("reset")}><Icon name="reset" size={15}/> Новый сценарий</button></div>
        </section>

        <section className="summary-strip" aria-label="Сводка сценария">
          <div className="summary-item budget-summary"><span className="summary-icon"><Icon name="wallet"/></span><div><span className="summary-label">Доступный бюджет</span><div className="summary-value">{100 - spent}<span>/ 100 ед.</span></div></div><div className="mini-budget" title={`Осталось ${100 - spent} единиц`}><span style={{ width: `${100 - spent}%` }}/></div></div>
          <div className="summary-item"><span className="summary-icon"><Icon name="layers"/></span><div><span className="summary-label">Ваши решения</span><div className="summary-value">{plan.length}<span>/ 5 выбрано</span></div></div><div className="decision-dots">{Array.from({ length: 5 }, (_, i) => <span className={i < plan.length ? "filled" : ""} key={i}/>)}</div></div>
          <div className="summary-item"><span className="summary-icon blue"><Icon name="clock"/></span><div><span className="summary-label">Горизонт планирования</span><div className="summary-value">2 года<span>8 кварталов</span></div></div></div>
          <div className="summary-item score-summary"><span className="summary-icon blue"><Icon name="chart"/></span><div><span className="summary-label">{plan.length ? "Предпросмотр Score" : "Качество жизни · старт"}</span><div className="summary-value">{formatScore(result.score)}<span className={plan.length ? "score-delta" : ""}>{plan.length ? formatDelta(result.score - baseline.score) : "/ 100"}</span></div></div></div>
        </section>

        <div className="dashboard-grid">
          <section className="panel catalog-panel" aria-labelledby="catalog-title">
            <div className="panel-heading"><div><h2 id="catalog-title">Городские инициативы</h2><p>Маленькие шаги. Большие изменения.</p></div><span className="count-badge">14</span></div>
            <label className="search-box"><Icon name="search" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти мероприятие" aria-label="Поиск мероприятий"/></label>
            <div className="category-filter" aria-label="Фильтр по направлению"><button title="Все направления" aria-label="Все направления" aria-pressed={category === "all"} className={category === "all" ? "selected" : ""} onClick={() => setCategory("all")}><Icon name="grid" size={17}/></button>{categories.map(c => <button key={c.id} title={c.name} aria-label={c.name} aria-pressed={category === c.id} className={category === c.id ? "selected" : ""} onClick={() => setCategory(c.id)}><Icon name={c.id} size={17}/></button>)}</div>
            <div className="catalog-caption"><span>{category === "all" ? "Все направления" : categories.find(c => c.id === category)!.short}</span><span>{filtered.length} из 14</span></div>
            <div className="measure-list">
              {filtered.map(m => {
            const added = plan.find(s => s.id === m.id);
            const candidate = [...plan, { id: m.id, ...(m.city ? {} : { district: selectedDistrict }) }];
            const unavailable = added ? null : validatePlan(candidate, false);
            return <article className={`measure-card ${added ? "measure-added" : ""}`} key={m.id}>
                  <div className="measure-top"><span className={`measure-category ${m.category}`}><Icon name={m.category} size={14}/>{categories.find(c => c.id === m.category)!.short}</span><span className="measure-id">{m.id}</span></div>
                  <h3>{m.name}</h3><p>{m.description}</p>
                  <div className="effect-chips">{Object.entries(m.effects).map(([metric, value]) => <span key={metric} className={value < 0 ? "negative" : ""} title={`${metricNames[metric as keyof typeof metricNames]}: полный эффект до учёта задержки`}>{metric} {value > 0 ? "+" : ""}{value}</span>)}</div>
                  <div className="measure-meta"><span><Icon name={m.city ? "city" : "pin"} size={12}/>{m.city ? "Весь город" : added ? districts.find(d => d.id === added.district)!.name : selected.name}</span><span><Icon name="clock" size={12}/>{m.lag} кв.</span></div>
                  <div className="measure-bottom"><strong>{m.cost}<span> ед.</span></strong><button className={`add-button ${added ? "is-added" : ""}`} aria-label={added ? `Удалить: ${m.name}` : `Добавить: ${m.name}`} title={unavailable ?? (added ? "Удалить из сценария" : "Добавить в сценарий")} data-unavailable={!!unavailable} onClick={() => added ? removeMeasure(m.id) : addMeasure(m.id)}><Icon name={added ? "check" : "plus"} size={14}/>{added ? "В плане" : "Добавить"}</button></div>
                </article>;
        })}
              {!filtered.length && <div className="search-empty"><Icon name="search" size={26}/><h3>Ничего не найдено</h3><p>Попробуйте другое название.</p><button className="text-button" onClick={() => { setQuery(""); setCategory("all"); }}>Сбросить поиск</button></div>}
            </div>
            <div className="catalog-footer"><Icon name="pin" size={13}/><span>Район для новых мер: <strong>{selected.name}</strong></span></div>
          </section>

          <div className="center-column">
            <section className="panel map-panel" aria-label="Город и показатели">
              <div className="map-panel-toolbar"><div className="view-tabs"><button className={view === "city" ? "selected" : ""} aria-pressed={view === "city"} onClick={() => setView("city")}><Icon name="city" size={16}/> Обзор города</button><button className={view === "metrics" ? "selected" : ""} aria-pressed={view === "metrics"} onClick={() => setView("metrics")}><Icon name="chart" size={16}/> Показатели</button></div><span className="map-version">5 РАЙОНОВ</span></div>
              {view === "city" ? <CityMap selected={selectedDistrict} onSelect={setSelectedDistrict} plan={plan}/> : <div className="metrics-overview"><div className="metrics-heading"><h3>Как меняется город</h3><p>Оценки районов до и после ваших решений</p></div>{result.districts.map((d, i) => <button key={d.id} className={`district-comparison ${selectedDistrict === d.id ? "selected" : ""}`} onClick={() => setSelectedDistrict(d.id)}><span>{d.name}<small>{Math.round(d.population * 100)}% населения</small></span><div className="comparison-track"><i style={{ width: `${d.score}%` }}/><b style={{ width: `${baseline.districts[i].score}%` }}/></div><strong>{formatScore(d.score)}<small>было {formatScore(baseline.districts[i].score)}</small></strong></button>)}<div className="comparison-legend"><span /> Исходное значение <span /> Ваш сценарий</div></div>}
              <div className="district-selector" aria-label="Выбрать район">{districts.map(d => <button className={selectedDistrict === d.id ? "selected" : ""} aria-pressed={selectedDistrict === d.id} key={d.id} onClick={() => setSelectedDistrict(d.id)}>{d.name}{d.id === "nura" && <span className="district-priority" title="Есть критические исходные показатели"/>}</button>)}</div>
            </section>

            <section className="panel district-panel" aria-labelledby="district-title"><div className="district-heading"><div className="district-heading-left"><span className="district-icon"><Icon name="pin" size={21}/></span><div><div className="district-title-row"><h2 id="district-title">{selected.name}</h2><span className="subtle-badge">{Math.round(selected.population * 100)}% населения</span></div><p>{selected.note}</p></div></div><div className="district-score"><strong>{formatScore(selected.score)}</strong><span>оценка района</span></div></div>
              <div className="district-metrics">{categories.map((c, i) => { const val = (selected.values[i * 2] + selected.values[i * 2 + 1]) / 2; const old = (before.values[i * 2] + before.values[i * 2 + 1]) / 2; return <div className="district-metric" key={c.id}><div className="metric-label"><Icon name={c.id} size={14}/><span>{c.short}</span></div><div className="metric-number">{val.toFixed(1)}<span>{val !== old ? formatDelta(val - old, 1) : "/ 100"}</span></div><div className="metric-bar"><span style={{ width: `${val}%` }}/></div></div>; })}</div>
              <p className="metrics-explainer">По направлениям показано среднее двух показателей. Итоговая оценка учитывает веса из задания.</p>
            </section>

            <section className="advisor-panel" id="ai-advisor" tabIndex={-1}><div className="advisor-icon"><Icon name="sparkles" size={23}/></div><div className="advisor-content"><div className="advisor-title"><h2>Взгляд на город с AI</h2><span>СКОРО</span></div><p>Какие решения усиливают друг друга? Кому нужна поддержка? Здесь появится разбор вашего сценария.</p><div className="advisor-status"><span /> AI ещё не подключён. Расчёты по модели уже работают.</div></div><span className="advisor-decoration" aria-hidden="true">✧</span></section>
          </div>

          <aside className="panel plan-panel" aria-labelledby="plan-title"><div className="panel-heading"><div><h2 id="plan-title">Ваш сценарий</h2><p>Соберите план развития города</p></div><span className="count-badge purple">{plan.length}/5</span></div>
            <div className="plan-budget"><div><span>Бюджет сценария</span><strong>{spent}<small> / 100</small></strong></div><div className="budget-track"><span style={{ width: `${spent}%` }}/></div><div className="budget-caption"><span>Условные единицы</span><span>Осталось <b>{100 - spent}</b></span></div></div>
            <div className="plan-list">{Array.from({ length: 5 }, (_, i) => {
            const choice = plan[i];
            const m = choice ? measures.find(m => m.id === choice.id)! : null;
            return m && choice ? <div className="plan-slot filled" key={choice.id}><span className={`plan-slot-icon ${m.category}`}><Icon name={m.category} size={17}/></span><div><h3>{m.name}</h3><span>{m.city ? "Весь город" : districts.find(d => d.id === choice.district)!.name} <b>· {m.cost} ед.</b></span></div><button className="remove-button" aria-label={`Убрать ${m.name} из плана`} onClick={() => removeMeasure(m.id)}><Icon name="close" size={14}/></button></div> : <div className="plan-slot empty" key={`empty-${i}`}><span className="slot-number">0{i + 1}</span><div><span>Ваше решение</span><small>Выберите из каталога</small></div><Icon name="plus" size={14}/></div>;
        })}</div>
            <div className="plan-hint"><Icon name="layers" size={16}/><p>До 2 мер на направление.<br />Каждое решение имеет значение.</p></div>
            <div className="plan-notice" role="status" aria-live="polite">{notice}</div>
            <div className="plan-actions"><button className="button button-primary simulate-button" disabled={!complete} onClick={() => openModal("results")}>Оценить сценарий<Icon name="arrow" size={17}/></button><p>{complete ? "Все условия соблюдены. Город готов к изменениям." : `Добавьте ещё ${5 - plan.length} ${5 - plan.length === 1 ? "решение" : 5 - plan.length === 5 ? "решений" : "решения"}, чтобы оценить сценарий`}</p><button className="example-button" onClick={loadExample}><Icon name="sparkles" size={14}/> Загрузить пример из задания</button></div>
            <div className="score-note"><span className="score-note-icon"><Icon name="target" size={21}/></span><h3>Сильный город — для всех</h3><p>Итоговый балл учитывает качество жизни в самом слабом районе. Не оставляйте его позади.</p><span>70% среднее + 30% слабый район − штрафы</span></div>
          </aside>
        </div>
        <footer className="page-footer"><span><Icon name="city" size={13}/> ASTANA CITY LAB <span>by g4ymers</span></span><span>Учебная модель · Данные и правила HackAlem AI 2026</span><button onClick={() => openModal("help")}>Как считается Score <Icon name="arrow" size={12}/></button></footer>
      </main>
    </div>

    <dialog ref={dialog} className="app-dialog" aria-labelledby="dialog-title" onClick={e => { if (e.target === dialog.current)
        dialog.current.close(); }}><div className="dialog-content"><button className="dialog-close icon-button" aria-label="Закрыть окно" onClick={() => dialog.current?.close()}><Icon name="close"/></button>
      {modal === "help" ? <><span className="dialog-eyebrow">ВАШ ГОРОД. ВАШИ РЕШЕНИЯ.</span><h2 id="dialog-title">Пять решений для Астаны</h2><p>Выберите ровно 5 мероприятий из каталога и уложитесь в 100 единиц. Для районных мер сначала выберите район на схеме или в переключателе.</p><ol className="rules-list"><li>Каждая мера используется один раз; максимум две из одного направления.</li><li>Остаток бюджета допустим. Городские меры действуют во всех районах.</li><li>Автобусные полосы и ЛРТ несовместимы. Парк со школой и чистое топливо с модернизацией сетей нельзя размещать в одном районе.</li><li>Эффект учитывает задержку: полный эффект × (8 − лаг) / 8. Синергии добавляются отдельно.</li></ol><div className="formula-box">Score = 0.7 × среднее по населению<br />+ 0.3 × худший район − критические показатели</div><p>За каждый показатель строго ниже 40 снимается один балл. Предпросмотр доступен во время выбора; итоговый сценарий должен содержать ровно 5 решений.</p><p className="dialog-footnote">Условная схема и синтетические данные. Результат — оценка игровой модели, а не прогноз реального развития Астаны.</p><button className="button button-primary" onClick={() => dialog.current?.close()}>Понятно, начнём<Icon name="arrow" size={16}/></button></> : modal === "reset" ? <><span className="dialog-eyebrow">НОВЫЙ СЦЕНАРИЙ</span><h2 id="dialog-title">Начать с чистого листа?</h2><p>Текущие {plan.length} решений будут удалены. Бюджет снова составит 100 единиц.</p><div className="dialog-actions"><button className="button button-outline" onClick={() => dialog.current?.close()}>Продолжить текущий</button><button className="button button-primary" onClick={() => { setPlan([]); setNotice("Новый сценарий готов."); dialog.current?.close(); }}>Начать заново</button></div></> : <><span className="dialog-eyebrow">РЕЗУЛЬТАТ ВАШЕГО СЦЕНАРИЯ</span><h2 id="dialog-title">Ваши решения в цифрах</h2><div className="result-hero"><span>Astana Quality of Life Score</span><strong>{formatScore(result.score)}<small>{formatDelta(result.score - baseline.score)}</small></strong><p>Начальный балл {formatScore(baseline.score)} · Бюджет {spent}/100 · Решений 5/5</p></div><div className="result-districts">{result.districts.map((d, i) => <div key={d.id}><span>{d.name}</span><span>{formatScore(baseline.districts[i].score)} <Icon name="arrow" size={12}/> <strong>{formatScore(d.score)}</strong></span></div>)}</div><div className="result-facts"><div><span>Среднее по городу</span><strong>{formatScore(result.average)}</strong></div><div><span>Худший район</span><strong>{formatScore(result.minimum)}</strong></div><div><span>Критических показателей</span><strong>{result.critical} <small>было {baseline.critical}</small></strong></div></div><p className="dialog-footnote">Рассчитано локально по формуле из задания, с учётом задержек и синергий. AI-анализ пока не подключён.</p><button className="button button-primary" onClick={() => dialog.current?.close()}>Вернуться к сценарию<Icon name="arrow" size={16}/></button></>}
    </div></dialog>
  </div>;
}
