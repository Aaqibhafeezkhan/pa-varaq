"use client";
import { displayName } from "@/lib/format";
import { AnimatePresence, motion } from "framer-motion";
import { Dices } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import type { Copy } from "@/lib/types";

/** "Surprise me": shuffles through covers, then reveals a random available book. */
export function SurpriseModal({ open, onOpenChange, pool }: { open: boolean; onOpenChange: (o: boolean) => void; pool: Copy[] }) {
  const [shuffling, setShuffling] = useState(true);
  const [shown, setShown] = useState<Copy | null>(null);
  const [result, setResult] = useState<Copy | null>(null);
  const [empty, setEmpty] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const roll = useCallback(async () => {
    setShuffling(true);
    setResult(null);
    setEmpty(false);
    timer.current = setInterval(() => pool.length && setShown(pool[Math.floor(Math.random() * pool.length)]), 90);
    const [res] = await Promise.all([api<Copy>("/feed/random").catch(() => null), new Promise((r) => setTimeout(r, 1500))]);
    clearInterval(timer.current);
    if (res) setResult(res);
    else setEmpty(true);
    setShuffling(false);
  }, [pool]);

  useEffect(() => {
    if (open) void roll();
    return () => clearInterval(timer.current);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const book = shuffling ? shown : result;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="کتاب تصادفی پیشنهاد پاورق" description="بذار پاورق یک کتاب برایت انتخاب کند!">
      <div className="flex flex-col items-center">
        <div className="relative w-40">
          <AnimatePresence mode="popLayout">
            {book ? (
              <motion.div
                key={shuffling ? book.id + Math.random() : book.id}
                initial={{ opacity: 0, y: 14, rotate: -4 }}
                animate={{ opacity: 1, y: 0, rotate: shuffling ? (Math.random() - 0.5) * 8 : 0, scale: shuffling ? 1 : [1, 1.12, 1] }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: shuffling ? 0.09 : 0.5 }}
              >
                <BookCover
                  title={book.edition.title}
                  author={book.edition.authors[0]}
                  coverUrl={book.edition.coverUrl}
                  className="w-full"
                />
              </motion.div>
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center rounded-xl bg-muted">
                <Dices className="animate-spin text-muted-foreground" />
              </div>
            )}
          </AnimatePresence>
        </div>

        {!shuffling && result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 w-full text-center">
            <h3 className="text-lg font-extrabold">{result.edition.title}</h3>
            <p className="text-sm text-muted-foreground">{result.edition.authors.join("، ")}</p>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-sm">
              <Avatar id={result.owner.avatarId} size={22} />
              <span>{displayName(result.owner)}</span>
            </div>
            <div className="mt-5 flex gap-2">
              <Link href={`/books/${result.id}`} className="flex-1" onClick={() => onOpenChange(false)}>
                <Button className="w-full">مشاهده کتاب</Button>
              </Link>
              <Button variant="outline" onClick={roll}>
                <Dices size={16} /> یکی دیگر
              </Button>
            </div>
          </motion.div>
        )}
        {shuffling && <p className="mt-5 text-sm text-muted-foreground">در حال انتخاب…</p>}
        {empty && <p className="mt-5 text-sm text-muted-foreground">فعلاً کتابی آماده امانت نیست.</p>}
      </div>
    </Sheet>
  );
}
