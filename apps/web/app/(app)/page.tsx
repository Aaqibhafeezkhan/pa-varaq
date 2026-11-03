"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BookCheck, BookX, Dices, Flame, Repeat, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { BookCard } from "@/components/book-card";
import { BookCover } from "@/components/book-cover";
import { CountUp } from "@/components/count-up";
import { HeartButton } from "@/components/heart-button";
import { SurpriseModal } from "@/components/surprise-modal";
import { TrustRing } from "@/components/trust-ring";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth";
import { toFaDigits, displayName } from "@/lib/format";
import { CONDITION_LABEL } from "@/lib/labels";
import type { Circle, Copy, Overview } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { BOOK_CONDITIONS, type BookCondition } from "@varaq/shared";

const GENRES = ["رمان", "فلسفه", "تاریخی", "علمی", "روانشناسی"];
type Scope = "all" | "nearby" | string; // string = circle id

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
          : "border-border bg-card/80 hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

function Ticker({ items }: { items: Overview["activity"] }) {
  if (!items.length) return null;
  const line = (a: Overview["activity"][number], i: number) => (
    <span key={i} className="mx-6 inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {a.type === "added" ? (
        <>
          <b>{displayName(a)}</b> کتاب «{a.title}» را به پاورق اضافه کرد
        </>
      ) : (
        <>
          «{a.title}» به <b>{displayName(a)}</b> برگشت داده شد 🔁
        </>
      )}
    </span>
  );
  return (
    <div className="glass overflow-hidden rounded-xl py-2.5" aria-label="تازه‌های پاورق" role="marquee">
      <div className="flex w-max animate-marquee">
        <div className="flex">{items.map(line)}</div>
        <div className="flex" aria-hidden>
          {items.map(line)}
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const { me } = useAuth();
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [genre, setGenre] = useState<string | null>(null);
  const [condition, setCondition] = useState<BookCondition | null>(null);
  const [surprise, setSurprise] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const overview = useApi<Overview>("/discover/overview");
  const circles = useApi<Circle[]>("/circles/mine");
  const featured = useApi<Copy[]>("/feed?sort=new&limit=12");

  const params = new URLSearchParams({ limit: "40", sort: q ? "relevance" : "new" });
  if (q) params.set("q", q);
  if (scope === "nearby") params.set("nearby", "true");
  else if (scope !== "all") params.set("circleId", scope);
  if (genre) params.set("genre", genre);
  if (condition) params.set("condition", condition);
  const feed = useApi<Copy[]>(`/feed?${params}`);

  const filtersKey = `${q}|${scope}|${genre}|${condition}`;
  const filtered = !!(q || scope !== "all" || genre || condition);
  const stats = overview.data?.stats;
  const pool = useMemo(() => featured.data ?? [], [featured.data]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 p-6 text-white shadow-2xl lg:p-10">
        <div className="pointer-events-none absolute -start-10 -top-16 h-64 w-64 rounded-full bg-amber-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 end-10 h-72 w-72 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-emerald-100">
              <Sparkles size={16} className="text-amber-300" /> همه کتاب‌های پاورق، بدون هیچ پیش‌شرطی
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight lg:text-5xl">
              کتاب بعدی‌ات
              <br />
              یک امانت فاصله دارد
            </h1>
            <div className="relative mt-6 max-w-xl">
              <Search size={20} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="جستجو"
                placeholder="جستجوی عنوان، نویسنده، ناشر یا شابک…"
                className="h-14 w-full rounded-2xl border-0 bg-white/95 ps-12 pe-4 text-base text-slate-900 shadow-xl outline-none placeholder:text-slate-500 focus:ring-4 focus:ring-amber-300/60"
              />
            </div>
            <Button variant="accent" className="mt-4 h-11" onClick={() => setSurprise(true)}>
              <Dices size={18} /> کتاب تصادفی پیشنهاد پاورق
            </Button>
          </div>

          {/* Bento stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "کتاب آماده امانت", value: stats?.availableBooks, icon: BookCheck, tone: "from-white/20" },
              { label: "امانت فعال", value: stats?.activeLoans, icon: Repeat, tone: "from-amber-300/30" },
              { label: "امانت موفق", value: stats?.completedLoans, icon: ShieldCheck, tone: "from-emerald-300/25" },
              { label: "عضو پاورق", value: stats?.members, icon: Users, tone: "from-violet-300/30" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className={`rounded-2xl border border-white/15 bg-gradient-to-br ${s.tone} to-white/5 p-4 backdrop-blur`}
              >
                <s.icon size={20} className="text-amber-200" />
                <div className="mt-2 text-3xl font-extrabold">{s.value === undefined ? "…" : <CountUp value={s.value} />}</div>
                <div className="text-xs text-emerald-50/90">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {overview.data && <Ticker items={overview.data.activity} />}

      {/* Featured carousel */}
      {!q && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold">
            <Flame className="text-amber-500" size={22} /> تازه‌های پاورق
          </h2>
          <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
            {featured.loading && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0" />)}
            {featured.data?.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-36 shrink-0 snap-start lg:w-40"
              >
                <Link href={`/books/${c.id}`} className="group block transition duration-300 hover:-translate-y-1.5 hover:scale-[1.03]">
                  <div className="relative">
                    <BookCover title={c.edition.title} author={c.edition.authors[0]} coverUrl={c.edition.coverUrl} className="w-full" />
                    <span className="absolute start-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                      جدید
                    </span>
                    <HeartButton editionId={c.edition.id} className="absolute end-2 top-2 h-8 w-8" />
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-bold">{c.edition.title}</p>
                  <p className="text-end text-xs text-muted-foreground">{displayName(c.owner)}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Popular & high-trust lenders */}
      {!q && overview.data && overview.data.topLenders.length > 0 && (
        <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-l from-violet-500/10 via-card/60 to-emerald-500/10 p-5 backdrop-blur">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
            <ShieldCheck className="text-emerald-600" size={22} /> امانت‌دهنده‌های محبوب و قابل‌اعتماد
          </h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto">
            {overview.data.topLenders.map((l, i) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="flex min-w-[220px] flex-1 items-center gap-3 rounded-2xl bg-card/80 p-3 shadow-paper"
              >
                <div className="relative">
                  <Avatar id={l.avatarId} size={48} />
                  {i === 0 && <span className="absolute -end-1 -top-1 text-lg">👑</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-end text-sm font-bold">{displayName(l)}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.lentCount ? `${toFaDigits(l.lentCount)} امانت موفق` : "تازه‌وارد معتمد"}
                  </div>
                </div>
                <TrustRing value={l.trustScore} size={42} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <section>
        <h2 className="mb-3 text-xl font-extrabold">{q ? `نتایج «${q}»` : "همه کتاب‌ها"}</h2>
        <div className="space-y-2.5">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="group" aria-label="فیلتر حلقه">
            <Pill active={scope === "all"} onClick={() => setScope("all")}>
              همه کتاب‌ها
            </Pill>
            <Pill active={scope === "nearby"} onClick={() => setScope("nearby")}>
              📍 نزدیک من
            </Pill>
            {circles.data?.map((c) => (
              <Pill key={c.id} active={scope === c.id} onClick={() => setScope(c.id)}>
                {c.name}
              </Pill>
            ))}
            <Link
              href="/circles"
              className="shrink-0 rounded-full border border-dashed border-border px-4 py-1.5 text-sm text-muted-foreground hover:border-primary"
            >
              + حلقه‌ها
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="group" aria-label="فیلتر ژانر">
            <Pill active={!genre} onClick={() => setGenre(null)}>
              همه ژانرها
            </Pill>
            {GENRES.map((g) => (
              <Pill key={g} active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
                {g}
              </Pill>
            ))}
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="group" aria-label="فیلتر وضعیت">
            <Pill active={!condition} onClick={() => setCondition(null)}>
              هر وضعیتی
            </Pill>
            {BOOK_CONDITIONS.map((c) => (
              <Pill key={c} active={condition === c} onClick={() => setCondition(condition === c ? null : c)}>
                {CONDITION_LABEL[c]}
              </Pill>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={filtersKey}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-5"
          >
            {feed.loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="aspect-[2/3.6]" />
                ))}
              </div>
            ) : feed.data && feed.data.length > 0 ? (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
              >
                {feed.data.map((c) => (
                  <motion.div key={c.id} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}>
                    <BookCard copy={c} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={<BookX size={34} />}
                title={filtered ? "کتابی با این فیلترها پیدا نشد" : "فعلاً کتابی آماده امانت نیست"}
                hint={
                  filtered ? "املای دیگری را امتحان کن یا فیلترها را بردار." : `${me ? "اولین نفر باش و کتابی به قفسه‌ات اضافه کن!" : ""}`
                }
              >
                {filtered && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setScope("all");
                      setGenre(null);
                      setCondition(null);
                    }}
                  >
                    پاک کردن فیلترها
                  </Button>
                )}
              </EmptyState>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <SurpriseModal open={surprise} onOpenChange={setSurprise} pool={pool} />
    </div>
  );
}
