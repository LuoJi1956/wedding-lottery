import { prisma } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/http";
import { toEventConfig, toParticipant, toPrize, toWinner } from "@/lib/server/serialize";
import type { Snapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 大屏、后台、来宾端共用的只读快照，客户端每 3 秒轮询一次 */
export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId")?.trim();
  if (!eventId) return fail("缺少活动标识");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return fail("活动不存在或链接已失效", 404);

  const [prizes, participants, winners] = await Promise.all([
    prisma.prize.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } }),
    prisma.participant.findMany({ where: { eventId }, orderBy: { ticketNo: "asc" } }),
    prisma.winner.findMany({ where: { eventId }, orderBy: { drawnAt: "asc" } }),
  ]);

  const data: Snapshot = {
    event: toEventConfig(event),
    prizes: prizes.map(toPrize),
    participants: participants.map(toParticipant),
    winners: winners.map(toWinner),
  };
  return ok(data);
}
