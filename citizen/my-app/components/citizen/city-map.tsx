"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { coordinatesToMap, districtColors, mapDistricts, mapLandmarks, placeAtPoint, type MapPoint, type ReportPlace } from "@/lib/citizen-map";
import type { CitizenProblem } from "@/lib/citizen";

type Camera = { center: MapPoint; zoom: number; rotation: number };
const home: Camera = { center: { x: 2260, y: 3100 }, zoom: 1, rotation: 0 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function unrotate(x: number, y: number, degrees: number) {
  const radians = degrees * Math.PI / 180;
  return { x: x * Math.cos(radians) + y * Math.sin(radians), y: -x * Math.sin(radians) + y * Math.cos(radians) };
}

export function CitizenCityMap({ place, onPlace, problems, onProblem }: {
  place?: ReportPlace; onPlace: (place: ReportPlace, label?: string) => void;
  problems: CitizenProblem[]; onProblem: (problem: CitizenProblem) => void;
}) {
  const [view, setView] = useState(home);
  const camera = useRef(home);
  const [size, setSize] = useState({ width: 1000, height: 600 });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [assetVersion, setAssetVersion] = useState(0);
  const [hint, setHint] = useState("");
  const [landmark, setLandmark] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const frame = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; center: MapPoint; rotation: number; pointerId: number; mode: "pan" | "rotate"; moved: boolean } | null>(null);
  const update = useCallback((next: Camera) => { camera.current = next; setView(next); }, []);
  const stop = useCallback(() => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }, []);
  const height = 3300 / view.zoom, unit = height / size.height, width = size.width * unit;

  useEffect(() => stop, [stop]);
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width || 1000, height: entry.contentRect.height || 600 }));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const image = new Image();
    image.onload = () => setStatus("ready"); image.onerror = () => setStatus("error");
    image.src = `/maps/astana.webp?v=${assetVersion}`;
    return () => { image.onload = null; image.onerror = null; };
  }, [assetVersion]);
  useEffect(() => {
    const node = svg.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      if (drag.current || !event.deltaY) return;
      event.preventDefault(); stop();
      const rect = node.getBoundingClientRect();
      const current = camera.current;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      const zoom = clamp(current.zoom * Math.exp(-clamp(delta, -120, 120) * .002), .35, 10);
      const offset = (3300 / current.zoom - 3300 / zoom) / rect.height;
      const point = unrotate(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, current.rotation);
      update({ ...current, zoom, center: { x: clamp(current.center.x + point.x * offset, 0, 5067), y: clamp(current.center.y + point.y * offset, 0, 7021) } });
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [stop, update]);

  function focus(point: MapPoint, zoom: number) {
    stop(); const start = camera.current;
    const target = { ...start, center: point, zoom };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { update(target); return; }
    let began: number | undefined;
    function animate(now: number) {
      began ??= now;
      const progress = Math.min(1, (now - began) / 600), eased = 1 - (1 - progress) ** 3;
      update({ ...start, center: { x: start.center.x + (point.x - start.center.x) * eased, y: start.center.y + (point.y - start.center.y) * eased }, zoom: start.zoom * (zoom / start.zoom) ** eased });
      frame.current = progress < 1 ? requestAnimationFrame(animate) : null;
    }
    frame.current = requestAnimationFrame(animate);
  }
  function choose(point: MapPoint, label?: string) {
    const next = placeAtPoint(point);
    if (!next) { setHint("Эта точка вне пяти районов проекта. Выберите выделенный район."); return; }
    setHint(""); onPlace(next, label);
  }
  function chooseDistrict(id: string) {
    const district = mapDistricts.find(d => d.id === id)!;
    const point = { x: district.label[0], y: district.label[1] };
    choose(point); setLandmark(""); focus(point, 1.4);
  }
  function chooseLandmark(id: string) {
    const item = mapLandmarks.find(l => l.id === id);
    if (!item) return;
    setLandmark(id); const point = { x: item.position[0], y: item.position[1] };
    focus(point, 3); choose(point, item.district ? item.name : undefined);
  }
  function pointFromEvent(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect(), current = camera.current;
    const point = unrotate(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, current.rotation);
    const scale = 3300 / current.zoom / rect.height;
    return { x: current.center.x + point.x * scale, y: current.center.y + point.y * scale };
  }
  function startDrag(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || drag.current || ![0, 2].includes(event.button) || (event.target as Element).closest("[data-interactive]")) return;
    stop();
    drag.current = { x: event.clientX, y: event.clientY, center: camera.current.center, rotation: camera.current.rotation, pointerId: event.pointerId, mode: event.button === 2 ? "rotate" : "pan", moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) < 5) return;
    start.moved = true;
    if (start.mode === "rotate") { update({ ...camera.current, rotation: start.rotation + dx * .3 }); return; }
    const point = unrotate(dx, dy, start.rotation), scale = 3300 / camera.current.zoom / size.height;
    update({ ...camera.current, center: { x: clamp(start.center.x - point.x * scale, 0, 5067), y: clamp(start.center.y - point.y * scale, 0, 7021) } });
  }
  function endDrag(event: PointerEvent<SVGSVGElement>, cancel = false) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancel && !start.moved && start.mode === "pan") { setLandmark(""); choose(pointFromEvent(event)); }
  }

  return <div className="citizen-city-map" ref={root}>
    <div className="ccm-navigation"><div className="ccm-districts" aria-label="Выбор района">{mapDistricts.map(d => <button key={d.id} aria-pressed={place?.districtId === d.id} onClick={() => chooseDistrict(d.id)}><i style={{ background: districtColors[d.id] }} />{d.name}</button>)}</div><select aria-label="Найти достопримечательность" value={landmark} onChange={e => chooseLandmark(e.target.value)}><option value="">Достопримечательности</option>{mapLandmarks.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
    <svg ref={svg} className="ccm-canvas" viewBox={`${view.center.x - width / 2} ${view.center.y - height / 2} ${width} ${height}`} role="group" aria-label="Карта Астаны. Нажмите на выделенный район, чтобы указать место обращения." onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={e => endDrag(e, true)} onLostPointerCapture={e => { if (e.target === e.currentTarget) endDrag(e, true); }} onContextMenu={e => e.preventDefault()}>
      <g transform={`rotate(${view.rotation} ${view.center.x} ${view.center.y})`}>
        <image href={`/maps/astana.webp?v=${assetVersion}`} x="0" y="0" width="5067" height="7021" className="ccm-basemap" pointerEvents="none" />
        {mapDistricts.map(d => <path className={`ccm-district ${place?.districtId === d.id ? "selected" : ""}`} key={d.id} d={d.path} fill={districtColors[d.id]} stroke={districtColors[d.id]} vectorEffect="non-scaling-stroke" role="button" tabIndex={0} aria-label={`Выбрать район ${d.name}`} aria-pressed={place?.districtId === d.id} onKeyDown={e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); chooseDistrict(d.id); } }} />)}
        {mapDistricts.map(d => <g key={`label-${d.id}`} transform={`translate(${d.label.join(" ")}) rotate(${-view.rotation}) scale(${unit})`} pointerEvents="none"><rect x="-48" y="-14" width="96" height="28" rx="8" fill={place?.districtId === d.id ? "#5A82EC" : "#0D0F14"} stroke={districtColors[d.id]} /><text y="4" textAnchor="middle" fill="#F4F5F1" fontSize="12" fontWeight="650">{d.name}</text></g>)}
        {mapLandmarks.map(l => <g key={l.id} transform={`translate(${l.position.join(" ")}) rotate(${-view.rotation}) scale(${unit})`} data-interactive className="ccm-landmark" role="button" tabIndex={0} aria-label={`Выбрать место ${l.name}`} onClick={() => chooseLandmark(l.id)} onKeyDown={e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); chooseLandmark(l.id); } }}><circle r="7" fill="#0D0F14" stroke="#78E2EA" strokeWidth="2" /><circle r="2" fill="#78E2EA" />{(view.zoom >= 2.3 || ["expo", "baiterek"].includes(l.id) || landmark === l.id) && <text x="12" y="-9" fill="#F4F5F1" fontSize="11" stroke="#0D0F14" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">{l.name}</text>}</g>)}
        {problems.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)).map(p => {
          const point = coordinatesToMap(p.latitude, p.longitude);
          if (point.x < 0 || point.x > 5067 || point.y < 0 || point.y > 7021) return null;
          return <g key={p.id} data-interactive className="ccm-report-marker" transform={`translate(${point.x} ${point.y}) rotate(${-view.rotation}) scale(${unit})`} role="button" tabIndex={0} aria-label={`Обращение: ${p.title}`} onClick={() => onProblem(p)} onKeyDown={e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); onProblem(p); } }}><circle r="12" fill={p.status === "RESOLVED" ? "#78E2EA" : "#5A82EC"} stroke="#0D0F14" strokeWidth="2" /><text y="4" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0D0F14">{p.status === "RESOLVED" ? "✓" : "!"}</text></g>;
        })}
        {place && <g pointerEvents="none" transform={`translate(${place.x} ${place.y}) rotate(${-view.rotation}) scale(${unit})`} className="ccm-selected-pin"><circle r="24" fill="#78E2EA" fillOpacity=".18" /><path d="M0 0s-12-13-12-21a12 12 0 0 1 24 0C12-13 0 0 0 0Z" fill="#78E2EA" stroke="#0D0F14" strokeWidth="2" /><circle cy="-21" r="4" fill="#0D0F14" /></g>}
      </g>
    </svg>
    {status !== "ready" && <div className="ccm-loading" role="status">{status === "loading" ? "Загружаем карту Астаны…" : <><span>Не удалось загрузить карту</span><button onClick={() => { setStatus("loading"); setAssetVersion(v => v + 1); }}>Повторить</button></>}</div>}
    {hint && <p className="ccm-hint" role="status">{hint}</p>}
    <div className="ccm-tools"><button aria-label="Увеличить карту" disabled={view.zoom >= 10} onClick={() => { stop(); update({ ...camera.current, zoom: clamp(camera.current.zoom * 1.4, .35, 10) }); }}>+</button><span>{Math.round(view.zoom * 100)}%</span><button aria-label="Уменьшить карту" disabled={view.zoom <= .35} onClick={() => { stop(); update({ ...camera.current, zoom: clamp(camera.current.zoom / 1.4, .35, 10) }); }}>−</button><button aria-label="Показать всю карту" onClick={() => { stop(); update(home); }}>⌖</button><button aria-label="Повернуть карту на север" onClick={() => { stop(); update({ ...camera.current, rotation: 0 }); }}>N</button></div>
    <div className="ccm-attribution"><span>Клик — место · Перетаскивание — движение · ПКМ — поворот · Колесо — масштаб</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></div>
  </div>;
}
