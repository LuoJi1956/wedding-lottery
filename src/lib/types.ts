export type EventStatus = "draft" | "active" | "ended";

export interface EventConfig {
  id: string;
  name: string;
  subtitle: string;
  status: EventStatus;
  /** ISO 字符串，跨网络边界统一用字符串传输 */
  startAt: string;
  endAt: string;
  maxParticipants: number;
  backgroundUrl: string | null;
  allowRepeatWin: boolean;
}

export interface Prize {
  id: string;
  eventId: string;
  name: string;
  iconUrl: string | null;
  winnerCount: number;
  /** 单次抽奖揭晓的人数，不得超过 winnerCount */
  drawBatchSize: number;
  sortOrder: number;
}

export interface Participant {
  id: number;
  eventId: string;
  name: string;
  phone: string | null;
  deviceId: string;
  /** 顺序号，展示时用 formatTicketNo 包成 NO.0001 */
  ticketNo: number;
  joinedAt: string;
}

export interface Winner {
  id: string;
  eventId: string;
  prizeId: string;
  participantId: number;
  drawnAt: string;
  revokedAt: string | null;
}

export interface Snapshot {
  event: EventConfig;
  prizes: Prize[];
  participants: Participant[];
  winners: Winner[];
}

export interface JoinGate {
  allowed: boolean;
  reason: "ok" | "not_started" | "ended" | "full" | "draft";
  message: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** 全站统一的失败结构：HTTP 状态码 + 一句可直接展示的中文提示 */
export interface ApiFailure {
  ok: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface DrawCandidate {
  participantId: number;
  name: string;
  ticketNo: number;
}

export interface DrawnEntry extends DrawCandidate {
  prizeId: string;
  prizeName: string;
}
