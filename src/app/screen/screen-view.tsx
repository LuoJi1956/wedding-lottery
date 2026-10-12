"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCw, Square, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateBlock } from "@/components/state-block";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { DEFAULT_EVENT_ID } from "@/lib/constants";
import { remainingOf, roundSizeOf, winnerParticipantIds } from "@/lib/derive";
import { formatTicketNo } from "@/lib/format";
import { useSnapshot } from "@/lib/use-snapshot";
import type { DrawnEntry, Prize, Snapshot } from "@/lib/types";

type Phase = "idle" | "rolling" | "revealing" | "done";

const ROLL_INTERVAL_MS = 70;
/** 与 winner-glow 的 1100ms 对齐：上一位的金光闪完，下一位再出场 */
const REVEAL_INTERVAL_MS = 1100;

export function ScreenView() {
  const { snapshot, error, refresh } = useSnapshot(DEFAULT_EVENT_ID);

  if (!snapshot) {
    return (
      <div className="screen-theme grid min-h-dvh place-items-center bg-background text-foreground">
        {error ? (
          <StateBlock
            tone="error"
            icon={<RotateCw className="h-7 w-7" />}
            title="无法连接抽奖服务"
            description={error}
            className="bg-black/40 text-foreground backdrop-blur"
            action={
              <Button variant="outline" size="lg" onClick={() => void refresh()}>
                重新加载
              </Button>
            }
          />
        ) : (
          <p className="text-2xl text-foreground/70">大屏加载中…</p>
        )}
      </div>
    );
  }
  return <ScreenStage snapshot={snapshot} refresh={refresh} />;
}

