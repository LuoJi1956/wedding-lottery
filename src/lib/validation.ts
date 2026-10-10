import { z } from "zod";

export const PHONE_REGEX = /^1[3-9]\d{9}$/;

/** zod 自身的默认提示是英文，字段级 error 兜住“缺失/类型不对”这类情况 */
const MISS_EVENT = "缺少活动标识";
const MISS_ID = "缺少标识";

/** 图片地址：允许留空、绝对 URL，以及站内相对路径（后台上传后为 /uploads/xxx） */
const imageUrl = z
  .string({ error: "请填写合法图片地址" })
  .trim()
  .refine(
    (v) => v === "" || v.startsWith("/") || URL.canParse(v),
    "请填写合法图片地址（http(s):// 或 /开头的站内路径）",
  );

const optionalPhone = z
  .string({ error: "手机号格式不正确" })
  .trim()
  .refine((v) => v === "" || PHONE_REGEX.test(v), "手机号格式不正确")
  .optional();

export const joinSchema = z.object({
  eventId: z.string({ error: MISS_EVENT }).min(1, MISS_EVENT),
  name: z
    .string({ error: "请填写姓名" })
    .trim()
    .min(1, "请填写姓名")
    .max(20, "姓名最多 20 个字符"),
  phone: optionalPhone,
  deviceId: z
    .string({ error: "设备标识异常，请刷新页面重试" })
    .min(8, "设备标识异常，请刷新页面重试")
    .max(64, "设备标识异常，请刷新页面重试"),
});

export type JoinInput = z.infer<typeof joinSchema>;

export const eventSchema = z
  .object({
    id: z.string({ error: MISS_EVENT }).min(1, MISS_EVENT),
    name: z.string({ error: "请填写活动名称" }).trim().min(1, "请填写活动名称").max(30, "活动名称最多 30 字"),
    subtitle: z.string({ error: "副标题格式不正确" }).trim().max(40, "副标题最多 40 字").default(""),
    status: z.enum(["draft", "active", "ended"], { error: "活动状态不正确" }),
    startAt: z.string({ error: "请选择开始时间" }).min(1, "请选择开始时间"),
    endAt: z.string({ error: "请选择结束时间" }).min(1, "请选择结束时间"),
    maxParticipants: z.coerce
      .number({ error: "请填写参与人数上限" })
      .int("请填写整数")
      .min(1, "至少 1 人")
      .max(10000, "最多 10000 人"),
    backgroundUrl: imageUrl,
    allowRepeatWin: z.boolean({ error: "允许重复中奖的开关取值不正确" }),
  })
  .superRefine((v, ctx) => {
    const start = new Date(v.startAt).getTime();
    const end = new Date(v.endAt).getTime();
    if (Number.isNaN(start)) {
      ctx.addIssue({ code: "custom", path: ["startAt"], message: "开始时间格式不正确" });
      return;
    }
    if (Number.isNaN(end)) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "结束时间格式不正确" });
      return;
    }
    if (end <= start) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "结束时间必须晚于开始时间" });
    }
  });

export const prizeSchema = z
  .object({
    eventId: z.string({ error: MISS_EVENT }).min(1, MISS_EVENT),
    /** 留空表示新增，由数据库生成 id */
    id: z.string({ error: MISS_ID }).trim().min(1).optional(),
    name: z.string({ error: "请填写奖项名称" }).trim().min(1, "请填写奖项名称").max(20, "奖项名称最多 20 字"),
    winnerCount: z.coerce
      .number({ error: "奖项名额请填写整数" })
      .int("请填写整数")
      .min(1, "至少 1 名")
      .max(500),
    drawBatchSize: z.coerce
      .number({ error: "单次抽奖人数请填写整数" })
      .int("请填写整数")
      .min(1, "至少 1 名")
      .max(500),
    sortOrder: z.coerce.number({ error: "排序值不正确" }).int("请填写整数").min(0).max(999),
    iconUrl: imageUrl,
  })
  .refine((v) => v.drawBatchSize <= v.winnerCount, {
    message: "单次抽奖人数不能大于奖项名额",
    path: ["drawBatchSize"],
  });

export const drawSchema = z.object({
  eventId: z.string({ error: MISS_EVENT }).min(1, MISS_EVENT),
  prizeId: z.string({ error: "缺少奖项标识" }).min(1, "缺少奖项标识"),
});

export const manualParticipantSchema = z.object({
  eventId: z.string({ error: MISS_EVENT }).min(1, MISS_EVENT),
  name: z.string({ error: "请填写姓名" }).trim().min(1, "请填写姓名").max(20, "姓名最多 20 个字符"),
  phone: optionalPhone,
});

export const loginSchema = z.object({
  password: z.string({ error: "请输入后台口令" }).min(4, "口令至少 4 位").max(64, "口令过长"),
});

export const stringIdSchema = z.object({
  id: z.string({ error: MISS_ID }).min(1, MISS_ID),
});

export const numberIdSchema = z.object({
  id: z.coerce.number({ error: "编号不正确" }).int("编号不正确").min(1, "编号不正确"),
});

const FALLBACK = "提交的内容有不合法项，请检查后重试";

/**
 * 接口与表单都只回显第一条提示。
 * zod 偶尔仍会产出英文默认文案（例如未知字段、嵌套 schema），这里统一兜底成中文，
 * 保证来宾端不会看到 “Invalid input: expected string…” 这类信息。
 */
export function firstIssue(error: z.ZodError): string {
  const message = error.issues[0]?.message?.trim() ?? "";
  if (!message) return FALLBACK;
  return /^[A-Za-z]/.test(message) ? FALLBACK : message;
}
