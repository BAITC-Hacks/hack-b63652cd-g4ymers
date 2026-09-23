"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import type { Catalog, Result } from "@/lib/api";
import { categories, costOf, formatDelta, formatScore, validatePlan, type Category, type Selection } from "@/lib/simulation";

export type ScenarioStage = "start" | "build" | "review" | "result";

type ScenarioFlowProps = {
    stage: ScenarioStage;
    onStage: (stage: ScenarioStage) => void;
    catalog: Catalog;
    baseline: Result;
    result: Result;
    plan: Selection[];
    selectedDistrict: string;
    onDistrict: (id: string) => void;
    name: string;
    onName: (name: string) => void;
    busy: boolean;
    finalized: boolean;
    saved: boolean;
    dirty: boolean;
    error: string;
    notice: string;
    onAdd: (id: string) => void;
    onRemove: (id: string) => void;
    onExample: () => void;
    onSave: () => void;
    onFinalize: () => void;
    onNew: () => void;
    onReload?: () => void;
    onClose: () => void;
};

export function ScenarioFlow({ stage, onStage, catalog, baseline, result, plan, selectedDistrict, onDistrict, name, onName, busy, finalized, saved, dirty, error, notice, onAdd, onRemove, onExample, onSave, onFinalize, onNew, onReload, onClose }: ScenarioFlowProps) {
    const [category, setCategory] = useState<Category | "all">("all");
    const [query, setQuery] = useState("");
    const viewStage = finalized ? "result" : stage === "result" ? "review" : stage;
    const heading = useRef<HTMLHeadingElement>(null);
    const body = useRef<HTMLDivElement>(null);
    const previousStage = useRef(viewStage);
    useEffect(() => {
        if (previousStage.current === viewStage) return;
        previousStage.current = viewStage;
        if (body.current) body.current.scrollTop = 0;
        heading.current?.focus({ preventScroll: true });
    }, [viewStage]);
    const spent = costOf(plan, catalog.measures);
    const remaining = 100 - spent;
    const invalid = validatePlan(plan, true, catalog);
    const complete = !invalid;
    const districtName = catalog.districts.find(d => d.id === selectedDistrict)?.name ?? "Выберите район";
    const filtered = catalog.measures.filter(m => (category === "all" || m.category === category) && `${m.name} ${m.description}`.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")));
    const status = finalized ? "Завершён и сохранён" : dirty ? "Есть несохранённые изменения" : saved ? "Черновик сохранён" : "Новый сценарий";
    const titles = {
        start: ["Пять решений для Астаны", "Создайте сценарий развития города и узнайте, как изменится качество жизни."],
        build: ["Соберите план развития", "Выберите район и добавьте инициативы. Ваш план всегда рядом."],
        review: ["Проверьте свой сценарий", "Убедитесь, что решения и районы выбраны верно, затем сохраните итог."],
        result: ["Ваши решения в цифрах", "Сценарий завершён. Посмотрите, как изменились показатели города."],
    };

    function choiceTarget(choice: Selection) {
        return choice.district ? catalog.districts.find(d => d.id === choice.district)?.name ?? "Район не найден" : "Весь город";
    }

    return <section id="overlay-flow" className={`panel floating-panel scenario-flow flow-stage-${viewStage}`} aria-labelledby="flow-title" aria-busy={busy}>
        <header className="flow-header">
            <div><span className="eyebrow">{viewStage === "start" ? "ВАШ ГОРОД. ВАШИ РЕШЕНИЯ." : "СЦЕНАРИЙ РАЗВИТИЯ"}</span><h2 ref={heading} tabIndex={-1} id="flow-title">{titles[viewStage][0]}</h2><p>{titles[viewStage][1]}</p></div>
            <button className="overlay-close icon-button" aria-label="Свернуть сценарий и посмотреть карту" title="Свернуть сценарий — ваш план останется здесь" onClick={onClose}><Icon name="close"/></button>
        </header>

        {viewStage !== "start" && <nav className="flow-steps" aria-label="Этапы сценария">
            <button data-step="build" aria-current={viewStage === "build" ? "step" : undefined} disabled={busy || finalized} onClick={() => onStage("build")}><span>1</span>Инициативы{complete && <Icon name="check" size={14}/>}</button>
            <Icon name="chevron" size={14}/>
            <button data-step="review" aria-current={viewStage === "review" ? "step" : undefined} disabled={busy || !complete || finalized} onClick={() => onStage("review")}><span>2</span>Проверка{finalized && <Icon name="check" size={14}/>}</button>
            <Icon name="chevron" size={14}/>
            <button data-step="result" aria-current={viewStage === "result" ? "step" : undefined} disabled={!finalized || busy} onClick={() => onStage("result")}><span>3</span>Результат</button>
        </nav>}

        {(error || busy || notice) && <div className={`flow-feedback ${error ? "is-error" : ""}`} role={error ? "alert" : "status"} aria-live="polite">
            <span>{error || (busy ? "Обновляем сценарий…" : notice)}</span>
            {error && saved && onReload && <button className="text-button" disabled={busy} onClick={onReload}>Загрузить сохранённую версию</button>}
        </div>}

        <div ref={body} className="flow-body">
            {viewStage === "start" && <div className="flow-welcome">
                <div className="flow-intro-stats"><div><Icon name="wallet"/><strong>100</strong><span>единиц бюджета</span></div><div><Icon name="layers"/><strong>5</strong><span>ваших решений</span></div><div><Icon name="clock"/><strong>2 года</strong><span>горизонт изменений</span></div></div>
                <div className="flow-start-copy"><h3>Как это работает</h3><ol><li><strong>Соберите план.</strong> Выберите инициативы и районы, которым они помогут.</li><li><strong>Проверьте решения.</strong> Мы подскажем ограничения и покажем бюджет.</li><li><strong>Получите результат.</strong> Сравните качество жизни до и после вашего плана.</li></ol><p>Цель — улучшить жизнь всего города, уделяя внимание самому слабому району.</p></div>
            </div>}

            {viewStage === "build" && <div className="flow-builder">
                <details className="flow-mobile-plan">
                    <summary>Ваш план <strong>{plan.length}/5</strong><span>Осталось {remaining} ед.</span><Icon name="chevron" size={14}/></summary>
                    <ol className="flow-slots">{plan.map((choice, i) => {
                        const m = catalog.measures.find(item => item.id === choice.id)!;
                        return <li className="flow-slot" key={choice.id}><span className="flow-slot-number">{i + 1}</span><div><h4>{m.name}</h4><p>{choiceTarget(choice)} · {m.cost} ед.</p></div><button className="icon-button flow-remove" disabled={busy || finalized} aria-label={`Убрать ${m.name} из плана`} onClick={() => onRemove(m.id)}><Icon name="close" size={14}/></button></li>;
                    })}</ol>
                    {!plan.length && <p>Добавьте первую инициативу в каталоге ниже.</p>}
                    <button className="text-button flow-example" disabled={busy || finalized} onClick={onExample}>{plan.length ? "Заменить план готовым примером" : "Заполнить готовым примером"}</button>
                </details>
                <div className="flow-catalog">
                    <label className="flow-district-picker"><span><Icon name="pin" size={16}/>Куда добавляем районные инициативы</span><select value={selectedDistrict} onChange={e => onDistrict(e.target.value)} disabled={busy || finalized} aria-label="Район для новых инициатив">{catalog.districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
                    <p className="flow-target-note">Новые районные меры → <strong>{districtName}</strong>. Меры с пометкой «Весь город» действуют во всех районах.</p>
                    <label className="flow-search"><Icon name="search" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти инициативу" aria-label="Поиск инициатив"/></label>
                    <div className="flow-categories" aria-label="Направления инициатив"><button aria-pressed={category === "all"} onClick={() => setCategory("all")}>Все</button>{categories.map(c => <button key={c.id} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.short}</button>)}</div>
                    <div className="flow-catalog-caption"><span>Инициативы</span><span>{filtered.length} из {catalog.measures.length}</span></div>
                    <div className="flow-measures">
                        {filtered.map(m => {
                            const added = plan.find(s => s.id === m.id);
                            const blocked = added ? null : plan.length >= 5 ? "В плане уже 5 инициатив. Уберите одну, чтобы заменить." : validatePlan([...plan, { id: m.id, ...(m.city ? {} : { district: selectedDistrict }) }], false, catalog);
                            return <article className={`flow-measure${added ? " is-added" : ""}${blocked ? " is-blocked" : ""}`} key={m.id}>
                                <div className="flow-measure-heading"><span className={`flow-category ${m.category}`}><Icon name={m.category} size={14}/>{categories.find(c => c.id === m.category)?.short}</span><strong>{m.cost}<small> ед.</small></strong></div>
                                <h3>{m.name}</h3><p>{m.description}</p>
                                <div className="flow-effects">{Object.entries(m.effects).map(([metric, effect]) => <span key={metric} className={effect < 0 ? "is-negative" : ""} title="Полный эффект до учёта срока реализации">{catalog.metrics.find(value => value.code === metric)?.name ?? metric} {formatDelta(effect, 0)}</span>)}</div>
                                <div className="flow-measure-meta"><span><Icon name={m.city ? "city" : "pin"} size={13}/>{added ? choiceTarget(added) : m.city ? "Весь город" : districtName}</span><span><Icon name="clock" size={13}/>{m.lag} кв. до эффекта</span></div>
                                <button className={`button ${added ? "button-outline" : "button-primary"} flow-add`} disabled={busy || finalized || !!blocked} aria-label={added ? `Убрать из плана: ${m.name}` : `Добавить в план: ${m.name}`} aria-describedby={blocked ? `flow-blocked-${m.id}` : undefined} onClick={() => added ? onRemove(m.id) : onAdd(m.id)}><Icon name={added ? "check" : "plus"} size={15}/>{added ? "В плане · убрать" : m.city ? "Добавить для всего города" : `Добавить · ${districtName}`}</button>
                                {blocked && <p id={`flow-blocked-${m.id}`} className="flow-blocked-reason">{blocked}</p>}
                            </article>;
                        })}
                        {!filtered.length && <div className="flow-empty"><Icon name="search" size={26}/><h3>Ничего не найдено</h3><p>Попробуйте другое название или направление.</p><button className="text-button" onClick={() => { setQuery(""); setCategory("all"); }}>Сбросить фильтры</button></div>}
                    </div>
                </div>
                <aside className="flow-selection" aria-label="Ваш план">
                    <div className="flow-selection-heading"><h3>Ваш план</h3><span className="count-badge">{plan.length}/5</span></div>
                    <div className="flow-budget"><div><span>Осталось бюджета</span><strong>{remaining}<small> / 100</small></strong></div><div className="flow-budget-track" role="progressbar" aria-label="Использованный бюджет" aria-valuenow={spent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, spent))}%` }}/></div><div className="flow-budget-caption"><span>Использовано {spent} ед.</span><span>Резерв допустим</span></div></div>
                    <ol className="flow-slots">{Array.from({ length: 5 }, (_, i) => {
                        const choice = plan[i];
                        const measure = choice && catalog.measures.find(m => m.id === choice.id);
                        return <li className={`flow-slot${measure ? "" : " is-empty"}`} key={choice?.id ?? `empty-${i}`}><span className="flow-slot-number">{i + 1}</span>{measure && choice ? <><div><h4>{measure.name}</h4><p>{choiceTarget(choice)} <span>· {measure.cost} ед.</span></p></div><button className="icon-button flow-remove" disabled={busy || finalized} aria-label={`Убрать ${measure.name} из плана`} onClick={() => onRemove(measure.id)}><Icon name="close" size={14}/></button></> : <div><h4>Добавьте инициативу</h4><p>Выберите её в каталоге</p></div>}</li>;
                    })}</ol>
                    <p className="flow-hint"><Icon name="help" size={15}/><span>Ровно 5 инициатив, до 2 одного направления. Меняйте район перед добавлением следующей меры.</span></p>
                    <span className="flow-save-status">{status}</span>
                    <button className="text-button flow-example" disabled={busy || finalized} onClick={onExample}>{plan.length ? "Заменить план готовым примером" : "Заполнить готовым примером"}</button>
                </aside>
            </div>}

            {viewStage === "review" && <div className="flow-review">
                <label className="flow-name"><span>Название сценария</span><input value={name} maxLength={120} disabled={busy || finalized} onChange={e => onName(e.target.value)} placeholder="Например, комфортная Астана" required aria-invalid={!name.trim()}/>{!name.trim() && <small>Введите название, чтобы сохранить сценарий.</small>}</label>
                <div className="flow-review-checks"><span><Icon name={complete ? "check" : "help"} size={16}/>{plan.length} из 5 инициатив</span><span><Icon name={remaining >= 0 ? "check" : "help"} size={16}/>{spent} из 100 ед.</span><span><Icon name={complete ? "check" : "help"} size={16}/>{complete ? "Все ограничения соблюдены" : invalid}</span></div>
                <ol className="flow-review-list">{plan.map((choice, index) => {
                    const m = catalog.measures.find(value => value.id === choice.id);
                    return m && <li key={choice.id}><span className="flow-slot-number">{index + 1}</span><div><h3>{m.name}</h3><p><Icon name={m.city ? "city" : "pin"} size={13}/>{choiceTarget(choice)} <span>· {categories.find(c => c.id === m.category)?.short}</span></p></div><strong>{m.cost}<small> ед.</small></strong></li>;
                })}</ol>
                <div className="flow-review-summary"><div><span>Предварительный Score</span><strong>{formatScore(result.score)} <small>{formatDelta(result.score - baseline.score)}</small></strong></div><p>После завершения план и результат сохранятся. Изменить завершённый сценарий нельзя — для других решений создайте новый.</p></div>
                <span className="flow-save-status">{status}</span>
            </div>}

            {viewStage === "result" && <div className="flow-results">
                <p className="flow-result-saved"><Icon name="check" size={16}/>«{name}» завершён и сохранён. Доступен в разделе «Сохранённые».</p>
                <div className="flow-result-hero"><span>Качество жизни города · Score</span><strong>{formatScore(result.score)}<small>{formatDelta(result.score - baseline.score)}</small></strong><p>Было {formatScore(baseline.score)} · Бюджет {spent}/100 · Решений {plan.length}/5</p></div>
                <div className="flow-result-facts"><div><span>Среднее по городу</span><strong>{formatScore(result.average)}</strong><small>было {formatScore(baseline.average)}</small></div><div><span>Слабейший район</span><strong>{formatScore(result.minimum)}</strong><small>было {formatScore(baseline.minimum)}</small></div><div><span>Критических показателей</span><strong>{result.critical}</strong><small>было {baseline.critical}</small></div></div>
                <div className="flow-result-districts"><h3>Что изменилось в районах</h3>{result.districts.map(d => {
                    const previous = baseline.districts.find(value => value.id === d.id)?.score ?? d.score;
                    return <div key={d.id}><span>{d.name}</span><span>{formatScore(previous)} <Icon name="arrow" size={14}/> <strong>{formatScore(d.score)}</strong><small>{formatDelta(d.score - previous)}</small></span></div>;
                })}</div>
                {!!result.explanations?.length && <div className="flow-explanations"><h3>Почему получился такой результат</h3><ul>{result.explanations.map((explanation, i) => <li key={i}>{explanation}</li>)}</ul></div>}
                <p className="flow-result-note">Рассчитано по учебной модели: 70% среднего по населению + 30% оценки слабейшего района − число критических показателей. Учтены сроки реализации и синергии.</p>
            </div>}
        </div>

        <footer className="flow-footer">
            {viewStage === "start" ? <><button className="button button-outline" disabled={busy} onClick={onExample}>Попробовать готовый пример</button><button className="button button-primary" disabled={busy} onClick={() => onStage("build")}>Начать сценарий<Icon name="arrow" size={16}/></button></> : viewStage === "build" ? <>
                <button className="button button-outline" disabled={busy || finalized || !name.trim() || (saved && !dirty)} onClick={onSave}>{busy ? "Подождите…" : "Сохранить черновик"}</button>
                <div className="flow-next"><span>{complete ? "План готов к проверке" : plan.length < 5 ? `Выбрано ${plan.length} из 5 · добавьте ещё ${5 - plan.length}` : invalid}</span><button className="button button-primary" disabled={busy || !complete} onClick={() => onStage("review")}>Проверить план<Icon name="arrow" size={16}/></button></div>
            </> : viewStage === "review" ? <><button className="button button-outline" disabled={busy || finalized} onClick={() => onStage("build")}>Изменить инициативы</button><button className="button button-primary" disabled={busy || !complete || !name.trim() || finalized} onClick={onFinalize}>{busy ? "Сохраняем…" : "Завершить и сохранить"}<Icon name="check" size={17}/></button></> : <><button className="button button-outline" onClick={onClose}>Посмотреть карту</button><button className="button button-primary" disabled={busy} onClick={onNew}>Новый сценарий<Icon name="plus" size={17}/></button></>}
        </footer>
    </section>;
}
