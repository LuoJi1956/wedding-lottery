import type { DrawCandidate } from "./types";

export type RandomInt = (maxExclusive: number) => number;

export class NotEnoughCandidatesError extends Error {
  constructor(
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(`可参与人数不足：需要 ${requested} 人，当前仅剩 ${available} 人`);
    this.name = "NotEnoughCandidatesError";
  }
}

export interface DrawInput {
  /** 尚未过滤的全量候选人 */
  candidates: DrawCandidate[];
  /** 已中奖者 participantId，allowRepeatWin 为 false 时会被排除 */
  alreadyWonIds: Set<number>;
  count: number;
  allowRepeatWin: boolean;
  randomInt: RandomInt;
}

/**
 * 部分 Fisher-Yates 洗牌：只洗出前 count 个，避免整体排序开销。
 * 纯函数，随机源由调用方注入（服务端用 crypto.randomInt，便于单测）。
 */
export function drawWinners({
  candidates,
  alreadyWonIds,
  count,
  allowRepeatWin,
  randomInt,
}: DrawInput): DrawCandidate[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError(`抽取人数非法：${count}`);
  }

  const pool = allowRepeatWin
    ? [...candidates]
    : candidates.filter((c) => !alreadyWonIds.has(c.participantId));

  if (pool.length < count) {
    throw new NotEnoughCandidatesError(count, pool.length);
  }

  const picked: DrawCandidate[] = [];
  for (let i = 0; i < count; i++) {
    const j = i + randomInt(pool.length - i);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
    picked.push(pool[i]);
  }
  return picked;
}
