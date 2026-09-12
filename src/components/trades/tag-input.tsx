"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const allTags = useAppStore((s) => s.tags);
  const addTag = useAppStore((s) => s.addTag);
  const [query, setQuery] = useState("");

  const suggestions = allTags.filter((t) => !value.includes(t) && t.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  function commit(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    if (!allTags.includes(trimmed)) addTag(trimmed);
    setQuery("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-md border border-border-strong bg-surface-2 px-2 py-1 text-[12px] font-medium text-text-primary"
          >
            {tag}
            <button onClick={() => onChange(value.filter((t) => t !== tag))} className="text-text-tertiary hover:text-text-primary">
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="relative mt-2">
        <div className="flex items-center gap-2 rounded-md border border-border-strong bg-bg-elevated px-2.5 h-9">
          <Plus size={13} className="text-text-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(query);
              }
            }}
            placeholder="Add a tag and press Enter…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-tertiary"
          />
        </div>
        {query && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-[var(--shadow-modal)]">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => commit(s)}
                className="flex w-full items-center px-3 py-2 text-left text-[13px] text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => commit(query)}
              className={cn("flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px] text-accent hover:bg-surface-2")}
            >
              <Plus size={12} /> Create &ldquo;{query}&rdquo;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
