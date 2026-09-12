"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn, uid } from "@/lib/utils";
import { uploadScreenshot } from "@/lib/supabase/queries";
import { useToast } from "@/components/ui/toast";
import type { TradeScreenshot } from "@/lib/types";

export function ScreenshotSlot({
  userId,
  tradeId,
  stage,
  label,
  screenshot,
  onChange,
}: {
  userId: string;
  tradeId: string;
  stage: TradeScreenshot["stage"];
  label: string;
  screenshot?: TradeScreenshot;
  onChange: (screenshot: TradeScreenshot | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const url = await uploadScreenshot(userId, tradeId, file, stage);
      onChange({ id: uid("shot"), stage, dataUrl: url, fileName: file.name, createdAt: new Date().toISOString() });
    } catch (err) {
      push({ title: "Upload failed", tone: "error", description: err instanceof Error ? err.message : undefined });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-text-secondary">{label}</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={cn(
          "relative flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed transition-colors",
          dragOver ? "border-accent/50 bg-accent-soft" : "border-border-strong bg-bg-elevated"
        )}
      >
        {uploading ? (
          <Loader2 size={20} className="animate-spin text-text-tertiary" />
        ) : screenshot ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshot.dataUrl} alt={label} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-2 py-1.5">
              <span className="truncate text-[11px] text-white/80">{screenshot.fileName}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => inputRef.current?.click()} className="rounded bg-white/10 p-1 text-white hover:bg-white/20">
                  <Upload size={12} />
                </button>
                <button onClick={() => onChange(null)} className="rounded bg-white/10 p-1 text-white hover:bg-white/20">
                  <X size={12} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <button onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-1.5 text-text-tertiary">
            <ImageIcon size={20} />
            <span className="text-[11.5px]">Drop image or click</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
