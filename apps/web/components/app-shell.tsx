"use client";
import { motion } from "framer-motion";
import { BookOpen, Coins, Compass, Heart, Library, LogOut, Plus, Repeat, ShieldAlert, ShieldCheck, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { AddBookProvider, useAddBook } from "@/components/add-book-context";
import { TrustRing } from "@/components/trust-ring";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toFaDigits, displayName } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "کشف کتاب", short: "کشف", icon: Compass },
  { href: "/wishlist", label: "علاقه‌مندی‌ها", short: "نشان‌شده", icon: Heart },
  { href: "/library", label: "کتابخانه من", short: "کتابخانه", icon: Library },
  { href: "/loans", label: "امانت‌ها", short: "امانت‌ها", icon: Repeat },
  { href: "/circles", label: "حلقه‌ها و پاتوق‌ها", short: "حلقه‌ها", icon: Users, desktopOnly: true },
  { href: "/verify", label: "احراز هویت", short: "احراز", icon: ShieldCheck, desktopOnly: true },
  { href: "/profile", label: "پروفایل", short: "پروفایل", icon: User },
];
const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-400 text-primary-foreground shadow-glow">
        <BookOpen size={20} />
      </span>
      <span className="text-2xl font-extrabold tracking-tight">پاورق</span>
    </Link>
  );
}

function KarmaBadge() {
  const { me } = useAuth();
  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-sm font-bold text-accent-ink"
      title="اعتبار امانت"
    >
      <Coins size={16} /> {toFaDigits(me?.karmaTokens ?? 0)}
    </span>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { me, logout } = useAuth();
  return (
    <aside className="glass fixed inset-y-4 start-4 z-40 hidden w-64 flex-col rounded-3xl p-4 shadow-2xl lg:flex">
      <div className="px-2 py-2">
        <Logo />
      </div>
      <nav aria-label="ناوبری اصلی" className="mt-6 flex-1 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                active ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="side-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-l from-primary to-emerald-500 shadow-lg shadow-primary/30"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={20} className="relative" /> <span className="relative">{label}</span>
              {href === "/verify" && me && !me.identityVerified && (
                <span className="relative ms-auto h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
              )}
            </Link>
          );
        })}
      </nav>
      {me && (
        <Link href="/profile" className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3 transition hover:bg-muted">
          <Avatar id={me.avatarId} size={44} />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-end">{displayName(me)}</div>
            <div className="text-xs text-muted-foreground">امتیاز اعتماد {toFaDigits(me.trustScore)}</div>
          </div>
        </Link>
      )}
      <button
        onClick={logout}
        className="mt-2 flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <LogOut size={20} /> خروج از حساب
      </button>
    </aside>
  );
}

function TopBar() {
  const { me, logout } = useAuth();
  const { openAddBook } = useAddBook();
  return (
    <header className="glass sticky top-3 z-30 mb-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 shadow-lg lg:top-4">
      <div className="lg:hidden">
        <Logo />
      </div>
      <p className="hidden text-sm text-muted-foreground lg:block">
        سلام <b className="text-foreground">{me ? displayName(me) : ""}</b> 👋 امروز چه کتابی می‌خوانی؟
      </p>
      <div className="flex items-center gap-2.5">
        <KarmaBadge />
        {me && (
          <div className="hidden sm:block">
            <TrustRing value={me.trustScore} size={40} />
          </div>
        )}
        <Button size="sm" variant="accent" onClick={openAddBook} className="h-10">
          <Plus size={16} /> <span className="hidden sm:inline">افزودن کتاب</span>
          <span className="sm:hidden">کتاب</span>
        </Button>
        <button
          onClick={logout}
          aria-label="خروج از حساب"
          title="خروج از حساب"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-danger/10 hover:text-danger lg:hidden"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

function Dock() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border bg-background/80 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-xl lg:hidden"
    >
      <ul className="flex p-1.5">
        {NAV.filter((n) => !n.desktopOnly).map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] transition-colors",
                  active ? "font-bold text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-xl bg-primary shadow-lg shadow-primary/40"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={21} className="relative" strokeWidth={active ? 2.4 : 1.8} />
                <span className="relative">{short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function VerifyBanner() {
  const { me } = useAuth();
  const pathname = usePathname();
  if (!me || me.identityVerified || pathname.startsWith("/verify")) return null;
  return (
    <Link
      href="/verify"
      className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-l from-amber-500/20 to-amber-500/5 p-3.5 text-sm transition hover:border-amber-500"
    >
      <ShieldAlert className="shrink-0 text-accent-ink" size={22} />
      <span className="flex-1">برای افزودن کتاب و امانت گرفتن، احراز هویت لازم است.</span>
      <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">احراز هویت</span>
    </Link>
  );
}

/** Authenticated shell: glass sidebar + top bar on desktop, floating dock on mobile. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AddBookProvider>
      <Sidebar />
      <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-32 pt-3 lg:px-8 lg:pb-12 lg:pe-8 lg:ps-72">
        <TopBar />
        <VerifyBanner />
        <main>{children}</main>
      </div>
      <Dock />
    </AddBookProvider>
  );
}
