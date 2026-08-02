/**
 * Projects and their build logs.
 *
 * A TedIS project is a chronological timeline of posts — `/projects/[slug]`
 * renders them oldest-first under "The journey", so a visitor can read a thing
 * being built from its first commit forward. That only works if the timeline is
 * an actual narrative, so each one here is written as one: an idea, the first
 * thing that worked, the wall it hit, what the fix cost, and where it landed.
 *
 * Each entry also produces the "Part of <project>" card that appears on the post
 * in the main feed, which is how people find their way into a timeline.
 *
 * Timeline posts are dated backwards from today with `daysAgo`, so the story
 * always spans the right stretch of history no matter when the seed runs.
 */

import type { ImageKey, VideoKey } from "./media";
import type { SeedComment } from "./posts";

export interface TimelinePost {
  key: string;
  /** Defaults to the project owner — set it to let a contributor post instead. */
  author?: string;
  type: "UPDATE" | "QUESTION" | "RESOURCE" | "DISCUSSION" | "MILESTONE";
  body: string;
  images?: ImageKey[];
  video?: VideoKey;
  /**
   * Omitted inherits the project's interest. `null` means deliberately untagged
   * — some build-log notes are quick enough that a real person skips the topic
   * picker. Those reach followers only, which is realistic and is exactly why
   * most posts here do carry a topic.
   */
  interest?: string | null;
  linkUrl?: string;
  daysAgo: number;
  comments: SeedComment[];
}

export interface SeedProject {
  key: string;
  owner: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: "IDEA" | "BUILDING" | "LIVE" | "PAUSED" | "ARCHIVED";
  interest: string;
  cover: ImageKey;
  repoUrl: string | null;
  openToCollab: boolean;
  /** Technology names — upserted so the seed does not depend on load order. */
  technologies: string[];
  links: { kind: "REPO" | "LIVE" | "DEMO" | "DOCS" | "OTHER"; label: string; url: string }[];
  contributors: { key: string; role: "MAINTAINER" | "CONTRIBUTOR" | "DESIGNER" | "RESEARCHER" | "ADVISOR" }[];
  createdDaysAgo: number;
  timeline: TimelinePost[];
}