function ScreenStage({
  snapshot,
  refresh,
}: {
  snapshot: Snapshot;
  refresh: () => Promise<unknown>;
}) {
  const { event, prizes, participants } = snapshot;

  const prizesSorted = useMemo(
    () => [...prizes].sort((a, b) => a.sortOrder - b.sortOrder),
    [prizes],
  );

  const wonIds = useMemo(() => winnerParticipantIds(snapshot), [snapshot]);
  const remainingByPrize = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of prizesSorted) map.set(p.id, remainingOf(snapshot, p));
    return map;
  }, [prizesSorted, snapshot]);

  const eligiblePool = useMemo(() => {
    const pool = event.allowRepeatWin
      ? participants
      : participants.filter((p) => !wonIds.has(p.id));
    return pool.map((p) => ({ participantId: p.id, name: p.name, ticketNo: p.ticketNo }));
  }, [participants, wonIds, event.allowRepeatWin]);

  const [prizeId, setPrizeId] = useState(prizesSorted[0]?.id ?? "");
  const currentPrize: Prize | undefined = prizesSorted.find((p) => p.id === prizeId);
  const remaining = currentPrize ? (remainingByPrize.get(currentPrize.id) ?? 0) : 0;
  /** 本轮实际揭晓人数：不足一批的余数一次抽完 */
  const roundCount = currentPrize ? roundSizeOf(snapshot, currentPrize) : 0;

  const [phase, setPhase] = useState<Phase>("idle");
  const [rollingName, setRollingName] = useState("");
  const [revealed, setRevealed] = useState<DrawnEntry[]>([]);
  const [error, setError] = useState("");
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearInterval(t));
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // 撤销中奖后，大屏的剩余名额与已揭晓名单需要立刻跟随变化
  useEffect(() => {
    if (phase === "idle" || phase === "done") {
      setRevealed((prev) =>
        prev.filter((entry) =>
          snapshot.winners.some(
            (w) =>
              w.participantId === entry.participantId &&
              w.prizeId === entry.prizeId &&
              !w.revokedAt,
          ),
        ),
      );
    }
  }, [snapshot.winners, phase]);

  const startRolling = () => {
    setError("");
    if (!currentPrize) {
      setError("请先在后台配置奖项");
      return;
    }
    if (remaining <= 0) {
      setError(`「${currentPrize.name}」名额已抽完`);
      return;
    }
    if (eligiblePool.length === 0) {
      setError(event.allowRepeatWin ? "参与名单为空" : "所有来宾都已中奖，无法继续抽取");
      return;
    }
    setRevealed([]);
    setPhase("rolling");
    const timer = window.setInterval(() => {
      const pick = eligiblePool[Math.floor(Math.random() * eligiblePool.length)];
      setRollingName(pick?.name ?? "");
    }, ROLL_INTERVAL_MS);
    timers.current.push(timer);
  };

  const stopAndReveal = async () => {
    if (!currentPrize) return;
    clearTimers();
    setPhase("revealing");
    // 中奖者由服务端在事务里抽取并落库，前端只负责揭晓动画
    const res = await api.draw({ eventId: event.id, prizeId: currentPrize.id });
    if (!res.ok) {
      setPhase("idle");
      setError(res.error);
      return;
    }
    const entries: DrawnEntry[] = res.data.picked.map((c) => ({
      participantId: c.participantId,
      prizeId: res.data.prizeId,
      name: c.name,
      ticketNo: c.ticketNo,
      prizeName: res.data.prizeName,
    }));
    entries.forEach((entry, i) => {
      const t = window.setTimeout(() => {
        setRevealed((prev) => [...prev, entry]);
        if (i === entries.length - 1) setPhase("done");
      }, REVEAL_INTERVAL_MS * (i + 1));
      timers.current.push(t);
    });
    await refresh();
  };

  const prizeWinners = snapshot.winners.filter(
    (w) => w.prizeId === currentPrize?.id && !w.revokedAt,
  );

  return (
    <div
      className="screen-theme relative h-dvh w-full overflow-hidden bg-background text-foreground"
      style={
        event.backgroundUrl
          ? {
              backgroundImage: `url(${event.backgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              backgroundImage:
                "radial-gradient(circle at 20% 15%, hsl(12 45% 22%), transparent 55%), radial-gradient(circle at 80% 85%, hsl(36 40% 18%), transparent 55%), linear-gradient(135deg, hsl(20 30% 8%), hsl(28 25% 12%))",
            }
      }
    >
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,.62) 0%, rgba(0,0,0,.40) 38%, rgba(0,0,0,.52) 72%, rgba(0,0,0,.72) 100%)",
        }}
      />

      <div className="relative flex h-dvh flex-col px-10 py-8 2xl:px-20">
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <h1
              className="font-semibold leading-tight tracking-wide gold-gradient-text"
              style={{ fontSize: "clamp(2rem,3.2vw,4rem)" }}
            >
              {event.name}
            </h1>
            <p className="mt-1 text-lg text-foreground/70">{event.subtitle}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm uppercase tracking-[0.3em] text-foreground/60">当前奖项</p>
            <p
              className="mt-1 font-serif text-gold"
              style={{ fontSize: "clamp(2rem,3.2vw,4rem)" }}
            >
              {currentPrize?.name ?? "未配置奖项"}
            </p>
            <p className="mt-1 text-base text-foreground/70">
              本奖项 {currentPrize?.winnerCount ?? 0} 名 · 剩余 {remaining} 名 · 本轮 {roundCount} 名
              · 已参与 {participants.length} 人
            </p>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
          {phase === "revealing" || phase === "done" ? (
            <div className="scroll-slim max-h-[54vh] w-full overflow-y-auto px-2 pb-2">
              <div className="flex flex-wrap items-start justify-center gap-6">
                {revealed.map((entry) => {
                  const prize = prizes.find((p) => p.id === entry.prizeId);
                  return (
                    <div
                      key={`${entry.prizeId}-${entry.participantId}`}
                      className="animate-reveal-card w-[clamp(15rem,24vw,26rem)] max-w-full shrink-0 rounded-2xl border-2 border-gold/60 bg-black/35 px-8 py-6 text-center backdrop-blur-sm"
                    >
                      <p className="text-xl text-foreground/70">{formatTicketNo(entry.ticketNo)}</p>
                      <p
                        className="mt-1.5 break-words font-serif font-semibold leading-tight text-gold"
                        style={{ fontSize: "clamp(2.5rem,4.2vw,5.5rem)" }}
                      >
                        {entry.name}
                      </p>
                      {prize?.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prize.iconUrl}
                          alt={prize.name}
                          className="mx-auto mt-3 h-20 w-20 object-contain 2xl:h-24 2xl:w-24"
                        />
                      ) : null}
                      <p className="mt-2 text-lg text-foreground/80">{entry.prizeName}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : phase === "rolling" ? (
            <p
              className="max-w-[85vw] break-words text-center font-serif font-semibold leading-none tracking-wide text-foreground"
              style={{ fontSize: "clamp(3.5rem,9vw,10rem)", textShadow: "0 8px 40px rgba(0,0,0,.55)" }}
            >
              {rollingName || "…"}
            </p>
          ) : eligiblePool.length === 0 ? (
            <StateBlock
              tone="warn"
              icon={<TriangleAlert className="h-7 w-7" />}
              title="当前没有可参与的人"
              description="等待来宾扫码，或在后台开启“允许重复中奖”"
              className="bg-black/40 text-foreground backdrop-blur"
            />
          ) : (
            <div className="text-center">
              <p
                className="font-serif tracking-[0.2em] text-foreground/80"
                style={{ fontSize: "clamp(2.5rem,5vw,4.5rem)" }}
              >
                准备就绪
              </p>
              <p className="mt-4 text-2xl text-foreground/60">
                点击下方「开始」，姓名将快速滚动 · 本轮 {roundCount} 人
              </p>
              {currentPrize?.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPrize.iconUrl}
                  alt={currentPrize.name}
                  className="mx-auto mt-6 h-28 w-28 object-contain 2xl:h-36 2xl:w-36"
                />
              ) : null}
            </div>
          )}

          {error ? (
            <p className="flex max-w-[85vw] flex-wrap items-center justify-center gap-3 rounded-full bg-destructive/20 px-5 py-2 text-lg text-destructive-foreground">
              <TriangleAlert className="h-5 w-5 shrink-0" />
              {error}
              {error.includes("登录") ? (
                <a
                  className="underline underline-offset-4"
                  href="/admin/login"
                  target="_blank"
                  rel="noreferrer"
                >
                  去登录
                </a>
              ) : null}
            </p>
          ) : null}

          {prizeWinners.length > 0 && phase === "idle" ? (
            <p className="max-w-[85vw] text-balance text-lg leading-relaxed text-foreground/70">
              <span className="whitespace-nowrap">
                {currentPrize?.name}已揭晓 {prizeWinners.length} 位：
              </span>
              {prizeWinners
                .map((w) => participants.find((p) => p.id === w.participantId)?.name ?? "-")
                .join("、")}
            </p>
          ) : null}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-white/15 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            {prizesSorted.map((p) => {
              const left = remainingByPrize.get(p.id) ?? 0;
              const round = Math.min(p.drawBatchSize, left);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={phase === "rolling" || phase === "revealing"}
                  onClick={() => setPrizeId(p.id)}
                  className={cn(
                    "touch-target rounded-full border px-5 py-2 text-lg transition-colors disabled:opacity-50",
                    p.id === prizeId
                      ? "border-gold bg-gold/25 text-gold"
                      : "border-white/25 bg-white/5 text-foreground/80 hover:bg-white/10",
                  )}
                >
                  {p.name}
                  <span className="ml-2 text-base text-foreground/60">
                    剩 {left} · 本轮 {round}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {phase === "rolling" ? (
              <Button size="xl" variant="destructive" onClick={() => void stopAndReveal()}>
                <Square className="h-6 w-6" />
                停止
              </Button>
            ) : (
              <Button
                size="xl"
                variant="gold"
                onClick={startRolling}
                disabled={
                  phase === "revealing" ||
                  !currentPrize ||
                  remaining <= 0 ||
                  eligiblePool.length === 0
                }
              >
                <Play className="h-6 w-6" />
                开始抽奖
              </Button>
            )}
            {phase === "done" || phase === "revealing" ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setPhase("idle");
                  setRevealed([]);
                  clearTimers();
                }}
              >
                {remaining > 0 ? "继续下一轮" : "该奖项已抽完"}
              </Button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
