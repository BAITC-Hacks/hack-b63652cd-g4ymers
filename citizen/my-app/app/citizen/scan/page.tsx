"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { CitizenIcon } from "@/components/citizen/icon";
import { CitizenPageHeader } from "@/components/citizen/citizen-shell";
import { LocationPermission } from "@/components/citizen/location-permission";
import { QrScanner } from "@/components/citizen/qr-scanner";

export default function CitizenScanPage() {
  const router = useRouter();
  return <>
    <CitizenPageHeader eyebrow="БЫСТРЫЙ ДОСТУП" title="Найдите место рядом" description="Отсканируйте QR-код на городской табличке, чтобы узнать историю улицы и сообщить о проблеме." />
    <section className="scanner-help"><div><strong>Рядом нет QR-кода?</strong><p>Выберите район и отметьте точку на карте. Камера и геолокация не нужны.</p><Link className="citizen-button secondary" href="/citizen/map"><CitizenIcon name="map" size={18} />Выбрать место на карте</Link></div></section>
    <LocationPermission />
    <QrScanner onDetected={(code) => router.push(`/report/${encodeURIComponent(code)}`)} />
    <section className="scanner-help"><div className="scanner-help-icon"><CitizenIcon name="pin" size={18} /></div><div><strong>Где искать QR-код?</strong><p>На информационных табличках рядом с фонарями, остановками, дворами и другими городскими объектами.</p></div></section>
    <p className="scanner-demo">Для обращения нужен код зарегистрированного объекта. Не используйте код другого места.</p>
  </>;
}
