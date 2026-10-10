"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2, QrCode, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StateBlock } from "@/components/state-block";
import { SnapshotGate } from "@/components/snapshot-gate";
import { DEFAULT_EVENT_ID } from "@/lib/constants";
import type { Snapshot } from "@/lib/types";

export default function AdminQrCodePage() {
  return (
    <SnapshotGate eventId={DEFAULT_EVENT_ID}>
      {({ snapshot }) => <QrCodePanel snapshot={snapshot} />}
    </SnapshotGate>
  );
}

function QrCodePanel({ snapshot }: { snapshot: Snapshot }) {
  const { event, participants } = snapshot;
  const [origin, setOrigin] = useState("");
  const [size, setSize] = useState(512);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = origin ? `${origin}/join?e=${event.id}` : "";

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    QRCode.toDataURL(link, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#5b3f16", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError("二维码生成失败，请刷新页面重试");
      });
    return () => {
      cancelled = true;
    };
  }, [link, size]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl">参与二维码</h1>
        <p className="text-sm text-muted-foreground">
          投屏或打印后，来宾微信扫码即可填写姓名（{participants.length}/{event.maxParticipants} 已参与）
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>二维码预览</CardTitle>
            <CardDescription>
              {link ? (
                <span className="inline-flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5" />
                  {link}
                </span>
              ) : (
                "正在读取当前地址…"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid place-items-center gap-4">
            {dataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dataUrl}
                  alt={`${event.name} 参与二维码`}
                  className="w-full max-w-72 rounded-xl border bg-white p-3"
                />
                <div className="flex flex-wrap justify-center gap-2">
                  {[256, 512, 1024].map((s) => (
                    <Button
                      key={s}
                      variant={s === size ? "gold" : "outline"}
                      size="sm"
                      onClick={() => setSize(s)}
                    >
                      {s}px
                    </Button>
                  ))}
                </div>
                <Button
                  variant="gold"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = dataUrl;
                    a.download = `${event.name}-参与二维码-${size}px.png`;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                  下载 PNG 用于打印
                </Button>
              </>
            ) : error ? (
              <StateBlock
                tone="error"
                icon={<TriangleAlert className="h-7 w-7" />}
                title="二维码生成失败"
                description={error}
              />
            ) : (
              <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在生成二维码
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>打印建议</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>选择 1024px 下载 PNG，A5 尺寸打印最清晰。</li>
              <li>
                台卡、签到台、入口各放一张；微信扫码后直接打开链接，无需安装应用。
              </li>
              <li>若现场使用内网 Wi-Fi，请先用手机流量验证链接可访问。</li>
            </ol>
            <div className="grid gap-2">
              <Label htmlFor="custom-link">自定义参与链接</Label>
              <Input
                id="custom-link"
                value={link}
                readOnly
                onFocus={(e) => e.target.select()}
              />
              <p className="text-xs text-muted-foreground">
                二维码始终按当前地址生成：现场请用 http://本机IP:3000 打开本页（不要用
                localhost），来宾扫码才能连到这台电脑。日后换正式域名后重新下载即可。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
