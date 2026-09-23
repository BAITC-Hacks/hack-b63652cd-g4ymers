"use client";
import { useState } from "react";
import { districts, measures, type Selection } from "@/lib/simulation";
import { Icon } from "./icon";
const project = (x: number, y: number, z = 0) => [365 + (x - y) * 0.91, 73 + (x + y) * 0.45 - z];
const point = (x: number, y: number, z = 0) => project(x, y, z).join(",");
const polygon = (x: number, y: number, w: number, d: number, z = 0) => [point(x, y, z), point(x + w, y, z), point(x + w, y + d, z), point(x, y + d, z)].join(" ");
const neighborhoods = [
    { id: "saryarka", x: 8, y: 8, w: 159, d: 132, label: [315, 88], color: "#d7d3ee" },
    { id: "baikonur", x: 183, y: 8, w: 161, d: 132, label: [589, 134], color: "#cbd4ed" },
    { id: "almaty", x: 8, y: 193, w: 145, d: 147, label: [139, 266], color: "#c8d7f0" },
    { id: "esil", x: 171, y: 193, w: 173, d: 147, label: [350, 420], color: "#c6cee9" },
    { id: "nura", x: 363, y: 52, w: 99, d: 288, label: [666, 332], color: "#d0c5f4" },
];
const buildings = neighborhoods.flatMap((n, ni) => Array.from({ length: ni === 4 ? 15 : 19 }, (_, i) => {
    const cols = ni === 4 ? 3 : 4;
    return { x: n.x + 14 + (i % cols) * (ni === 4 ? 26 : 32), y: n.y + 14 + Math.floor(i / cols) * (ni === 4 ? 47 : 24), w: 12 + (i % 3) * 4, d: 12 + ((i + 1) % 3) * 3, h: 12 + ((i * 13 + ni * 19) % 37), color: n.color, district: n.id, index: i };
})).sort((a, b) => (a.x + a.y) - (b.x + b.y));
function Building({ x, y, w, d, h, color, special = false }: {
    x: number;
    y: number;
    w: number;
    d: number;
    h: number;
    color: string;
    special?: boolean;
}) {
    const p = (dx: number, dy: number, z: number) => point(x + dx, y + dy, z);
    return <g className={special ? "new-building" : undefined}>
    <polygon points={polygon(x + 6, y + 5, w + 4, d + 4)} fill="#4d4470" opacity=".07"/>
    <polygon points={`${p(0, d, 0)} ${p(w, d, 0)} ${p(w, d, h)} ${p(0, d, h)}`} fill={color}/>
    <polygon points={`${p(w, 0, 0)} ${p(w, d, 0)} ${p(w, d, h)} ${p(w, 0, h)}`} fill={special ? "#6850ce" : "#9baacb"}/>
    <polygon points={polygon(x, y, w, d, h)} fill={special ? "#b79af9" : "#f4f4fe"} stroke={special ? "#9d7ce2" : "#d7dcf0"} strokeWidth=".65"/>
    {Array.from({ length: Math.floor(h / 9) }, (_, row) => <g key={row} opacity=".7">
      <line x1={project(x + 3, y + d, 5 + row * 9)[0]} y1={project(x + 3, y + d, 5 + row * 9)[1]} x2={project(x + w - 3, y + d, 5 + row * 9)[0]} y2={project(x + w - 3, y + d, 5 + row * 9)[1]} stroke="white" strokeWidth="2"/>
      <line x1={project(x + w, y + 3, 5 + row * 9)[0]} y1={project(x + w, y + 3, 5 + row * 9)[1]} x2={project(x + w, y + d - 3, 5 + row * 9)[0]} y2={project(x + w, y + d - 3, 5 + row * 9)[1]} stroke="#dbe6ff" strokeWidth="1.5"/>
    </g>)}
  </g>;
}
export function CityMap({ selected, onSelect, plan }: {
    selected: string;
    onSelect: (id: string) => void;
    plan: Selection[];
}) {
    const [zoom, setZoom] = useState(1);
    const [showLabels, setShowLabels] = useState(true);
    return <div className="city-map">
    <div className="map-caption"><span className="live-dot"/> АСТАНА <span className="caption-divider"/> МОДЕЛЬ ГОРОДА</div>
    <div className="map-north"><span>N</span><svg viewBox="0 0 24 32" width="20" height="27" aria-hidden="true"><path d="M12 2 3 27l9-6 9 6Z" fill="#28253d"/><path d="M12 2v19l9 6Z" fill="#b8b0d1"/></svg></div>
    <svg className="city-illustration" viewBox="0 0 820 500" role="group" aria-label="Интерактивная условная схема пяти районов Астаны">
      <defs>
        <linearGradient id="river" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a6c5fa"/><stop offset="1" stopColor="#6996ee"/></linearGradient>
        <filter id="island-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="12" floodColor="#534382" floodOpacity=".12"/></filter>
      </defs>
      <g style={{ transform: `translate(410px, 250px) scale(${zoom}) translate(-410px, -250px)`, transition: "transform 250ms ease" }}>
        <g filter="url(#island-shadow)">
          <polygon points={`${point(-7, 352)} ${point(474, 352)} ${point(474, 352, -12)} ${point(-7, 352, -12)}`} fill="#c7c4df"/>
          <polygon points={`${point(474, -8)} ${point(474, 352)} ${point(474, 352, -12)} ${point(474, -8, -12)}`} fill="#b4bbd9"/>
          <polygon points={polygon(-7, -8, 481, 360)} fill="#e8e9f4" stroke="#fdfcff" strokeWidth="3"/>
        </g>
        {neighborhoods.map(n => <g key={n.id} role="button" tabIndex={0} aria-label={`Выбрать район ${districts.find(d => d.id === n.id)!.name}`} aria-pressed={selected === n.id} className="map-district" onClick={() => onSelect(n.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(n.id);
        } }}>
          <polygon points={polygon(n.x, n.y, n.w, n.d)} fill={selected === n.id ? "#ded1fc" : "#e0e4f1"} stroke={selected === n.id ? "#9875e6" : "#cfd5e6"} strokeWidth={selected === n.id ? "2" : "1"} strokeDasharray={selected === n.id ? "5 4" : undefined}/>
        </g>)}
        <g pointerEvents="none">
        <polygon points={polygon(-7, 149, 370, 32)} fill="url(#river)"/>
        {[157, 170].map(y => <line key={y} x1={project(0, y)[0]} y1={project(0, y)[1]} x2={project(350, y)[0]} y2={project(350, y)[1]} stroke="#c7dcff" strokeWidth="1" opacity=".6"/>)}
        {[70, 163, 350].map(x => <g key={x}>
          <polygon points={polygon(x, -5, 8, 351)} fill="#fdfcff"/>
          <line x1={project(x + 4, 0)[0]} y1={project(x + 4, 0)[1]} x2={project(x + 4, 346)[0]} y2={project(x + 4, 346)[1]} stroke="#c4c9df" strokeDasharray="5 5" strokeWidth="1"/>
        </g>)}
        {[73, 260].map(y => <polygon key={y} points={polygon(0, y, 465, 6)} fill="#fafaff"/>)}
        {buildings.map(b => <Building key={`${b.district}-${b.index}`} {...b}/>)}
        {neighborhoods.flatMap((n, ni) => Array.from({ length: 7 }, (_, i) => {
            const [cx, cy] = project(n.x + 10 + (i * 23) % (n.w - 18), n.y + n.d - 12);
            return <g key={`tree-${ni}-${i}`}><ellipse cx={cx + 4} cy={cy + 2} rx="8" ry="3" fill="#666081" opacity=".1"/><path d={`M${cx} ${cy}v-11`} stroke="#aaa5c4" strokeWidth="2"/><ellipse cx={cx} cy={cy - 12} rx="6" ry="9" fill={i % 2 ? "#a8b0d9" : "#b9aadf"}/><ellipse cx={cx - 2} cy={cy - 15} rx="3" ry="5" fill="#d2c8ee"/></g>;
        }))}
        <g transform={`translate(${project(278, 225).join(" ")})`}>
          <ellipse cy="3" rx="15" ry="7" fill="#bdc5de"/><path d="M-8 0 -4-49M8 0 4-49M0 0v-49" stroke="#fdfcff" strokeWidth="3"/>
          <ellipse cy="-46" rx="9" ry="3" fill="#adb8d8"/><circle cy="-57" r="12" fill="#8070c2"/><circle cx="-3" cy="-61" r="6" fill="#b7a5e7"/>
        </g>
        {plan.flatMap((choice, i) => {
            const measure = measures.find(m => m.id === choice.id)!;
            return neighborhoods.filter(n => measure.city || n.id === choice.district).map(n => {
                const x = n.x + n.w - 30, y = n.y + 30 + i * 15;
                const [cx, cy] = project(x, y);
                if (measure.category === "social")
                    return <Building key={`${choice.id}-${n.id}`} x={x} y={y} w={17} d={15} h={24} color="#a58be5" special/>;
                return <g key={`${choice.id}-${n.id}`} className="new-building">
              {measure.category === "ecology" ? <><polygon points={polygon(x - 9, y - 9, 27, 27)} fill="#c8b3ed"/>{[-9, 0, 9].map(dx => <g key={dx}><path d={`M${cx + dx} ${cy + 2}v-17`} stroke="#8162ab" strokeWidth="2"/><ellipse cx={cx + dx} cy={cy - 18 - Math.abs(dx) / 2} rx="6" ry="10" fill="#a37bd2"/></g>)}</> : measure.category === "transport" ? <><path d={`M${cx - 23} ${cy - 12}l46 24`} stroke="#5a87e4" strokeWidth="6"/><path d={`M${cx - 23} ${cy - 12}l46 24`} stroke="#dfe9ff" strokeWidth="1" strokeDasharray="3 3"/></> : measure.category === "safety" ? <><path d={`M${cx} ${cy}v-33h10`} fill="none" stroke="#8772b6" strokeWidth="2.5"/><circle cx={cx + 10} cy={cy - 30} r="12" fill="#ba9feb" opacity=".2"/><circle cx={cx + 10} cy={cy - 30} r="4" fill="#aa85de"/></> : <><ellipse cx={cx} cy={cy} rx="15" ry="7" fill="#93b3ee" opacity=".5"/><circle cx={cx} cy={cy - 12} r="9" fill="#7193d8" stroke="white" strokeWidth="2"/><path d={`M${cx - 4} ${cy - 12}l3 3 5-6`} fill="none" stroke="white" strokeWidth="1.5"/></>}
            </g>;
            });
        })}
        <text x="352" y="215" fill="#4568a1" fontSize="9" letterSpacing="4" transform="rotate(26 352 215)">ЕСИЛЬ</text>
        </g>
        {showLabels && neighborhoods.map(n => {
            const name = districts.find(d => d.id === n.id)!.name;
            const isSelected = selected === n.id;
            const count = plan.filter(s => s.district === n.id || measures.find(m => m.id === s.id)?.city).length;
            return <g key={`label-${n.id}`} transform={`translate(${n.label.join(" ")})`} role="button" tabIndex={0} aria-label={`Район ${name}`} aria-pressed={isSelected} onClick={() => onSelect(n.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(n.id);
            } }} className="district-label">
            <rect x="-55" y="-16" width="110" height="32" rx="9" fill={isSelected ? "#7750cc" : "#fff"} stroke={isSelected ? "#7750cc" : "#e7e4f0"}/>
            <circle cx="-38" cy="0" r="3" fill={isSelected ? "#e6d8ff" : "#9a8ac7"}/>
            <text x={count ? "-4" : "3"} y="4" textAnchor="middle" fill={isSelected ? "white" : "#4c455f"} fontSize="11" fontWeight="600">{name}</text>
            {count > 0 && <><circle cx="41" cy="0" r="9" fill={isSelected ? "#ffffff25" : "#eee6ff"}/><text x="41" y="3" textAnchor="middle" fontSize="9" fill={isSelected ? "white" : "#7750cc"}>{count}</text></>}
          </g>;
        })}
      </g>
    </svg>
    <div className="map-footnote"><span className="map-legend-dot"/> Выбранный район <span className="map-footnote-separator">·</span> Условная схема города</div>
    <div className="map-tools">
      <button className="icon-button" aria-label="Увеличить карту" disabled={zoom >= 1.4} onClick={() => setZoom(v => Math.min(1.4, v + .2))}><Icon name="plus" size={17}/></button>
      <button className="icon-button" aria-label="Уменьшить карту" disabled={zoom <= .8} onClick={() => setZoom(v => Math.max(.8, v - .2))}><Icon name="minus" size={17}/></button>
      <span />
      <button className="icon-button" aria-label="Сбросить масштаб" onClick={() => setZoom(1)}><Icon name="expand" size={16}/></button>
      <button className={`icon-button ${showLabels ? "tool-active" : ""}`} aria-label="Названия районов" aria-pressed={showLabels} onClick={() => setShowLabels(v => !v)}><Icon name="layers" size={16}/></button>
    </div>
  </div>;
}
