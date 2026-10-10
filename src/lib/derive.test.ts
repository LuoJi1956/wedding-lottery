import { describe, expect, it } from "vitest";
import {
  activeWinners,
  drawnCountOf,
  evaluatedWinners,
  remainingOf,
  roundSizeOf,
  sortedPrizes,
  winnerParticipantIds,
} from "@/lib/derive";
import type { EventConfig, Participant, Prize, Snapshot, Winner } from "@/lib/types";

const event: EventConfig = {
  id: "evt_test",
  name: "测试活动",
  subtitle: "",
  status: "active",
  startAt: "2026-10-01T10:00:00.000Z",
  endAt: "2026-10-01T20:00:00.000Z",
  maxParticipants: 100,
  backgroundUrl: null,
  allowRepeatWin: false,
};

const prizeThird: Prize = {
  id: "prize_3",
  eventId: event.id,
  name: "三等奖",
  iconUrl: null,
  winnerCount: 10,
  drawBatchSize: 4,
  sortOrder: 3,
};

const prizeFirst: Prize = {
  id: "prize_1",
  eventId: event.id,
  name: "一等奖",
  iconUrl: null,
  winnerCount: 1,
  drawBatchSize: 1,
  sortOrder: 1,
};

function participant(id: number): Participant {
  return {
    id,
    eventId: event.id,
    name: `来宾${id}`,
    phone: null,
    deviceId: `device_${id}`,
    ticketNo: id,
    joinedAt: "2026-10-01T09:00:00.000Z",
  };
}

function winner(id: string, participantId: number, revokedAt: string | null = null): Winner {
  return {
    id,
    eventId: event.id,
    prizeId: prizeThird.id,
    participantId,
    drawnAt: "2026-10-01T11:00:00.000Z",
    revokedAt,
  };
}

function snapshot(winners: Winner[]): Snapshot {
  return {
    event,
    prizes: [prizeThird, prizeFirst],
    participants: [participant(1), participant(2), participant(3)],
    winners,
  };
}

describe("名额与轮次推导", () => {
  it("已抽人数只算未撤销的记录", () => {
    const s = snapshot([winner("w1", 1), winner("w2", 2, "2026-10-01T12:00:00.000Z")]);
    expect(drawnCountOf(s, prizeThird.id)).toBe(1);
  });

  it("剩余名额 = 总名额 - 有效已抽", () => {
    const s = snapshot([winner("w1", 1), winner("w2", 2)]);
    expect(remainingOf(s, prizeThird)).toBe(8);
  });

  it("撤销后名额回到奖池", () => {
    const before = snapshot([winner("w1", 1), winner("w2", 2)]);
    const after = snapshot([
      winner("w1", 1),
      winner("w2", 2, "2026-10-01T12:00:00.000Z"),
    ]);
    expect(remainingOf(before, prizeThird)).toBe(8);
    expect(remainingOf(after, prizeThird)).toBe(9);
  });

  it("每轮 4 人、共 10 个名额时按 4→4→2 收尾", () => {
    const drawn: Winner[] = [];
    const rounds: number[] = [];
    for (let round = 0; round < 3; round++) {
      const s = snapshot(drawn);
      const size = roundSizeOf(s, prizeThird);
      rounds.push(size);
      for (let i = 0; i < size; i++) {
        drawn.push(winner(`w${drawn.length + 1}`, drawn.length + 1));
      }
    }
    expect(rounds).toEqual([4, 4, 2]);
    expect(remainingOf(snapshot(drawn), prizeThird)).toBe(0);
  });

  it("余数不足一批时一次抽完，不会留下抽不掉的尾数", () => {
    const drawn = Array.from({ length: 9 }, (_, i) => winner(`w${i + 1}`, i + 1));
    expect(roundSizeOf(snapshot(drawn), prizeThird)).toBe(1);
  });

  it("名额抽完后本轮人数为 0", () => {
    const drawn = Array.from({ length: 10 }, (_, i) => winner(`w${i + 1}`, i + 1));
    expect(roundSizeOf(snapshot(drawn), prizeThird)).toBe(0);
    expect(remainingOf(snapshot(drawn), prizeThird)).toBe(0);
  });

  it("剩余名额不会为负，也不受其他奖项记录影响", () => {
    const s = snapshot([winner("w1", 1)]);
    // 另一个奖项还没有任何记录，已抽人数不应跨奖项累加
    expect(remainingOf(s, { ...prizeThird, id: "prize_missing", winnerCount: 2 })).toBe(2);
    expect(remainingOf(s, { ...prizeThird, winnerCount: 0 })).toBe(0);
  });
});

describe("中奖集合推导", () => {
  it("已中奖名单只包含有效记录", () => {
    const s = snapshot([winner("w1", 1), winner("w2", 2, "2026-10-01T12:00:00.000Z")]);
    expect(Array.from(winnerParticipantIds(s))).toEqual([1]);
    expect(activeWinners(s)).toHaveLength(1);
  });

  it("撤销的来宾重新回到可参与池", () => {
    const revokedOnly = snapshot([winner("w1", 1, "2026-10-01T12:00:00.000Z")]);
    expect(winnerParticipantIds(revokedOnly).has(1)).toBe(false);
  });

  it("中奖详情带上奖项名与时间", () => {
    const s = snapshot([winner("w1", 1)]);
    expect(evaluatedWinners(s).get(1)).toEqual({
      prizeName: "三等奖",
      drawnAt: "2026-10-01T11:00:00.000Z",
    });
  });

  it("奖项按 sortOrder 排序且不改动原数组", () => {
    const s = snapshot([]);
    expect(sortedPrizes(s).map((p) => p.name)).toEqual(["一等奖", "三等奖"]);
    expect(s.prizes.map((p) => p.name)).toEqual(["三等奖", "一等奖"]);
  });
});
