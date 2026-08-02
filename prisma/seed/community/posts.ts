/**
 * Standalone posts — the ones that do not belong to a project.
 *
 * Anything that is part of a build story lives in `projects.ts` instead, on the
 * project's timeline, where it also carries a "Part of <project>" card into the
 * feed. Events are told exactly once: if a post here started duplicating a
 * timeline moment, the timeline kept it and this one was deleted.
 *
 * Written by hand for the same reason the personas are — at this volume,
 * generated prose reads as generated. Each post belongs to a specific person and
 * sounds like them: Laura is exasperated about changelogs, Ananya is a final-year
 * student who is honest about being lost.
 *
 * Rules the corpus follows:
 *  - `daysAgo` spreads posting across roughly ten weeks, weighted recent.
 *  - Media keys reference `media.ts` by meaning, never by index, so a post about
 *    a dashboard cannot drift onto a photo of a circuit board.
 *  - Comments come from other seeded people and respond to the actual post. No
 *    comment text is reused anywhere in this file.
 *  - Hashtags are written the way people write them: a couple at the end, not a
 *    keyword-stuffed trailer.
 */

import type { ImageKey, VideoKey } from "./media";

export interface SeedComment {
  /** Persona key of the commenter. */
  author: string;
  body: string;
  /** Hours after the post was published. Keeps threads chronological. */
  hoursAfter: number;
  /** Index of the comment in this list that this one replies to. */
  replyTo?: number;
}

export interface SeedPost {
  key: string;
  author: string;
  type: "UPDATE" | "QUESTION" | "RESOURCE" | "DISCUSSION" | "MILESTONE";
  /** Interest slug from the reference data. Drives which feeds surface the post. */
  interest: string;
  body: string;
  images?: ImageKey[];
  video?: VideoKey;
  linkUrl?: string;
  gitRepoUrl?: string;
  daysAgo: number;
  comments: SeedComment[];
}

