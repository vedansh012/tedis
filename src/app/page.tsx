"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Rocket, GraduationCap, Users2, Sparkles } from "lucide-react";
import { TedisMark } from "@/components/brand/tedis-mark";

/**
 * Landing page. Deliberately always-light (white-dominant, orange accents) so the
 * marketing surface reads consistently regardless of the viewer's app theme.
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

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white text-neutral-900 antialiased">
      {/* abstract background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,107,0,0.18),transparent)]" />
        <div className="absolute -right-40 top-40 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,150,50,0.14),transparent)]" />
        <div className="absolute bottom-0 -left-32 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,107,0,0.10),transparent)]" />
      </div>

      <div className="relative">
        {/* nav */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <TedisMark size={34} priority />
            <span className="text-lg font-semibold tracking-tight">TedIS</span>
          </Link>
          <nav className="text-sm">
            <Link href="/login" className="rounded-lg px-4 py-2 font-medium text-neutral-600 transition-colors hover:text-neutral-900">
              Log in
            </Link>
          </nav>
        </header>

        {/* hero */}
        <section className="mx-auto max-w-4xl px-6 pb-20 pt-14 text-center sm:pt-20">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex justify-center">
            <TedisMark size={104} float priority className="shadow-xl shadow-orange-500/20" />
          </motion.div>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-[#FF6B00]"
          >
            <Sparkles size={14} /> Build in the open
          </motion.p>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-6xl"
          >
            The home for builders,
            <br className="hidden sm:block" /> learners &amp; <span className="text-[#FF6B00]">creators</span>
          </motion.h1>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="mt-9 flex justify-center"
          >
            <Link
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-8 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-[#f26200] hover:shadow-xl hover:shadow-orange-500/30"
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
          <p className="mb-4 text-center text-sm text-neutral-500">Pick the topics you&rsquo;re curious about</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {TOPICS.map((t) => (
              <li key={t} className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm backdrop-blur">
                {t}
              </li>
            ))}
          </ul>
        </motion.section>

        {/* features */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={i}
                className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_10px_30px_-15px_rgba(255,107,0,0.15)]"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B00]">
                  <f.icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF6B00] to-[#ff8a3d] px-8 py-14 text-center shadow-xl shadow-orange-500/20"
          >
            <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <div aria-hidden className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10" />
            <div className="relative">
              <TedisMark size={64} className="mx-auto ring-4 ring-white/30" />
              <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">Start building in the open</h2>
              <p className="mx-auto mt-3 max-w-xl text-pretty text-orange-50">
                Join a home built for people who make things. It takes a minute — no résumé required.
              </p>
              <Link
                href="/signup"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-[#FF6B00] shadow-lg transition-transform hover:scale-[1.02]"
              >
                Create your account <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </section>

        {/* footer */}
        <footer className="border-t border-neutral-100">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-neutral-500 sm:flex-row">
            <div className="flex items-center gap-2">
              <TedisMark size={22} />
              <span className="font-medium text-neutral-700">TedIS</span>
            </div>
            <p>Build in the open.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
