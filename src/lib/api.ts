import type {
  ApiResponse,
  DrawCandidate,
  EventConfig,
  Participant,
  Prize,
  Snapshot,
  Winner,
} from "@/lib/types";

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  let res: Response;
  // FormData 必须让浏览器自己带 multipart boundary，不能预设 JSON Content-Type
  const isForm = init?.body instanceof FormData;
  try {
    res = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: isForm
        ? init?.headers
        : { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    return { ok: false, error: "网络异常，请检查本机与服务是否在同一个 Wi-Fi" };
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (body && typeof body.ok === "boolean") return body;
  return { ok: false, error: `请求失败（HTTP ${res.status}）` };
}

export interface JoinData {
  participant: Participant;
  /** true 表示这台设备此前已报名 */
  duplicated: boolean;
}

export interface DrawData {
  prizeId: string;
  prizeName: string;
  drawnAt: string;
  picked: DrawCandidate[];
}

export const api = {
  snapshot: (eventId: string) =>
    request<Snapshot>(`/api/snapshot?eventId=${encodeURIComponent(eventId)}`),

  join: (input: { eventId: string; name: string; phone?: string; deviceId: string }) =>
    request<JoinData>("/api/join", { method: "POST", body: JSON.stringify(input) }),

  draw: (input: { eventId: string; prizeId: string }) =>
    request<DrawData>("/api/draw", { method: "POST", body: JSON.stringify(input) }),

  saveEvent: (input: {
    id: string;
    name: string;
    subtitle: string;
    status: EventConfig["status"];
    startAt: string;
    endAt: string;
    maxParticipants: number;
    backgroundUrl: string;
    allowRepeatWin: boolean;
  }) => request<EventConfig>("/api/admin/event", { method: "PATCH", body: JSON.stringify(input) }),

  upsertPrize: (input: Partial<Prize> & { eventId: string; name: string; winnerCount: number; drawBatchSize: number; sortOrder: number; iconUrl: string }) =>
    request<Prize>("/api/admin/prizes", { method: "POST", body: JSON.stringify(input) }),

  deletePrize: (id: string) =>
    request<{ id: string }>(`/api/admin/prizes?id=${encodeURIComponent(id)}`, { method: "DELETE" }),

  addParticipant: (input: { eventId: string; name: string; phone?: string }) =>
    request<Participant>("/api/admin/participants", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteParticipant: (id: number) =>
    request<{ id: number }>(`/api/admin/participants?id=${id}`, { method: "DELETE" }),

  revokeWinner: (id: string) =>
    request<Winner>(`/api/admin/winners?id=${encodeURIComponent(id)}`, { method: "DELETE" }),

  /** 图片上传走 multipart，不能带 JSON 的 Content-Type */
  uploadImage: (file: File, kind: "background" | "icon") => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    return request<{ url: string }>("/api/admin/upload", { method: "POST", body: form });
  },

  login: (password: string) =>
    request<Record<string, never>>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  logout: () => request<Record<string, never>>("/api/admin/logout", { method: "POST" }),
};
