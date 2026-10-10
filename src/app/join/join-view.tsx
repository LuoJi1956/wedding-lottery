"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PartyPopper, RotateCw, Ticket, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StateBlock } from "@/components/state-block";
import { PageSkeleton } from "@/components/page-skeleton";
import { api } from "@/lib/api";
import { joinGate } from "@/lib/join-gate";
import { formatTicketNo } from "@/lib/format";
import { maskPhone } from "@/lib/utils";
import { readDeviceId, saveTicket, loadTicket } from "@/lib/ticket";
import { useSnapshot } from "@/lib/use-snapshot";
import { PHONE_REGEX } from "@/lib/validation";
import type { ApiResponse, Participant, Snapshot } from "@/lib/types";

export function JoinView({ eventId }: { eventId: string }) {
  const { snapshot, error, refresh } = useSnapshot(eventId);

  if (!snapshot) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center px-5">
        {error ? (
          <StateBlock
            tone="error"
            icon={<RotateCw className="h-7 w-7" />}
            title="活动信息加载失败"
            description={error}
            action={
              <Button variant="outline" onClick={() => void refresh()}>
                重新加载
              </Button>
            }
          />
        ) : (
          <PageSkeleton className="w-full" lines={2} />
        )}
      </main>
    );
  }
  return <JoinForm eventId={eventId} snapshot={snapshot} />;
}

function JoinForm({ eventId, snapshot }: { eventId: string; snapshot: Snapshot }) {
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApiResponse<{ participant: Participant }> | null>(null);
  const [restored, setRestored] = useState<Participant | null>(null);

  useEffect(() => {
    setDeviceId(readDeviceId());
    setRestored(loadTicket(eventId));
  }, [eventId]);

  const gate = useMemo(
    () => joinGate(snapshot.event, snapshot.participants.length),
    [snapshot],
  );
  const ticket = result?.ok ? result.data.participant : restored;

  if (ticket) return <TicketView participant={ticket} eventName={snapshot.event.name} />;
  if (!gate.allowed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 pb-safe">
        <StateBlock
          tone={gate.reason === "full" ? "warn" : "neutral"}
          icon={<TriangleAlert className="h-7 w-7" />}
          title={gate.reason === "not_started" ? "活动还没开始" : gate.reason === "ended" ? "活动已结束" : gate.reason === "full" ? "参与人数已满" : "暂时无法参与"}
          description={gate.message}
        />
      </main>
    );
  }

  const canSubmit =
    name.trim().length > 0 && (phone.trim() === "" || PHONE_REGEX.test(phone.trim()));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting || deviceId === "") return;
    setSubmitting(true);
    const res = await api.join({ eventId, name, phone, deviceId });
    if (res.ok) saveTicket(res.data.participant);
    setResult(res);
    setSubmitting(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10 pb-safe">
      <div className="space-y-2 text-center">
        <p className="text-sm tracking-widest text-gold-deep">{snapshot.event.subtitle}</p>
        <h1 className="text-3xl gold-gradient-text">{snapshot.event.name}</h1>
        <p className="text-sm text-muted-foreground">填写姓名即可参与现场抽奖</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)}>
        <Card>
          <CardContent className="grid gap-5 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={name}
                maxLength={20}
                autoComplete="off"
                autoFocus
                enterKeyHint="next"
                placeholder="请输入您的姓名"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">
                手机号 <span className="text-muted-foreground">（选填）</span>
              </Label>
              <Input
                id="phone"
                value={phone}
                inputMode="numeric"
                maxLength={11}
                autoComplete="off"
                enterKeyHint="go"
                placeholder="用于现场联系，仅收 11 位数字"
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
              {phone.trim() !== "" && !PHONE_REGEX.test(phone.trim()) ? (
                <p className="text-xs text-destructive">手机号格式不正确</p>
              ) : null}
            </div>

            <Button
              type="submit"
              size="lg"
              variant="gold"
              className="w-full"
              disabled={!canSubmit || submitting || deviceId === ""}
            >
              {submitting ? "提交中…" : "参与抽奖"}
            </Button>

            {result && !result.ok ? (
              <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                {result.error}
              </p>
            ) : null}

            <p className="text-center text-xs text-muted-foreground">
              同一台手机与同一手机号仅可参与一次
            </p>
          </CardContent>
        </Card>
      </form>
    </main>
  );
}

function TicketView({ participant, eventName }: { participant: Participant; eventName: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10 pb-safe">
      <div className="text-center">
        <PartyPopper className="mx-auto h-8 w-8 text-gold" />
        <h1 className="mt-2 text-2xl">抽奖券已生成</h1>
        <p className="mt-1 text-sm text-muted-foreground">请保留本页，开奖时凭编号核对</p>
      </div>

      <Card className="overflow-hidden border-gold/40 bg-gradient-to-b from-card to-accent">
        <CardContent className="p-0">
          <div className="px-6 pt-6 pb-4 text-center">
            <p className="text-xs tracking-[0.3em] text-gold-deep">{eventName}</p>
            <p className="mt-3 font-serif text-4xl gold-gradient-text">
              {formatTicketNo(participant.ticketNo)}
            </p>
          </div>
          <div className="relative border-t border-dashed border-gold/40">
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-background" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-background" />
            <dl className="grid gap-2 px-6 py-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">姓名</dt>
                <dd className="font-medium">{participant.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">手机号</dt>
                <dd>{participant.phone ? maskPhone(participant.phone) : "未填写"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">参与时间</dt>
                <dd>{new Date(participant.joinedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Ticket className="h-4 w-4" />
        开奖时请留意大屏公告
      </p>
    </main>
  );
}
