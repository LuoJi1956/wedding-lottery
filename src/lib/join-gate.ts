import type { EventConfig, JoinGate } from "@/lib/types";
import { formatClock } from "@/lib/time";

/**
 * 报名闸门。服务端在写入前调用它做权威判断，
 * 客户端用同一份逻辑渲染「未开始 / 已结束 / 已满」页面，两边结论不会打架。
 */
export function joinGate(event: EventConfig, participantCount: number): JoinGate {
  const now = Date.now();
  if (event.status === "draft") {
    return { allowed: false, reason: "draft", message: "活动尚未创建完成，请联系工作人员" };
  }
  if (event.status === "ended" || now > new Date(event.endAt).getTime()) {
    return { allowed: false, reason: "ended", message: "本次活动已结束，感谢参与" };
  }
  if (now < new Date(event.startAt).getTime()) {
    return {
      allowed: false,
      reason: "not_started",
      message: `活动将于 ${formatClock(event.startAt)} 开始`,
    };
  }
  if (participantCount >= event.maxParticipants) {
    return { allowed: false, reason: "full", message: "参与人数已满，请联系工作人员" };
  }
  return { allowed: true, reason: "ok", message: "" };
}
