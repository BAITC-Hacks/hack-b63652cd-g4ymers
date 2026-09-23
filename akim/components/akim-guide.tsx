"use client";

import { useRef, useState } from "react";
import { Icon, type IconName } from "./icon";

export type GuideDestination = "flow" | "reports" | "district" | "advisor" | "map";

const topics: { label: string; title: string; icon: IconName; destination: GuideDestination; action: string }[] = [
  { label: "Сценарий", title: "От инициатив до сохранённого результата", icon: "layers", destination: "flow", action: "Открыть мой сценарий" },
  { label: "Обращения", title: "Помогите жителям решить проблему", icon: "services", destination: "reports", action: "Открыть обращения" },
  { label: "Рейтинги", title: "Два показателя для разных задач", icon: "chart", destination: "district", action: "Посмотреть рейтинг района" },
  { label: "AI-советы", title: "Начните с проблем выбранного района", icon: "sparkles", destination: "advisor", action: "Открыть AI-советы" },
  { label: "Карта", title: "Исследуйте Астану", icon: "pin", destination: "map", action: "Перейти к карте" },
];

export function AkimGuide({ onNavigate, onClose }: { onNavigate: (destination: GuideDestination) => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const topic = topics[step];

  function goTo(next: number) {
    setStep(next);
    if (body.current) body.current.scrollTop = 0;
  }

  return <div className="akim-guide">
    <header className="guide-header">
      <span className="dialog-eyebrow">БЫСТРЫЙ СТАРТ · КАБИНЕТ АКИМА</span>
      <h2 id="guide-title">Как пользоваться</h2>
      <p>Выберите нужную тему или пройдите все пять.</p>
    </header>
    <nav className="guide-topics" aria-label="Темы руководства">
      {topics.map((item, index) => <button key={item.destination} type="button" aria-current={step === index ? "step" : undefined} aria-controls="guide-topic" onClick={() => goTo(index)}><span>{index + 1}</span>{item.label}</button>)}
    </nav>
    <div ref={body} className="guide-body" id="guide-topic" role="region" aria-labelledby="guide-topic-title" tabIndex={0}>
      <div className="guide-topic-heading"><span className="guide-topic-icon"><Icon name={topic.icon} size={23}/></span><div><span>Тема {step + 1} из {topics.length}</span><h3 id="guide-topic-title">{topic.title}</h3></div></div>
      {step === 0 && <>
        <ol className="guide-instructions">
          <li><strong>Выберите инициативы</strong><p>Откройте сценарий, выберите район и добавьте меры из каталога. Нужно 5 уникальных инициатив на сумму до 100 единиц, максимум 2 одного направления.</p></li>
          <li><strong>Проверьте план</strong><p>Нажмите «Проверить план». Проверьте районы и стоимость, задайте название. Пока выбираете, можно нажать «Сохранить черновик».</p></li>
          <li><strong>Сохраните итог</strong><p>«Завершить и сохранить» фиксирует решения и показывает результат. Найти его снова можно в «Сохранённых». Завершённый сценарий доступен только для просмотра.</p></li>
        </ol>
        <p className="guide-tip"><Icon name="wallet" size={17}/><span>Остаток бюджета можно не тратить. Причины недоступности инициатив указаны в каталоге.</span></p>
      </>}
      {step === 1 && <>
        <ol className="guide-instructions">
          <li><strong>Найдите обращение</strong><p>Откройте «Обращения». Фильтры по району, статусу и направлению помогут найти нужную проблему.</p></li>
          <li><strong>Разберитесь в ситуации</strong><p>Откройте карточку, прочитайте описание, адрес, комментарии жителей и историю статусов.</p></li>
          <li><strong>Обновите статус</strong><p>Выберите доступный статус и нажмите «Изменить статус». Для решения или отклонения обязательно укажите результат или причину в комментарии.</p></li>
        </ol>
        <p className="guide-tip"><Icon name="reset" size={17}/><span>Кнопка «Обновить обращения» сразу запрашивает новые сообщения жителей.</span></p>
      </>}
      {step === 2 && <>
        <div className="guide-rating-cards">
          <article><span>ПЛАН РАЗВИТИЯ</span><h4>Score сценария</h4><p>Показывает эффект выбранных инициатив по учебному датасету. Зависит от показателей районов, сроков мер и синергий.</p><small>Где смотреть: верхняя сводка, «Показатели» и результат сценария.</small></article>
          <article><span>РАБОТА С ЖИТЕЛЯМИ</span><h4>Рейтинг по обращениям</h4><p>Учитывает активные проблемы и результаты их обработки. Это рабочий индикатор района на основе обращений жителей.</p><small>Где смотреть: панель выбранного района → «Рейтинг по обращениям».</small></article>
        </div>
        <p className="guide-tip"><Icon name="help" size={17}/><span>Закрытие обращения не меняет Score сценария. Добавление инициативы в план не закрывает обращение.</span></p>
      </>}
      {step === 3 && <>
        <ol className="guide-instructions">
          <li><strong>Выберите район</strong><p>Нажмите на район на карте или его название над картой. Затем откройте «AI» в нижнем меню.</p></li>
          <li><strong>Изучите предложения</strong><p>Советы сгруппированы по темам и адресам обращений. Посмотрите число проблем, действия и связанные меры каталога.</p></li>
          <li><strong>Проверьте на месте</strong><p>Рекомендации помогают выбрать, что изучить в первую очередь. Проверьте причину проблемы, а эффект инициатив оцените в сценарии.</p></li>
        </ol>
        <p className="guide-tip"><Icon name="sparkles" size={17}/><span>Это советы по обращениям выбранного района. При отсутствии активных обращений список может быть пустым.</span></p>
      </>}
      {step === 4 && <>
        <dl className="guide-controls">
          <div><dt>Выбрать район</dt><dd>Нажмите на его контур или название — карта плавно наведётся на район.</dd></div>
          <div><dt>Переместить</dt><dd>Зажмите левую кнопку мыши и перетащите карту. На телефоне — проведите пальцем.</dd></div>
          <div><dt>Приблизить / отдалить</dt><dd>Прокрутите колёсико вверх / вниз или используйте кнопки «+» и «−».</dd></div>
          <div><dt>Повернуть</dt><dd>Зажмите правую кнопку мыши и двигайте мышь влево или вправо.</dd></div>
          <div><dt>Вернуть исходный вид</dt><dd>Кнопка «Сбросить масштаб» возвращает исходный масштаб и север наверх.</dd></div>
        </dl>
        <p className="guide-tip"><Icon name="expand" size={17}/><span>Сверните панель крестиком или клавишей Escape. Кнопка «Только карта» скрывает интерфейс, «Показать панели» возвращает его.</span></p>
      </>}
      <button type="button" className="button button-primary guide-open" onClick={() => onNavigate(topic.destination)}>{topic.action}<Icon name="arrow" size={17}/></button>
    </div>
    <footer className="guide-footer">
      <button type="button" className="button button-outline" disabled={step === 0} onClick={() => goTo(step - 1)}>Назад</button>
      <span>{step + 1} / {topics.length}</span>
      {step < topics.length - 1 ? <button type="button" className="button button-outline" onClick={() => goTo(step + 1)}>Далее<Icon name="arrow" size={15}/></button> : <button type="button" className="button button-outline" onClick={onClose}>Готово<Icon name="check" size={15}/></button>}
    </footer>
  </div>;
}
