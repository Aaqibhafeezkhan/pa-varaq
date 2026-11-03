"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { isoDateInput } from "@/lib/format";
import type { Copy, Loan } from "@/lib/types";
import { mutate } from "@/lib/use-api";

/** Quick-log for a book lent to a friend outside Pa-Varaq. */
export function ExternalLoanSheet({
  copy,
  onOpenChange,
  onDone,
}: {
  copy: Copy | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [due, setDue] = useState(isoDateInput(21));
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!copy) return;
    setBusy(true);
    const res = await mutate(
      () =>
        api<Loan>("/external-loans", {
          method: "POST",
          body: { copyId: copy.id, borrowerName: name.trim(), dueDate: new Date(due + "T12:00:00").toISOString() },
        }),
      "امانت ثبت شد.",
    );
    setBusy(false);
    if (res) {
      setName("");
      onOpenChange(false);
      onDone();
    }
  }

  return (
    <Sheet
      open={!!copy}
      onOpenChange={onOpenChange}
      title="ثبت امانت دستی به دوست"
      description={copy ? `«${copy.edition.title}» را به چه کسی دادی؟ پاورق یادت می‌ماند.` : undefined}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <Label>نام قرض‌گیرنده</Label>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="علی" maxLength={60} />
        </div>
        <div>
          <Label>تاریخ برگشت</Label>
          <Input type="date" dir="ltr" value={due} min={isoDateInput(1)} onChange={(e) => setDue(e.target.value)} />
        </div>
        <Button className="w-full" disabled={busy || !name.trim() || !due}>
          ثبت امانت
        </Button>
      </form>
    </Sheet>
  );
}
