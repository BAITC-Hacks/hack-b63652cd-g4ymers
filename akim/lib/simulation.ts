export type Category = "transport" | "ecology" | "social" | "safety" | "services";
export type Metric = "T1" | "T2" | "E1" | "E2" | "S1" | "S2" | "B1" | "B2" | "C1" | "C2";
export type Selection = {
    id: string;
    district?: string;
};
export type Measure = {
    id: string;
    name: string;
    description: string;
    category: Category;
    cost: number;
    lag: number;
    city: boolean;
    effects: Partial<Record<Metric, number>>;
};
export const categories: {
    id: Category;
    name: string;
    short: string;
    metrics: Metric[];
}[] = [
    { id: "transport", name: "Транспорт", short: "Транспорт", metrics: ["T1", "T2"] },
    { id: "ecology", name: "Озеленение и экология", short: "Экология", metrics: ["E1", "E2"] },
    { id: "social", name: "Социальная инфраструктура", short: "Соцсфера", metrics: ["S1", "S2"] },
    { id: "safety", name: "Безопасность", short: "Безопасность", metrics: ["B1", "B2"] },
    { id: "services", name: "Городские сервисы", short: "Сервисы", metrics: ["C1", "C2"] },
];
export const metricNames: Record<Metric, string> = {
    T1: "Разгрузка дорог", T2: "Общественный транспорт", E1: "Озеленение", E2: "Качество воздуха",
    S1: "Школы и детсады", S2: "Поликлиники", B1: "Безопасность улиц", B2: "Безопасность на дорогах",
    C1: "Надёжность ЖКХ", C2: "Обращения жителей",
};
const keys = Object.keys(metricNames) as Metric[];
const weights = [0.10, 0.10, 0.09, 0.11, 0.11, 0.11, 0.09, 0.09, 0.10, 0.10];
export const districts = [
    { id: "esil", name: "Есиль", population: 0.27, values: [45, 62, 68, 72, 48, 55, 78, 60, 75, 70], note: "Развитый район. Приоритеты — транспорт и доступность школ." },
    { id: "almaty", name: "Алматы", population: 0.24, values: [40, 75, 50, 55, 60, 65, 62, 52, 50, 60], note: "Высокая транспортная нагрузка и потребность в обновлении ЖКХ." },
    { id: "saryarka", name: "Сарыарка", population: 0.20, values: [50, 70, 42, 40, 62, 68, 58, 55, 45, 55], note: "Приоритеты — качество воздуха, озеленение и надёжность сетей." },
    { id: "baikonur", name: "Байконур", population: 0.13, values: [52, 68, 55, 50, 58, 60, 52, 58, 55, 58], note: "Сбалансированный район с возможностями для роста во всех сферах." },
    { id: "nura", name: "Нура", population: 0.16, values: [55, 40, 45, 65, 38, 35, 55, 50, 60, 50], note: "На старте два критических показателя: школы и поликлиники." },
];
export const measures: Measure[] = [
    { id: "M1", name: "Выделенные автобусные полосы", description: "Больше места для общественного транспорта", category: "transport", cost: 18, lag: 2, city: false, effects: { T1: 6, T2: 9 } },
    { id: "M2", name: "Умные светофоры", description: "Адаптивное управление городским трафиком", category: "transport", cost: 22, lag: 2, city: true, effects: { T1: 4, B2: 3 } },
    { id: "M3", name: "Новая линия ЛРТ", description: "Развитие сети лёгкого рельсового транспорта", category: "transport", cost: 30, lag: 4, city: false, effects: { T1: 16, T2: 20, E2: 4 } },
    { id: "M4", name: "Парк и сквер", description: "Зелёное пространство рядом с домом", category: "ecology", cost: 15, lag: 2, city: false, effects: { E1: 12, E2: 3, B1: 2 } },
    { id: "M5", name: "Чистое топливо", description: "Перевод частного сектора на чистое отопление", category: "ecology", cost: 25, lag: 3, city: false, effects: { E2: 14, C1: 4 } },
    { id: "M6", name: "Городское озеленение", description: "Озеленение и ветрозащитные полосы", category: "ecology", cost: 20, lag: 4, city: true, effects: { E1: 5, E2: 3 } },
    { id: "M7", name: "Школа и детский сад", description: "Новые места для самых маленьких жителей", category: "social", cost: 24, lag: 3, city: false, effects: { S1: 16 } },
    { id: "M8", name: "Семейная поликлиника", description: "Первичная медицинская помощь в районе", category: "social", cost: 20, lag: 3, city: false, effects: { S2: 14 } },
    { id: "M9", name: "Дворовые спорт-хабы", description: "Доступный спорт и активные дворы", category: "social", cost: 10, lag: 1, city: false, effects: { S1: 3, S2: 3, B1: 3 } },
    { id: "M10", name: "Освещение и камеры", description: "Освещённые улицы и расширение Safe City", category: "safety", cost: 12, lag: 1, city: false, effects: { B1: 12, B2: 2 } },
    { id: "M11", name: "Безопасные переходы", description: "Защищённые пешеходные и школьные зоны", category: "safety", cost: 10, lag: 1, city: false, effects: { B2: 12, T1: -2 } },
    { id: "M12", name: "Цифровые обращения", description: "Единая платформа обратной связи с жителями", category: "services", cost: 14, lag: 1, city: true, effects: { C2: 5 } },
    { id: "M13", name: "Модернизация сетей", description: "Обновление тепло- и водоснабжения", category: "services", cost: 28, lag: 4, city: false, effects: { C1: 18, E2: 2 } },
    { id: "M14", name: "Аварийные бригады ЖКХ", description: "Быстрое реагирование и раннее оповещение", category: "services", cost: 16, lag: 1, city: true, effects: { C1: 5, C2: 2 } },
];
export const examplePlan: Selection[] = [
    { id: "M7", district: "nura" }, { id: "M8", district: "nura" }, { id: "M10", district: "nura" },
    { id: "M12" }, { id: "M5", district: "saryarka" },
];
export function costOf(plan: Selection[], availableMeasures = measures) {
    return plan.reduce((sum, choice) => sum + (availableMeasures.find(m => m.id === choice.id)?.cost ?? 0), 0);
}
export function validatePlan(plan: Selection[], requireComplete = true, catalog = { districts, measures }): string | null {
    const { districts, measures } = catalog;
    if (plan.length > 5 || (requireComplete && plan.length !== 5))
        return "Выберите ровно 5 мероприятий.";
    if (new Set(plan.map(s => s.id)).size !== plan.length)
        return "Мероприятия не должны повторяться.";
    const counts: Partial<Record<Category, number>> = {};
    for (const choice of plan) {
        const measure = measures.find(m => m.id === choice.id);
        if (!measure)
            return "Неизвестное мероприятие.";
        if (measure.city ? choice.district !== undefined : !districts.some(d => d.id === choice.district))
            return "Укажите корректный район мероприятия.";
        counts[measure.category] = (counts[measure.category] ?? 0) + 1;
        if (counts[measure.category]! > 2)
            return "Можно выбрать максимум 2 меры одного направления.";
    }
    if (costOf(plan, measures) > 100)
        return "Недостаточно бюджета. Удалите или замените мероприятие.";
    const find = (id: string) => plan.find(s => s.id === id);
    if (find("M1") && find("M3"))
        return "Автобусные полосы и ЛРТ нельзя выбрать одновременно.";
    if (find("M4") && find("M7") && find("M4")!.district === find("M7")!.district)
        return "Парк и школа в одном районе конфликтуют за участок.";
    if (find("M5") && find("M13") && find("M5")!.district === find("M13")!.district)
        return "Чистое топливо и модернизация сетей в одном районе несовместимы.";
    return null;
}
export function simulate(plan: Selection[]) {
    const error = validatePlan(plan, false);
    if (error)
        throw new Error(error);
    const values = districts.map(d => [...d.values]);
    for (const choice of plan) {
        const measure = measures.find(m => m.id === choice.id)!;
        districts.forEach((district, i) => {
            if (!measure.city && district.id !== choice.district)
                return;
            for (const [key, effect] of Object.entries(measure.effects))
                values[i][keys.indexOf(key as Metric)] += effect * (8 - measure.lag) / 8;
        });
    }
    for (const [a, b, metric] of [["M1", "M2", "T1"], ["M10", "M12", "B1"], ["M5", "M6", "E2"]]) {
        const first = plan.find(s => s.id === a);
        if (first && plan.some(s => s.id === b))
            values[districts.findIndex(d => d.id === first.district)][keys.indexOf(metric as Metric)] += 2;
    }
    const results = districts.map((district, i) => {
        const metrics = values[i].map(value => Math.max(0, Math.min(100, value)));
        return { ...district, values: metrics, score: metrics.reduce((sum, value, k) => sum + value * weights[k], 0) };
    });
    const average = results.reduce((sum, d) => sum + d.score * d.population, 0);
    const minimum = Math.min(...results.map(d => d.score));
    const critical = results.reduce((sum, d) => sum + d.values.filter(value => value < 40).length, 0);
    return { districts: results, average, minimum, critical, score: 0.7 * average + 0.3 * minimum - critical };
}
export const baseline = simulate([]);
export const formatScore = (value: number) => value.toFixed(2);
export const formatDelta = (value: number, digits = 2) => `${value < 0 ? "−" : "+"}${Math.abs(value).toFixed(digits)}`;
