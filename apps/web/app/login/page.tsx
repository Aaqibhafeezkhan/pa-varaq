"use client";
import { normalizeIranMobile } from "@varaq/shared";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookOpen, Pencil, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/lib/notify";
import { Avatar } from "@/components/avatar";
import { AvatarPickerModal } from "@/components/avatar-picker-modal";
import { BookCover } from "@/components/book-cover";
import { OtpInput } from "@/components/otp-input";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/labels";
import type { Me } from "@/lib/types";

type Step = "phone" | "code" | "register";
const SHOWCASE = [
  ["بوف کور", "صادق هدایت"],
  ["شازده کوچولو", "سنت‌اگزوپری"],
  ["۱۹۸۴", "جورج اورول"],
  ["انسان خردمند", "یووال هراری"],
];

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { me, ready, login } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickAvatar, setPickAvatar] = useState(false);
  const [f, setF] = useState({ firstName: "", lastName: "", username: "", avatarId: 1, inviteCode: "" });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (ready && me) router.replace("/");
  }, [ready, me, router]);

  const phoneOk = !!normalizeIranMobile(phone);
  const errors = {
    firstName: f.firstName.trim().length < 2 ? "نام را وارد کنید." : "",
    lastName: f.lastName.trim().length < 2 ? "نام خانوادگی را وارد کنید." : "",
    username: /^@?[\p{L}\p{N}_.]{3,24}$/u.test(f.username.trim()) ? "" : "نام کاربری ۳ تا ۲۴ نویسه (حرف، عدد، _ و .) باشد.",
  };
  const formOk = Object.values(errors).every((e) => !e);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(errorMessage(e instanceof ApiError ? e.code : undefined));
    } finally {
      setBusy(false);
    }
  }

  const requestCode = () =>
    run(async () => {
      const res = await api<{ devCode?: string }>("/auth/otp/request", { method: "POST", body: { phone } });
      setDevCode(res.devCode ?? null);
      setStep("code");
    });

  const verify = (registering: boolean) =>
    run(async () => {
      const body: Record<string, unknown> = { phone, code };
      if (registering) {
        setTouched(true);
        if (!formOk) return;
        body.registration = {
          firstName: f.firstName.trim(),
          lastName: f.lastName.trim(),
          username: f.username.trim(),
          avatarId: f.avatarId,
        };
        if (f.inviteCode) body.inviteCode = f.inviteCode;
      }
      const res = await api<{ registrationRequired: boolean; token?: string; user?: Me }>("/auth/otp/verify", { method: "POST", body });
      if (res.registrationRequired) return setStep("register");
      login(res.token!, res.user!);
      router.replace("/");
    });

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Showcase panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-20 start-10 h-80 w-80 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 end-0 h-96 w-96 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <BookOpen />
          </span>
          <span className="text-3xl font-extrabold">پاورق</span>
        </div>
        <div className="relative">
          <div className="mb-10 flex justify-center gap-4">
            {SHOWCASE.map(([t, a], i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: i % 2 ? 18 : 0 }}
                transition={{ delay: 0.15 * i, type: "spring" }}
                className="w-32"
              >
                <BookCover title={t} author={a} className="w-full" />
              </motion.div>
            ))}
          </div>
          <h2 className="text-4xl font-extrabold leading-tight">
            کتاب‌هایت را بچرخان،
            <br />
            سفرشان را دنبال کن.
          </h2>
          <p className="mt-3 max-w-md text-emerald-100/90">قفسه شخصی، امانت بین دوستان و پاسپورت سفر هر کتاب؛ رایگان و متن‌باز.</p>
        </div>
      </aside>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-400 text-primary-foreground shadow-glow">
              <BookOpen size={26} />
            </div>
            <h1 className="text-3xl font-extrabold">پاورق</h1>
          </div>

          <div className="glass rounded-3xl p-6 shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
              >
                {step === "phone" && (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void requestCode();
                    }}
                  >
                    <div>
                      <h2 className="text-xl font-extrabold">ورود یا ثبت‌نام</h2>
                      <p className="mt-1 text-sm text-muted-foreground">شماره موبایلت را وارد کن تا کد تایید بفرستیم.</p>
                    </div>
                    <Field label="شماره موبایل">
                      <Input
                        autoFocus
                        inputMode="tel"
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="text-lg"
                      />
                    </Field>
                    <Button className="w-full" disabled={busy || !phoneOk}>
                      دریافت کد ورود
                    </Button>
                  </form>
                )}

                {step === "code" && (
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void verify(false);
                    }}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground"
                      onClick={() => {
                        setStep("phone");
                        setCode("");
                      }}
                    >
                      <ArrowRight size={14} /> تغییر شماره
                    </button>
                    <div>
                      <h2 className="text-xl font-extrabold">کد تایید</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        کد ۶ رقمی ارسال‌شده به <b dir="ltr">{phone}</b> را وارد کن.
                      </p>
                    </div>
                    <OtpInput value={code} onChange={setCode} autoFocus />
                    {devCode && (
                      <p className="rounded-lg bg-accent/15 p-2 text-center text-xs text-accent-ink">
                        نسخه آزمایشی: کد ورود <b dir="ltr">{devCode}</b> است.
                      </p>
                    )}
                    <Button className="w-full" disabled={busy || code.length !== 6}>
                      ادامه
                    </Button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setCode("");
                        void requestCode();
                      }}
                      className="w-full text-center text-sm text-primary underline-offset-4 hover:underline"
                    >
                      ارسال دوباره کد
                    </button>
                  </form>
                )}

                {step === "register" && (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void verify(true);
                    }}
                  >
                    <div>
                      <h2 className="text-xl font-extrabold">تکمیل ثبت‌نام</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        فقط چند مورد ساده؛ بقیه اطلاعات را بعداً، هنگام اولین امانت، کامل می‌کنی.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar id={f.avatarId} size={72} className="shadow-glow" />
                        <button
                          type="button"
                          onClick={() => setPickAvatar(true)}
                          aria-label="تغییر آواتار"
                          title="تغییر آواتار"
                          className="absolute -bottom-1 -end-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <Field label="نام کاربری (عمومی)" error={touched ? errors.username : ""}>
                          <Input placeholder="mahan_reads" value={f.username} onChange={set("username")} />
                        </Field>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="نام" error={touched ? errors.firstName : ""}>
                        <Input placeholder="ماهان" value={f.firstName} onChange={set("firstName")} />
                      </Field>
                      <Field label="نام خانوادگی" error={touched ? errors.lastName : ""}>
                        <Input placeholder="منتظری" value={f.lastName} onChange={set("lastName")} />
                      </Field>
                    </div>
                    <Field label="کد دعوت حلقه (اختیاری)">
                      <Input
                        placeholder="UTEHRAN1"
                        value={f.inviteCode}
                        onChange={(e) => setF({ ...f, inviteCode: e.target.value.toUpperCase() })}
                      />
                    </Field>

                    <Button className="w-full" disabled={busy}>
                      <ShieldCheck size={16} /> ساخت حساب
                    </Button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      <AvatarPickerModal
        open={pickAvatar}
        onOpenChange={setPickAvatar}
        value={f.avatarId}
        onSave={(id) => setF((p) => ({ ...p, avatarId: id }))}
      />
    </main>
  );
}
