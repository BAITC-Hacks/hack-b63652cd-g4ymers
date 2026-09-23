"use client";

import { useRouter } from "next/navigation";
import { CitizenIcon } from "@/components/citizen/icon";
import { CitizenPageHeader } from "@/components/citizen/citizen-shell";
import { LocationPermission } from "@/components/citizen/location-permission";
import { QrScanner } from "@/components/citizen/qr-scanner";

export default function CitizenScanPage() {
  const router = useRouter();
  return <>
    <CitizenPageHeader eyebrow="БЫСТРЫЙ ДОСТУП" title="Найдите место рядом" description="Отсканируйте QR-код на городской табличке, чтобы узнать историю улицы и сообщить о проблеме." />
    <LocationPermission />
    <QrScanner onDetected={(code) => router.push(`/report/${encodeURIComponent(code)}`)} />
    <section className="scanner-help"><div className="scanner-help-icon"><CitizenIcon name="pin" size={18} /></div><div><strong>Где искать QR-код?</strong><p>На информационных табличках рядом с фонарями, остановками, дворами и другими городскими объектами.</p></div></section>
    <div className="scanner-demo"><span>Нет таблички рядом?</span><button onClick={() => router.push("/report/ASTANA-NURA-LIGHT-001")}>Открыть демо-место <CitizenIcon name="arrow" size={14} /></button></div>
  </>;
}
