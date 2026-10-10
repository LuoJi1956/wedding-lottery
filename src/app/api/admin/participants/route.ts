import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/server/admin-auth";
import { prisma } from "@/lib/server/db";
import { fail, ok, parseBody, parseQuery } from "@/lib/server/http";
import { toParticipant } from "@/lib/server/serialize";
import { nextTicketNo } from "@/lib/server/ticket";
import { manualParticipantSchema, numberIdSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(request, manualParticipantSchema);
  if ("response" in parsed) return parsed.response;
  const { eventId, name } = parsed.data;
  const phone = parsed.data.phone?.trim() || null;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return fail("活动不存在或已被删除", 404);

  const joined = await prisma.participant.count({ where: { eventId } });
  if (joined >= event.maxParticipants) return fail("已达参与人数上限", 409);

  if (phone) {
    const taken = await prisma.participant.findFirst({ where: { eventId, phone } });
    if (taken) return fail("该手机号已在名单中", 409);
  }

  try {
    const created = await prisma.$transaction(async (tx) =>
      tx.participant.create({
        data: {
          eventId,
          name,
          phone,
          // 后台补录没有浏览器设备标识，用随机串占位，避免与真实设备冲突
          deviceId: `manual_${randomUUID()}`,
          ticketNo: await nextTicketNo(tx, eventId),
        },
      }),
    );
    return ok(toParticipant(created), 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("编号分配冲突，请重试", 409);
    }
    throw err;
  }
}

export async function DELETE(request: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const id = parseQuery(request, numberIdSchema)?.id;
  if (!id) return fail("来宾编号不正确");

  const activeWin = await prisma.winner.findFirst({
    where: { participantId: id, revokedAt: null },
  });
  if (activeWin) return fail("该来宾已中奖，请先在获奖名单中撤销", 409);

  try {
    await prisma.participant.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return fail("来宾不存在或已被删除", 404);
    }
    throw err;
  }
  return ok({ id });
}
