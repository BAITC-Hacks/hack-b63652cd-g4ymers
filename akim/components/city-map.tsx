"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { districts, measures, type Selection } from "@/lib/simulation";
import map from "@/lib/astana-map.json";
import { Icon } from "./icon";

const HOME = { x: 2260, y: 3100 };
const colors: Record<string, string> = { nura: "#8b5cf6", esil: "#6366f1", almaty: "#3b82f6", saryarka: "#6366b9", baikonur: "#648ed4" };
const outlines = map.districts.map(d => ({ ...d, path: d.rings.map(r => `M${r.map(p => p.join(",")).join("L")}Z`).join(" ") }));

export function CityMap({ selected, onSelect, plan, fullViewport = false, uiHidden = false }: { selected: string; onSelect: (id: string) => void; plan: Selection[]; fullViewport?: boolean; uiHidden?: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState(HOME);
  const [size, setSize] = useState({ width: 1000, height: 690 });
  const [showLabels, setShowLabels] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeLandmark, setActiveLandmark] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [assetVersion, setAssetVersion] = useState(0);
  const mapRoot = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean; active: boolean } | null>(null);
  const active = map.landmarks.find(l => l.id === activeLandmark);
  const selectedName = districts.find(d => d.id === selected)!.name;
  const height = 3300 / zoom;
  const unit = height / size.height;
  const width = size.width * unit;
  const viewBox = `${center.x - width / 2} ${center.y - height / 2} ${width} ${height}`;

  useEffect(() => {
    // An SVG image may finish loading before React hydrates a cached page.
    const image = new Image();
    image.onload = () => setMapStatus("ready");
    image.onerror = () => setMapStatus("error");
    image.src = `/maps/astana.webp?v=${assetVersion}`;
    return () => { image.onload = null; image.onerror = null; };
  }, [assetVersion]);

  useEffect(() => {
    const node = mapRoot.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    mapRoot.current?.querySelector<HTMLButtonElement>(".map-expand-button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "Tab") {
        const focusable = Array.from(mapRoot.current?.querySelectorAll<HTMLElement>('button:not([disabled]), select, a[href], [tabindex="0"]') ?? []);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKey); previousFocus?.focus(); };
  }, [expanded]);

  function startDrag(event: PointerEvent<SVGSVGElement>) {
    drag.current = null;
    if (event.button !== 0 || (event.target as Element).closest("[data-interactive]")) return;
    drag.current = { x: event.clientX, y: event.clientY, cx: center.x, cy: center.y, moved: false, active: true };
  }
  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current?.active) return;
    const dx = event.clientX - drag.current.x, dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.current.moved = true;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    setCenter({ x: Math.max(0, Math.min(5067, drag.current.cx - dx * unit)), y: Math.max(0, Math.min(7021, drag.current.cy - dy * unit)) });
  }
  function selectDistrict(id: string) { onSelect(id); setActiveLandmark(null); }
  function focusDistrict(id: string) {
    selectDistrict(id);
    const district = outlines.find(d => d.id === id)!;
    setCenter({ x: district.label[0], y: district.label[1] });
    setZoom(1.5);
  }
  function focusLandmark(id: string) {
    const landmark = map.landmarks.find(l => l.id === id);
    if (!landmark) return;
    setActiveLandmark(id);
    if (landmark.district) onSelect(landmark.district);
    setCenter({ x: landmark.position[0], y: landmark.position[1] });
    setZoom(4);
  }
  function changeZoom(factor: number) { setZoom(v => Math.max(.15, Math.min(10, v * factor))); }
  function showAll() {
    setZoom(Math.min(3300 / 5944, 3300 * size.width / size.height / 5067) * .85);
    setCenter({ x: 2533, y: 2980 });
    setActiveLandmark(null);
  }
  function resetView() { setZoom(1); setCenter(HOME); setActiveLandmark(null); }

  return <div ref={mapRoot} className={`city-map astana-map geographic-map ${fullViewport ? "viewport-map" : ""} ${uiHidden ? "map-ui-hidden" : ""} ${expanded ? "map-expanded" : ""}`} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? "Карта Астаны на весь экран" : undefined}>
    <div className="astana-map-heading"><span className="map-city-kicker"><span className="live-dot"/> АСТАНА · КАРТА РЕШЕНИЙ</span><strong>Настоящий город. Ваши решения.</strong><span>Улицы, кварталы и границы из карты Астаны</span></div>
    <div className="map-top-controls"><span className="city-map-mode">5 РАЙОНОВ ИЗ ТЗ</span><button className="map-expand-button" aria-label={expanded ? "Свернуть карту" : "Развернуть карту"} onClick={() => setExpanded(v => !v)}><Icon name={expanded ? "close" : "expand"} size={16}/><span>{expanded ? "Свернуть" : "На весь экран"}</span></button></div>
    <div className="map-navigation">
      <div className="map-district-chips" aria-label="Районы из технического задания">{districts.map(d => <button key={d.id} aria-label={`Показать район ${d.name}`} aria-pressed={selected === d.id} onClick={() => focusDistrict(d.id)}><i style={{ background: colors[d.id] }}/>{d.name}</button>)}</div>
      <select aria-label="Найти достопримечательность" value={activeLandmark ?? ""} onChange={e => focusLandmark(e.target.value)}><option value="" disabled>Достопримечательности</option>{map.landmarks.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
    </div>
    <svg className="city-illustration astana-illustration" viewBox={viewBox} role="group" aria-label="Подробная карта Астаны. Выделены Есиль, Алматы, Сарыарка, Байконур и Нура." onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={e => { if (drag.current) drag.current.active = false; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { drag.current = null; }}>
      <image key={assetVersion} href={`/maps/astana.webp?v=${assetVersion}`} x="0" y="0" width="5067" height="7021" preserveAspectRatio="none" className="astana-basemap" pointerEvents="none" onLoad={() => setMapStatus("ready")} onError={() => setMapStatus("error")}/>
      {outlines.map(d => <path key={d.id} d={d.path} className={`real-district ${selected === d.id ? "is-selected" : ""}`} data-district={d.id} fill={colors[d.id]} stroke={colors[d.id]} vectorEffect="non-scaling-stroke" role="button" tabIndex={0} aria-label={`Район ${districts.find(item => item.id === d.id)!.name}`} aria-pressed={selected === d.id} onClick={() => { if (!drag.current?.moved) selectDistrict(d.id); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectDistrict(d.id); } }}><title>{`${districts.find(item => item.id === d.id)!.name} — выбрать район`}</title></path>)}
      {outlines.map(d => {
        const name = districts.find(item => item.id === d.id)!.name;
        const choices = plan.filter(s => s.district === d.id || measures.find(m => m.id === s.id)?.city);
        if (zoom < .7) return <g key={d.id} transform={`translate(${d.label.join(" ")}) scale(${unit})`} pointerEvents="none">
          <rect x="-32" y="-10" width="64" height="20" rx="5" fill={selected === d.id ? "#6d45cf" : "#fffffff2"}/><text textAnchor="middle" y="3" fontSize="10" fontWeight="600" fill={selected === d.id ? "white" : "#53466a"}>{name}</text>
        </g>;
        return <g key={d.id} transform={`translate(${d.label.join(" ")}) scale(${unit})`} className="real-district-label" pointerEvents="none">
          <rect x="-61" y="-23" width="122" height={choices.length ? 61 : 43} rx="10" fill={selected === d.id ? "#6d45cf" : "#ffffffed"} stroke={selected === d.id ? "#fff" : "#e1deeb"}/>
          <circle cx="-43" cy="-5" r="3" fill={selected === d.id ? "#cbb6ff" : colors[d.id]}/><text x="-32" y="-1" fontSize="12" fontWeight="650" fill={selected === d.id ? "white" : "#39344c"}>{name}</text>
          <text x="0" y="12" textAnchor="middle" fontSize="8" fill={selected === d.id ? "#dfd2ff" : "#9690a4"}>{selected === d.id ? "ВЫБРАННЫЙ РАЙОН" : "РАЙОН ИЗ ТЗ"}</text>
          {choices.length > 0 && <text x="0" y="28" textAnchor="middle" fontSize="9" fill={selected === d.id ? "white" : "#7753c5"}>{choices.map(s => s.id).join(" · ")}</text>}
        </g>;
      })}
      {zoom >= .7 && map.landmarks.map(l => {
        const primary = l.id === "baiterek" || l.id === "expo";
        const isActive = activeLandmark === l.id;
        const label = showLabels && (zoom >= 3 || primary || isActive);
        const [dx, dy] = l.offset;
        return <g key={l.id} transform={`translate(${l.position.join(" ")}) scale(${unit})`} className="real-landmark" data-interactive role="button" tabIndex={0} aria-label={`Достопримечательность: ${l.name}`} aria-pressed={isActive} onClick={() => focusLandmark(l.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusLandmark(l.id); } }}>
          <title>{l.name}</title><circle r={isActive ? 12 : 9} fill={isActive ? "#7445d6" : "#fff"} stroke={l.district ? "#7860a1" : "#9195a1"} strokeWidth="1.5"/><circle r="3" fill={isActive ? "white" : "#7560a2"}/>
          {label && <g pointerEvents="none"><path d={`M0 0L${dx} ${dy}`} stroke="#827394" strokeWidth=".8"/><rect x={dx < 0 ? dx - l.name.length * 6 - 13 : dx - 6} y={dy - 12} width={l.name.length * 6 + 19} height="24" rx="5" fill="#ffffffee" stroke="#e0d9e9"/><text x={dx < 0 ? dx - 6 : dx + 3} y={dy + 4} textAnchor={dx < 0 ? "end" : "start"} fontSize="10" fontWeight="550" fill="#554267">{l.name}</text></g>}
        </g>;
      })}
    </svg>
    {mapStatus !== "ready" && <div className="map-loading" role="status">{mapStatus === "loading" ? "Загружаем подробную карту…" : <><span>Не удалось загрузить карту</span><button onClick={() => { setMapStatus("loading"); setAssetVersion(v => v + 1); }}>Повторить</button></>}</div>}
    {active && <aside className="landmark-detail"><button className="icon-button" aria-label="Закрыть описание" onClick={() => setActiveLandmark(null)}><Icon name="close" size={14}/></button><span>ОРИЕНТИР НА КАРТЕ</span><h3>{active.name}</h3><p>{active.district ? `Район ${districts.find(d => d.id === active.district)!.name}. Выбран для вашего сценария.` : "Вне пяти районов ТЗ. Доступен как ориентир; район сценария не меняется."}</p><small>Расположение из исходной SVG-карты</small></aside>}
    <div className="astana-compass" aria-label="Север вверху"><span>N</span><svg viewBox="0 0 24 30" width="21" height="27" aria-hidden="true"><path d="M12 1 3 28l9-7 9 7Z" fill="#6e5b93"/><path d="M12 1v20l9 7Z" fill="#b9a5dd"/></svg></div>
    <div className="astana-map-bottom"><div><Icon name="pin" size={13}/><strong>{selectedName}</strong><span>· Выберите район на карте</span></div><p>Цветом — только районы из ТЗ. Остальная территория нейтральная.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></div>
    <div className="map-tools"><button className="icon-button" aria-label="Уменьшить карту" disabled={zoom <= .15} onClick={() => changeZoom(1 / 1.4)}><Icon name="minus" size={16}/></button><span className="zoom-value">{Math.round(zoom * 100)}%</span><button className="icon-button" aria-label="Увеличить карту" disabled={zoom >= 10} onClick={() => changeZoom(1.4)}><Icon name="plus" size={16}/></button><span className="tool-divider"/><button className="icon-button" aria-label="Сбросить масштаб" onClick={resetView}><Icon name="target" size={16}/></button><button className="icon-button" aria-label="Показать все границы" onClick={showAll}><Icon name="city" size={16}/></button><button className={`icon-button ${showLabels ? "active" : ""}`} aria-label="Названия достопримечательностей" aria-pressed={showLabels} onClick={() => setShowLabels(v => !v)}><Icon name="layers" size={16}/></button></div>
  </div>;
}