export const POSTS: readonly SeedPost[] = [
  // ---------------------------------------------------------------- images --
  {
    key: "priya-eval-dashboard",
    author: "priya",
    type: "MILESTONE",
    interest: "ai",
    body: "Six weeks of building an eval set instead of shipping features, and here's the payoff: we can finally tell whether a retrieval change actually helped. 📈\n\nThe number that matters isn't the average — it's the bottom 10% of queries. That's where users were quietly giving up. We moved that from 41% to 68% answerable and nobody outside the team noticed, which is sort of the point.\n\nIf you're building RAG and you don't have a golden set yet, build it before your next model swap. You cannot A/B a vibe.\n\n#AI #RAG #MLOps",
    images: ["dashboardMetrics"],
    daysAgo: 3,
    comments: [
      { author: "emily", body: "The bottom-decile framing is exactly right. Averages hide the failures that make people churn — it's the same problem we have with long-horizon agent benchmarks.", hoursAfter: 2 },
      { author: "omar", body: "How big is your golden set? We're at ~300 hand-labelled queries and I keep wondering if that's enough to trust a 5% move.", hoursAfter: 5 },
      { author: "priya", body: "About 900 now, but honestly the first 200 gave us most of the signal. Below ~150 I wouldn't trust anything under a 10% swing.", hoursAfter: 7, replyTo: 1 },
      { author: "rohan", body: "Saving this. We're about to swap embedding models and were going to eyeball it. Clearly not doing that now.", hoursAfter: 26 },
    ],
  },
  {
    key: "sofia-empty-states",
    author: "sofia",
    type: "UPDATE",
    interest: "ui-ux-design",
    body: "Spent the whole week on empty states and I'd do it again.\n\nEvery screen in the product now answers three questions when it has no data: what goes here, why is it empty, and what do I press. Before this, six of our screens just showed a spinner that resolved into nothing. Users assumed the app was broken. It technically worked perfectly.\n\nThe happy path is the easiest 20% of design work and it gets 80% of the attention. 🙃\n\n#uxdesign #productdesign",
    images: ["uiWireframes", "uiResponsive"],
    daysAgo: 9,
    comments: [
      { author: "nadia", body: "Empty states are also where design systems fall apart fastest — everyone invents their own. We ended up shipping one component with a required `action` prop so you physically can't build a dead end.", hoursAfter: 4 },
      { author: "hannah", body: "\"It technically worked perfectly\" 😂 the most damning bug report there is.", hoursAfter: 6 },
      { author: "ananya", body: "This is really clarifying, thank you. I have a spinner that resolves into nothing in my project right now and I genuinely thought that was fine.", hoursAfter: 31 },
      { author: "sofia", body: "It's the most common thing I see, don't feel bad about it. Add one line of text and a button and you're ahead of most shipped products.", hoursAfter: 34, replyTo: 2 },
    ],
  },
  {
    key: "emily-eval-notes",
    author: "emily",
    type: "UPDATE",
    interest: "research",
    body: "Two months of notes on why long-horizon agent evals keep disagreeing with each other.\n\nShort version: most benchmarks score the final answer, but on a 40-step task the final answer is dominated by whether step 3 happened to work. Two runs of the same agent can differ more than two different agents. We've been measuring variance and calling it capability.\n\nStill writing this up properly. Posting the messy version because waiting for camera-ready helps nobody. 📓\n\n#research #AI #evaluation",
    images: ["researchNotes"],
    daysAgo: 15,
    comments: [
      { author: "priya", body: "This matches what we see at much smaller scale. We started scoring intermediate steps and the rankings changed completely.", hoursAfter: 3 },
      { author: "omar", body: "Do you report variance across seeds in the paper? Almost nobody does and it makes half the tables unreadable.", hoursAfter: 11 },
      { author: "emily", body: "Five seeds, and yes, error bars. It makes our own results look worse and I think that's correct.", hoursAfter: 13, replyTo: 1 },
      { author: "diego", body: "Same failure mode in robotics — a policy that works 8/10 times looks identical to one that works 2/10 if you only report the successful demo.", hoursAfter: 28 },
    ],
  },
  {
    key: "ananya-desk-setup",
    author: "ananya",
    type: "UPDATE",
    interest: "project-showcase",
    body: "Hostel desk, final semester. 💜\n\nNot the prettiest setup on this platform but it's where I've written every line of my capstone. Second-hand monitor from a senior who graduated, keyboard I saved three months for, and a lamp that flickers when the fan is on.\n\nYou genuinely do not need good gear to start. I wish someone had told me that in first year instead of letting me think I was behind.\n\n#studentlife #buildinpublic",
    images: ["workspaceRgb"],
    daysAgo: 21,
    comments: [
      { author: "kwame", body: "I wrote my first open source contribution on a laptop with a broken hinge propped against a book. Gear is the least important variable.", hoursAfter: 2 },
      { author: "meera", body: "The saved-three-months keyboard hits. Enjoy it — nothing you buy later will feel as good.", hoursAfter: 4 },
      { author: "marcus", body: "Genuinely one of the better setups I've seen this week, because something real is getting made on it.", hoursAfter: 9 },
      { author: "hannah", body: "The flickering lamp detail 😭 good luck with the capstone!", hoursAfter: 30 },
    ],
  },
  {
    key: "fatima-secrets-audit",
    author: "fatima",
    type: "UPDATE",
    interest: "cybersecurity",
    body: "Ran a secrets scan across every internal repo last month. 63 live credentials in git history. 🔑\n\nBreakdown: 31 were test keys that turned out to be production, 19 were rotated years ago and forgotten, 13 were fully live and one of them was a database superuser.\n\nNobody on the team is careless. They were all committed during an incident, at 2am, when someone needed to get something working. That's when it always happens — which is why the fix is pre-commit hooks and short-lived credentials, not a training slide about being careful.\n\n#appsec #devsecops",
    images: ["padlockKeyboard"],
    daysAgo: 30,
    comments: [
      { author: "arjun", body: "\"Committed during an incident at 2am\" — every single time. Process fixes beat willpower fixes.", hoursAfter: 2 },
      { author: "chris", body: "The test-keys-that-were-actually-production category is the one that scares me most. Nobody even knows they're exposed.", hoursAfter: 6 },
      { author: "daniel", body: "What are you using for the scan? We've been meaning to do this and keep not doing it.", hoursAfter: 11 },
      { author: "fatima", body: "gitleaks in CI plus a one-off full-history sweep. The history sweep is the one that hurts — start there.", hoursAfter: 12, replyTo: 2 },
    ],
  },
  {
    key: "kwame-triage-reality",
    author: "kwame",
    type: "UPDATE",
    interest: "open-source",
    body: "What maintaining a library actually looks like this week: 0 features, 14 issues triaged, 6 closed as duplicates, 2 closed as \"working as intended\", 1 genuinely great bug report from someone who included a minimal reproduction and I could have kissed them. 🙏\n\nIf you want to help a maintainer, that last one is how. A repro is worth ten \"any update on this?\" comments.\n\n#opensource #maintainers",
    images: ["codeReactLogo"],
    // Kwame's own project, seeded in projects.ts — never a real third-party repo,
    // which would read as this fictional person claiming to maintain it.
    gitRepoUrl: "https://github.com/kwamemensah/riverbed",
    daysAgo: 33,
    comments: [
      { author: "hannah", body: "The minimal reproduction is such an underrated skill. Half the time I find my own bug while making one.", hoursAfter: 3 },
      { author: "laura", body: "A good issue template does a surprising amount of this work for you. Ours cut duplicate reports by about half.", hoursAfter: 7 },
      { author: "wei", body: "\"Working as intended\" closes are the ones that generate the angriest replies, in my experience.", hoursAfter: 16 },
      { author: "kwame", body: "Every time. I've started explaining the reasoning in the close comment — takes two minutes, avoids a week of argument.", hoursAfter: 18, replyTo: 2 },
    ],
  },
  {
    key: "laura-changelog",
    author: "laura",
    type: "UPDATE",
    interest: "education",
    body: "Rewrote our changelog format and the support load dropped. Same releases, different words.\n\nBefore: \"Fixed an issue with sync.\"\nAfter: \"Fixed: records edited on two devices within the same minute could lose the older edit. Affects v3.1–v3.4. No action needed after updating.\"\n\nThe second one takes ninety seconds longer to write and stops roughly eleven support tickets. Writing is not overhead, it's the cheapest engineering you can do. ✍️\n\n#techwriting #docs",
    images: ["planningNotebook"],
    daysAgo: 36,
    comments: [
      { author: "kwame", body: "\"Fixed an issue with sync\" is a confession that you don't want anyone to ask follow-up questions.", hoursAfter: 4 },
      { author: "nadia", body: "Does anyone actually read changelogs though? Genuine question — I'd love the data.", hoursAfter: 9 },
      { author: "laura", body: "Ours gets about 4k views a release, mostly from admins deciding whether to upgrade. Small audience, very high stakes.", hoursAfter: 11, replyTo: 1 },
      { author: "arjun", body: "The \"no action needed\" line is doing a lot of work there. That's the sentence ops people are actually looking for.", hoursAfter: 22 },
    ],
  },
  {
    key: "chris-multicloud",
    author: "chris",
    type: "DISCUSSION",
    interest: "cloud",
    body: "Unpopular opinion after twelve years of doing this: most multi-cloud strategies are an expensive way to use the worst features of two providers.\n\nYou give up managed services, you write an abstraction layer that leaks anyway, and you double your on-call surface — to protect against a vendor failure that is far less likely than the outage your own abstraction layer will cause.\n\nPortability is a real requirement for maybe 5% of teams. For the rest it's a slide in a board deck.\n\nHappy to be argued with. I have been wrong about this before, but not recently. 😄\n\n#cloud #architecture",
    images: ["networkSwitch"],
    daysAgo: 45,
    comments: [
      { author: "arjun", body: "The leaky abstraction point is the one people underestimate. Ours handled 90% of cases and the remaining 10% consumed a full engineer.", hoursAfter: 3 },
      { author: "fatima", body: "Counterpoint: for regulated workloads it isn't a board slide, it's a contractual requirement. But agreed that's nowhere near the majority.", hoursAfter: 6 },
      { author: "chris", body: "That's fair and it's the strongest version of the argument. Regulatory portability is a real requirement — \"what if AWS raises prices\" is not.", hoursAfter: 8, replyTo: 1 },
      { author: "wei", body: "Also worth separating multi-cloud from avoiding proprietary lock-in at the data layer. Postgres everywhere is cheap insurance; a cross-cloud control plane is not.", hoursAfter: 19 },
      { author: "daniel", body: "We're single-cloud and the thing that has actually bitten us is regional capacity, not vendor failure. Nobody plans for that one.", hoursAfter: 30 },
    ],
  },
  {
    key: "hannah-lcp-fonts",
    author: "hannah",
    type: "UPDATE",
    interest: "web-development",
    body: "Cut our Largest Contentful Paint from 4.1s to 1.6s on a mid-range Android over 3G. Nothing clever, just four unglamorous things:\n\n1. Fonts — dropped from four weights to two, preloaded, `font-display: swap`\n2. The hero image was a 1.4MB PNG. It is now a 90KB WebP.\n3. Deferred an analytics script that was blocking render for 600ms\n4. Removed a carousel nobody clicked\n\nNumber 4 was the biggest single win, which tells you something. 🐌➡️⚡\n\n#webperf #frontend #a11y",
    images: ["codeDevtools"],
    daysAgo: 54,
    comments: [
      { author: "sofia", body: "\"Removed a carousel nobody clicked\" is the most reliable performance optimisation in the industry.", hoursAfter: 2 },
      { author: "kwame", body: "The analytics-blocking-render one is so common. Worth auditing what your tag manager actually loads — ours pulled in three vendors we'd stopped paying.", hoursAfter: 7 },
      { author: "nadia", body: "Curious how you got sign-off on removing the carousel. That's usually a marketing fight.", hoursAfter: 12 },
      { author: "hannah", body: "Click data. 0.3% of sessions touched slide 2. Hard to defend 400KB for that.", hoursAfter: 13, replyTo: 2 },
      { author: "meera", body: "Mid-range Android over 3G as the test device is the right call. Testing on a flagship on office wifi tells you nothing.", hoursAfter: 26 },
    ],
  },
  {
    key: "omar-dialect-data",
    author: "omar",
    type: "UPDATE",
    interest: "ai",
    body: "Word error rate on Egyptian Arabic: 34% with the best off-the-shelf model we could buy, 11% with ours. 🎙️\n\nNot because our architecture is clever — it isn't, it's a fairly standard setup. It's because we spent seven months collecting and labelling dialect audio that nobody else had bothered to collect.\n\nThe uncomfortable lesson for a founder: our moat is data janitorial work, not ML. That's a harder story to tell investors and a much better business.\n\n#speechrecognition #AI #startups",
    images: ["mlTypewriter"],
    daysAgo: 57,
    comments: [
      { author: "emily", body: "This is the finding that keeps repeating across every applied ML domain and keeps not being believed.", hoursAfter: 5 },
      { author: "priya", body: "34% → 11% is not a marginal improvement, that's the difference between unusable and shippable. Congrats.", hoursAfter: 9 },
      { author: "marcus", body: "\"A harder story to tell investors and a much better business\" — bookmarking that for my next deck rewrite.", hoursAfter: 18 },
      { author: "omar", body: "Took me a while to stop apologising for it in meetings, honestly. Defensible is defensible.", hoursAfter: 20, replyTo: 2 },
    ],
  },
  {
    key: "wei-rust-rewrite-honest",
    author: "wei",
    type: "UPDATE",
    interest: "programming",
    body: "The honest retro on our Rust rewrite, one year on.\n\np99 latency: 84ms → 51ms. Memory: down about 60%. Zero segfaults, zero data races, which was the actual goal.\n\nCost: three months of two engineers, plus roughly two months where the team was slower because half of us were still learning. Nobody puts that in the blog post.\n\nWould I do it again for this service? Yes — it's on every request path. Would I do it for the admin backend? Absolutely not.\n\n#rust #performance #engineering",
    images: ["terminalSudo"],
    daysAgo: 60,
    comments: [
      { author: "tobias", body: "The \"two months where the team was slower\" line is the one I always have to explain to management. Ramp cost is real and it's invisible in the benchmarks.", hoursAfter: 3 },
      { author: "arjun", body: "Zero data races being the actual goal is the part people miss. The latency win is nice; the class of bug you deleted is the return.", hoursAfter: 8 },
      { author: "kwame", body: "Refreshing to see a rewrite post that names a service it wouldn't be worth doing for.", hoursAfter: 15 },
      { author: "daniel", body: "Did you rewrite in place or run both and shift traffic?", hoursAfter: 25 },
      { author: "wei", body: "Shadow traffic for six weeks, then a percentage rollout. Found three behavioural differences that way that tests never caught.", hoursAfter: 27, replyTo: 3 },
    ],
  },
  {
    key: "priya-conference-talk",
    author: "priya",
    type: "UPDATE",
    interest: "ai",
    body: "Gave my first conference talk yesterday: \"Your RAG system is fine, your evaluation isn't.\" 🎤\n\nI have never been that nervous. Shook through the first three slides. Then someone in row two nodded at the part about golden sets and I was fine for the remaining twenty minutes.\n\nThe Q&A was better than the talk. Three people described the exact failure mode I'd spent six months on and thought was ours alone.\n\nRecording should be up in a few weeks — I'll post it when it lands. Say hi if you were there. 👋\n\n#AI #conference #publicspeaking",
    images: ["speakerStage", "conferenceSkyline"],
    daysAgo: 66,
    comments: [
      { author: "emily", body: "\"The Q&A was better than the talk\" is true of almost every good talk. It means you picked a real problem.", hoursAfter: 4 },
      { author: "nadia", body: "Shaking through the first three slides is universal. Nobody in the audience can tell, for what it's worth.", hoursAfter: 8 },
      { author: "omar", body: "Sorry I missed it — is there a recording coming?", hoursAfter: 16 },
      { author: "priya", body: "Organisers said about three weeks. I'll post it when it's up.", hoursAfter: 17, replyTo: 2 },
    ],
  },

  // ---------------------------------------------------------------- videos --
  {
    key: "sofia-motion-spec",
    author: "sofia",
    type: "UPDATE",
    interest: "ui-ux-design",
    body: "Motion spec for the sheet transition. Everything here is 200ms or under. ⏱️\n\nIf an animation is over ~300ms the user has stopped reading it as feedback and started reading it as waiting. We had this at 450ms and testers described the app as \"slow\" — while every network call was faster than the competitor's.\n\nPerceived speed is a design decision, not just an engineering one.\n\n#uidesign #motiondesign #ux",
    video: "pexelsMotion",
    daysAgo: 11,
    comments: [
      { author: "hannah", body: "The 300ms threshold matches what we found. Also worth respecting prefers-reduced-motion — for some users the animation isn't feedback at all, it's nausea.", hoursAfter: 4 },
      { author: "sofia", body: "Absolutely — reduced-motion drops all of these to a cross-fade. Should have said so in the post.", hoursAfter: 6, replyTo: 0 },
      { author: "meera", body: "\"Stopped reading it as feedback and started reading it as waiting\" — that's the clearest articulation of this I've seen.", hoursAfter: 15 },
      { author: "yuki", body: "We shipped 400ms transitions for a year and got \"laggy\" in reviews. Cut to 180ms, same complaints vanished.", hoursAfter: 29 },
    ],
  },
  {
    key: "priya-eval-run",
    author: "priya",
    type: "UPDATE",
    interest: "machine-learning",
    body: "A full eval sweep, sped up. 900 queries against four retrieval configurations, about 40 minutes of real time. 🔁\n\nWatching it run is oddly calming, and it's also how I catch problems — you can see a config start failing in a cluster of similar queries long before the summary number tells you anything.\n\nThe summary is what goes in the doc. The run is where the understanding happens.\n\n#MLOps #AI #evaluation",
    video: "pexelsTyping",
    daysAgo: 17,
    comments: [
      { author: "rohan", body: "Do you log per-query results or only the aggregate? The clustering insight only works if you keep the raw output.", hoursAfter: 6 },
      { author: "priya", body: "Every query, every config, forever. Storage is cheap and the aggregate has thrown away the interesting part by definition.", hoursAfter: 8, replyTo: 0 },
      { author: "emily", body: "Strongly agree. Half my research findings came from re-reading raw outputs from a run I'd already \"finished\".", hoursAfter: 19 },
    ],
  },
  {
    key: "hannah-profiling-session",
    author: "hannah",
    type: "UPDATE",
    interest: "web-development",
    body: "Profiling session, recorded because people keep asking how I find this stuff. 🔍\n\nThere's no trick. Open the performance panel, record an interaction, look for the widest bar, ask why it's wide. Repeat until bored or fast.\n\nMost people skip this because the flame graph looks intimidating. It's a list of what happened, sorted by how long it took. That's all it is.\n\n#webperf #frontend #devtools",
    video: "pexelsWork",
    daysAgo: 29,
    comments: [
      { author: "ananya", body: "\"A list of what happened, sorted by how long it took\" — I have avoided flame graphs for two years and that sentence fixed it.", hoursAfter: 3 },
      { author: "kwame", body: "The intimidation factor is real and it's mostly a UI problem. The data is simple, the presentation is dense.", hoursAfter: 11 },
      { author: "meera", body: "Same workflow in Instruments, different buttons. Worth learning once and reusing on every platform you touch.", hoursAfter: 20 },
    ],
  },
  {
    key: "wei-bench-run",
    author: "wei",
    type: "UPDATE",
    interest: "programming",
    body: "Benchmark run against the new connection pool. 🧪\n\nImportant caveat that gets left out of most benchmark posts: this is a synthetic workload on an idle machine. Real traffic is bursty, shares a host with noisy neighbours, and has a cache that behaves completely differently under concurrency.\n\nThe number is 2.1x. The number you'd see in production is probably 1.3x. Both are worth having, but only one is honest to put in a headline.\n\n#rust #benchmarking #performance",
    video: "pexelsCode",
    daysAgo: 32,
    comments: [
      { author: "tobias", body: "The gap between synthetic and production benchmarks is where most \"10x faster\" claims live.", hoursAfter: 5 },
      { author: "arjun", body: "Noisy neighbours are the variable nobody can reproduce locally and everybody hits in prod.", hoursAfter: 12 },
      { author: "chris", body: "Appreciate you publishing the caveat above the number rather than in a footnote.", hoursAfter: 23 },
    ],
  },
  {
    key: "fatima-hardware-key",
    author: "fatima",
    type: "UPDATE",
    interest: "cybersecurity",
    body: "Testing the hardware token rollout before we push it company-wide. 🔐\n\nWe moved everyone off TOTP. The reason isn't that TOTP is broken — it's that it's phishable, and our last tabletop exercise showed a convincing login page beats security training every single time.\n\nHardware keys make the phishing question structural instead of a matter of whether someone is having a bad morning.\n\n#security #phishing #mfa",
    video: "pexelsCircuit",
    daysAgo: 41,
    comments: [
      { author: "chris", body: "Structural beats behavioural for every control that depends on a human being alert at 4pm on a Friday.", hoursAfter: 3 },
      { author: "arjun", body: "How are you handling the lost-key path? That's where every rollout I've seen gets messy.", hoursAfter: 8 },
      { author: "fatima", body: "Two keys per person, mandatory, one stays at home. The recovery flow is a video call with a manager — deliberately slow and annoying.", hoursAfter: 10, replyTo: 1 },
      { author: "daniel", body: "Deliberately slow and annoying is correct for account recovery. That's the path attackers actually use.", hoursAfter: 22 },
    ],
  },

  // ------------------------------------------------------------------ text --
  {
    key: "tobias-debug-story",
    author: "tobias",
    type: "DISCUSSION",
    interest: "programming",
    body: "Debugging story, because I think about it every few months.\n\nA service failed once a week, always overnight, never reproducible. Six weeks of investigation. Logs showed nothing. Memory was fine. It ran clean for days and then simply stopped.\n\nIt was a certificate renewal cron on a different machine that restarted a shared dependency, which dropped connections, which our retry logic handled — except the retry used a connection pool that had already been marked closed.\n\nThe bug was in our code. The trigger was in someone else's calendar.\n\nLesson I actually took from it: when something fails on a schedule, stop reading the code and go find out what else runs on that schedule. 🕵️\n\n#debugging #distributedsystems",
    daysAgo: 2,
    comments: [
      { author: "arjun", body: "\"The trigger was in someone else's calendar\" — this is why correlating deploy and cron timelines with incidents is worth the setup cost.", hoursAfter: 2 },
      { author: "wei", body: "Weekly periodicity is such a strong signal and it's so easy to dismiss as coincidence for the first month.", hoursAfter: 5 },
      { author: "ananya", body: "Six weeks?! Did you ever feel like you should give up and just add a restart?", hoursAfter: 9 },
      { author: "tobias", body: "We did add a restart in week three. It stopped the pages and made finding the real cause much harder — I'd think twice about that trade next time.", hoursAfter: 11, replyTo: 2 },
      { author: "fatima", body: "The honest addendum about the restart making it harder is the most useful part of this post.", hoursAfter: 20 },
    ],
  },
  {
    key: "laura-write-it-down",
    author: "laura",
    type: "DISCUSSION",
    interest: "education",
    body: "The most expensive sentence in software is \"I'll remember why I did this.\"\n\nYou will not. I have watched senior engineers stare at their own six-month-old code with the expression of someone reading a stranger's handwriting.\n\nWrite the why in the commit message. Not what changed — the diff already says that — but what you knew at that moment that isn't visible in the code. The constraint, the thing you tried first, the reason the obvious approach doesn't work.\n\nIt takes ninety seconds and it is the highest-return writing in this industry. ✍️\n\n#techwriting #engineering #documentation",
    daysAgo: 5,
    comments: [
      { author: "kwame", body: "\"What you knew at that moment that isn't visible in the code\" is the best definition of a useful comment I've read.", hoursAfter: 3 },
      { author: "tobias", body: "The one I write most often now is \"tried X first, it fails because Y.\" Saves the next person from repeating my week.", hoursAfter: 6 },
      { author: "nadia", body: "Design decisions have the same rot. Six months on, nobody remembers which constraint the weird spacing was solving.", hoursAfter: 13 },
      { author: "hannah", body: "git blame becomes an actual archaeology tool when people do this, rather than a way to find who to be annoyed at.", hoursAfter: 27 },
    ],
  },
  {
    key: "kwame-maintainer-boundaries",
    author: "kwame",
    type: "DISCUSSION",
    interest: "open-source",
    body: "I took two weeks completely off from the repo and nothing bad happened.\n\nI want to say that clearly because I spent three years believing the opposite. 340 issues, some of them angry, and I felt personally responsible for every one at all hours.\n\nWhat I do now:\n• Issues get looked at twice a week, not continuously\n• \"No\" is a complete answer and doesn't need a paragraph of apology\n• Nobody is entitled to my weekend because they use my library for free\n\nBurnout in open source isn't caused by the work. It's caused by the belief that the work is never allowed to stop. 🌱\n\n#opensource #burnout #maintainers",
    daysAgo: 13,
    comments: [
      { author: "laura", body: "The apology paragraph is such a trap. A kind, short no is more respectful than a long guilty yes you'll resent.", hoursAfter: 4 },
      { author: "hannah", body: "Two weeks off and nothing broke is worth saying out loud, because the fear is always that everything will.", hoursAfter: 8 },
      { author: "marcus", body: "Same lesson in founding, honestly. The always-on belief is the thing that breaks you, not the hours.", hoursAfter: 16 },
      { author: "diego", body: "Needed to read this. Grad school has the identical failure mode with a different vocabulary.", hoursAfter: 34 },
    ],
  },
  {
    key: "ananya-interview-question",
    author: "ananya",
    type: "QUESTION",
    interest: "interview-prep",
    body: "Genuine question from someone in the middle of placement season. 🙋‍♀️\n\nI've solved around 400 DSA problems. I can do a medium in about 20 minutes. But in my last two interviews I froze — not because I didn't know the approach, but because I couldn't talk and think at the same time while someone watched.\n\nIs that a thing you get better at, or a thing you work around? Everyone tells me to \"just practice more problems\" and I don't think more problems is the missing piece here.\n\n#interviewprep #placements #dsa",
    daysAgo: 16,
    comments: [
      { author: "wei", body: "It's a separate skill and it is trainable. Solve problems out loud, alone, in an empty room. Feels ridiculous, works.", hoursAfter: 2 },
      { author: "daniel", body: "Also worth saying out loud in the interview: \"let me think quietly for thirty seconds.\" Every interviewer I know is fine with that. Silence is only awkward if it's unexplained.", hoursAfter: 4 },
      { author: "hannah", body: "I've been on the other side of this a lot. A candidate who says \"I'm going to sketch this before I speak\" reads as senior, not stuck.", hoursAfter: 7 },
      { author: "ananya", body: "This is so much more useful than \"do more problems.\" Going to try the empty-room thing this week, thank you all. 🙏", hoursAfter: 10, replyTo: 1 },
      { author: "kwame", body: "400 problems is plenty. You have the knowledge; you're debugging the interface, not the engine.", hoursAfter: 18 },
    ],
  },
  {
    key: "emily-ai-trend-take",
    author: "emily",
    type: "DISCUSSION",
    interest: "ai",
    body: "A thing I've noticed reviewing papers this year: the benchmark numbers keep improving and the reproductions keep failing.\n\nNot because anyone is lying. It's that the setups have quietly become enormous — a specific prompt template, a specific retry policy, a decoding config in an appendix, an undocumented filtering step. Each one is defensible. Together they mean the result belongs to that pipeline, not to the model.\n\nWe've started asking a simple question in review: if a competent person spent a week on this, would they get your number? Surprisingly often the honest answer is no. 🔬\n\n#AI #research #reproducibility",
    daysAgo: 19,
    comments: [
      { author: "priya", body: "The industry version of this is a demo that only works with the prompt the founder wrote. Same failure, higher valuation.", hoursAfter: 5 },
      { author: "omar", body: "We now publish the full config with any number we quote, mostly because I got tired of not being able to reproduce our own results from three months ago.", hoursAfter: 9 },
      { author: "rohan", body: "\"The result belongs to the pipeline, not the model\" applies to basically every ML claim I've had to productionise.", hoursAfter: 15 },
      { author: "emily", body: "That's the sentence I've been trying to write for two weeks, and you got it in one line. Borrowing it.", hoursAfter: 17, replyTo: 2 },
    ],
  },
  {
    key: "chris-boring-tech",
    author: "chris",
    type: "DISCUSSION",
    interest: "system-design",
    body: "Every architecture review I've sat in this year has had a moment where someone proposes a queue for a problem that a database transaction solves.\n\nQueues are wonderful and they cost you: ordering guarantees you now have to reason about, a dead-letter path someone must own, a new failure mode where the producer succeeded and the consumer didn't, and an on-call rotation that has to understand all of it at 3am.\n\nIf both options work, pick the one with fewer moving parts. You can always add the queue later. Removing one is a migration. 🧱\n\n#systemdesign #architecture",
    daysAgo: 22,
    comments: [
      { author: "tobias", body: "\"You can always add the queue later, removing one is a migration\" is the whole argument in two clauses.", hoursAfter: 3 },
      { author: "wei", body: "Would push back slightly — adding a queue later often means rewriting the calling code to be async anyway. Sometimes the cheap version is the expensive one.", hoursAfter: 7 },
      { author: "chris", body: "Fair, and that's the real cost to weigh. My objection is to reaching for it by default, not to ever using one.", hoursAfter: 9, replyTo: 1 },
      { author: "arjun", body: "The dead-letter-path-someone-must-own line is painfully accurate. In practice nobody owns it until the first incident.", hoursAfter: 18 },
      { author: "rohan", body: "Inherited a system with four queues and no dead-letter handling anywhere. Can confirm.", hoursAfter: 29 },
    ],
  },
  {
    key: "marcus-almost-quit",
    author: "marcus",
    type: "UPDATE",
    interest: "entrepreneurship",
    body: "Month 11 I had a spreadsheet open with my runway on it and a job application in another tab. I've never told anyone that.\n\nWhat kept me going wasn't grit or a motivational quote. It was one customer who emailed to ask when a feature was shipping, because her team had started depending on it. That was it. One person who would have been mildly inconvenienced if I quit.\n\nThe survivorship-biased version of this story is \"never give up.\" The true version is that I got lucky that the email arrived that week.\n\nIf you're in month 11 right now: the fact that it feels like this doesn't mean you're doing it wrong. 🤝\n\n#startups #foundermentalhealth #buildinpublic",
    daysAgo: 28,
    comments: [
      { author: "omar", body: "Month 11 for me was February. The email version was a WhatsApp voice note from a user. Genuinely the only reason I kept going.", hoursAfter: 4 },
      { author: "sofia", body: "Thank you for naming the survivorship bias instead of selling it as inevitable. That framing does real damage.", hoursAfter: 8 },
      { author: "priya", body: "\"One person who would have been mildly inconvenienced\" is a very low bar to keep going for, and apparently it's enough.", hoursAfter: 14 },
      { author: "laura", body: "Posts like this are worth more to people three months behind you than any growth chart.", hoursAfter: 26 },
    ],
  },
  {
    key: "daniel-friday-deploy",
    author: "daniel",
    type: "DISCUSSION",
    interest: "devops",
    body: "We deploy on Fridays. We deploy on Friday afternoons. Nothing bad happens, and I want to explain why, because it isn't bravery.\n\nIt's that a deploy is 40 lines, goes out behind a flag, rolls back in 30 seconds with one command, and gets validated by tests we actually trust.\n\n\"Don't deploy on Friday\" is a sensible rule for a team whose deploys are 4,000 lines, manual, and irreversible. But the rule treats the symptom. The real problem is that your deploys are terrifying — and Friday isn't what makes them terrifying. 🚀\n\n#devops #cicd #deployment",
    daysAgo: 34,
    comments: [
      { author: "arjun", body: "Agreed with one caveat: even with good deploys, having fewer people around to notice a slow-burn issue is a real risk. We deploy Fridays but not after 3pm.", hoursAfter: 3 },
      { author: "chris", body: "The rule is a proxy for deploy quality. Teams that can't deploy Friday usually can't safely deploy Tuesday either, they just find out slower.", hoursAfter: 6 },
      { author: "daniel", body: "The 3pm cutoff is reasonable and honestly we do something similar in practice. It's the blanket \"never\" I'm arguing with.", hoursAfter: 8, replyTo: 0 },
      { author: "fatima", body: "Feature flags change this conversation completely. Deploy and release stop being the same event.", hoursAfter: 15 },
      { author: "kwame", body: "\"Friday isn't what makes them terrifying\" — that's the post.", hoursAfter: 21 },
    ],
  },
  {
    key: "nadia-design-politics",
    author: "nadia",
    type: "DISCUSSION",
    interest: "product-design",
    body: "Nobody tells you that maintaining a design system is 70% negotiation.\n\nThree teams want three variants of the same button. Each has a real reason. Say yes to all of them and in a year you have a component with eleven props and no opinion, which is not a system, it's a shed.\n\nWhat's worked for me: make the default easy and the exception expensive but possible. You can have your variant — you write the rationale, it goes in the docs, and you own it at the next audit.\n\nOwnership makes people surprisingly reasonable about whether they truly need it. 🧩\n\n#designsystems #productdesign",
    daysAgo: 44,
    comments: [
      { author: "sofia", body: "\"A component with eleven props and no opinion\" — I have built that component. Twice.", hoursAfter: 2 },
      { author: "hannah", body: "The expensive-but-possible framing is exactly how good lint rules work too. Escape hatches should require a comment explaining yourself.", hoursAfter: 9 },
      { author: "laura", body: "Making them write the rationale is doing double duty — you get the docs and the filter in one step.", hoursAfter: 12 },
      { author: "nadia", body: "That was the accidental discovery, honestly. I wanted the docs and got the filter for free.", hoursAfter: 14, replyTo: 2 },
    ],
  },
  {
    key: "hannah-career-advice",
    author: "hannah",
    type: "DISCUSSION",
    interest: "career",
    body: "Career advice I'd give my younger self, which is the only person I'm qualified to advise:\n\nThe engineers who got promoted around me were not the best programmers. They were the ones who made other people more effective — the ones whose code review comments taught you something, who wrote the doc that stopped the same question being asked nine times.\n\nI spent two years optimising for being impressive. Impressive is a solo activity and it has a ceiling.\n\nThis isn't \"soft skills matter,\" which is a phrase I hate. It's that the job is more collaborative than it looks from the outside, and nobody tells you that in a bootcamp. 🌱\n\n#career #engineering #mentorship",
    daysAgo: 47,
    comments: [
      { author: "kwame", body: "\"Impressive is a solo activity and it has a ceiling.\" That's going on a sticky note.", hoursAfter: 5 },
      { author: "ananya", body: "As someone about to start: what does this look like in your first year, when you don't know enough to make anyone more effective yet?", hoursAfter: 11 },
      { author: "hannah", body: "Write down what confused you while it's fresh. You're the only person who can still see what's unobvious — in six months you'll have forgotten. That doc is genuinely valuable.", hoursAfter: 13, replyTo: 1 },
      { author: "laura", body: "The new-person confusion doc is the single best onboarding artefact and almost nobody captures it in time.", hoursAfter: 19 },
      { author: "marcus", body: "Same is true of founders. The ones who last make their team effective; the ones who burn out try to be the smartest person in every room.", hoursAfter: 30 },
    ],
  },
  {
    key: "wei-idempotency-resource",
    author: "wei",
    type: "RESOURCE",
    interest: "system-design",
    body: "The clearest writing on retries and idempotency I've found, and I've read a lot of bad writing on retries and idempotency.\n\nThe part worth internalising: a retry is a new request that happens to look like an old one. The network cannot tell you whether the first one succeeded — only your own state can. Everything else follows from that.\n\nIf you're building anything that talks to another service over a network, this is worth an hour. 📚\n\n#systemdesign #distributedsystems #reliability",
    linkUrl: "https://developer.mozilla.org/en-US/docs/Glossary/Idempotent",
    daysAgo: 50,
    comments: [
      { author: "daniel", body: "\"A retry is a new request that happens to look like an old one\" is the framing that finally made this click for me.", hoursAfter: 6 },
      { author: "tobias", body: "The corollary people miss: the client's timeout is not the server's timeout. The request may still be running when you retry.", hoursAfter: 14 },
      { author: "ananya", body: "Adding this to the reading list, thank you. I understand retries in theory and clearly not in practice.", hoursAfter: 25 },
    ],
  },
  {
    key: "priya-friday-mood",
    author: "priya",
    type: "DISCUSSION",
    interest: "programming",
    body: "Stages of debugging, as experienced this afternoon:\n\n1. That's impossible\n2. That's not impossible but it shouldn't happen\n3. Why does that happen\n4. Oh\n5. Oh no\n6. I have to tell someone I did this in March 🫠\n\nFix was one character. A `>` that should have been `>=`. Four hours.\n\nAnyway, happy Friday, may your off-by-one errors be in code nobody has deployed yet.\n\n#debugging #devlife",
    daysAgo: 56,
    comments: [
      { author: "meera", body: "Stage 6 is the one they don't put in the motivational posters.", hoursAfter: 1 },
      { author: "wei", body: "One character, four hours, and a permanent memory. That's the exchange rate.", hoursAfter: 3 },
      { author: "diego", body: "I lost a week to a sign error in a transform matrix. A minus. One minus.", hoursAfter: 6 },
      { author: "arjun", body: "The March part is what makes it art. 🫠", hoursAfter: 12 },
      { author: "ananya", body: "Weirdly comforting that this happens to people who give conference talks about evaluation.", hoursAfter: 20 },
    ],
  },
];

/** Sanity guards — the corpus is data, so let it fail loudly if it drifts. */
export const POST_COUNTS = {
  total: POSTS.length,
  withImages: POSTS.filter((p) => p.images?.length).length,
  withVideo: POSTS.filter((p) => p.video).length,
  textOnly: POSTS.filter((p) => !p.images?.length && !p.video).length,
  comments: POSTS.reduce((n, p) => n + p.comments.length, 0),
};