export const PROJECTS: readonly SeedProject[] = [
  // ------------------------------------------------------------- groundwork --
  {
    key: "groundwork",
    owner: "priya",
    slug: "groundwork",
    name: "Groundwork",
    tagline: "An evaluation harness for retrieval systems that tells you the truth",
    description:
      "Groundwork scores a retrieval pipeline the way a user experiences it — per query, worst-case first — instead of reporting an average that hides the failures. Bring your own corpus and golden set; it handles sweeps across configurations, keeps every raw result, and diffs two runs so you can see exactly which queries a change broke.\n\nBuilt because we swapped an embedding model on a hunch and shipped a regression nobody caught for five weeks.",
    status: "LIVE",
    interest: "ai",
    cover: "dashboardMetrics",
    repoUrl: "https://github.com/priyaraghu/groundwork",
    openToCollab: true,
    technologies: ["Python", "PostgreSQL", "PyTorch", "Docker"],
    links: [
      { kind: "REPO", label: "Source", url: "https://github.com/priyaraghu/groundwork" },
      { kind: "DOCS", label: "Documentation", url: "https://priyaraghu.dev/groundwork" },
    ],
    contributors: [
      { key: "priya", role: "MAINTAINER" },
      { key: "emily", role: "RESEARCHER" },
      { key: "rohan", role: "CONTRIBUTOR" },
    ],
    createdDaysAgo: 232,
    timeline: [
      {
        key: "gw-01",
        type: "MILESTONE",
        daysAgo: 230,
        body: "Starting something. 🌱\n\nWe shipped a retrieval regression five weeks ago and only found it because one customer complained twice. Five weeks. Our dashboard said everything was fine the whole time, because our dashboard reported a mean.\n\nSo: an eval harness that scores per query and sorts by worst, not by average. Working name Groundwork. Repo is empty right now — I'll build it here in the open.\n\n#AI #RAG #buildinpublic",
        images: ["notebookGrowth"],
        comments: [
          { author: "emily", body: "Per-query with worst-case ordering is the right primitive. If you want a second pair of eyes on the scoring design, I've made most of these mistakes already.", hoursAfter: 4 },
          { author: "rohan", body: "Following this closely. We have the identical problem and currently \"solve\" it by eyeballing twenty queries after every change.", hoursAfter: 11 },
        ],
      },
      {
        key: "gw-02",
        type: "UPDATE",
        daysAgo: 221,
        body: "First thing that runs end to end. It's ugly and it's a single Python file, but it took a corpus, a set of 40 questions, and produced a table I could actually read. 🐍\n\nThe design decision I want to get right early: every run stores every raw result, forever. Storage is cheap. The aggregate has thrown away the interesting part by definition — you cannot go back and ask \"which queries broke\" if you only kept the mean.\n\n#python #AI",
        images: ["codePython"],
        comments: [
          { author: "tobias", body: "Storing raw results forever will bite you at scale unless you partition by run date early. Cheap to do now, painful in a year.", hoursAfter: 6 },
          { author: "priya", body: "Noted, and you're right that it's a now-decision. Adding a run_id partition before this gets any bigger.", hoursAfter: 8, replyTo: 0 },
        ],
      },
      {
        key: "gw-03",
        type: "UPDATE",
        daysAgo: 206,
        interest: null,
        body: "Small thing, no topic, just want it written down: I spent today building a golden set instead of building the tool.\n\n40 questions was not enough. Below about 150 the numbers move more from sampling noise than from anything I change, which makes the whole exercise theatre. At 200 it started behaving.\n\nThe unglamorous part is the product. 🙃",
        comments: [
          { author: "emily", body: "This matches what we see in research too. People underestimate how much of an eval is just patient labelling.", hoursAfter: 5 },
        ],
      },
      {
        key: "gw-04",
        type: "UPDATE",
        daysAgo: 188,
        body: "Config sweeps work. You give it a matrix — chunk sizes, overlap, top-k, two embedding models — and it runs the cross product and ranks by bottom-decile score. ⚙️\n\nFirst real result on our own corpus: the config we've been running in production for eight months is fourth out of twelve. The winner differs only by chunk overlap. Eight months.\n\nI'm somewhere between delighted and unwell about this.\n\n#MLOps #AI",
        images: ["dashboardCharts"],
        comments: [
          { author: "omar", body: "\"Somewhere between delighted and unwell\" is every eval result I have ever run against my own production settings.", hoursAfter: 3 },
          { author: "marcus", body: "Fourth out of twelve is a great advert for the tool, honestly. That's the pitch.", hoursAfter: 9 },
          { author: "priya", body: "Ha — hadn't thought of it that way. Slightly less unwell now.", hoursAfter: 12, replyTo: 1 },
        ],
      },
      {
        key: "gw-05",
        type: "UPDATE",
        daysAgo: 164,
        body: "Run diffing is in, and it's the feature I'd keep if I had to delete everything else. 🔍\n\nPoint it at two runs and it shows you only what changed: queries that got better, queries that got worse, and — the important one — queries that stayed the same score but returned completely different documents. That last category is where silent breakage lives.\n\nThe screenshot is a diff where overall score improved 3% and eleven queries got materially worse.\n\n#AI #evaluation",
        images: ["dashboardMetrics", "codeSplitPane"],
        comments: [
          { author: "emily", body: "Same-score-different-documents is a genuinely novel thing to surface. Most harnesses would call that a no-op.", hoursAfter: 4 },
          { author: "wei", body: "This is just a regression test suite with better ergonomics, which I mean as high praise.", hoursAfter: 13 },
          { author: "rohan", body: "Would this work against a plain SQL full-text search, or is it embedding-specific?", hoursAfter: 22 },
          { author: "priya", body: "Anything that returns ranked document ids works — it doesn't care how you got them. We test against BM25 as a baseline.", hoursAfter: 24, replyTo: 2 },
        ],
      },
      {
        key: "gw-06",
        type: "UPDATE",
        daysAgo: 131,
        author: "emily",
        body: "Jumping in on Priya's project because the variance problem here is the one from my own research. 📊\n\nAdded seed-aware runs: everything executes N times and reports a distribution, not a point. On our test corpus a single run and five runs disagree about which of two configs is better roughly a fifth of the time.\n\nIf your eval doesn't report variance, some fraction of your wins are coin flips.\n\n#research #evaluation",
        images: ["researchNotes"],
        comments: [
          { author: "priya", body: "This is a much better implementation than the one I'd sketched. Merged.", hoursAfter: 2 },
          { author: "diego", body: "A fifth of the time is far higher than I'd have guessed. That's sobering.", hoursAfter: 16 },
        ],
      },
      {
        key: "gw-07",
        type: "UPDATE",
        daysAgo: 96,
        body: "Two weeks of nothing to show. Rewrote the storage layer and it is slower. 😐\n\nI moved raw results from flat files into Postgres for the diffing queries, which was correct, and then wrote an insert-per-row loop, which was not. A 900-query sweep went from 40 seconds to nine minutes.\n\nPosting the bad week because the good weeks are not representative.\n\n#postgres #buildinpublic",
        comments: [
          { author: "tobias", body: "Batch the inserts with COPY and this problem disappears entirely. Nine minutes to a few seconds, most likely.", hoursAfter: 3 },
          { author: "priya", body: "COPY got it to 6 seconds. Faster than the flat files ever were. Thank you.", hoursAfter: 27, replyTo: 0 },
          { author: "kwame", body: "Respect for posting the week where the number went the wrong way.", hoursAfter: 8 },
        ],
      },
      {
        key: "gw-08",
        type: "MILESTONE",
        daysAgo: 47,
        body: "v1.0. Groundwork is public. 🎉\n\nIt does one thing: tells you whether a retrieval change actually helped, per query, with error bars, and shows you precisely what broke. Bring your own corpus and golden set — it's deliberately not opinionated about your stack.\n\nSeven months. Thank you to @emilychen for the variance work and @rohankulkarni for finding roughly forty bugs in the CLI.\n\nInstall instructions in the repo. Issues welcome, especially the annoying ones.\n\n#AI #opensource #MLOps",
        images: ["terminalSudo"],
        comments: [
          { author: "kwame", body: "Congratulations. Now begins the part where you learn what people actually do with it. 🙂", hoursAfter: 2 },
          { author: "hannah", body: "The README is unusually good — the \"why not just use the average\" section sells the whole tool.", hoursAfter: 7 },
          { author: "omar", body: "Running this against our speech pipeline this week. Different domain, same broken measurement habits.", hoursAfter: 14 },
          { author: "ananya", body: "Reading this whole timeline from the top was genuinely the most useful thing I've done this month.", hoursAfter: 30 },
        ],
      },
      {
        key: "gw-09",
        type: "UPDATE",
        daysAgo: 12,
        body: "Five weeks post-launch: 61 people have run it against a real corpus, and eleven have opened issues good enough that I fixed them the same day. 📈\n\nThe thing I did not predict: most people's first run finds a regression they already had. That's now the most common message I get — some version of \"we've been shipping this bug for months.\"\n\nThat's the product, it turns out. Not the sweeps. Just showing people what was already broken.\n\n#AI #opensource",
        images: ["dashboardBlue"],
        comments: [
          { author: "marcus", body: "\"Showing people what was already broken\" is a sharper positioning line than anything on your docs homepage right now.", hoursAfter: 5 },
          { author: "emily", body: "Eleven same-day fixes from external issues is a healthier ratio than most funded projects manage.", hoursAfter: 12 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------- relayline --
  {
    key: "relayline",
    owner: "marcus",
    slug: "relayline",
    name: "Relayline",
    tagline: "Dispatch and scheduling for HVAC and electrical contractors",
    description:
      "Relayline replaces the whiteboard on the wall of a contractor's office. Drag a job to a technician and it reassigns, texts them the address, and updates the customer — offline-tolerant, because the people using it are in vans and crawlspaces, not at desks.\n\nSecond-time founder building in the open, including the nine months where nothing grew.",
    status: "LIVE",
    interest: "startups",
    cover: "dashboardLaptop",
    repoUrl: null,
    openToCollab: false,
    technologies: ["TypeScript", "Next.js", "PostgreSQL", "Redis", "AWS"],
    links: [
      { kind: "LIVE", label: "relayline.io", url: "https://relayline.io" },
      { kind: "DEMO", label: "Product tour", url: "https://relayline.io/tour" },
    ],
    contributors: [
      { key: "marcus", role: "MAINTAINER" },
      { key: "sofia", role: "DESIGNER" },
      { key: "daniel", role: "ADVISOR" },
    ],
    createdDaysAgo: 300,
    timeline: [
      {
        key: "rl-01",
        type: "MILESTONE",
        daysAgo: 298,
        body: "Company number two. Opening the build log on day one this time. 🚀\n\nLast one died because I built something nobody needed and told nobody about it until it was finished. So: Relayline, scheduling for field service teams, and I'm going to publish the numbers every month including the bad ones.\n\nCurrently: 0 customers, 0 revenue, one very optimistic Figma file.\n\n#buildinpublic #startups",
        images: ["planningNotebook"],
        comments: [
          { author: "omar", body: "Publishing the bad months is the part everyone promises and then quietly stops doing around month four. Rooting for you.", hoursAfter: 3 },
          { author: "daniel", body: "Field service is a genuinely underserved space. The incumbents are all 2009-era desktop software.", hoursAfter: 9 },
        ],
      },
      {
        key: "rl-02",
        type: "UPDATE",
        daysAgo: 281,
        body: "Spent two weeks not writing code. Sat in four contractors' offices and watched them schedule a day's work. 📋\n\nEvery single one used a physical whiteboard. Two photographed it each evening so they'd have a record. One had a laminated map with magnets.\n\nNobody asked for \"scheduling software.\" They asked to stop losing the whiteboard when someone wiped it by accident. That's a much smaller and much more solvable problem.\n\n#startups #productdiscovery",
        images: ["teamWhiteboard"],
        comments: [
          { author: "sofia", body: "The magnets detail is worth more than any survey. That's someone designing their own interface because nothing fit.", hoursAfter: 4 },
          { author: "nadia", body: "\"Nobody asked for scheduling software\" — this is why feature lists from customers are almost always wrong.", hoursAfter: 11 },
          { author: "marcus", body: "Right. They describe the workaround they built, not the problem underneath it. Took me a company to learn that.", hoursAfter: 13, replyTo: 1 },
        ],
      },
      {
        key: "rl-03",
        type: "UPDATE",
        daysAgo: 259,
        body: "First version is a web page with draggable cards and nothing else. No accounts, no billing, no mobile app. One contractor is using it on an iPad mounted where the whiteboard used to be. 🧲\n\nHe found three bugs in the first hour and stayed on anyway, which told me more than any amount of positive feedback would have.\n\n#buildinpublic #saas",
        images: ["uiAppScreen"],
        comments: [
          { author: "hannah", body: "Someone tolerating bugs is the strongest early signal there is. Enthusiasm is cheap, tolerance isn't.", hoursAfter: 6 },
          { author: "yuki", body: "iPad-where-the-whiteboard-was is such a good constraint. It tells you the font size before you write any CSS.", hoursAfter: 15 },
        ],
      },
      {
        key: "rl-04",
        type: "UPDATE",
        daysAgo: 216,
        author: "sofia",
        body: "Came on to help Marcus with the interface. First thing I changed: the drag target. 🎯\n\nThe original let you drop a job anywhere on a technician's column. Real dispatchers care intensely about order — who's doing what first — so the drop now snaps to a position and shows the resulting route time.\n\nSame interaction, one extra piece of information, and it stopped being a to-do list and started being a schedule.\n\n#uxdesign #productdesign",
        images: ["uiWireframes"],
        comments: [
          { author: "marcus", body: "This change is the single biggest jump in demo quality we've had. People get it in about four seconds now.", hoursAfter: 3 },
          { author: "nadia", body: "Showing the consequence of the drop rather than just accepting it — that's the whole difference between a control and a tool.", hoursAfter: 10 },
        ],
      },
      {
        key: "rl-05",
        type: "UPDATE",
        daysAgo: 174,
        body: "Month six. 3 paying customers, $310 MRR. Flat for the third month running. 📉\n\nI said I'd publish the bad ones, so: this is a bad one. I'm working seven days a week and the number has not moved since March.\n\nThe honest read is that I'm selling to anyone with a van, and \"anyone with a van\" is not a market, it's a shrug.\n\n#buildinpublic #startups",
        comments: [
          { author: "omar", body: "Three months flat with the effort you're putting in is genuinely hard. Thanks for putting the real number up.", hoursAfter: 2 },
          { author: "kwame", body: "\"Not a market, a shrug\" — that's the diagnosis right there, and you already know it.", hoursAfter: 8 },
          { author: "priya", body: "For what it's worth, from the outside the product has looked sharp this whole time. The problem you're naming isn't the product.", hoursAfter: 19 },
        ],
      },
      {
        key: "rl-06",
        type: "UPDATE",
        daysAgo: 143,
        body: "Narrowed to HVAC and electrical contractors only. Turned off every other lead. 🔌\n\nTerrifying to do at 3 customers. But those two trades have the same job structure — permits, parts, a callback rate — and I can build for that specifically instead of building for an abstraction of everyone.\n\nFirst week after narrowing: 4 demos, 3 closed. Previous best was 1 in 9.\n\n#startups #positioning",
        images: ["notebookGrowth"],
        comments: [
          { author: "daniel", body: "1 in 9 to 3 in 4 is not a positioning tweak, that's a different company. Congratulations.", hoursAfter: 4 },
          { author: "marcus", body: "It genuinely feels like one. Same code, almost — the demo just stopped needing me to explain anything.", hoursAfter: 6, replyTo: 0 },
          { author: "chris", body: "Turning off leads when you have three customers takes real nerve. Most people can't do it.", hoursAfter: 17 },
        ],
      },
      {
        key: "rl-07",
        type: "UPDATE",
        daysAgo: 89,
        interest: null,
        body: "Quick one. A customer called to say the app went down. It hadn't — his phone had no signal in a crawlspace and our UI just showed a spinner forever.\n\nThat's not an outage, that's us being rude about the network. Offline queue moved to the top of the roadmap this morning. 📵",
        comments: [
          { author: "yuki", body: "This is exactly the bug we had. Local write first, sync in the background, never block the UI on a request.", hoursAfter: 5 },
          { author: "marcus", body: "Reading your offline-first post now. Sounds like you've already solved the version of this I'm about to hit.", hoursAfter: 7, replyTo: 0 },
        ],
      },
      {
        key: "rl-08",
        type: "UPDATE",
        daysAgo: 52,
        body: "The dispatch board, working, in a warehouse in Round Rock. 🎬\n\nEverything in this clip works with no signal — actions queue locally and sync when the van comes back into coverage. The owner sent me a photo of the wall where the whiteboard used to be and I have not stopped thinking about it.\n\nDrag a job, it reassigns and texts the tech. That's the whole product. Eleven months to make it that simple.\n\n#buildinpublic #saas",
        video: "pexelsScreen",
        comments: [
          { author: "sofia", body: "The undo affordance after a drag is doing a lot of quiet work in this video. Nobody will notice it, which is the point.", hoursAfter: 3 },
          { author: "arjun", body: "Offline queue plus SMS side effects is a genuinely nasty combination to get right. What stops a text firing twice on resync?", hoursAfter: 9 },
          { author: "marcus", body: "Idempotency key per job assignment, deduped server-side. Stole the pattern wholesale from @danokonjo's payments post.", hoursAfter: 11, replyTo: 1 },
        ],
      },
      {
        key: "rl-09",
        type: "MILESTONE",
        daysAgo: 21,
        body: "18 months: 240 paying teams, $34k MRR, and the first month payroll came out of revenue instead of my savings. 🥲\n\nThe curve is flat for nine of those months. I'm keeping that chart un-cropped on purpose, because every growth post I read while I was in month six had the flat part quietly removed.\n\nWhat changed wasn't the product. It was deciding who it wasn't for.\n\n#buildinpublic #startups #saas",
        images: ["dashboardMetrics", "teamHighFive"],
        comments: [
          { author: "priya", body: "Keeping the flat part un-cropped is the most useful thing in this entire timeline.", hoursAfter: 3 },
          { author: "ananya", body: "I read this whole project from the first post today. The month-six one is the one I'll remember.", hoursAfter: 8 },
          { author: "omar", body: "Payroll from revenue. That's the milestone that actually matters — congratulations, genuinely.", hoursAfter: 14 },
          { author: "laura", body: "Worth writing this up properly somewhere permanent. The nine-flat-months story is rarer than the growth story.", hoursAfter: 26 },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------- sawtly --
  {
    key: "sawtly",
    owner: "omar",
    slug: "sawtly",
    name: "Sawtly",
    tagline: "Speech recognition that understands Arabic dialects, not just textbook Arabic",
    description:
      "Every off-the-shelf speech model treats Modern Standard Arabic as the only Arabic, which makes them useless for the way roughly 400 million people actually speak. Sawtly is trained on collected, labelled dialect audio — Egyptian first, Levantine and Gulf next — and runs small enough to work on the hardware our users already own.\n\nThe moat is seven months of data collection, not the architecture.",
    status: "BUILDING",
    interest: "ai",
    cover: "mlTypewriter",
    repoUrl: null,
    openToCollab: true,
    technologies: ["Python", "PyTorch", "Docker", "AWS"],
    links: [
      { kind: "LIVE", label: "sawtly.ai", url: "https://sawtly.ai" },
      { kind: "DEMO", label: "Try the demo", url: "https://sawtly.ai/demo" },
    ],
    contributors: [
      { key: "omar", role: "MAINTAINER" },
      { key: "priya", role: "ADVISOR" },
    ],
    createdDaysAgo: 214,
    timeline: [
      {
        key: "sw-01",
        type: "MILESTONE",
        daysAgo: 212,
        body: "Starting Sawtly. 🎙️\n\nI tested six commercial speech APIs on a recording of my mother telling a story. Word error rates between 34% and 61%. The same APIs handle my English near-perfectly.\n\nShe speaks Egyptian Arabic, which is the native language of about 100 million people. It is not an edge case. It's just not in anybody's training data.\n\n#AI #speech #startups",
        images: ["mlTypewriter"],
        comments: [
          { author: "priya", body: "61% word error rate is not a model that speaks the language badly, it's a model that doesn't speak it. Good problem to pick.", hoursAfter: 5 },
          { author: "fatima", body: "The number of products that quietly fail this way across the region is enormous. Following.", hoursAfter: 13 },
        ],
      },
      {
        key: "sw-02",
        type: "UPDATE",
        daysAgo: 195,
        body: "Fine-tuned an open model on the largest public Egyptian Arabic dataset I could find. WER went 34% → 29%. 😕\n\nFive points for three weeks of work, and the remaining errors are all the same shape: everyday words, spoken quickly, in the middle of a sentence.\n\nThe public data is mostly read speech — people carefully reading prepared sentences. Nobody talks like that. I think I have to go collect real audio, which is the answer I was hoping to avoid.\n\n#machinelearning #AI",
        comments: [
          { author: "emily", body: "Read speech versus spontaneous speech is one of the biggest domain gaps in the field. Five points is honestly not bad for that mismatch.", hoursAfter: 4 },
          { author: "omar", body: "That's reassuring and depressing in equal measure. Buying microphones.", hoursAfter: 6, replyTo: 0 },
        ],
      },
      {
        key: "sw-03",
        type: "UPDATE",
        daysAgo: 168,
        body: "Six weeks of recording. Cafés, family gatherings, two taxi drivers who were extremely generous with their time and opinions. ☕\n\n40 hours of genuinely spontaneous dialect audio, consented and paid for. Every hour takes about four hours to transcribe properly, so the labelling is now the bottleneck and will be for months.\n\nThis is the least glamorous machine learning work imaginable and it is the entire company.\n\n#AI #datacollection",
        images: ["researchNotes"],
        comments: [
          { author: "diego", body: "Four hours of labelling per hour of audio is brutal. Is any of it automatable with a first-pass model?", hoursAfter: 7 },
          { author: "omar", body: "First-pass then human correction gets it to about 1.5:1. Still the bottleneck, but survivable.", hoursAfter: 9, replyTo: 0 },
          { author: "laura", body: "Paying and getting consent properly is worth saying out loud. A lot of speech datasets can't claim either.", hoursAfter: 20 },
        ],
      },
      {
        key: "sw-04",
        type: "UPDATE",
        daysAgo: 134,
        body: "WER 29% → 17% on the first 20 hours of our own data. 📉\n\nThe curve is still going down and shows no sign of flattening, which means the answer to \"how much more data\" is currently \"yes.\"\n\nArchitecture unchanged this whole time. Same model, same hyperparameters, better food.\n\n#machinelearning #AI",
        images: ["dashboardCharts"],
        comments: [
          { author: "priya", body: "\"Same model, better food\" is the most accurate description of applied ML I've read.", hoursAfter: 3 },
          { author: "emily", body: "Not flattening at 20 hours suggests you're nowhere near the data ceiling. That's a good place to be, if an expensive one.", hoursAfter: 11 },
          { author: "rohan", body: "Curious how you're splitting train and test given the audio comes from a small number of speakers.", hoursAfter: 18 },
          { author: "omar", body: "Speaker-disjoint splits, strictly. Early on I didn't and got a beautiful, completely fake result.", hoursAfter: 21, replyTo: 2 },
        ],
      },
      {
        key: "sw-05",
        type: "UPDATE",
        daysAgo: 101,
        interest: null,
        body: "Note to self and anyone else doing this: our best model was too big to run on the phones our users have.\n\n11% WER, needed a GPU. Useless. A model our customers cannot run is a research result, not a product. Distilling down now and eating a few points to get there. 📱",
        comments: [
          { author: "meera", body: "This constraint shapes everything on mobile and it's almost always discovered too late. Good catch.", hoursAfter: 6 },
          { author: "yuki", body: "The device your users own is a product requirement, not a deployment detail. Learned the same lesson the same way.", hoursAfter: 14 },
        ],
      },
      {
        key: "sw-06",
        type: "UPDATE",
        daysAgo: 74,
        body: "Distilled to 240M parameters. Runs in real time on a mid-range Android. WER 11% → 13%. 🎧\n\nTwo points is a real cost and I'll take it every time, because 13% on a device someone owns beats 11% on hardware they don't.\n\nHonestly the distillation was harder than the original training. Nobody writes tutorials about the boring half.\n\n#AI #speech",
        images: ["phoneInHand"],
        comments: [
          { author: "wei", body: "\"13% on a device someone owns beats 11% on hardware they don't\" is a good engineering sentence in any domain.", hoursAfter: 4 },
          { author: "priya", body: "The boring half is where products live. Would read that tutorial if you wrote it.", hoursAfter: 12 },
        ],
      },
      {
        key: "sw-07",
        type: "UPDATE",
        daysAgo: 38,
        body: "Live dialect transcription, unedited, first take. 🎧\n\nIt gets a place name wrong around eight seconds in and I left it in, because every demo video you've ever seen was the ninth take and that's why demo videos feel dishonest.\n\nThis is a sentence in Egyptian Arabic being transcribed correctly in real time on a laptop. Eighteen months ago I was told this market was too small to build for.\n\n#AI #speech #startups",
        video: "pexelsCity",
        comments: [
          { author: "priya", body: "Leaving the error in makes me trust everything else in the clip. Nine-take demos are why nobody believes AI videos any more.", hoursAfter: 4 },
          { author: "marcus", body: "\"Too small to build for\" is what they said about every vertical that now prints money.", hoursAfter: 9 },
          { author: "fatima", body: "Sent this to three people this morning. The dialect gap is a daily annoyance here and nobody is working on it.", hoursAfter: 17 },
        ],
      },
      {
        key: "sw-08",
        type: "MILESTONE",
        daysAgo: 9,
        body: "Private beta open. 14 companies, mostly call centres and one hospital doing intake notes. 🚀\n\nWER on their real audio is landing between 12% and 19% depending on how noisy the room is, which is roughly where our own tests said it would. Nice to be unsurprised for once.\n\nLevantine data collection starts next month. Same unglamorous process, second dialect.\n\n#AI #startups #beta",
        images: ["teamOpenOffice"],
        comments: [
          { author: "omar", body: "If anyone here works somewhere that records Arabic customer calls and wants in, my inbox is open.", hoursAfter: 1 },
          { author: "emily", body: "A hospital doing intake notes is a serious first customer. That's a high-stakes transcription setting.", hoursAfter: 6 },
          { author: "chris", body: "Congratulations. Curious whether you'll run inference on-prem for the hospital or push audio out.", hoursAfter: 15 },
          { author: "omar", body: "On-prem, entirely. Patient audio never leaves their network — which is another reason the small model mattered.", hoursAfter: 17, replyTo: 2 },
        ],
      },
    ],
  },

  // --------------------------------------------------------------- stepfree --
  {
    key: "stepfree",
    owner: "ananya",
    slug: "stepfree",
    name: "StepFree",
    tagline: "Step-free routes between campus buildings, mapped by the students who need them",
    description:
      "Campus maps assume everyone takes the stairs. StepFree maps the routes that actually work for wheelchair users — ramps, working lifts, doors wide enough — and keeps them current, because a lift that has been broken since March is not a route.\n\nStarted at a 36-hour hackathon because a teammate had been late to class for three years. Now being handed to the university's disability office.",
    status: "BUILDING",
    interest: "education",
    cover: "teamHackathon",
    repoUrl: "https://github.com/ananyaiyer/stepfree",
    openToCollab: true,
    technologies: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    links: [
      { kind: "REPO", label: "Source", url: "https://github.com/ananyaiyer/stepfree" },
    ],
    contributors: [
      { key: "ananya", role: "MAINTAINER" },
      { key: "hannah", role: "ADVISOR" },
      { key: "laura", role: "CONTRIBUTOR" },
    ],
    createdDaysAgo: 64,
    timeline: [
      {
        key: "sf-01",
        type: "MILESTONE",
        daysAgo: 63,
        body: "WE WON. 🏆\n\n36 hours, four people, a campus accessibility tool that maps step-free routes between buildings. Built it because one of our teammates uses a wheelchair and has been late to class for three years because of a route the campus map insists is fine.\n\nI barely slept, I cried at hour 29 when our maps API quota ran out, and it is the proudest I have ever been of anything.\n\nTo everyone who says hackathon projects don't matter — the disability office asked for a handover meeting. 🥹\n\n#hackathon #accessibility #studentlife",
        images: ["teamHackathon", "teamHighFive", "teamDesksTopDown"],
        comments: [
          { author: "sofia", body: "Building it for a specific person on your own team is exactly why it's good. Congratulations!", hoursAfter: 1 },
          { author: "hannah", body: "As someone who does accessibility work — step-free routing is genuinely hard and chronically ignored. Well done. 👏", hoursAfter: 5 },
          { author: "laura", body: "If you do hand it over, write the maintenance doc now while it's fresh. Handover projects die from undocumented API keys.", hoursAfter: 11 },
        ],
      },
      {
        key: "sf-02",
        type: "UPDATE",
        daysAgo: 57,
        body: "Handover meeting happened. It went well and also completely changed the project. 📋\n\nThey don't want an app. They want the route data, in a form they can correct, because they're the ones who know when a lift goes out of service.\n\nSo the thing I built — a nice interface over a static graph — is the wrong half. The valuable half is the boring admin screen I didn't build.\n\nSlightly deflating. Also obviously correct.\n\n#accessibility #buildinpublic",
        comments: [
          { author: "marcus", body: "The customer telling you which half matters six days in is a gift. Most people pay for that lesson in months.", hoursAfter: 3 },
          { author: "nadia", body: "\"The boring admin screen I didn't build\" is the origin story of most real software.", hoursAfter: 9 },
          { author: "ananya", body: "Trying to see it that way! Rebuilding around the data model this week.", hoursAfter: 12, replyTo: 0 },
        ],
      },
      {
        key: "sf-03",
        type: "QUESTION",
        daysAgo: 49,
        body: "Genuine design question and I'm out of my depth. 🙋‍♀️\n\nA route is step-free until the lift breaks. So every edge in the graph needs a status and a last-verified date, and stale data is actively dangerous here — telling someone a broken lift works could strand them.\n\nDo I hide routes that haven't been verified in N days, or show them with a warning? Hiding feels safer but makes the map useless in week one. Showing feels like passing the risk to the person who can least absorb it.\n\n#accessibility #systemdesign",
        comments: [
          { author: "hannah", body: "Show it with the verification date visible and let the person decide. Removing information from disabled users \"for their safety\" is a pattern worth avoiding.", hoursAfter: 2 },
          { author: "sofia", body: "Agreed. Surface the age of the data as a first-class part of the route, not a footnote. \"Verified 3 days ago\" versus \"verified in March\" does the work.", hoursAfter: 4 },
          { author: "tobias", body: "From a data angle: store the verification event, not a boolean. You'll want the history the first time someone disputes a route.", hoursAfter: 8 },
          { author: "ananya", body: "All three of these are going straight into the rebuild. Storing events rather than a flag hadn't occurred to me at all.", hoursAfter: 10, replyTo: 2 },
        ],
      },
      {
        key: "sf-04",
        type: "UPDATE",
        daysAgo: 41,
        body: "Rebuilt around verification events. Every edge shows when it was last confirmed and by whom. 🗺️\n\nThe map now looks worse — lots of amber \"verified 6 weeks ago\" — and that's honest. The old version looked confident about things it had no right to be confident about.\n\nMaking uncertainty visible made the interface uglier and the product better. Not a trade I expected to like.\n\n#accessibility #uxdesign",
        images: ["uiWireframes"],
        comments: [
          { author: "nadia", body: "Amber everywhere is the correct first state. It's also a to-do list for the disability office, which is quietly clever.", hoursAfter: 5 },
          { author: "hannah", body: "This is a much better product than the one that won the hackathon. Genuinely.", hoursAfter: 13 },
        ],
      },
      {
        key: "sf-05",
        type: "UPDATE",
        daysAgo: 33,
        interest: null,
        body: "Placement season has started and I have not touched StepFree in nine days. 😞\n\nLeaving this here mostly so the gap in the timeline has an explanation rather than looking like the project quietly died. It didn't. I'm just doing two things badly instead of one thing well.",
        comments: [
          { author: "kwame", body: "The gap needing an explanation is a thing you invented. Projects are allowed to pause. Go get the job.", hoursAfter: 4 },
          { author: "laura", body: "Write yourself a one-paragraph note on where you left off before you step away. Future you will be very grateful.", hoursAfter: 7 },
          { author: "marcus", body: "Two things badly beats one thing well when one of the two pays rent. This is fine.", hoursAfter: 16 },
        ],
      },
      {
        key: "sf-06",
        type: "UPDATE",
        daysAgo: 22,
        author: "laura",
        body: "Wrote the handover documentation for StepFree, because Ananya is deep in placements and this is the exact moment projects die. ✍️\n\nIt covers: where the API keys live and who owns them, how to add a building, what to do when a lift status is disputed, and — most importantly — how to run it if nobody who built it is around.\n\nA handover project without a runbook is a project with an expiry date.\n\n#techwriting #accessibility",
        comments: [
          { author: "ananya", body: "I genuinely teared up a bit at this. Thank you. 🙏", hoursAfter: 2 },
          { author: "arjun", body: "\"How to run it if nobody who built it is around\" is the section every internal tool needs and almost none have.", hoursAfter: 9 },
          { author: "kwame", body: "This is the highest-leverage contribution anyone can make to a small project. Underrated work.", hoursAfter: 18 },
        ],
      },
      {
        key: "sf-07",
        type: "UPDATE",
        daysAgo: 11,
        body: "Back, and the disability office has been using the admin screen without me. 😭\n\n64 edges verified, 3 lifts marked out of service, one route deleted entirely because it goes through a door that's been locked since last year and nobody's map knew.\n\nThey didn't ask me for anything. They just used it. I think that means it works.\n\n#accessibility #buildinpublic",
        images: ["dashboardLaptop"],
        comments: [
          { author: "hannah", body: "Users doing the work without contacting you is the highest compliment a tool gets. Congratulations.", hoursAfter: 3 },
          { author: "sofia", body: "The locked door nobody's map knew about — that's the entire justification for the project in one sentence.", hoursAfter: 8 },
          { author: "priya", body: "Following this timeline from the hackathon post to here has been a genuine pleasure.", hoursAfter: 15 },
          { author: "ananya", body: "Thank you — honestly the comments on the design question changed the whole shape of it. 🙏", hoursAfter: 19, replyTo: 2 },
        ],
      },
    ],
  },

  // --------------------------------------------------------------- softgrip --
  {
    key: "softgrip",
    owner: "diego",
    slug: "softgrip",
    name: "Softgrip",
    tagline: "A compliant robot gripper that can pick up an egg",
    description:
      "Most robot grippers solve delicate grasping in software: sense the force, react, stop. That loop is always a little too slow. Softgrip puts the compliance in the mechanism — springs and a deformable pad — so the hardware absorbs the error the controller can't react to in time.\n\nMaster's research, built in the open, including a great many broken eggs.",
    status: "BUILDING",
    interest: "robotics",
    cover: "roboticsLab",
    repoUrl: "https://github.com/diegosalcedo/softgrip",
    openToCollab: true,
    technologies: ["Python", "PyTorch"],
    links: [
      { kind: "REPO", label: "Source + CAD", url: "https://github.com/diegosalcedo/softgrip" },
    ],
    contributors: [
      { key: "diego", role: "MAINTAINER" },
      { key: "emily", role: "ADVISOR" },
    ],
    createdDaysAgo: 152,
    timeline: [
      {
        key: "sg-01",
        type: "MILESTONE",
        daysAgo: 150,
        body: "Thesis project, starting now: a gripper that can pick up an egg without destroying it. 🥚\n\nSounds trivial. It is not. The standard approach reads force from a sensor and stops the motor, and the round trip through sensing, decision and actuation takes long enough that by the time you've stopped, you've squeezed.\n\nI'll post the failures too. There will be many.\n\n#robotics #research #gradschool",
        images: ["engineerSketch"],
        comments: [
          { author: "emily", body: "The sense-decide-act loop being too slow for the physics is a beautifully concrete research problem. Good luck.", hoursAfter: 6 },
          { author: "wei", body: "Every latency problem I've had was eventually solved by not being in the loop at all. Curious whether that applies here.", hoursAfter: 14 },
        ],
      },
      {
        key: "sg-02",
        type: "UPDATE",
        daysAgo: 137,
        body: "Baseline built: rigid gripper, force sensor, PID controller. It works on a tennis ball and a wooden block. ⚙️\n\nOn an egg it is 0 for 12.\n\nThe controller does exactly what it's told. It just gets told 80ms too late, and 80ms is the difference between holding an egg and cleaning up an egg.\n\n#robotics #controlsystems",
        images: ["roboticsLab"],
        comments: [
          { author: "ananya", body: "0 for 12 is somehow much funnier and sadder than 0 for 1.", hoursAfter: 4 },
          { author: "emily", body: "Is the 80ms in the sensing or the actuation? Different fixes, and it's worth measuring the split before you design around it.", hoursAfter: 7 },
          { author: "diego", body: "Measuring that this week. My instinct says actuation but instincts are how you waste a month.", hoursAfter: 9, replyTo: 1 },
        ],
      },
      {
        key: "sg-03",
        type: "UPDATE",
        daysAgo: 121,
        body: "Measured it properly. 12ms sensing, 68ms actuation. The pneumatics simply cannot reverse faster than that. 📉\n\nSo no amount of controller cleverness fixes this. I could have a perfect model of the egg and still be 68ms late.\n\nThat's either very bad news or the actual finding. Currently deciding which.\n\n#robotics #research",
        images: ["circuitDark"],
        comments: [
          { author: "wei", body: "That's the finding. You've just proved the problem isn't where everyone looks for it.", hoursAfter: 3 },
          { author: "emily", body: "Agreed — a negative result this clean is publishable on its own. Don't bury it.", hoursAfter: 10 },
        ],
      },
      {
        key: "sg-04",
        type: "UPDATE",
        daysAgo: 98,
        body: "Three weeks of trying to make the pneumatics faster. Failed. 😑\n\nBetter valves, shorter tubing, higher pressure. Got 68ms down to 61ms and spent most of my hardware budget doing it.\n\nMy supervisor has asked me twice now whether the mechanism could absorb the error instead of the controller correcting it. I have been ignoring this because I want the answer to be software.\n\n#robotics #gradschool",
        comments: [
          { author: "diego", body: "Writing that out loud made it fairly obvious what I'm doing wrong, which I suppose is why I wrote it out loud.", hoursAfter: 2 },
          { author: "priya", body: "\"I want the answer to be software\" — I have lost entire quarters to this exact sentence.", hoursAfter: 8 },
          { author: "arjun", body: "Supervisors asking the same question twice is them being polite about it being the answer.", hoursAfter: 15 },
        ],
      },
      {
        key: "sg-05",
        type: "UPDATE",
        daysAgo: 76,
        body: "Put a four-euro spring in the finger linkage. 🌱\n\nSix successful grasps in a row before it crushed one. Previous record was zero.\n\nThe spring absorbs the overshoot during the 61ms the controller can't cover. The mechanism is now doing the job the software could not physically do, and it cost less than my lunch.\n\nTwo months. Four euros.\n\n#robotics #mechatronics",
        images: ["engineerSketch", "circuitGreen"],
        comments: [
          { author: "emily", body: "Mechanical compliance beating a control loop is such a satisfying result. Latency you don't have to compensate for is latency that doesn't exist.", hoursAfter: 5 },
          { author: "wei", body: "The software equivalent is fixing a caching problem by making the thing fast. Sometimes you're working in the wrong layer.", hoursAfter: 11 },
          { author: "diego", body: "That analogy is going in my committee presentation, with credit.", hoursAfter: 13, replyTo: 1 },
          { author: "meera", body: "Four euros and two months is the most honest engineering cost breakdown I've seen this year.", hoursAfter: 20 },
        ],
      },
      {
        key: "sg-06",
        type: "UPDATE",
        daysAgo: 51,
        body: "Best run yet, on video. 🤖\n\nEleven grasps, ten successes, one egg lost to a bad approach angle rather than crushing — which is a different and much more tractable failure.\n\nThe pad is a cast silicone piece now instead of the printed one, which added grip without adding stiffness. That took four attempts and a mould I made badly twice.\n\n#robotics #mechatronics #research",
        video: "pexelsLab",
        comments: [
          { author: "emily", body: "10/11 with the remaining failure being approach angle means you've solved the problem you set out to solve. That's a thesis.", hoursAfter: 4 },
          { author: "ananya", body: "Watching this after reading the 0-for-12 post is genuinely thrilling. Congratulations!", hoursAfter: 9 },
          { author: "chris", body: "The cast-versus-printed pad detail is the kind of thing that never makes it into a paper and always matters.", hoursAfter: 17 },
        ],
      },
      {
        key: "sg-07",
        type: "UPDATE",
        daysAgo: 26,
        interest: null,
        body: "CAD files and the controller code are up in the repo. Print the finger, buy the spring, it's about €30 of parts total.\n\nNo licence discussion needed — do whatever you like with it. If it stops one person spending two months trying to solve this in software, that's a better outcome than the paper. 🔧",
        comments: [
          { author: "kwame", body: "Publishing the CAD alongside the code is what makes this reproducible rather than just readable. Nice.", hoursAfter: 6 },
          { author: "diego", body: "Felt strange to publish before the thesis is examined, honestly. Decided the point is that people use it.", hoursAfter: 8, replyTo: 0 },
          { author: "emily", body: "Your committee will like this more than you expect. Open artefacts are increasingly what reviewers ask for.", hoursAfter: 14 },
        ],
      },
    ],
  },

  // --------------------------------------------------------------- riverbed --
  {
    key: "riverbed",
    owner: "kwame",
    slug: "riverbed",
    name: "Riverbed",
    tagline: "A small, honest HTTP client for TypeScript",
    description:
      "Riverbed does request deduplication, retries with proper backoff, and typed responses — and then stops. It is deliberately not a data layer, not a cache, and not a framework. About 4kB, no dependencies.\n\nMaintained in the open by one person, which shapes every scope decision in it.",
    status: "LIVE",
    interest: "open-source",
    cover: "codeReactLogo",
    repoUrl: "https://github.com/kwamemensah/riverbed",
    openToCollab: true,
    technologies: ["TypeScript", "Node.js", "React"],
    links: [
      { kind: "REPO", label: "Source", url: "https://github.com/kwamemensah/riverbed" },
      { kind: "DOCS", label: "Docs", url: "https://kwamemensah.dev/riverbed" },
    ],
    contributors: [
      { key: "kwame", role: "MAINTAINER" },
      { key: "hannah", role: "CONTRIBUTOR" },
      { key: "wei", role: "CONTRIBUTOR" },
    ],
    createdDaysAgo: 284,
    timeline: [
      {
        key: "rb-01",
        type: "MILESTONE",
        daysAgo: 282,
        body: "Extracted the HTTP wrapper I've copy-pasted into six projects into an actual library. 📦\n\nRiverbed. Request dedup, backoff that respects Retry-After, typed responses. That's the whole scope and I intend to defend that boundary aggressively.\n\nEvery library I've watched die got there by saying yes.\n\n#opensource #typescript",
        images: ["codeReactLogo"],
        comments: [
          { author: "hannah", body: "Defending the scope boundary from day one is the only way it survives. Bookmarking to see if you manage it.", hoursAfter: 5 },
          { author: "wei", body: "Respecting Retry-After puts you ahead of most clients already. Astonishing how many ignore it.", hoursAfter: 12 },
        ],
      },
      {
        key: "rb-02",
        type: "UPDATE",
        daysAgo: 261,
        body: "v0.2. Dedup now keys on method plus URL plus a stable hash of the body, so two identical in-flight POSTs collapse into one. 🔗\n\nSubtle bug I hit: JSON.stringify doesn't guarantee key order across objects built differently, so `{a:1,b:2}` and `{b:2,a:1}` hashed differently and didn't dedup. Sorting keys before hashing fixed it.\n\nThat one took an embarrassing afternoon.\n\n#typescript #opensource",
        images: ["codeCloseup"],
        comments: [
          { author: "tobias", body: "Key ordering in serialised payloads has cost me days across my career. It's such a quiet failure.", hoursAfter: 4 },
          { author: "daniel", body: "Worth documenting that dedup applies to POSTs — plenty of people will assume it's GET-only and be surprised.", hoursAfter: 11 },
          { author: "kwame", body: "Good call, that's a footgun. Adding a warning to the README.", hoursAfter: 13, replyTo: 1 },
        ],
      },
      {
        key: "rb-03",
        type: "UPDATE",
        daysAgo: 228,
        author: "hannah",
        body: "Sent Riverbed a PR for request cancellation via AbortSignal, because I wanted it for a search-as-you-type box and pending requests were piling up. 🛑\n\nThe nice part is it composes with the dedup: cancelling the last subscriber to a deduped request aborts the underlying fetch, but cancelling one of three leaves it running for the others.\n\nRefreshing to contribute to a library small enough to read in one sitting.\n\n#opensource #typescript",
        comments: [
          { author: "kwame", body: "This PR was better designed than what I'd have written. Merged same day.", hoursAfter: 3 },
          { author: "meera", body: "\"Small enough to read in one sitting\" should be a badge npm gives out.", hoursAfter: 10 },
        ],
      },
      {
        key: "rb-04",
        type: "DISCUSSION",
        daysAgo: 194,
        body: "Said no to caching today. Third time this quarter. 🙅\n\nThe request is always reasonable: \"you already dedup in-flight requests, so caching is a small step.\" It isn't. Caching means invalidation, which means staleness policy, which means configuration, which means this stops being 4kB and starts being a data layer with my name on it and my weekends attached.\n\nA library that does one thing is allowed to point at the door.\n\n#opensource #maintainers",
        comments: [
          { author: "nadia", body: "\"Make the default easy and the exception expensive but possible\" applies to library scope as much as design systems.", hoursAfter: 6 },
          { author: "laura", body: "Worth putting this reasoning in the README as a non-goals section. It answers the question before it's asked.", hoursAfter: 9 },
          { author: "kwame", body: "Adding a Non-goals section this week. Should have done it a year ago.", hoursAfter: 11, replyTo: 1 },
          { author: "chris", body: "The weekends-attached framing is the honest version of scope creep that nobody says out loud.", hoursAfter: 20 },
        ],
      },
      {
        key: "rb-05",
        type: "UPDATE",
        daysAgo: 147,
        author: "wei",
        body: "Profiled Riverbed's hot path because we put it in front of a service doing a few thousand requests a minute. ⚡\n\nThe body hash was being recomputed on every retry. Cached it on the request object: about 8% off total client-side overhead at our volume, and rather more on large payloads.\n\nSmall patch. Attached the flamegraph to the PR so the reasoning outlives me.\n\n#performance #opensource",
        images: ["codeDevtools"],
        comments: [
          { author: "kwame", body: "The flamegraph in the PR is why this got merged in ten minutes instead of sitting for a week.", hoursAfter: 2 },
          { author: "hannah", body: "Attaching the profile to the PR should be standard for any perf change. It turns \"trust me\" into evidence.", hoursAfter: 8 },
        ],
      },
      {
        key: "rb-06",
        type: "UPDATE",
        daysAgo: 88,
        interest: null,
        body: "Riverbed passed 40k weekly downloads at some point and I found out from a stranger's tweet rather than from looking. 📈\n\nNot sure what to do with that information. It hasn't changed anything about how I work on it — still twice-weekly triage, still saying no to caching.",
        comments: [
          { author: "marcus", body: "Finding out from a stranger is the most open-source way to hit a milestone possible.", hoursAfter: 4 },
          { author: "laura", body: "It does mean your Non-goals section is now load-bearing for 40k installs a week. Worth keeping it sharp.", hoursAfter: 12 },
        ],
      },
      {
        key: "rb-07",
        type: "MILESTONE",
        daysAgo: 34,
        body: "v1.0, finally. 🎉\n\nThe API hasn't meaningfully changed in five months, which is the only reason to call something 1.0. Not a rewrite, not new features — just a promise that I'll stop moving things.\n\n4.1kB, zero dependencies, does three things. Thanks to @hannahbrennan for cancellation and @weizhang for making the hot path considerably less embarrassing.\n\n#opensource #typescript",
        images: ["codeReactRouter"],
        comments: [
          { author: "hannah", body: "\"A promise that I'll stop moving things\" is the best definition of 1.0 I've read. Congratulations!", hoursAfter: 3 },
          { author: "tobias", body: "Five stable months before tagging 1.0 is genuinely rare discipline. Most projects tag it at three weeks.", hoursAfter: 9 },
          { author: "ananya", body: "Riverbed is in my capstone. Didn't realise it was maintained by one person until I read this timeline.", hoursAfter: 21 },
          { author: "kwame", body: "That's most of npm, honestly. Glad it's useful. 🙂", hoursAfter: 23, replyTo: 2 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------- baseplate --
  {
    key: "baseplate",
    owner: "nadia",
    slug: "baseplate",
    name: "Baseplate",
    tagline: "The design system three product teams have to agree on",
    description:
      "Baseplate is Northbeam's component library and token set. Its real job is not consistency — it is making the cheap path also the correct one, so that accessible, on-brand interfaces are what you get by default and divergence takes deliberate effort.\n\nMostly archaeology, then diplomacy, then a very small commit.",
    status: "LIVE",
    interest: "design",
    cover: "uiResponsive",
    repoUrl: "https://github.com/nadiapetrova/baseplate",
    openToCollab: false,
    technologies: ["TypeScript", "React", "Tailwind CSS"],
    links: [
      { kind: "REPO", label: "Source", url: "https://github.com/nadiapetrova/baseplate" },
      { kind: "DOCS", label: "Component docs", url: "https://nadiapetrova.eu/baseplate" },
    ],
    contributors: [
      { key: "nadia", role: "MAINTAINER" },
      { key: "sofia", role: "DESIGNER" },
      { key: "hannah", role: "CONTRIBUTOR" },
    ],
    createdDaysAgo: 193,
    timeline: [
      {
        key: "bp-01",
        type: "MILESTONE",
        daysAgo: 191,
        body: "Counted the buttons in our codebase today: 34 distinct implementations across three product teams. 🎨\n\nNot 34 variants of one button. 34 buttons, each written by someone who couldn't find the last one.\n\nStarting Baseplate. The goal isn't consistency for its own sake — it's that nobody should have to make a button decision again.\n\n#designsystems #productdesign",
        images: ["uiTabletSketch"],
        comments: [
          { author: "sofia", body: "34 is high but not shocking. The number people should be scared of is how many of them handle focus states correctly.", hoursAfter: 4 },
          { author: "nadia", body: "Six. The answer is six. 🙃", hoursAfter: 5, replyTo: 0 },
          { author: "hannah", body: "And that's the argument that gets you budget. Not tidiness — an accessibility audit you'd currently fail.", hoursAfter: 11 },
        ],
      },
      {
        key: "bp-02",
        type: "UPDATE",
        daysAgo: 176,
        body: "Tokens before components. Colour, spacing, radius, type scale — no React yet. 🎯\n\nEveryone wants to start with components because components are visible. But a component built on ad-hoc values just relocates the inconsistency into a nicer file.\n\nThe spacing scale took three days and one genuinely tense meeting.\n\n#designsystems #designtokens",
        comments: [
          { author: "sofia", body: "Tokens first is right and it's the least popular sequencing decision you'll make. Hold the line.", hoursAfter: 3 },
          { author: "hannah", body: "What was the tense meeting about, out of interest? Ours was over whether 4px or 8px was the base unit.", hoursAfter: 8 },
          { author: "nadia", body: "Exactly that. We landed on 4 with the caveat that component padding uses multiples of 8. Everyone left mildly unhappy, which felt correct.", hoursAfter: 10, replyTo: 1 },
        ],
      },
      {
        key: "bp-03",
        type: "UPDATE",
        daysAgo: 158,
        body: "First eight components shipped. Button, Input, Select, Checkbox, Radio, Dialog, Tooltip, Toast. 🧩\n\nEvery one ships with its keyboard behaviour and focus management as part of the component, not as a note in the docs. If it's in a doc, it's optional, and optional accessibility is decorative.\n\nDialog alone took a week. Focus trapping is genuinely hard.\n\n#designsystems #a11y",
        images: ["uiResponsive"],
        comments: [
          { author: "hannah", body: "Building the keyboard behaviour into the component instead of documenting it is the single highest-value decision in this whole project.", hoursAfter: 2 },
          { author: "meera", body: "\"Optional accessibility is decorative\" — stealing that for our next planning discussion.", hoursAfter: 12 },
          { author: "sofia", body: "A week for Dialog is fast, honestly. Focus trapping plus scroll locking plus returning focus on close is three problems wearing one coat.", hoursAfter: 19 },
        ],
      },
      {
        key: "bp-04",
        type: "UPDATE",
        daysAgo: 122,
        body: "Renamed one token and it took three weeks. `primary` → `action`. 🎨\n\nThat's the change. But `primary` was doing brand colour, focus rings and the marketing hero, for three teams who each assumed their meaning was the real one.\n\nRenaming forced the conversation nobody wanted about what the token was actually for. The commit is two lines and the migration was forty files.\n\n#designsystems #designtokens",
        comments: [
          { author: "sofia", body: "Archaeology, then diplomacy, then a very small commit. That's the job.", hoursAfter: 2 },
          { author: "hannah", body: "The focus-ring usage is the one worth fighting over — it's semantically never the same thing as brand, and it breaks contrast the moment brand shifts.", hoursAfter: 8 },
          { author: "nadia", body: "That was the argument that won it. Accessibility gave the rename a reason that wasn't taste.", hoursAfter: 10, replyTo: 1 },
        ],
      },
      {
        key: "bp-05",
        type: "UPDATE",
        daysAgo: 87,
        interest: null,
        body: "Someone shipped a custom dropdown last sprint instead of using ours. I was annoyed for about an hour, then went and read their code.\n\nOurs genuinely couldn't do what they needed — async option loading. They weren't going around the system, the system was incomplete.\n\nEvery divergence is a bug report about your library, written in the most expensive possible format. 🧩",
        comments: [
          { author: "kwame", body: "This is the healthiest possible reaction to someone not using your thing. Most maintainers stop at the annoyed hour.", hoursAfter: 5 },
          { author: "marcus", body: "Same is true of customers building workarounds. The workaround is the spec.", hoursAfter: 13 },
        ],
      },
      {
        key: "bp-06",
        type: "UPDATE",
        daysAgo: 54,
        author: "hannah",
        body: "Added an automated contrast check to Baseplate's CI. Any token pair used as foreground-on-background fails the build below 4.5:1. ♿\n\nIt caught three combinations already shipped in production, including our disabled-button text, which has been failing since before the system existed.\n\nNobody chose that. It just accumulated. Which is precisely why it needs to be a build step and not a review checklist.\n\n#a11y #designsystems",
        images: ["codeDevtools"],
        comments: [
          { author: "nadia", body: "Three existing failures found on the first run. Worth every minute this took.", hoursAfter: 3 },
          { author: "sofia", body: "Disabled text failing contrast is nearly universal and everyone waves it through because \"it's disabled\". It still has to be readable.", hoursAfter: 9 },
          { author: "arjun", body: "Build step over review checklist, always. Checklists depend on someone being alert on a Friday.", hoursAfter: 16 },
        ],
      },
      {
        key: "bp-07",
        type: "MILESTONE",
        daysAgo: 19,
        body: "Six months in: 34 button implementations down to 1, all three teams migrated, and the contrast check has been green for seven weeks. 🎉\n\nThe metric I actually care about: a new engineer shipped an accessible settings page last week without talking to me once. They didn't know they were doing anything special. It was just what the default gave them.\n\nThat's the whole point of a design system. Not consistency — making the cheap path the correct one.\n\n#designsystems #a11y #productdesign",
        images: ["uiAppScreen", "teamPairing"],
        comments: [
          { author: "hannah", body: "\"They didn't know they were doing anything special\" is the success condition and almost nobody measures it. Congratulations.", hoursAfter: 4 },
          { author: "sofia", body: "Reading this timeline from the 34-buttons post is a genuinely good case study. You should write it up externally.", hoursAfter: 10 },
          { author: "laura", body: "Seconding that. The token rename post alone would do numbers with design system people.", hoursAfter: 18 },
          { author: "nadia", body: "Might do exactly that. Would need to be honest about the three weeks the rename took. 🙃", hoursAfter: 20, replyTo: 2 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------- quietloop --
  {
    key: "quietloop",
    owner: "arjun",
    slug: "quietloop",
    name: "Quietloop",
    tagline: "Finds the alerts nobody acts on and helps you delete them",
    description:
      "Quietloop reads your alerting history and answers one question per rule: when this fired, did anyone do anything? Rules that page repeatedly and are always acknowledged-and-ignored get surfaced for deletion, with the firing history attached so the argument is about evidence rather than fear.\n\nBuilt while cutting one team's pager volume by 71%.",
    status: "BUILDING",
    interest: "devops",
    cover: "serverRacks",
    repoUrl: "https://github.com/arjundeshmukh/quietloop",
    openToCollab: true,
    technologies: ["Go", "PostgreSQL", "Kubernetes", "Docker"],
    links: [
      { kind: "REPO", label: "Source", url: "https://github.com/arjundeshmukh/quietloop" },
    ],
    contributors: [
      { key: "arjun", role: "MAINTAINER" },
      { key: "chris", role: "ADVISOR" },
      { key: "fatima", role: "CONTRIBUTOR" },
    ],
    createdDaysAgo: 171,
    timeline: [
      {
        key: "ql-01",
        type: "MILESTONE",
        daysAgo: 169,
        body: "We have 245 alert rules. I asked six engineers to name one they'd acted on this month and got two answers. 🔕\n\nSo I'm building the thing I keep doing by hand: pull the firing history, join it against whether anyone actually did something, and rank rules by how ignorable they are.\n\nCalling it Quietloop. The goal is a smaller pager, not a better dashboard.\n\n#sre #devops #oncall",
        images: ["serverRacks"],
        comments: [
          { author: "chris", body: "245 rules and two remembered actions is the entire alerting industry in one statistic.", hoursAfter: 3 },
          { author: "fatima", body: "The join against \"did anyone do something\" is the hard part. What's your signal — acknowledgement, or an actual change?", hoursAfter: 9 },
          { author: "arjun", body: "Starting with ack-then-nothing-within-an-hour as the proxy. Crude, but it's directionally right and I can refine it.", hoursAfter: 11, replyTo: 1 },
        ],
      },
      {
        key: "ql-02",
        type: "UPDATE",
        daysAgo: 152,
        body: "First report against our own history. It's worse than I thought. 📊\n\n214 of 245 rules fired at least once in 90 days. Of those, 189 were acknowledged with no subsequent deploy, config change or incident record within an hour.\n\nThat's not alerting. That's 189 rules that exist to make someone feel covered.\n\n#sre #devops",
        images: ["dashboardCharts"],
        comments: [
          { author: "chris", body: "\"Exist to make someone feel covered\" is going to upset people and it's exactly right.", hoursAfter: 4 },
          { author: "wei", body: "Worth separating rules that never fire from rules that fire and get ignored. Very different conversations with the owner.", hoursAfter: 12 },
          { author: "arjun", body: "Good distinction — a rule that never fires is cheap, just clutter. One that pages weekly is actively costing sleep. Splitting the report.", hoursAfter: 14, replyTo: 1 },
        ],
      },
      {
        key: "ql-03",
        type: "UPDATE",
        daysAgo: 128,
        body: "Deleted the first 60. Kept the firing history attached to each deletion. 🗑️\n\nThe history is the whole trick. \"Delete this alert\" starts an argument. \"This paged 40 times in 90 days, here are the 40 times nobody did anything\" ends one.\n\nNobody has asked for any of the 60 back.\n\n#sre #devops #oncall",
        comments: [
          { author: "fatima", body: "Evidence over opinion. Same reason security findings need a reproduction rather than a severity rating.", hoursAfter: 5 },
          { author: "laura", body: "Attaching the reasoning to the deletion is documentation doing its actual job. In six months nobody will remember why.", hoursAfter: 13 },
          { author: "chris", body: "Zero requests to restore is the number that matters. Congratulations.", hoursAfter: 21 },
        ],
      },
      {
        key: "ql-04",
        type: "UPDATE",
        daysAgo: 103,
        interest: null,
        body: "Someone pushed back hard today: \"that's the one that'll catch the big one.\"\n\nIt has fired 61 times in 90 days and been ignored 61 times. If the big one arrives, it will arrive as the 62nd ignored page.\n\nAn alert nobody reads isn't a safety net, it's a story we tell ourselves. Kept it anyway — reduced to a daily digest instead of a page. Compromise, not a win. 😐",
        comments: [
          { author: "arjun", body: "Genuinely unsure whether the compromise was right or whether I blinked. Both feel plausible.", hoursAfter: 2 },
          { author: "chris", body: "It was right. Digest instead of page removes the harm and keeps the person's trust, and you'll need that for the next 60.", hoursAfter: 6, replyTo: 0 },
          { author: "hannah", body: "\"It will arrive as the 62nd ignored page\" is a devastating and completely fair sentence.", hoursAfter: 15 },
        ],
      },
      {
        key: "ql-05",
        type: "UPDATE",
        daysAgo: 71,
        author: "fatima",
        body: "Contributed a rule classifier to Quietloop for security alerts specifically. 🔐\n\nSecurity alerting has an inverted problem: low-frequency rules that fire once a year are often the most important ones, so ranking purely by \"ignored often\" would delete exactly the wrong things.\n\nThe classifier flags rules tied to auth, secrets or privilege changes and exempts them from frequency-based ranking. Rare and important is a real category.\n\n#security #devops",
        comments: [
          { author: "arjun", body: "This is the gap I'd have walked straight into. Merged and moved into the default config.", hoursAfter: 3 },
          { author: "chris", body: "Rare-and-important versus rare-and-pointless is the distinction most alert tooling flattens.", hoursAfter: 11 },
        ],
      },
      {
        key: "ql-06",
        type: "UPDATE",
        daysAgo: 44,
        body: "Quarterly drill, with Quietloop's reduced rule set in place. Killed the primary region on purpose at 2pm on a Tuesday. 🔥\n\nRecovery in 4m12s against a 5-minute target. Nothing was missed by the alerts we deleted — the two things that broke both paged correctly.\n\nFound two unrelated problems: a DNS TTL nobody lowered, and a runbook step pointing at a dashboard deleted in March.\n\n#sre #chaosengineering",
        video: "pexelsServer",
        comments: [
          { author: "chris", body: "2pm Tuesday with everyone watching is the correct way to drill. 3am surprise drills just teach people to resent the exercise.", hoursAfter: 2 },
          { author: "laura", body: "Runbooks rot faster than code because nothing fails when they're wrong. This is the argument for treating them as code.", hoursAfter: 8 },
          { author: "fatima", body: "The deleted alerts not mattering during a real failover is the strongest validation this project could get.", hoursAfter: 16 },
        ],
      },
      {
        key: "ql-07",
        type: "MILESTONE",
        daysAgo: 15,
        body: "245 rules → 31. Pager volume down 71%. Six months. 📉\n\nThe number I care about more: median time to acknowledge went from 14 minutes to 90 seconds. When the pager stops crying wolf, people pick it up.\n\nQuietloop is open now if you want to run it against your own history. Fair warning — the first report is uncomfortable reading.\n\n#sre #devops #opensource",
        images: ["dashboardMetrics", "serverCorridor"],
        comments: [
          { author: "chris", body: "14 minutes to 90 seconds is the real result. Alert fatigue is a response-time problem disguised as a volume problem.", hoursAfter: 3 },
          { author: "daniel", body: "Running this against ours this week, entirely because of the \"uncomfortable reading\" warning.", hoursAfter: 7 },
          { author: "priya", body: "There's a strong parallel to eval work here — you both built a tool whose main output is showing people what was already broken.", hoursAfter: 14 },
          { author: "arjun", body: "Hadn't drawn that line but it's exactly right. Nobody wants the report and everybody needs it.", hoursAfter: 16, replyTo: 2 },
        ],
      },
    ],
  },
];

export const PROJECT_COUNTS = {
  projects: PROJECTS.length,
  timelinePosts: PROJECTS.reduce((n, p) => n + p.timeline.length, 0),
  timelineComments: PROJECTS.reduce((n, p) => n + p.timeline.reduce((m, t) => m + t.comments.length, 0), 0),
  untagged: PROJECTS.reduce((n, p) => n + p.timeline.filter((t) => t.interest === null).length, 0),
};
