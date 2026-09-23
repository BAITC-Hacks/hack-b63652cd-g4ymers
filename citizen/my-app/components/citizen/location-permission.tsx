"use client";

import { useEffect, useState } from "react";
import { CitizenIcon } from "@/components/citizen/icon";
import { getSavedCitizenLocation, saveCitizenLocation, type CitizenLocation } from "@/lib/citizen";

type PermissionState = "checking" | "granted" | "prompt" | "denied" | "unsupported";

export function LocationPermission({ compact = false, onLocation }: { compact?: boolean; onLocation?: (location: CitizenLocation) => void }) {
  const [status, setStatus] = useState<PermissionState>("checking");
  const [message, setMessage] = useState("");

  function requestLocation() {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      setMessage("Браузер не поддерживает геолокацию.");
      return;
    }
    setStatus("checking");
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: CitizenLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: Math.round(position.coords.accuracy), capturedAt: new Date().toISOString() };
        saveCitizenLocation(location);
        setStatus("granted");
        onLocation?.(location);
      },
      (error) => {
        setStatus(error.code === 1 ? "denied" : "prompt");
        setMessage(error.code === 1 ? "Доступ запрещён. Разрешите геолокацию в настройках браузера." : "Не удалось определить координаты. Проверьте сигнал и попробуйте ещё раз.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = getSavedCitizenLocation();
      if (saved) {
        setStatus("granted");
        onLocation?.(saved);
        return;
      }
      requestLocation();
    }, 0);
    return () => window.clearTimeout(timer);
    // The prompt is intentionally requested once when this component enters the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "checking") return <div className={`location-permission ${compact ? "compact" : ""}`}><span className="location-permission-icon"><CitizenIcon name="pin" size={17} /></span><div><strong>Проверяем ваше местоположение…</strong><p>Координаты нужны только для подтверждения места.</p></div></div>;
  if (status === "granted") return <div className={`location-permission granted ${compact ? "compact" : ""}`}><span className="location-permission-icon"><CitizenIcon name="check" size={17} /></span><div><strong>Местоположение подтверждено</strong><p>Точная геолокация не публикуется другим жителям.</p></div></div>;
  return <div className={`location-permission ${compact ? "compact" : ""}`}><span className="location-permission-icon"><CitizenIcon name="pin" size={17} /></span><div><strong>{status === "unsupported" ? "Геолокация недоступна" : "Подтвердите местоположение"}</strong><p>{message || "Это помогает понять, про какую улицу идёт речь."}</p><button className="location-retry" onClick={requestLocation}>Попробовать снова</button></div></div>;
}
