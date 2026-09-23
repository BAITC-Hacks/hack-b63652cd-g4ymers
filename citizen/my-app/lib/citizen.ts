export type CitizenCategory =
  | "TRANSPORT"
  | "GREEN_SPACES"
  | "SOCIAL_INFRASTRUCTURE"
  | "SAFETY"
  | "CITY_SERVICES";

export type CitizenStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "PLANNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED";

export type CitizenUrgency = "NORMAL" | "IMPORTANT" | "URGENT";

export type CitizenLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

export type CitizenComment = {
  id: string;
  displayName: string;
  text: string;
  createdAt: string;
  own?: boolean;
};

export type CitizenProblem = {
  id: string;
  title: string;
  description: string;
  category: CitizenCategory;
  status: CitizenStatus;
  district: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  confirmations: number;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  photoUrl?: string;
  comments: CitizenComment[];
  confirmedByMe?: boolean;
};

export type QrLocation = {
  code: string;
  district: string;
  objectName: string;
  objectType: string;
  streetName?: string;
  latitude: number;
  longitude: number;
  active: boolean;
  locationVerified?: boolean;
  distanceMeters?: number;
  history?: StreetHistoryEvent[];
  recentChanges?: CityChange[];
};

export type StreetHistoryEvent = {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "REPORT" | "CHANGE" | "RESOLUTION";
};

export type CityChange = {
  id: string;
  date: string;
  title: string;
  description: string;
  status: "DONE" | "IN_PROGRESS";
};

export type RewardEvent = {
  id: string;
  type: "SCAN" | "REPORT" | "CONFIRM" | "COMMENT" | "RESOLUTION";
  points: number;
  createdAt: string;
};

export type CitizenBadge = {
  id: string;
  title: string;
  description: string;
  icon: "scan" | "report" | "community" | "resolved";
  earned: boolean;
};

export type CitizenProfile = {
  displayName: string;
  district: string;
  reports: number;
  confirmedProblems: number;
  resolvedReports: number;
  points: number;
  level: string;
  streakDays?: number;
  reportsThisMonth?: number;
  badges?: CitizenBadge[];
};

export const categoryLabels: Record<CitizenCategory, string> = {
  TRANSPORT: "Транспорт",
  GREEN_SPACES: "Озеленение",
  SOCIAL_INFRASTRUCTURE: "Социальная инфраструктура",
  SAFETY: "Безопасность",
  CITY_SERVICES: "Городские сервисы",
};

export const statusLabels: Record<CitizenStatus, string> = {
  NEW: "Получено",
  UNDER_REVIEW: "На рассмотрении",
  PLANNED: "Запланировано",
  IN_PROGRESS: "В работе",
  RESOLVED: "Решено",
  REJECTED: "Отклонено",
};

export const statusTone: Record<CitizenStatus, string> = {
  NEW: "new",
  UNDER_REVIEW: "review",
  PLANNED: "planned",
  IN_PROGRESS: "progress",
  RESOLVED: "resolved",
  REJECTED: "rejected",
};

export const categoryTone: Record<CitizenCategory, string> = {
  TRANSPORT: "transport",
  GREEN_SPACES: "green",
  SOCIAL_INFRASTRUCTURE: "social",
  SAFETY: "safety",
  CITY_SERVICES: "services",
};

export const demoQrLocation: QrLocation = {
  code: "ASTANA-NURA-LIGHT-001",
  district: "Нура",
  objectName: "Уличный фонарь №142",
  objectType: "Уличное освещение",
  streetName: "ул. Сыганак",
  latitude: 51.1034,
  longitude: 71.4302,
  active: true,
  locationVerified: true,
  history: [
    { id: "history-1", date: "20 сентября 2026", title: "Жители сообщили о проблеме", description: "23 сообщения о неработающих фонарях возле остановки.", type: "REPORT" },
    { id: "history-2", date: "21 сентября 2026", title: "Заявка проверена", description: "Городская служба подтвердила неисправность на месте.", type: "CHANGE" },
    { id: "history-3", date: "22 сентября 2026", title: "Ремонт запланирован", description: "Работы по замене светильников начались.", type: "RESOLUTION" },
  ],
  recentChanges: [
    { id: "change-1", date: "22 сентября", title: "Начат ремонт освещения", description: "Подрядчик заменяет неисправные светильники на участке возле остановки.", status: "IN_PROGRESS" },
    { id: "change-2", date: "июль 2026", title: "Обновлена остановка", description: "Появились новая скамейка и табличка с расписанием автобусов.", status: "DONE" },
  ],
};

