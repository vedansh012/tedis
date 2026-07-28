"use client";

import { useState } from "react";
import { InterestIcon, INTEREST_ICON_KEYS, isEmojiIcon } from "@/components/interest-icon";

/**
 * Icon picker for interests: choose from the lucide registry OR type any emoji.
 * The chosen value is stored verbatim on `Interest.iconKey` — no code change to
 * add future interests.
 */
export function IconPicker({
  value,
  accent,
  onChange,
}: {
  value: string | null;
  accent: string;
  onChange: (key: string | null) => void;
}) {
  const [emoji, setEmoji] = useState(isEmojiIcon(value) ? (value ?? "") : "");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent + "1a", color: accent }}
        >
          <InterestIcon iconKey={value} size={18} />
        </span>
        <input
          value={emoji}
          onChange={(e) => {
            const v = e.target.value.trim();
            setEmoji(v);
            if (v && isEmojiIcon(v)) onChange(v);
          }}
          placeholder="…or type an emoji"
          aria-label="Emoji icon"
          className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      </div>

      <div className="grid max-h-40 grid-cols-9 gap-1 overflow-y-auto rounded-md border border-border bg-background p-2 sm:grid-cols-11">
        {INTEREST_ICON_KEYS.map((key) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              title={key}
              aria-label={key}
              aria-pressed={active}
              onClick={() => {
                setEmoji("");
                onChange(key);
              }}
              className={`flex aspect-square items-center justify-center rounded-md transition-colors ${
                active ? "bg-primary/15 text-primary ring-1 ring-primary" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <InterestIcon iconKey={key} size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
