import type { SVGProps } from "react";

type IconName = "home" | "map" | "plus" | "reports" | "user" | "arrow" | "chevron" | "search" | "filter" | "pin" | "check" | "clock" | "camera" | "qr" | "close" | "menu" | "shield" | "leaf" | "bus" | "building" | "service" | "alert" | "send" | "back";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/><path d="M9 21h6"/></>,
  map: <><path d="M3 6.5 8.5 4 15 6.5 21 4v13.5L15 20l-6.5-2.5L3 20Z"/><path d="M8.5 4v13.5M15 6.5V20"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  reports: <><path d="M6 3h12a2 2 0 0 1 2 2v14H4V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.6-3.6 3-5.5 7-5.5s6.4 1.9 7 5.5"/></>,
  arrow: <><path d="M4 12h15M13 6l6 6-6 6"/></>,
  chevron: <path d="m8 10 4 4 4-4"/>,
  search: <><circle cx="10.7" cy="10.7" r="6.3"/><path d="m16 16 4.5 4.5"/></>,
  filter: <path d="M4 6h16M7 12h10M10 18h4"/>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></>,
  camera: <><path d="M4 8h3l1.5-2h7L17 8h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/></>,
  qr: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  shield: <path d="M12 3 19 6v5c0 4.5-2.7 8-7 10-4.3-2-7-5.5-7-10V6Z"/>,
  leaf: <><path d="M19 4C10 4 5 8 5 14c0 3 2 5 5 5 6 0 9-5 9-15Z"/><path d="M5 19c2-4 5-7 10-9"/></>,
  bus: <><rect x="5" y="4" width="14" height="14" rx="3"/><path d="M5 12h14M8 18l-2 3M16 18l2 3M8 8h.01M16 8h.01"/></>,
  building: <><path d="M5 21V4h10v17M15 10h4v11M8 8h3M8 12h3M8 16h3M18 14h.01M18 18h.01"/></>,
  service: <><path d="M4 7h16M4 12h16M4 17h10"/><circle cx="18" cy="17" r="2"/></>,
  alert: <><path d="m12 3 9 17H3Z"/><path d="M12 9v5M12 17h.01"/></>,
  send: <><path d="m3 11 18-8-8 18-2.5-7.5Z"/><path d="m10.5 13.5 4-4"/></>,
  back: <><path d="M19 12H5M11 18l-6-6 6-6"/></>,
};

export function CitizenIcon({ name, size = 20, strokeWidth = 1.8, ...props }: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
