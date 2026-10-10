import type { Participant } from "@/lib/types";

const DEVICE_KEY = "wedding_lottery_device_id";
const TICKET_KEY = "wedding_lottery_ticket_v2";

/**
 * 访客身份来源。微信扫码进入普通 H5 时拿不到微信 uid（需要认证服务号网页授权），
 * 因此当前用浏览器设备指纹做防重。接入服务号后只需替换本函数返回 openid。
 */
export function readDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function saveTicket(participant: Participant) {
  localStorage.setItem(TICKET_KEY, JSON.stringify(participant));
}

export function loadTicket(eventId: string): Participant | null {
  const raw = localStorage.getItem(TICKET_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Participant;
    // 阶段 1 存的是字符串编号，形状不符就当没有票，让来宾重新填一次
    const valid =
      parsed && typeof parsed.id === "number" && typeof parsed.ticketNo === "number";
    return valid && parsed.eventId === eventId ? parsed : null;
  } catch {
    return null;
  }
}
