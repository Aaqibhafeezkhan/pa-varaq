import { BookMarked, MapPin, Sprout } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { formatDate, displayName } from "@/lib/format";
import type { PassportTimeline } from "@/lib/types";

/** Vertical timeline: the physical journey of one copy, newest memory first. */
export function PassportTimelineView({ data }: { data: PassportTimeline }) {
  return (
    <ol className="relative ms-3 border-s-2 border-dashed border-border">
      {data.entries.map((e) => (
        <li key={e.id} className="relative mb-5 ps-6">
          <span className="absolute -start-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 ring-4 ring-background" />
          <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-card p-3 shadow-paper">
            <p className="text-sm leading-relaxed">«{e.note}»</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {e.reader && (
                <span className="flex items-center gap-1">
                  <Avatar id={e.reader.avatarId} size={18} /> {displayName(e.reader)}
                </span>
              )}
              <span>{formatDate(e.createdAt)}</span>
              {e.cityOrCircle && (
                <span className="flex items-center gap-0.5">
                  <MapPin size={11} /> {e.cityOrCircle}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
      <li className="relative ps-6">
        <span className="absolute -start-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-background">
          <Sprout size={12} />
        </span>
        <p className="text-sm">
          <BookMarked size={14} className="me-1 inline" />
          شروع سفر: این نسخه را <b>{displayName(data.copy.owner)}</b> به پاورق اضافه کرد · {formatDate(data.copy.addedAt)}
        </p>
      </li>
    </ol>
  );
}
