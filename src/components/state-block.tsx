import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StateBlockProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "warn" | "error";
  className?: string;
}

const toneRing: Record<NonNullable<StateBlockProps["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground",
  warn: "bg-secondary/40 text-secondary-foreground",
  error: "bg-destructive/10 text-destructive",
};

export function StateBlock({
  title,
  description,
  icon,
  action,
  tone = "neutral",
  className,
}: StateBlockProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card/70 px-6 py-12 text-center animate-fade-up",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full",
            toneRing[tone],
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <p className="font-serif text-xl">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      role="status"
      aria-label="加载中"
    />
  );
}
