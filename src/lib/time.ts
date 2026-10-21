/**
 * 全站时间口径。
 *
 * 服务可能跑在 UTC 的云上（Netlify/Vercel 的函数默认就是 UTC），而活动是中国的婚礼，
 * 所以所有展示与录入都显式按这一个时区换算，不依赖服务器本地时区。
 */
export const DISPLAY_TIME_ZONE = "Asia/Shanghai";

const wallClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** 把瞬时拆成该时区的年月日时分，取不到就返回 null 让调用方走占位符 */
function partsOf(instant: number) {
  const parts = wallClock.formatToParts(new Date(instant));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  const hour = pick("hour");
  const minute = pick("minute");
  if (!year || !month || !day || !hour || !minute) return null;
  return { year, month, day, hour, minute };
}

/** ISO 串 →「2026-10-21 15:40」 */
export function formatDateTime(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "-";
  const p = partsOf(time);
  return p ? `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}` : "-";
}

/** ISO 串 →「15:40」，用于只关心钟点的提示 */
export function formatClock(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "-";
  const p = partsOf(time);
  return p ? `${p.hour}:${p.minute}` : "-";
}

/**
 * ISO 串 → datetime-local 输入框要的「2026-10-21T15:40」。
 * 输出的是该时区的墙上时间，与服务器时区无关。
 */
export function toWallClockInput(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const p = partsOf(time);
  return p ? `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` : "";
}

/**
 * 「2026-10-21T15:40」→ 按 DISPLAY_TIME_ZONE 理解的那个瞬时（UTC ISO 串）。
 *
 * 不能直接 new Date(串)：那样是「按当前时区」解释，服务端与浏览器时区不同时结果就差几小时。
 * 这里先把它当 UTC 猜一次，再用「换算回墙上时间」的差值校正，固定时区下两次即收敛。
 */
export function fromWallClockInput(value: string): string {
  const naive = value.length === 16 ? `${value}:00` : value.slice(0, 19);
  const want = Date.parse(`${naive}Z`);
  if (Number.isNaN(want)) return "";

  let guess = want;
  for (let i = 0; i < 3; i += 1) {
    const back = Date.parse(`${toWallClockInput(new Date(guess).toISOString())}:00Z`);
    const delta = want - back;
    guess += delta;
    if (delta === 0) break;
  }
  return new Date(guess).toISOString();
}
