"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CitizenIcon } from "./icon";
import { initialTourProgress, readTourProgress, saveTourProgress, tourSteps, type TourProgress, type TourStorage } from "@/lib/onboarding";

type TourContext = { ready: boolean; isOpen: boolean; progress: TourProgress | null; start: () => void; resume: () => void };
const OnboardingContext = createContext<TourContext | null>(null);
export const useCitizenOnboarding = () => useContext(OnboardingContext);
function storage(): TourStorage | null { try { return window.localStorage; } catch { return null; } }

// Mounted per authenticated account, above both /citizen and /report routes.
export function CitizenOnboardingProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [progress, setProgress] = useState<TourProgress | null>(null);
  const update = useCallback((next: TourProgress) => {
    saveTourProgress(storage(), userId, next);
    setProgress(next);
  }, [userId]);
  useEffect(() => {
    const timer = window.setTimeout(() => update(readTourProgress(storage(), userId) ?? initialTourProgress()), 0);
    return () => window.clearTimeout(timer);
  }, [userId, update]);
  const isOpen = progress?.status === "in-progress";
  const dismiss = useCallback(() => {
    if (progress) update({ ...progress, status: "dismissed" });
  }, [progress, update]);
  return <OnboardingContext.Provider value={{ ready: progress !== null, isOpen, progress,
    start: () => update(initialTourProgress()),
    resume: () => update({ ...(progress ?? initialTourProgress()), status: "in-progress" }),
  }}>
    <div inert={isOpen} aria-hidden={isOpen || undefined}>{children}</div>
    {isOpen && <TourDialog step={progress.step} onStep={step => update({ ...progress, step })} onDismiss={dismiss}
      onFinish={() => update({ ...progress, status: "completed" })} />}
  </OnboardingContext.Provider>;
}

type Highlight = { left: number; top: number; width: number; height: number; bottom: number; viewport: number };
function TourDialog({ step, onStep, onDismiss, onFinish }: {
  step: number; onStep: (step: number) => void; onDismiss: () => void; onFinish: () => void;
}) {
  const current = tourSteps[step];
  const dialog = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const dismissRef = useRef(onDismiss);
  useLayoutEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);

  useLayoutEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); dismissRef.current(); }
      if (event.key !== "Tab") return;
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex="0"]') ?? []);
      const first = items[0], last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      window.requestAnimationFrame(() => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); });
    };
  }, []);

  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
    dialog.current?.querySelector(".tour-body")?.scrollTo(0, 0);
    function measure() {
      const targets = current.target ? document.querySelectorAll<HTMLElement>(`[data-tour="${current.target}"]`) : [];
      const visible = Array.from(targets).reverse().map(element => element.getBoundingClientRect()).find(rect =>
        rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight);
      // On short landscape screens prioritize a readable dialog over a spotlight.
      setHighlight(visible && window.innerHeight >= 600 ? { left: visible.left, top: visible.top, width: visible.width,
        height: visible.height, bottom: visible.bottom, viewport: window.innerHeight } : null);
    }
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    window.addEventListener("resize", measure);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [current]);

  const cardStyle: CSSProperties = highlight ? (highlight.top > highlight.viewport / 2
    ? { bottom: highlight.viewport - highlight.top + 18, maxHeight: highlight.top - 36 }
    : { bottom: 18, maxHeight: highlight.viewport - highlight.bottom - 36 }) : {};
  return createPortal(<div className={`tour-overlay ${highlight ? "has-spotlight" : ""}`}>
    {highlight && <div className="tour-spotlight" aria-hidden="true" style={{ left: Math.max(2, highlight.left - 5), top: Math.max(2, highlight.top - 5),
      width: Math.min(window.innerWidth - Math.max(2, highlight.left - 5) - 2, highlight.width + 10), height: highlight.height + 10 }} />}
    <div ref={dialog} className="tour-dialog" style={cardStyle} role="dialog" aria-modal="true" aria-labelledby="citizen-tour-title" aria-describedby="citizen-tour-description">
      <header className="tour-header"><div><span className="tour-kicker">ВАШ ГИД ПО ПРИЛОЖЕНИЮ</span><span className="tour-counter" aria-live="polite">Шаг {step + 1} из {tourSteps.length} · {current.section}</span></div>
        <button className="tour-close" onClick={onDismiss} aria-label="Закрыть обучение и сохранить шаг"><CitizenIcon name="close" size={19} /></button></header>
      <div className="tour-progress" role="progressbar" aria-label="Прогресс обучения" aria-valuemin={0} aria-valuemax={tourSteps.length} aria-valuenow={step + 1}>
        {tourSteps.map((item, index) => <span key={item.id} className={index <= step ? "filled" : ""} />)}
      </div>
      <div className="tour-body">
        <div className="tour-heading"><span className="tour-icon"><CitizenIcon name={current.icon} size={26} /></span><h2 id="citizen-tour-title" ref={heading} tabIndex={-1}>{current.title}</h2></div>
        <p className="tour-description" id="citizen-tour-description">{current.description}</p>
        {current.preview && <div className="tour-preview"><span>{current.preview.label}</span><div>{current.preview.items.map(item => <span key={item}>{item}</span>)}</div><small>Схема для знакомства, не действующие кнопки</small></div>}
        <ol className="tour-instructions">{current.instructions.map((item, index) => <li key={item.title}><span>{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></li>)}</ol>
        <div className="tour-tip"><CitizenIcon name="shield" size={18} /><p>{current.tip}</p></div>
        {highlight && <p className="tour-target-note"><span /> Подсвечено, где найти нужную кнопку. Сейчас управляйте гидом с помощью «Далее» и «Назад».</p>}
      </div>
      <footer className="tour-footer"><p className="tour-scroll-hint">Текст подсказок можно прокручивать ↕</p><div><button className="tour-later" onClick={onDismiss}>Позже</button><span>Продолжить можно в «Помощи»</span></div><div className="tour-controls">
        {step > 0 && <button className="citizen-button secondary" onClick={() => onStep(step - 1)}>Назад</button>}
        <button className="citizen-button primary" onClick={() => step === tourSteps.length - 1 ? onFinish() : onStep(step + 1)}>
          {step === tourSteps.length - 1 ? "Завершить обучение" : step === 0 ? "Начать экскурсию" : "Далее"}<CitizenIcon name={step === tourSteps.length - 1 ? "check" : "arrow"} size={17} />
        </button>
      </div></footer>
    </div>
  </div>, document.body);
}

export function CitizenTourHelp() {
  const tour = useCitizenOnboarding();
  if (!tour) return null;
  const canResume = tour.progress?.status === "dismissed" && tour.progress.step > 0;
  return <section className="tour-help-card"><span className="tour-icon"><CitizenIcon name="map" size={25} /></span><div><span className="citizen-eyebrow">ПОШАГОВАЯ ЭКСКУРСИЯ</span>
    <h2>Покажем, куда нажимать</h2><p>{tourSteps.length} коротких шагов: QR, адрес, обращение, статусы и баллы. Можно проходить в своём темпе.</p>
    <div className="tour-help-actions">{canResume && <button className="citizen-button primary" onClick={tour.resume}>Продолжить с шага {tour.progress!.step + 1}</button>}
      <button className={`citizen-button ${canResume ? "secondary" : "primary"}`} onClick={tour.start} disabled={!tour.ready}>Пройти обучение заново</button></div>
    <small>Прогресс запоминается для вашего аккаунта в этом браузере.</small></div></section>;
}
