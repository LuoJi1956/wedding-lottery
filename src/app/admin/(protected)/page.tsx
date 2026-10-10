"use client";

import { useEffect, useState } from "react";
import { Check, Eraser, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/state-block";
import { UploadImageButton } from "@/components/upload-image-button";
import { api } from "@/lib/api";
import { SnapshotGate } from "@/components/snapshot-gate";
import { DEFAULT_EVENT_ID } from "@/lib/constants";
import { eventSchema, firstIssue } from "@/lib/validation";
import type { EventStatus, Snapshot } from "@/lib/types";

const statusLabel: Record<EventStatus, string> = {
  draft: "草稿",
  active: "进行中",
  ended: "已结束",
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminEventPage() {
  return (
    <SnapshotGate eventId={DEFAULT_EVENT_ID}>
      {({ snapshot, refresh }) => <EventForm snapshot={snapshot} refresh={refresh} />}
    </SnapshotGate>
  );
}

function EventForm({ snapshot, refresh }: { snapshot: Snapshot; refresh: () => Promise<unknown> }) {
  const { event, participants, prizes, winners } = snapshot;
  const [form, setForm] = useState(() => ({
    name: event.name,
    subtitle: event.subtitle,
    status: event.status,
    startAt: toLocalInput(event.startAt),
    endAt: toLocalInput(event.endAt),
    maxParticipants: String(event.maxParticipants),
    backgroundUrl: event.backgroundUrl ?? "",
    allowRepeatWin: event.allowRepeatWin,
  }));
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const totalSeats = prizes.reduce((sum, p) => sum + p.winnerCount, 0);
  const drawnSeats = winners.filter((w) => !w.revokedAt).length;

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (saving) return;
    const parsed = eventSchema.safeParse({
      id: event.id,
      ...form,
      maxParticipants: Number(form.maxParticipants),
    });
    if (!parsed.success) {
      setFeedback({ ok: false, text: firstIssue(parsed.error) });
      return;
    }
    setSaving(true);
    const res = await api.saveEvent({
      ...parsed.data,
      startAt: new Date(parsed.data.startAt).toISOString(),
      endAt: new Date(parsed.data.endAt).toISOString(),
    });
    setSaving(false);
    if (!res.ok) {
      setFeedback({ ok: false, text: res.error });
      return;
    }
    await refresh();
    setFeedback({ ok: true, text: "已保存活动配置" });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">活动配置</h1>
          <p className="text-sm text-muted-foreground">修改后立即对大屏与来宾端生效</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="gold">当前：{statusLabel[event.status]}</Badge>
          <Badge variant="muted">已参与 {participants.length}/{event.maxParticipants}</Badge>
          <Badge variant="secondary">已开奖 {drawnSeats}/{totalSeats}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>来宾端与大屏顶部展示的活动名称、副标题</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">活动名称</Label>
              <Input
                id="name"
                value={form.name}
                maxLength={30}
                onChange={(e) => patch("name", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subtitle">副标题</Label>
              <Input
                id="subtitle"
                value={form.subtitle}
                maxLength={40}
                onChange={(e) => patch("subtitle", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="status">活动状态</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => patch("status", e.target.value as EventStatus)}
                className="h-12 rounded-lg border border-input bg-card px-3 text-base"
              >
                <option value="draft">草稿（不可参与）</option>
                <option value="active">进行中</option>
                <option value="ended">已结束</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start">开始时间</Label>
              <Input
                id="start"
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => patch("startAt", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">结束时间</Label>
              <Input
                id="end"
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => patch("endAt", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="max">参与人数上限</Label>
              <Input
                id="max"
                type="number"
                min={1}
                value={form.maxParticipants}
                onChange={(e) => patch("maxParticipants", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <Label htmlFor="repeat" className="font-medium">允许重复中奖</Label>
                <p className="text-xs text-muted-foreground">关闭后同一人最多中一个奖</p>
              </div>
              <Switch
                id="repeat"
                checked={form.allowRepeatWin}
                onCheckedChange={(v) => patch("allowRepeatWin", v)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bg">大屏背景图</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="bg"
                className="min-w-0 flex-1"
                value={form.backgroundUrl}
                placeholder="留空则使用内置渐变背景；也可点右侧上传"
                onChange={(e) => patch("backgroundUrl", e.target.value)}
              />
              <UploadImageButton
                kind="background"
                onUploaded={(url) => patch("backgroundUrl", url)}
                onError={(message) => setFeedback({ ok: false, text: message })}
              />
              {form.backgroundUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="touch-target text-muted-foreground"
                  onClick={() => patch("backgroundUrl", "")}
                >
                  <Eraser className="h-4 w-4" />
                  清除
                </Button>
              ) : null}
            </div>
            {form.backgroundUrl ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.backgroundUrl}
                  alt="大屏背景图预览"
                  className="h-16 w-28 shrink-0 rounded object-cover"
                />
                <p className="truncate text-xs text-muted-foreground">{form.backgroundUrl}</p>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              图片存到服务的 <code>public/uploads/</code>，建议 1920×1080、3MB 以内；Serverless 部署请改填外链，详见 README。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="gold" size="lg" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {saving ? "保存中…" : "保存配置"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setForm({
                  name: event.name,
                  subtitle: event.subtitle,
                  status: event.status,
                  startAt: toLocalInput(event.startAt),
                  endAt: toLocalInput(event.endAt),
                  maxParticipants: String(event.maxParticipants),
                  backgroundUrl: event.backgroundUrl ?? "",
                  allowRepeatWin: event.allowRepeatWin,
                });
                setFeedback({ ok: true, text: "已还原为当前保存值" });
              }}
            >
              <RefreshCw className="h-4 w-4" />
              还原
            </Button>
            {feedback ? (
              <span
                className={
                  feedback.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"
                }
              >
                {feedback.text}
              </span>
            ) : null}
          </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
