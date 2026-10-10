import { randomInt } from "node:crypto";
import { requireAdmin } from "@/lib/server/admin-auth";
import { prisma } from "@/lib/server/db";
import { drawWinners, NotEnoughCandidatesError } from "@/lib/lottery";
import { fail, ok, parseBody } from "@/lib/server/http";
import type { DrawCandidate } from "@/lib/types";
import { drawSchema } from "@/lib/validation";

/** 事务内发现业务不允许开奖时抛出，统一在路由出口转成失败响应 */
class DrawRejected extends Error {
  constructor(
    message: string,
    readonly status = 409,
  ) {
    super(message);
    this.name = "DrawRejected";
  }
}

interface DrawResponse {
  prizeId: string;
  prizeName: string;
  drawnAt: string;
  picked: DrawCandidate[];
}

export async function POST(request: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(request, drawSchema);
  if ("response" in parsed) return parsed.response;
  const { eventId, prizeId } = parsed.data;

  try {
    const result = await prisma.$transaction<DrawResponse>(async (tx) => {
      const [event, prize] = await Promise.all([
        tx.event.findUnique({ where: { id: eventId } }),
        tx.prize.findFirst({ where: { id: prizeId, eventId } }),
      ]);
      if (!event) throw new DrawRejected("活动不存在或已被删除", 404);
      if (!prize) throw new DrawRejected("奖项不存在", 404);

      const drawn = await tx.winner.count({ where: { prizeId, revokedAt: null } });
      const remaining = prize.winnerCount - drawn;
      if (remaining <= 0) throw new DrawRejected(`「${prize.name}」名额已抽完`);

      // 单次抽取人数由奖项配置决定，余数不足一批时一次抽完
      const count = Math.min(prize.drawBatchSize, remaining);

      const [participants, winners] = await Promise.all([
        tx.participant.findMany({
          where: { eventId },
          select: { id: true, name: true, ticketNo: true },
          orderBy: { ticketNo: "asc" },
        }),
        tx.winner.findMany({
          where: { eventId, revokedAt: null },
          select: { participantId: true },
        }),
      ]);

      const picked = drawWinners({
        candidates: participants.map((p) => ({
          participantId: p.id,
          name: p.name,
          ticketNo: p.ticketNo,
        })),
        alreadyWonIds: new Set(winners.map((w) => w.participantId)),
        count,
        allowRepeatWin: event.allowRepeatWin,
        randomInt,
      });

      const drawnAt = new Date();
      await tx.winner.createMany({
        data: picked.map((c) => ({
          eventId,
          prizeId,
          participantId: c.participantId,
          drawnAt,
        })),
      });

      return { prizeId, prizeName: prize.name, drawnAt: drawnAt.toISOString(), picked };
    });

    return ok(result);
  } catch (err) {
    if (err instanceof DrawRejected) return fail(err.message, err.status);
    if (err instanceof NotEnoughCandidatesError) return fail(err.message, 409);
    throw err;
  }
}
