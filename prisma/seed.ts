import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EVENT_ID = "evt_thanksbanquet";
const HOUR = 3_600_000;

const SEED_NAMES = [
  "陈志远", "林晓雯", "王嘉怡", "李承恩", "赵梦琪", "刘宇航", "陈嘉豪",
  "周雨桐", "吴敏华", "郑泽楷", "孙可欣", "胡文博", "黄雅静", "徐俊杰",
  "何思远", "高静怡", "罗天佑", "梁诗涵", "宋佳霖", "谢明轩", "唐婉清",
  "韩雪莹", "曹立诚", "邓佳琪", "冯亦凡", "蒋雨萱", "沈之豪", "陶欣然",
  "苏晴川", "许亦初",
];

/** 三等奖已开出的一轮，编号与 drawBatchSize 保持一致 */
const SEEDED_WINNER_ORDINALS = [2, 7, 12, 19, 26];

async function main() {
  const now = Date.now();

  await prisma.event.upsert({
    where: { id: EVENT_ID },
    update: {},
    create: {
      id: EVENT_ID,
      name: "答谢宴抽奖系统",
      subtitle: "感谢每一位到场的亲友",
      status: "active",
      startAt: new Date(now - HOUR),
      endAt: new Date(now + 4 * HOUR),
      maxParticipants: 100,
      backgroundUrl: null,
      allowRepeatWin: false,
    },
  });

  // 重跑 seed 时先清空该活动的从表数据，保证演示结果可预期
  await prisma.winner.deleteMany({ where: { eventId: EVENT_ID } });
  await prisma.prize.deleteMany({ where: { eventId: EVENT_ID } });
  await prisma.participant.deleteMany({ where: { eventId: EVENT_ID } });

  await prisma.prize.createMany({
    data: [
      { id: "prize_1", eventId: EVENT_ID, name: "一等奖", iconUrl: "/icons/prize-1.svg", winnerCount: 1, drawBatchSize: 1, sortOrder: 1 },
      { id: "prize_2", eventId: EVENT_ID, name: "二等奖", iconUrl: "/icons/prize-2.svg", winnerCount: 3, drawBatchSize: 1, sortOrder: 2 },
      { id: "prize_3", eventId: EVENT_ID, name: "三等奖", iconUrl: "/icons/prize-3.svg", winnerCount: 10, drawBatchSize: 5, sortOrder: 3 },
    ],
  });

  const participants = await Promise.all(
    SEED_NAMES.map((name, i) =>
      prisma.participant.create({
        data: {
          eventId: EVENT_ID,
          ticketNo: i + 1,
          name,
          phone: null,
          deviceId: `seed_device_${i + 1}`,
          joinedAt: new Date(now - 2 * HOUR + i * 60_000),
        },
      }),
    ),
  );

  const byOrdinal = (n: number) => participants[n - 1];
  await prisma.event.update({
    where: { id: EVENT_ID },
    data: { lastTicketNo: participants.length },
  });
  await prisma.winner.createMany({
    data: SEEDED_WINNER_ORDINALS.map((n) => ({
      eventId: EVENT_ID,
      prizeId: "prize_3",
      participantId: byOrdinal(n).id,
      drawnAt: new Date(now - 30 * 60_000),
      revokedAt: null,
    })),
  });

  console.log(
    `已写入活动 ${EVENT_ID}：${participants.length} 位来宾、3 个奖项、${SEEDED_WINNER_ORDINALS.length} 条中奖记录`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
