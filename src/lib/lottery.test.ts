import { describe, expect, it } from "vitest";
import {
  NotEnoughCandidatesError,
  drawWinners,
  type RandomInt,
} from "@/lib/lottery";
import type { DrawCandidate } from "@/lib/types";

function candidates(n: number): DrawCandidate[] {
  return Array.from({ length: n }, (_, i) => ({
    participantId: i + 1,
    name: `来宾${i + 1}`,
    ticketNo: i + 1,
  }));
}

/** 恒定返回 0 的随机源：每次交换都落在 i 本身，结果就是原顺序 */
const zeroRandom: RandomInt = () => 0;

/** mulberry32：可复现且低位不劣化，用来做分布抽查，避免测试随机抖动 */
function seededRandom(seed: number): RandomInt {
  let a = seed >>> 0;
  return (maxExclusive) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * maxExclusive);
  };
}

describe("drawWinners 抽取规则", () => {
  it("随机源确定时结果可复现", () => {
    const picked = drawWinners({
      candidates: candidates(5),
      alreadyWonIds: new Set(),
      count: 3,
      allowRepeatWin: false,
      randomInt: zeroRandom,
    });
    expect(picked.map((c) => c.participantId)).toEqual([1, 2, 3]);
  });

  it("同一轮内不会出现重复的中奖者", () => {
    const picked = drawWinners({
      candidates: candidates(30),
      alreadyWonIds: new Set(),
      count: 10,
      allowRepeatWin: false,
      randomInt: seededRandom(7),
    });
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((c) => c.participantId)).size).toBe(10);
  });

  it("名额等于全部候选人时全部抽出", () => {
    const picked = drawWinners({
      candidates: candidates(4),
      alreadyWonIds: new Set(),
      count: 4,
      allowRepeatWin: false,
      randomInt: seededRandom(11),
    });
    expect(picked.map((c) => c.participantId).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it("抽取结果在长跑中覆盖所有候选人（均匀性粗检）", () => {
    const randomInt = seededRandom(20261009);
    const hits = new Map<number, number>();
    for (let round = 0; round < 3000; round++) {
      const [winner] = drawWinners({
        candidates: candidates(6),
        alreadyWonIds: new Set(),
        count: 1,
        allowRepeatWin: false,
        randomInt,
      });
      hits.set(winner.participantId, (hits.get(winner.participantId) ?? 0) + 1);
    }
    expect(hits.size).toBe(6);
    // 期望每人约 500 次，放宽到 [150, 850] 只用于捕捉“某人永远抽不到”这类缺陷
    hits.forEach((count) => {
      expect(count).toBeGreaterThan(150);
      expect(count).toBeLessThan(850);
    });
  });
});

describe("drawWinners 不可重复中奖", () => {
  it("allowRepeatWin 为 false 时已中奖者被排除", () => {
    const picked = drawWinners({
      candidates: candidates(5),
      alreadyWonIds: new Set([1, 2, 3]),
      count: 2,
      allowRepeatWin: false,
      randomInt: zeroRandom,
    });
    expect(picked.map((c) => c.participantId)).toEqual([4, 5]);
  });

  it("allowRepeatWin 为 true 时已中奖者仍在奖池", () => {
    const picked = drawWinners({
      candidates: candidates(5),
      alreadyWonIds: new Set([1, 2, 3]),
      count: 3,
      allowRepeatWin: true,
      randomInt: zeroRandom,
    });
    expect(picked.map((c) => c.participantId)).toEqual([1, 2, 3]);
  });

  it("排除后人数不足则明确报错，而不是少抽", () => {
    expect(() =>
      drawWinners({
        candidates: candidates(5),
        alreadyWonIds: new Set([1, 2, 3, 4]),
        count: 3,
        allowRepeatWin: false,
        randomInt: zeroRandom,
      }),
    ).toThrow(NotEnoughCandidatesError);

    try {
      drawWinners({
        candidates: candidates(5),
        alreadyWonIds: new Set([1, 2, 3, 4]),
        count: 3,
        allowRepeatWin: false,
        randomInt: zeroRandom,
      });
      expect.unreachable("应当抛出异常");
    } catch (err) {
      expect((err as Error).message).toBe("可参与人数不足：需要 3 人，当前仅剩 1 人");
    }
  });
});

describe("drawWinners 入参防御", () => {
  it.each([0, -1, 1.5, Number.NaN])("抽取人数 %s 非法时拒绝", (count) => {
    expect(() =>
      drawWinners({
        candidates: candidates(5),
        alreadyWonIds: new Set(),
        count,
        allowRepeatWin: false,
        randomInt: zeroRandom,
      }),
    ).toThrow(RangeError);
  });

  it("不修改传入的候选数组", () => {
    const list = candidates(5);
    const snapshot = [...list];
    drawWinners({
      candidates: list,
      alreadyWonIds: new Set(),
      count: 3,
      allowRepeatWin: false,
      randomInt: seededRandom(3),
    });
    expect(list).toEqual(snapshot);
  });
});
