import type { CSSProperties } from "react";
export type IconName = "city" | "grid" | "chart" | "sparkles" | "help" | "arrow" | "chevron" | "plus" | "minus" | "close" | "reset" | "pin" | "layers" | "check" | "clock" | "wallet" | "transport" | "ecology" | "social" | "safety" | "services" | "search" | "target" | "expand";
const paths: Record<IconName, React.ReactNode> = {
    city: <><path d="M3 21V9h6v12M9 21V3h7v18M16 21V12h5v9M1 21h22"/><path d="M12 7h1m-1 4h1m-1 4h1M5 13h2m-2 4h2m11-1h1"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    chart: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7"/></>,
    sparkles: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6L20 2Z"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    reset: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    layers: <><path d="m12 3 10 6-10 6L2 9l10-6Zm-9 11 9 5 9-5M3 18l9 5 9-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    wallet: <><path d="M20 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7"/><path d="M21 12h-6v5h6m-3-2.5h.01"/></>,
    transport: <><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 19v2m8-2v2M8 15h1m6 0h1M9 6h6"/></>,
    ecology: <><path d="M5 19C-1 7 12 4 21 3c0 12-5 19-13 15m-5 3L16 8"/></>,
    social: <><path d="M4 21V7l8-4 8 4v14M2 21h20M9 21v-6h6v6M8 9h1m6 0h1M8 12h1m6 0h1"/></>,
    safety: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    services: <><path d="m14 3-3 6 4 4 6-3c1 6-4 9-9 6l-6 6-4-4 6-6C5 7 8 2 14 3Z"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    target: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></>,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
};
export function Icon({ name, size = 20, className, style }: {
    name: IconName;
    size?: number;
    className?: string;
    style?: CSSProperties;
}) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name]}</svg>;
}
