"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Rocket, GraduationCap, Users2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";
import { TedisMark } from "@/components/brand/tedis-mark";

/**
 * Landing page. Themed via design tokens so it follows the app theme.
 * Motion is used for a soft staggered entrance; the brand mark floats.
 */

const TOPICS = [
  "AI", "Cybersecurity", "Cloud", "Robotics", "Design", "Finance",
  "Gaming", "Entrepreneurship", "Photography", "Health", "Education", "Science",
];

const FEATURES = [
  { icon: Rocket, title: "Show your work", body: "Your projects are your profile. Ship in the open and build a living portfolio, not a résumé." },
  { icon: GraduationCap, title: "Learn in the open", body: "Follow the people and topics you care about. Turn curiosity into a habit, together." },
  { icon: Users2, title: "Find collaborators", body: "Meet genuine builders in your interests and start something worth building." },
];

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease, delay: i * 0.08 } }),
};

// Feature card with mouse-tracked 3D tilt. Small angles (~7°) so it reads as depth,
// not as a gimmick. Spring smooths the reset when the pointer leaves.
function TiltCard({
  icon: Icon,
  title,
  body,
  index,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  index: number;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 250, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 250, damping: 20 });
  const glowX = useTransform(mx, (v) => `${(v + 0.5) * 100}%`);
  const glowY = useTransform(my, (v) => `${(v + 0.5) * 100}%`);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() { mx.set(0); my.set(0); }

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      custom={index}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ perspective: 900 }}
      className="group [transform-style:preserve-3d]"
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative rounded-2xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_20px_50px_-25px_hsl(var(--primary)/0.35)] transition-shadow duration-300 group-hover:shadow-[0_1px_3px_rgba(0,0,0,0.05),0_30px_70px_-25px_hsl(var(--primary)/0.5)]"
      >
        {/* pointer-tracked highlight — the "flash" on the flash card */}
        <motion.span
          aria-hidden
          style={{
            background: `radial-gradient(220px circle at ${glowX.get()} ${glowY.get()}, hsl(var(--primary)/0.18), transparent 65%)`,
            backgroundPositionX: glowX,
            backgroundPositionY: glowY,
          }}
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <div style={{ transform: "translateZ(28px)" }} className="relative">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 shadow-[inset_0_1px_0_hsl(var(--primary)/0.25)]">
            <Icon size={22} />
          </span>
          <h3 className="mt-4 text-lg font-semibold">{title}</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function LandingDark() {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      {/* abstract background — ember glows painted from the primary token */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.09),transparent)]" />
        <div className="absolute -right-40 top-40 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.06),transparent)]" />
        <div className="absolute bottom-0 -left-32 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.05),transparent)]" />
      </div>

      <div className="relative">
        {/* nav */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <TedisMark size={34} priority />
            <span className="text-lg font-semibold tracking-tight">TedIS</span>
          </Link>
          <nav className="text-sm">
            <Link
              href="/login"
              className="group inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 font-semibold text-white shadow-[0_0_0_1px_hsl(var(--primary)/0.08)_inset,0_6px_18px_-8px_hsl(var(--primary)/0.5)] transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/15 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)_inset,0_10px_24px_-8px_hsl(var(--primary)/0.6)]"
            >
              Log in
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </header>

        {/* hero */}
        <section className="mx-auto max-w-4xl px-6 pb-20 pt-14 text-center sm:pt-20">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex justify-center">
            <TedisMark size={104} float interactive priority className="shadow-xl shadow-primary/20" />
          </motion.div>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset] backdrop-blur"
          >
            <Sparkles size={14} /> Build in the open
          </motion.p>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-6xl"
          >
            The home for builders,
            <br className="hidden sm:block" /> learners &amp; <span className="text-primary">creators</span>
          </motion.h1>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="mt-9 flex justify-center"
          >
            <Link
              href="/signup"
              className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 font-semibold text-neutral-900 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_-1px_0_rgba(0,0,0,0.08)_inset,0_8px_24px_-6px_hsl(var(--primary)/0.35),0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_-1px_0_rgba(0,0,0,0.08)_inset,0_14px_32px_-8px_hsl(var(--primary)/0.5),0_0_0_1px_rgba(255,255,255,0.12)] active:translate-y-0 active:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_-1px_0_rgba(0,0,0,0.08)_inset,0_4px_12px_-3px_hsl(var(--primary)/0.3)]"
            >
              Choose your interests
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </section>

        {/* topic chips */}
        <motion.section
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-3xl px-6 pb-24"
        >
          <p className="mb-4 text-center text-sm text-muted-foreground">Pick the topics you&rsquo;re curious about</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {TOPICS.map((t) => (
              <li key={t} className="rounded-full border border-border bg-surface/80 px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm backdrop-blur">
                {t}
              </li>
            ))}
          </ul>
        </motion.section>

        {/* features */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <TiltCard key={f.title} icon={f.icon} title={f.title} body={f.body} index={i} />
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#f5a56a] via-[#f38a4a] to-[#f27222] px-8 py-14 text-center shadow-xl shadow-primary/25"
          >
            <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <div aria-hidden className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10" />
            <div className="relative">
              <TedisMark size={64} className="mx-auto ring-4 ring-white/30" />
              <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">Start building in the open</h2>
              <p className="mx-auto mt-3 max-w-xl text-pretty text-white/90">
                Join a home built for people who make things. It takes a minute — no résumé required.
              </p>
              <Link
                href="/signup"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl border border-white/70 bg-transparent px-7 py-3.5 font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] transition-all duration-150 hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
              >
                Create your account <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </section>

        {/* footer */}
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2">
              <TedisMark size={22} />
              <span className="font-medium text-foreground">TedIS</span>
            </div>
            <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link href="/terms" className="hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/cookies" className="hover:text-foreground">Cookies</Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