const demoProblems: CitizenProblem[] = [
  {
    id: "problem-lighting-nura",
    title: "Не работает уличное освещение",
    description: "Несколько фонарей возле остановки не работают вечером. Район становится небезопасным после заката.",
    category: "SAFETY",
    status: "IN_PROGRESS",
    district: "Нура",
    locationLabel: "ул. Сыганак, остановка «Нура»",
    latitude: 51.1034,
    longitude: 71.4302,
    confirmations: 47,
    reportCount: 23,
    createdAt: "2026-09-20T09:30:00+05:00",
    updatedAt: "2026-09-22T17:10:00+05:00",
    comments: [
      { id: "comment-1", displayName: "Айдос", text: "Сегодня вечером фонари всё ещё не работали.", createdAt: "2026-09-23T10:20:00+05:00" },
      { id: "comment-2", displayName: "Меруерт", text: "Рабочие приезжали утром, спасибо за проверку.", createdAt: "2026-09-22T14:10:00+05:00" },
    ],
  },
  {
    id: "problem-sidewalk-esil",
    title: "Повреждённый тротуар",
    description: "На тротуаре у школы просели несколько плиток. После дождя здесь трудно пройти с коляской.",
    category: "SOCIAL_INFRASTRUCTURE",
    status: "UNDER_REVIEW",
    district: "Есиль",
    locationLabel: "ул. Достык, 12",
    latitude: 51.128,
    longitude: 71.415,
    confirmations: 12,
    reportCount: 8,
    createdAt: "2026-09-18T11:00:00+05:00",
    updatedAt: "2026-09-21T09:00:00+05:00",
    comments: [{ id: "comment-3", displayName: "Сания", text: "Проблема особенно заметна у входа в школу.", createdAt: "2026-09-21T12:40:00+05:00" }],
  },
  {
    id: "problem-trash-almaty",
    title: "Мусор возле остановки",
    description: "Контейнеры переполнены, мусор разносит ветром по тротуару.",
    category: "CITY_SERVICES",
    status: "RESOLVED",
    district: "Алматы",
    locationLabel: "пр. Абылай хана, 44",
    latitude: 51.151,
    longitude: 71.39,
    confirmations: 8,
    reportCount: 5,
    createdAt: "2026-09-13T08:00:00+05:00",
    updatedAt: "2026-09-19T16:00:00+05:00",
    comments: [{ id: "comment-4", displayName: "Данияр", text: "Спасибо, контейнеры вывезли.", createdAt: "2026-09-19T17:20:00+05:00" }],
  },
  {
    id: "problem-bus-saryarka",
    title: "Остановка без навеса",
    description: "На остановке нет навеса и скамейки. В дождь людям приходится ждать на открытом месте.",
    category: "TRANSPORT",
    status: "PLANNED",
    district: "Сарыарка",
    locationLabel: "ул. Бейбитшилик, 31",
    latitude: 51.174,
    longitude: 71.425,
    confirmations: 31,
    reportCount: 17,
    createdAt: "2026-09-11T15:40:00+05:00",
    updatedAt: "2026-09-20T10:00:00+05:00",
    comments: [],
  },
  {
    id: "problem-park-baikonur",
    title: "Сухие деревья в парке",
    description: "В центральной части парка несколько деревьев высохли, ветки могут быть опасны для посетителей.",
    category: "GREEN_SPACES",
    status: "NEW",
    district: "Байконур",
    locationLabel: "Парк «Жерұйық»",
    latitude: 51.19,
    longitude: 71.36,
    confirmations: 6,
    reportCount: 3,
    createdAt: "2026-09-22T13:00:00+05:00",
    updatedAt: "2026-09-22T13:00:00+05:00",
    comments: [],
  },
  {
    id: "problem-crossing-nura",
    title: "Не работает кнопка светофора",
    description: "Пешеходная кнопка на переходе срабатывает через раз.",
    category: "SAFETY",
    status: "UNDER_REVIEW",
    district: "Нура",
    locationLabel: "ул. Керей, Жәнібек хандар",
    latitude: 51.089,
    longitude: 71.44,
    confirmations: 19,
    reportCount: 9,
    createdAt: "2026-09-17T10:15:00+05:00",
    updatedAt: "2026-09-18T12:00:00+05:00",
    comments: [],
  },
];

