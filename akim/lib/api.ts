import type { Category, Measure, Metric, Selection } from "./simulation";

export type User = { id: string; email: string; displayName: string; role: "AKIM" | "CITIZEN" };
export type District = { id: string; name: string; population: number; values: number[]; note: string };
export type Catalog = { districts: District[]; measures: Measure[]; metrics: { code: Metric; name: string; weight: number }[] };
export type Result = { districts: (Omit<District, "note"> & { score: number })[]; average: number; minimum: number; critical: number; score: number; spent: number; remaining: number; explanations: string[] };
export type Scenario = { id: string; name: string; selections: Selection[]; result: Result; budget: number; status: "DRAFT" | "FINAL"; version: number; createdAt: string; updatedAt: string };
export type Status = "NEW" | "UNDER_REVIEW" | "PLANNED" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
export type Problem = { id: string; title: string; description: string; district: string; districtId: string; locationLabel: string; status: Status; category: string; urgency: string; confirmations: number; version: number; createdAt: string; comments: { id: string; displayName: string; text: string }[] };
export type DistrictInsights = {
  districtId: string; districtName: string;
  rating: { baseline: number; score: number; activePenalty: number; resolutionBonus: number; active: number; resolved: number; rejected: number };
  recommendations: { topic: string; address: string; latitude: number; longitude: number; activeReports: number; residents: number; confidence: number; actions: string[]; measureIds: string[] }[];
  modelVersion: string; trainingSamples: number; trainingSource: string; ratingMethod: string; generatedAt: string;
};
export const statusLabels: Record<Status, string> = { NEW: "Получено", UNDER_REVIEW: "На рассмотрении", PLANNED: "Запланировано", IN_PROGRESS: "В работе", RESOLVED: "Решено", REJECTED: "Отклонено" };
export const transitions: Record<Status, Status[]> = { NEW: ["UNDER_REVIEW", "REJECTED"], UNDER_REVIEW: ["PLANNED", "IN_PROGRESS", "REJECTED"], PLANNED: ["IN_PROGRESS", "REJECTED"], IN_PROGRESS: ["RESOLVED", "REJECTED"], RESOLVED: [], REJECTED: [] };
export const categoryLabels: Record<string, string> = { TRANSPORT: "Транспорт", GREEN_SPACES: "Озеленение", SOCIAL_INFRASTRUCTURE: "Соцсфера", SAFETY: "Безопасность", CITY_SERVICES: "Городские сервисы" };
export const categoryIds: Record<Category, string> = { transport: "TRANSPORT", ecology: "GREEN_SPACES", social: "SOCIAL_INFRASTRUCTURE", safety: "SAFETY", services: "CITY_SERVICES" };
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api/backend/${path}`, { method, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
  catch { throw new ApiError(0, "Не удалось связаться с сервером. Повторите попытку."); }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "auth/login") window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(response.status, problem.detail ?? "Не удалось выполнить запрос");
  }
  return response.status === 204 ? undefined as T : response.json();
}
export function selectionsOf(scenario: Scenario): Selection[] { return scenario.selections.map(s => ({ id: s.id, ...(s.district ? { district: s.district } : {}) })); }
export function message(error: unknown) { return error instanceof Error ? error.message : "Не удалось выполнить запрос"; }
