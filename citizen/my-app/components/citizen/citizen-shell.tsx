"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CitizenIcon } from "@/components/citizen/icon";
import { useCitizenAuth } from "@/components/citizen/auth-provider";
import { BrandLogo } from "@/components/citizen/brand-logo";

const nav = [
  { href: "/citizen", label: "Главная", icon: "home" as const, tour: "home" },
  { href: "/citizen/map", label: "Карта", icon: "map" as const, tour: "map" },
  { href: "/citizen/my-reports", label: "Обращения", icon: "reports" as const, tour: "reports" },
  { href: "/citizen/profile", label: "Профиль", icon: "user" as const, tour: "profile" },
];

export function CitizenShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useCitizenAuth();
  const isMap = pathname === "/citizen/map";
  return <div className={`citizen-app${isMap ? " citizen-app-map" : ""}`}>
    <header className="citizen-header">
      <Link className="citizen-brand" href="/citizen" aria-label="E-AkimAI — кабинет жителя"><BrandLogo compact /><span><strong>E-AkimAI</strong><small>Кабинет жителя</small></span></Link>
      <div className="citizen-header-actions"><Link data-tour="help" className="citizen-help-link" href="/citizen/help">Помощь</Link><Link data-tour="scan" className="citizen-qr-link" href="/citizen/scan" aria-label="Сканировать QR-код"><CitizenIcon name="qr" size={18} /><span>QR-код</span></Link><Link className="citizen-header-action" href="/citizen/map"><CitizenIcon name="plus" size={18} /><span>Создать обращение</span></Link></div>
    </header>
    <nav className="citizen-desktop-nav" data-tour="navigation" aria-label="Разделы приложения">
      {nav.map(item => <Link key={item.href} href={item.href} data-tour={item.tour} aria-current={pathname === item.href ? "page" : undefined}><CitizenIcon name={item.icon} size={18} />{item.label}</Link>)}
    </nav>
    <main className={`citizen-main${isMap ? " citizen-main-wide" : ""}`}><div className="citizen-account"><span><CitizenIcon name="user" size={15} />{auth?.user.displayName}</span><button onClick={() => void auth?.logout()}>Выйти</button></div>{children}</main>
    <nav className="citizen-bottom-nav" data-tour="navigation" aria-label="Навигация жителя">
      {nav.slice(0, 2).map((item) => <Link key={item.href} data-tour={item.tour} className={pathname === item.href ? "active" : ""} href={item.href}><CitizenIcon name={item.icon} size={21} /><span>{item.label}</span></Link>)}
      <Link className="citizen-report-fab" href="/citizen/map" aria-label="Создать обращение через карту"><span><CitizenIcon name="plus" size={24} /></span><small>Сообщить</small></Link>
      {nav.slice(2).map((item) => <Link key={item.href} data-tour={item.tour} className={pathname.startsWith(item.href) ? "active" : ""} href={item.href}><CitizenIcon name={item.icon} size={21} /><span>{item.label}</span></Link>)}
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