const cloneProblems = () => demoProblems.map((problem) => ({ ...problem, comments: problem.comments.map((comment) => ({ ...comment })) }));

const clonePublicProblems = () => cloneProblems().filter((problem) => problem.status === "RESOLVED");

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

export function getSavedCitizenLocation() {
  return readLocal<CitizenLocation | undefined>("citizen-location", undefined);
}

export function saveCitizenLocation(location: CitizenLocation) {
  writeLocal("citizen-location", location);
}

function addRewardEvent(type: RewardEvent["type"], points: number, uniqueKey?: string) {
  const events = readLocal<RewardEvent[]>("citizen-reward-events", []);
  if (uniqueKey && events.some((event) => event.id === uniqueKey)) return;
  writeLocal("citizen-reward-events", [...events, { id: uniqueKey ?? `${type}-${Date.now()}`, type, points, createdAt: new Date().toISOString() }]);
}

const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBase) throw new Error("DEMO_MODE");
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`API_${response.status}`);
  return response.json() as Promise<T>;
}

export const citizenApi = {
  async getProblems(): Promise<CitizenProblem[]> {
    try { return await request<CitizenProblem[]>("/api/public/problems?status=RESOLVED"); }
    catch (error) {
      if (error instanceof Error && error.message !== "DEMO_MODE") throw error;
      const confirmed = readLocal<string[]>("citizen-confirmed", []);
      return clonePublicProblems().map((problem) => ({ ...problem, confirmedByMe: confirmed.includes(problem.id), confirmations: problem.confirmations + (confirmed.includes(problem.id) ? 1 : 0) }));
    }
  },
  async getProblem(id: string, privateView = false) {
    if (privateView) {
      try { return await request<CitizenProblem>(`/api/citizen/my-reports/${encodeURIComponent(id)}`); }
      catch (error) {
        if (error instanceof Error && error.message !== "DEMO_MODE" && !error.message.startsWith("API_")) throw error;
        return cloneProblems().slice(0, 2).find((problem) => problem.id === id);
      }
    }
    try { return await request<CitizenProblem>(`/api/public/problems/${encodeURIComponent(id)}`); }
    catch (error) {
      if (error instanceof Error && error.message !== "DEMO_MODE" && !error.message.startsWith("API_")) throw error;
      return (await this.getProblems()).find((problem) => problem.id === id);
    }
  },
  async getMyReports(): Promise<CitizenProblem[]> {
    try { return await request<CitizenProblem[]>("/api/citizen/my-reports"); }
    catch (error) {
      if (error instanceof Error && error.message !== "DEMO_MODE") throw error;
      return cloneProblems().slice(0, 2);
    }
  },
  async getQrLocation(code: string) {
    try { return await request<QrLocation>(`/api/public/qr/${encodeURIComponent(code)}`); }
    catch (error) {
      if (error instanceof Error && error.message !== "DEMO_MODE") throw error;
      return code.toUpperCase() === demoQrLocation.code ? demoQrLocation : undefined;
    }
  },
  async getPlaceHistory(code: string, citizenLocation?: CitizenLocation) {
    const query = citizenLocation ? `?latitude=${citizenLocation.latitude}&longitude=${citizenLocation.longitude}&accuracy=${citizenLocation.accuracy}` : "";
    let location: QrLocation | undefined;
    try {
      location = await request<QrLocation>(`/api/public/qr/${encodeURIComponent(code)}${query}`);
    } catch (error) {
      if (error instanceof Error && error.message !== "DEMO_MODE") throw error;
      location = code.toUpperCase() === demoQrLocation.code ? { ...demoQrLocation, locationVerified: Boolean(citizenLocation) } : undefined;
    }
    if (!location) return undefined;
    addRewardEvent("SCAN", 1, `SCAN-${location.code}`);
    return { location, history: location.history ?? [], recentChanges: location.recentChanges ?? [] };
  },
  async confirmProblem(id: string) {
    try { return await request<CitizenProblem>(`/api/citizen/problems/${encodeURIComponent(id)}/confirm`, { method: "POST" }); }
    catch (error) {
      if (error instanceof Error && error.message !== "DEMO_MODE") throw error;
      const confirmed = readLocal<string[]>("citizen-confirmed", []);
      if (!confirmed.includes(id)) writeLocal("citizen-confirmed", [...confirmed, id]);
      addRewardEvent("CONFIRM", 2, `CONFIRM-${id}`);
      return this.getProblem(id, true);
    }
  },
  async addComment(id: string, text: string) {
    try { return await request<CitizenComment>(`/api/citizen/problems/${encodeURIComponent(id)}/comments`, { method: "POST", body: JSON.stringify({ text }) }); }
    catch (error) {
      if (error instanceof Error && error.message !== "DEMO_MODE") throw error;
      const comments = readLocal<Record<string, CitizenComment[]>>("citizen-comments", {});
      const comment = { id: `local-${Date.now()}`, displayName: "Вы", text, createdAt: new Date().toISOString(), own: true };
      writeLocal("citizen-comments", { ...comments, [id]: [...(comments[id] ?? []), comment] });
      addRewardEvent("COMMENT", 2, `COMMENT-${id}-${text.slice(0, 20)}`);
      return comment;
    }
  },
  async createReport(payload: { qrCode?: string; title: string; description: string; category: CitizenCategory; urgency: CitizenUrgency; photoUrl?: string; location?: CitizenLocation }) {
    try { return await request<{ id: string; problemId: string }>("/api/citizen/reports", { method: "POST", body: JSON.stringify(payload) }); }
    catch (error) {
      if (error instanceof Error && error.message !== "DEMO_MODE") throw error;
      const id = `report-demo-${Date.now()}`;
      writeLocal("citizen-last-report", { id, problemId: "problem-lighting-nura" });
      addRewardEvent("REPORT", 10, `REPORT-${id}`);
      return { id, problemId: "problem-lighting-nura" };
    }
  },
  async getProfile(): Promise<CitizenProfile> {
    try { return await request<CitizenProfile>("/api/citizen/profile"); }
    catch (error) {
      if (error instanceof Error && error.message !== "DEMO_MODE") throw error;
      const confirmed = readLocal<string[]>("citizen-confirmed", []);
      const events = readLocal<RewardEvent[]>("citizen-reward-events", []);
      const earned = events.reduce((sum, event) => sum + event.points, 0);
      const reports = events.filter((event) => event.type === "REPORT").length;
      return {
        displayName: "Алия С.", district: "Нура", reports: 2 + reports, confirmedProblems: confirmed.length + 8, resolvedReports: 1,
        points: 240 + earned, level: earned > 80 ? "Городской помощник" : "Активный житель", streakDays: Math.min(7, 2 + events.length), reportsThisMonth: reports,
        badges: [
          { id: "first-scan", title: "Первый скан", description: "Сканировали QR места", icon: "scan", earned: events.some((event) => event.type === "SCAN") },
          { id: "first-report", title: "Внимательный сосед", description: "Отправили сообщение", icon: "report", earned: reports > 0 },
          { id: "community", title: "Голос района", description: "Поддержали 5 проблем", icon: "community", earned: confirmed.length >= 5 },
          { id: "resolved", title: "До результата", description: "Проблема решена", icon: "resolved", earned: true },
        ],
      };
    }
  },
};

export function getMergedComments(problem: CitizenProblem): CitizenComment[] {
  const local = readLocal<Record<string, CitizenComment[]>>("citizen-comments", {});
  return [...problem.comments, ...(local[problem.id] ?? [])];
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(value));
}

export function timeAgo(value: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diff < 60) return `${diff} мин назад`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`;
  return `${Math.floor(diff / 1440)} дн назад`;
}
