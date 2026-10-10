"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function submit() {
    if (password.length < 4) {
      setError("口令至少 4 位");
      return;
    }
    setChecking(true);
    setError("");
    const res = await api.login(password);
    setChecking(false);
    if (!res.ok) {
      setError(res.error);
      setPassword("");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <Card>
        <CardHeader>
          <CardTitle>管理员登录</CardTitle>
          <CardDescription>婚礼现场抽奖系统后台</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">访问口令</Label>
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete="off"
              placeholder="请输入后台口令"
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <Button variant="gold" size="lg" disabled={checking} onClick={submit}>
            {checking ? "验证中…" : "进入后台"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            口令由服务端环境变量 ADMIN_PASSWORD 校验，登录后写入 httpOnly Cookie
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
