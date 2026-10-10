import { Prisma } from "@prisma/client";
import { joinGate } from "@/lib/join-gate";
import { prisma } from "@/lib/server/db";
import { fail, ok, parseBody } from "@/lib/server/http";
import { toEventConfig, toParticipant } from "@/lib/server/serialize";
import { nextTicketNo } from "@/lib/server/ticket";
import { joinSchema } from "@/lib/validation";

interface JoinResponse {
  participant: ReturnType<typeof toParticipant>;
  /** true 表示这台设备此前已报名，本次没有新增记录 */
  duplicated: boolean;
}

export async function POST(request: Request) {
  const parsed = await parseBody(request, joinSchema);
  if ("response" in parsed) return parsed.response;
  const { eventId, name, deviceId } = parsed.data;
  const phone = parsed.data.phone?.trim() || null;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return fail("活动不存在或链接已失效", 404);

  const joined = await prisma.participant.count({ where: { eventId } });
  const gate = joinGate(toEventConfig(event), joined);
  if (!gate.allowed) return fail(gate.message, 409);

  const existing = await prisma.participant.findUnique({
    where: { eventId_deviceId: { eventId, deviceId } },
  });
  if (existing) return ok<JoinResponse>({ participant: toParticipant(existing), duplicated: true });

  if (phone) {
    const phoneTaken = await prisma.participant.findFirst({ where: { eventId, phone } });
    if (phoneTaken) return fail("该手机号已参与过本次抽奖", 409);
  }

  try {
    // 编号取自活动计数器，事务里自增，避免并发拿到同一个号
    const created = await prisma.$transaction(async (tx) =>
      tx.participant.create({
        data: {
          eventId,
          name,
          phone,
          deviceId,
          ticketNo: await nextTicketNo(tx, eventId),
        },
      }),
    );
    return ok<JoinResponse>({ participant: toParticipant(created), duplicated: false }, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("你已参与过本次抽奖，无需重复填写", 409);
    }
    throw err;
  }
}
