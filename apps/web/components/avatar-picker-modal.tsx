"use client";
import { AVATAR_COUNT } from "@varaq/shared";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Bottom drawer / modal to browse the 16 curated avatars, preview one and save it. */
export function AvatarPickerModal({
  open,
  onOpenChange,
  value,
  onSave,
  busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value?: number;
  onSave: (id: number) => void | Promise<void>;
  busy?: boolean;
}) {
  const [pick, setPick] = useState<number | undefined>(value);
  useEffect(() => {
    if (open) setPick(value);
  }, [open, value]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="انتخاب آواتار"
      description="در پاورق عکس پروفایل وجود ندارد؛ یکی از آواتارهای آماده را انتخاب کن."
    >
      <div className="mb-5 flex justify-center">
        <motion.div
          key={pick}
          initial={{ scale: 0.8, rotate: -6, opacity: 0.4 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 16 }}
          className="rounded-full p-1.5 shadow-glow ring-2 ring-primary/60"
        >
          <Avatar id={pick ?? 1} size={112} />
        </motion.div>
      </div>
      <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="آواتارها">
        {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((id) => (
          <motion.button
            key={id}
            type="button"
            role="radio"
            aria-checked={pick === id}
            aria-label={`آواتار ${id}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setPick(id)}
            className={cn(
              "rounded-full p-1 transition",
              pick === id ? "bg-primary/15 ring-2 ring-primary" : "opacity-85 hover:opacity-100",
            )}
          >
            <Avatar id={id} size={72} className="h-auto w-full" />
          </motion.button>
        ))}
      </div>
      <Button
        className="mt-6 w-full"
        disabled={!pick || busy}
        onClick={async () => {
          if (pick) {
            await onSave(pick);
            onOpenChange(false);
          }
        }}
      >
        ذخیره آواتار
      </Button>
    </Sheet>
  );
}
