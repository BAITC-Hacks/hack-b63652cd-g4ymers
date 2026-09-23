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

export type CitizenUser = { id: string; email: string | null; displayName: string; districtId: string; role: "CITIZEN" };
export type CitizenCatalog = { districts: { id: string; name: string }[] };
export class CitizenApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function citizenRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/backend/${path}`, { ...init, credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch { throw new CitizenApiError(0, "Нет связи с сервером. Попробуйте ещё раз."); }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "auth/me" && !path.startsWith("auth/citizen/")) window.dispatchEvent(new Event("citizen-session-expired"));
    throw new CitizenApiError(response.status, problem.detail ?? "Не удалось выполнить запрос");
  }
  return response.status === 204 ? undefined as T : response.json();
}
export function getSavedCitizenLocation(): CitizenLocation | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem("citizen-location") ?? "null") as CitizenLocation | null;
    if (!saved || !Number.isFinite(saved.latitude) || !Number.isFinite(saved.longitude) ||
      !Number.isFinite(Date.parse(saved.capturedAt)) || Date.now() - Date.parse(saved.capturedAt) > 300000) return undefined;
    return saved;
  } catch { return undefined; }
}
export function saveCitizenLocation(location: CitizenLocation) {
  try { window.sessionStorage.setItem("citizen-location", JSON.stringify(location)); } catch { /* Location remains in memory. */ }
}
export function locationDistance(a: CitizenLocation, b: QrLocation) {
  const radians = Math.PI / 180;
  const value = Math.sin((b.latitude-a.latitude)*radians/2)**2 +
    Math.cos(a.latitude*radians)*Math.cos(b.latitude*radians)*Math.sin((b.longitude-a.longitude)*radians/2)**2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, value)));
}
async function allPages(path: string): Promise<CitizenProblem[]> {
  const result: CitizenProblem[] = [];
  for (let page = 0; ; page++) {
    const rows = await citizenRequest<CitizenProblem[]>(`${path}?size=50&page=${page}`);
    result.push(...rows);
    if (rows.length < 50) return result;
  }
}
export const citizenApi = {
  getProblems: () => allPages("public/problems"),
  getMyReports: () => allPages("citizen/my-reports"),
  getProblem: (id: string, privateView = false) => citizenRequest<CitizenProblem>(
    `${privateView ? "citizen/my-reports" : "public/problems"}/${encodeURIComponent(id)}`),
  getQrLocation: (code: string) => citizenRequest<QrLocation>(`public/qr/${encodeURIComponent(code)}`),
  async getPlaceHistory(code: string, coordinates?: CitizenLocation) {
    const location = await this.getQrLocation(code);
    const distance = coordinates ? locationDistance(coordinates, location) : undefined;
    return { location: { ...location, distanceMeters: distance,
      locationVerified: Boolean(coordinates && coordinates.accuracy <= 150 && distance !== undefined && distance <= 250) },
      history: location.history ?? [], recentChanges: location.recentChanges ?? [] };
  },
  confirmProblem: (id: string) => citizenRequest<CitizenProblem>(`citizen/problems/${encodeURIComponent(id)}/confirm`, { method: "POST" }),
  addComment: (id: string, text: string) => citizenRequest<CitizenComment>(`citizen/problems/${encodeURIComponent(id)}/comments`,
    { method: "POST", body: JSON.stringify({ text }) }),
  createReport: (payload: { qrCode: string; title: string; description: string; category: CitizenCategory; urgency: CitizenUrgency; location?: CitizenLocation }) =>
    citizenRequest<{ id: string; problemId: string }>("citizen/reports", { method: "POST", body: JSON.stringify(payload) }),
  getProfile: () => citizenRequest<CitizenProfile>("citizen/profile"),
};
export function getMergedComments(problem: CitizenProblem): CitizenComment[] { return problem.comments; }
export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}
export function timeAgo(value: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diff < 60) return `${diff} мин назад`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`;
  return `${Math.floor(diff / 1440)} дн назад`;
}
