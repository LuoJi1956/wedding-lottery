import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function maskPhone(phone: string | null): string {
  if (!phone) return "-";
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

export function toCsv(rows: string[][]): string {
  const escape = (v: string) => {
    // 来宾自己填的姓名/备注以 = + - @ 开头时，Excel 会当公式执行（CSV 注入），加前缀变成纯文本
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  // BOM so Excel opens UTF-8 Chinese correctly（写成转义，避免源码里的隐形字符被工具链吃掉）
  return "\uFEFF" + rows.map((r) => r.map(escape).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
