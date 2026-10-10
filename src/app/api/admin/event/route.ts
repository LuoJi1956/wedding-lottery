import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/server/admin-auth";
import { prisma } from "@/lib/server/db";
import { fail, ok, parseBody } from "@/lib/server/http";
import { toEventConfig } from "@/lib/server/serialize";
import { eventSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(request, eventSchema);
  if ("response" in parsed) return parsed.response;
  const { id, backgroundUrl, startAt, endAt, maxParticipants, ...rest } = parsed.data;

  const joined = await prisma.participant.count({ where: { eventId: id } });
  if (maxParticipants < joined) {
    return fail(`已有 ${joined} 位来宾参与，人数上限不能小于该人数`);
  }

  try {
    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...rest,
        maxParticipants,
        backgroundUrl: backgroundUrl || null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      },
    });
    return ok(toEventConfig(updated));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return fail("活动不存在或已被删除", 404);
    }
    throw err;
  }
}
