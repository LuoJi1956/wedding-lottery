import type { Prize, Snapshot, Winner } from "@/lib/types";

export function activeWinners(snapshot: Snapshot): Winner[] {
  return snapshot.winners.filter((w) => !w.revokedAt);
}

/** 已中奖者（含被撤销后仍保留历史的记录只取有效部分），用于「不允许重复中奖」 */
export function winnerParticipantIds(snapshot: Snapshot): Set<number> {
  return new Set(activeWinners(snapshot).map((w) => w.participantId));
}

export function evaluatedWinners(
  snapshot: Snapshot,
): Map<number, { prizeName: string; drawnAt: string }> {
  const map = new Map<number, { prizeName: string; drawnAt: string }>();
  for (const w of activeWinners(snapshot)) {
    const prize = snapshot.prizes.find((p) => p.id === w.prizeId);
    map.set(w.participantId, {
      prizeName: prize?.name ?? "未知奖项",
      drawnAt: w.drawnAt,
    });
  }
  return map;
}

export function drawnCountOf(snapshot: Snapshot, prizeId: string): number {
  return snapshot.winners.filter((w) => w.prizeId === prizeId && !w.revokedAt).length;
}

export function remainingOf(snapshot: Snapshot, prize: Prize): number {
  return Math.max(prize.winnerCount - drawnCountOf(snapshot, prize.id), 0);
}

/** 本轮实际揭晓人数：单次抽奖人数与剩余名额取小，余数不足一批时一次抽完 */
export function roundSizeOf(snapshot: Snapshot, prize: Prize): number {
  return Math.min(prize.drawBatchSize, remainingOf(snapshot, prize));
}

export function sortedPrizes(snapshot: Snapshot): Prize[] {
  return [...snapshot.prizes].sort((a, b) => a.sortOrder - b.sortOrder);
}
