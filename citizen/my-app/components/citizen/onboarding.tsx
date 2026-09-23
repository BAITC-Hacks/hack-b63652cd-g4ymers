"use client";

import { useEffect, useState } from "react";
import { CitizenIcon } from "@/components/citizen/icon";
import { LocationPermission } from "@/components/citizen/location-permission";

const steps = [
  { title: "Сначала подтвердим место", description: "Геолокация помогает приложению понять, про какую улицу или объект идёт речь. Координаты не показываются другим жителям.", icon: "pin" as const },
  { title: "Сканируйте QR на улице", description: "Наведите камеру на QR-код таблички: откроется история места, изменения акимата и форма нового обращения.", icon: "qr" as const },
  { title: "Ваши обращения приватны", description: "Активные заявки видите только вы. После решения они могут попасть в общий журнал, чтобы жители видели результат работы.", icon: "shield" as const },
];

export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!window.localStorage.getItem("citizen-onboarding-seen")) setStep(0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function close() {
    window.localStorage.setItem("citizen-onboarding-seen", "1");
    setStep(null);
  }

  if (step === null) return null;
  const current = steps[step];
  return <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div className="onboarding-card"><div className="onboarding-top"><span className="onboarding-counter">{step + 1} / {steps.length}</span><button className="onboarding-close" onClick={close} aria-label="Закрыть обучение"><CitizenIcon name="close" size={18} /></button></div><div className="onboarding-icon"><CitizenIcon name={current.icon} size={28} /></div><span className="citizen-eyebrow">ПЕРВЫЙ ЗАПУСК</span><h2 id="onboarding-title">{current.title}</h2><p>{current.description}</p>{step === 0 && <LocationPermission compact />}<div className="onboarding-dots">{steps.map((item, index) => <span className={index === step ? "active" : ""} key={item.title} />)}</div><div className="onboarding-actions"><button className="onboarding-skip" onClick={close}>Пропустить</button>{step < steps.length - 1 ? <button className="citizen-button primary" onClick={() => setStep(step + 1)}>Далее <CitizenIcon name="arrow" size={15} /></button> : <button className="citizen-button primary" onClick={close}>Понятно <CitizenIcon name="check" size={15} /></button>}</div></div></div>;
}
