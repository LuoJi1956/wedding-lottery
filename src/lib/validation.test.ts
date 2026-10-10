import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import {
  eventSchema,
  firstIssue,
  joinSchema,
  loginSchema,
  manualParticipantSchema,
  numberIdSchema,
  prizeSchema,
} from "@/lib/validation";

/** 取 zod 的第一条中文提示，接口层就是用它回给前端的 */
function message(schema: ZodType, input: unknown): string | null {
  const res = schema.safeParse(input);
  return res.success ? null : firstIssue(res.error);
}

const validEvent = {
  id: "evt_test",
  name: "答谢宴抽奖",
  subtitle: "副标题",
  status: "active",
  startAt: "2026-10-01T10:00:00.000Z",
  endAt: "2026-10-01T20:00:00.000Z",
  maxParticipants: 100,
  backgroundUrl: "",
  allowRepeatWin: false,
};

const validPrize = {
  eventId: "evt_test",
  name: "三等奖",
  winnerCount: 10,
  drawBatchSize: 4,
  sortOrder: 3,
  iconUrl: "",
};

describe("joinSchema 来宾报名校验", () => {
  it("合法输入会被裁剪空白并补默认值", () => {
    const parsed = joinSchema.parse({
      eventId: "evt_test",
      name: "  张三  ",
      phone: " 13800001111 ",
      deviceId: "device_abc_123",
    });
    expect(parsed.name).toBe("张三");
    expect(parsed.phone).toBe("13800001111");
  });

  it("手机号选填，留空即视为未填写", () => {
    expect(joinSchema.parse({ eventId: "e", name: "李四", deviceId: "device_abc" }).phone).toBeUndefined();
    expect(message(joinSchema, { eventId: "e", name: "李四", phone: "", deviceId: "device_abc" })).toBeNull();
  });

  it.each([
    [{ name: "", deviceId: "device_abc" }, "请填写姓名"],
    [{ name: "   ", deviceId: "device_abc" }, "请填写姓名"],
    [{ name: "甲".repeat(21), deviceId: "device_abc" }, "姓名最多 20 个字符"],
    [{ name: "王五", phone: "12345678901", deviceId: "device_abc" }, "手机号格式不正确"],
    [{ name: "王五", phone: "1380000111", deviceId: "device_abc" }, "手机号格式不正确"],
    [{ name: "王五", phone: "13800001111a", deviceId: "device_abc" }, "手机号格式不正确"],
    [{ name: "王五", deviceId: "short" }, "设备标识异常，请刷新页面重试"],
  ])("拒绝 %o 并给出中文提示", (input, expected) => {
    expect(message(joinSchema, { eventId: "e", ...input })).toBe(expected);
  });

  it("缺少活动标识时拒绝", () => {
    expect(message(joinSchema, { name: "赵六", deviceId: "device_abc" })).toBe("缺少活动标识");
  });

  it("类型不对时也不会把 zod 默认英文文案丢给来宾", () => {
    const inputs = [
      { eventId: 123, name: "张三", deviceId: "device_abc" },
      { name: "张三", deviceId: "device_abc" },
      { eventId: "e", name: 42, deviceId: "device_abc" },
      { eventId: "e", name: "张三", deviceId: 7 },
      null,
      "not-an-object",
    ];
    for (const input of inputs) {
      const msg = message(joinSchema, input);
      expect(msg).not.toBeNull();
      expect(msg).not.toMatch(/^[A-Za-z]/);
    }
  });
});

describe("eventSchema 活动配置校验", () => {
  it("时间顺序颠倒时只报一条原因", () => {
    expect(
      message(eventSchema, { ...validEvent, startAt: validEvent.endAt, endAt: validEvent.startAt }),
    ).toBe("结束时间必须晚于开始时间");
  });

  it("非法时间与未选择时间分别提示", () => {
    expect(message(eventSchema, { ...validEvent, startAt: "not-a-date" })).toBe("开始时间格式不正确");
    expect(message(eventSchema, { ...validEvent, startAt: "" })).toBe("请选择开始时间");
    expect(message(eventSchema, { ...validEvent, endAt: "" })).toBe("请选择结束时间");
  });

  it("人数上限接受输入框里的字符串数字并做范围限制", () => {
    expect(eventSchema.parse({ ...validEvent, maxParticipants: "120" }).maxParticipants).toBe(120);
    expect(message(eventSchema, { ...validEvent, maxParticipants: 0 })).toContain("至少 1 人");
    expect(message(eventSchema, { ...validEvent, maxParticipants: 99999 })).toContain("最多 10000 人");
    expect(message(eventSchema, { ...validEvent, maxParticipants: 12.5 })).toBe("请填写整数");
  });

  it("状态只接受 draft/active/ended", () => {
    expect(message(eventSchema, { ...validEvent, status: "closed" })).not.toBeNull();
  });

  it("背景图允许留空、站内路径与绝对地址，拒绝畸形 URL", () => {
    for (const ok of ["", "/uploads/bg.png", "https://example.com/bg.jpg"]) {
      expect(message(eventSchema, { ...validEvent, backgroundUrl: ok })).toBeNull();
    }
    expect(message(eventSchema, { ...validEvent, backgroundUrl: "example.com" })).toContain("请填写合法图片地址");
  });

  it("活动名称必填且不超过 30 字", () => {
    expect(message(eventSchema, { ...validEvent, name: "" })).toBe("请填写活动名称");
    expect(message(eventSchema, { ...validEvent, name: "宴".repeat(31) })).toBe("活动名称最多 30 字");
  });
});

describe("prizeSchema 奖项校验", () => {
  it("单次抽奖人数不能大于总名额", () => {
    expect(message(prizeSchema, { ...validPrize, drawBatchSize: 11 })).toBe(
      "单次抽奖人数不能大于奖项名额",
    );
  });

  it("批次等于总名额时合法（一次抽完）", () => {
    expect(message(prizeSchema, { ...validPrize, drawBatchSize: 10 })).toBeNull();
  });

  it("名额与批次都至少 1 人", () => {
    expect(message(prizeSchema, { ...validPrize, winnerCount: 0 })).toContain("至少 1 名");
    expect(message(prizeSchema, { ...validPrize, drawBatchSize: 0 })).toContain("至少 1 名");
  });

  it("编辑时带上 id，新增时省略 id", () => {
    expect(prizeSchema.parse({ ...validPrize, id: "prize_3" }).id).toBe("prize_3");
    expect(prizeSchema.parse(validPrize).id).toBeUndefined();
  });
});

describe("后台口令与 id 校验", () => {
  it.each(["", "abc", "wed"])("口令 %s 太短被拒绝", (password) => {
    expect(message(loginSchema, { password })).toBe("口令至少 4 位");
  });

  it("手动添加来宾复用同一套手机号规则", () => {
    expect(message(manualParticipantSchema, { eventId: "e", name: "手动", phone: "138" })).toBe(
      "手机号格式不正确",
    );
    expect(message(manualParticipantSchema, { eventId: "e", name: "手动" })).toBeNull();
  });

  it("数字 id 与字符串 id 各自拦截非法值", () => {
    expect(message(numberIdSchema, { id: "abc" })).toBe("编号不正确");
    expect(message(numberIdSchema, { id: "0" })).toBe("编号不正确");
    expect(numberIdSchema.parse({ id: "12" }).id).toBe(12);
  });
});
