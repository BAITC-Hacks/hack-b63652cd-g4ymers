"use client";

import { useEffect, useRef, useState } from "react";
import { CitizenIcon } from "@/components/citizen/icon";

type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> };
type DetectorConstructor = new (options?: { formats: string[] }) => Detector;

function normalizeQrValue(value: string) {
  const trimmed = value.trim();
  const marker = "/report/";
  const index = trimmed.indexOf(marker);
  if (index >= 0) return decodeURIComponent(trimmed.slice(index + marker.length).split(/[?#]/)[0]);
  return trimmed;
}

export function QrScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "unsupported" | "denied">("idle");
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function startScanner() {
    setError("");
    const DetectorClass = (globalThis as typeof globalThis & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!videoRef.current) return;
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play();
      detectorRef.current = new DetectorClass({ formats: ["qr_code"] });
      setStatus("scanning");
      scanFrame();
    } catch {
      setStatus("denied");
      setError("Разрешите доступ к камере или введите код вручную.");
    }
  }

  async function scanFrame() {
    if (!videoRef.current || !detectorRef.current || status === "denied") return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      const value = codes[0]?.rawValue;
      if (value) {
        stopScanner();
        onDetected(normalizeQrValue(value));
        return;
      }
    } catch {
      setError("Не удалось распознать QR-код. Попробуйте навести камеру ещё раз.");
    }
    window.setTimeout(scanFrame, 350);
  }

  function stopScanner() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }

  function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (manualCode.trim()) onDetected(normalizeQrValue(manualCode));
  }

  return <div className="qr-scanner-card">
    <div className="scanner-viewport">
      <video ref={videoRef} className={status === "scanning" ? "visible" : ""} muted playsInline aria-label="Изображение с камеры" />
      {status !== "scanning" && <div className="scanner-placeholder"><div className="scanner-qr-icon"><CitizenIcon name="qr" size={32} /></div><strong>{status === "unsupported" ? "Сканирование недоступно" : "Наведите камеру на QR-код"}</strong><span>{status === "unsupported" ? "Ваш браузер не поддерживает чтение QR-кодов" : "Код находится на табличке объекта"}</span></div>}
      <span className="scanner-corner top-left" /><span className="scanner-corner top-right" /><span className="scanner-corner bottom-left" /><span className="scanner-corner bottom-right" />
      {status === "scanning" && <span className="scanner-line" />}
    </div>
    {error && <p className="scanner-error"><CitizenIcon name="alert" size={14} /> {error}</p>}
    <div className="scanner-actions">{status === "scanning" ? <button className="citizen-button secondary" onClick={stopScanner}><CitizenIcon name="close" size={16} /> Остановить</button> : <button className="citizen-button primary" onClick={startScanner}><CitizenIcon name="camera" size={17} /> Включить камеру</button>}</div>
    <div className="manual-code-divider"><span>или введите код с таблички</span></div>
    <form className="manual-code-form" onSubmit={submitManual}><input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Например, ASTANA-NURA-LIGHT-001" aria-label="Код QR-локации" /><button className="citizen-button secondary" type="submit" disabled={!manualCode.trim()}>Открыть</button></form>
  </div>;
}
