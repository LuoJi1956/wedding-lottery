import { describe, expect, it } from "vitest";
import {
  DISPLAY_TIME_ZONE,
  formatClock,
  formatDateTime,
  fromWallClockInput,
  toWallClockInput,
} from "@/lib/time";

describe("时间展示按固定时区换算", () => {
  it("输出的是北京墙上时间，不是服务器时区", () => {
    expect(DISPLAY_TIME_ZONE).toBe("Asia/Shanghai");
    // UTC 09:30 = 北京 17:30
    expect(formatDateTime("2026-10-01T09:30:00.000Z")).toBe("2026-10-01 17:30");
    expect(formatClock("2026-10-01T09:30:00.000Z")).toBe("17:30");
    expect(toWallClockInput("2026-10-01T09:30:00.000Z")).toBe("2026-10-01T17:30");
  });

  it("跨零点的瞬时换算到正确的日期", () => {
    expect(formatDateTime("2026-10-01T16:05:00.000Z")).toBe("2026-10-02 00:05");
    expect(formatDateTime("2026-10-01T15:55:00.000Z")).toBe("2026-10-01 23:55");
  });

  it("非法时间给占位符，不吐出 Invalid Date", () => {
    expect(formatDateTime("not-a-date")).toBe("-");
    expect(formatDateTime("")).toBe("-");
    expect(formatClock("")).toBe("-");
    expect(toWallClockInput("")).toBe("");
  });
});

describe("后台录入的起止时间", () => {
  it("输入框里的墙上时间按北京时区落成 UTC", () => {
    expect(fromWallClockInput("2026-10-01T17:30")).toBe("2026-10-01T09:30:00.000Z");
    expect(fromWallClockInput("2026-10-02T00:05")).toBe("2026-10-01T16:05:00.000Z");
  });

  it("来回转换不漂移", () => {
    for (const iso of [
      "2026-10-01T09:30:00.000Z",
      "2026-10-01T16:05:00.000Z",
      "2026-12-31T23:59:00.000Z",
      "2028-02-29T04:00:00.000Z",
    ]) {
      expect(fromWallClockInput(toWallClockInput(iso))).toBe(iso);
    }
  });

  it("非法输入返回空串，交给服务端校验拦下", () => {
    expect(fromWallClockInput("")).toBe("");
    expect(fromWallClockInput("随便写的")).toBe("");
  });
});
