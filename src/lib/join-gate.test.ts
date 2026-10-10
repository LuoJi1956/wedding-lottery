import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { joinGate } from "@/lib/join-gate";
import type { EventConfig } from "@/lib/types";

const NOW = "2026-10-01T12:00:00.000Z";

function event(overrides: Partial<EventConfig> = {}): EventConfig {
  return {
    id: "evt_test",
    name: "测试活动",
    subtitle: "",
    status: "active",
    startAt: "2026-10-01T10:00:00.000Z",
    endAt: "2026-10-01T20:00:00.000Z",
    maxParticipants: 100,
    backgroundUrl: null,
    allowRepeatWin: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("joinGate 报名闸门", () => {
  it("活动进行中且未满时放行", () => {
    expect(joinGate(event(), 30)).toEqual({ allowed: true, reason: "ok", message: "" });
  });

  it("草稿状态一律拒绝，避免误开放", () => {
    const gate = joinGate(event({ status: "draft" }), 0);
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("draft");
  });

  it("未到开始时间时提示具体时刻", () => {
    const gate = joinGate(event({ startAt: "2026-10-01T13:00:00.000Z" }), 0);
    expect(gate.reason).toBe("not_started");
    expect(gate.message).toContain("活动将于");
  });

  it("状态仍是 active 但已过结束时间也判为已结束", () => {
    const gate = joinGate(event({ endAt: "2026-10-01T11:00:00.000Z" }), 10);
    expect(gate.reason).toBe("ended");
    expect(gate.message).toBe("本次活动已结束，感谢参与");
  });

  it("显式 ended 优先于时间判断", () => {
    expect(joinGate(event({ status: "ended" }), 0).reason).toBe("ended");
  });

  it("人数达到上限时拒绝，恰好满员即不可再参与", () => {
    expect(joinGate(event({ maxParticipants: 100 }), 99).allowed).toBe(true);
    expect(joinGate(event({ maxParticipants: 100 }), 100).reason).toBe("full");
  });

  it("边界时刻：开始瞬间可参与，结束瞬间不可", () => {
    expect(joinGate(event({ startAt: NOW }), 0).allowed).toBe(true);
    expect(joinGate(event({ endAt: NOW }), 0).allowed).toBe(true);
    expect(joinGate(event({ endAt: "2026-10-01T11:59:59.999Z" }), 0).reason).toBe("ended");
  });
});
