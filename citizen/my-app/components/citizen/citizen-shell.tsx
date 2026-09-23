"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CitizenIcon } from "@/components/citizen/icon";

const nav = [
  { href: "/citizen", label: "Главная", icon: "home" as const },
  { href: "/citizen/map", label: "Карта", icon: "map" as const },
  { href: "/citizen/my-reports", label: "Обращения", icon: "reports" as const },
  { href: "/citizen/profile", label: "Профиль", icon: "user" as const },
];

export function CitizenShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="citizen-app">
    <header className="citizen-header">
      <Link className="citizen-brand" href="/citizen" aria-label="Қалаға көмект — на главную"><span className="citizen-brand-mark"><span /></span><span><strong>Қалаға көмект</strong><small>Город рядом</small></span></Link>
      <Link className="citizen-header-action" href="/report/ASTANA-NURA-LIGHT-001"><CitizenIcon name="plus" size={18} /> Сообщить</Link>
    </header>
    <main className="citizen-main">{children}</main>
    <nav className="citizen-bottom-nav" aria-label="Навигация жителя">
      {nav.slice(0, 2).map((item) => <Link key={item.href} className={pathname === item.href ? "active" : ""} href={item.href}><CitizenIcon name={item.icon} size={21} /><span>{item.label}</span></Link>)}
      <Link className="citizen-report-fab" href="/report/ASTANA-NURA-LIGHT-001" aria-label="Сообщить о проблеме"><span><CitizenIcon name="plus" size={24} /></span><small>Сообщить</small></Link>
      {nav.slice(2).map((item) => <Link key={item.href} className={pathname.startsWith(item.href) ? "active" : ""} href={item.href}><CitizenIcon name={item.icon} size={21} /><span>{item.label}</span></Link>)}
    </nav>
  </div>;
}

export function CitizenPageHeader({ eyebrow, title, description, back = false }: { eyebrow?: string; title: string; description?: string; back?: boolean }) {
  return <div className="citizen-page-header">
    {back && <Link className="citizen-back" href="/citizen"><CitizenIcon name="back" size={18} /> Главная</Link>}
    {eyebrow && <span className="citizen-eyebrow">{eyebrow}</span>}
    <h1>{title}</h1>
    {description && <p>{description}</p>}
  </div>;
}
