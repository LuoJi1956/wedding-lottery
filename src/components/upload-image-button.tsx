import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

interface UploadImageButtonProps {
  kind: "background" | "icon";
  /** 上传成功后回传站内路径，由调用方写入表单 */
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
  label?: string;
  className?: string;
}

/** 隐藏的原生文件选择：点击按钮即可选图，不需要额外弹窗 */
export function UploadImageButton({
  kind,
  onUploaded,
  onError,
  label = "上传图片",
  className,
}: UploadImageButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const res = await api.uploadImage(file, kind);
    setUploading(false);
    if (res.ok) onUploaded(res.data.url);
    else onError(res.error);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("touch-target", className)}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "上传中…" : label}
      </Button>
    </>
  );
}
