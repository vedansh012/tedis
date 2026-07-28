/**
 * Idempotent seed. Populates Interests (the product's spine), a starter set of
 * technologies/skills, and a small graph of demo users with real projects and
 * posts so every surface has genuine content on first run.
 *
 * Demo login:  ada@tedis.dev  /  Password123!
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/services/auth/password";

const prisma = new PrismaClient();

// ~45 broad, community-sized interest categories. Existing slugs (ai, cybersecurity,
// cloud, robotics, design, finance, gaming, entrepreneurship, photography, health,
// education, science) are preserved so seeded projects/communities still resolve.
// The first FEATURED_COUNT are surfaced first on Explore.
const FEATURED_COUNT = 8;
const INTERESTS = [
  // — featured / most popular —
  { slug: "ai", name: "Artificial Intelligence", tagline: "Models, agents, and everything intelligent.", accentColor: "#7c5cff", iconKey: "brain" },
  { slug: "machine-learning", name: "Machine Learning", tagline: "Training, tuning, and shipping models.", accentColor: "#8b5cf6", iconKey: "binary" },
  { slug: "web-development", name: "Web Development", tagline: "Frontends, backends, and the full stack.", accentColor: "#0ea5e9", iconKey: "code-xml" },
  { slug: "programming", name: "Programming", tagline: "Languages, craft, and clean code.", accentColor: "#475569", iconKey: "terminal" },
  { slug: "data-science", name: "Data Science", tagline: "Data, analysis, and insight.", accentColor: "#06b6d4", iconKey: "line-chart" },
  { slug: "cybersecurity", name: "Cybersecurity", tagline: "Offense, defense, and everything in between.", accentColor: "#ef4444", iconKey: "shield" },
  { slug: "cloud", name: "Cloud Computing", tagline: "Infra, platforms, and scale.", accentColor: "#38bdf8", iconKey: "cloud" },
  { slug: "devops", name: "DevOps", tagline: "CI/CD, reliability, and automation.", accentColor: "#2563eb", iconKey: "infinity" },
  // — engineering & CS —
  { slug: "mobile-development", name: "Mobile Development", tagline: "iOS, Android, and cross-platform apps.", accentColor: "#0d9488", iconKey: "smartphone" },
  { slug: "system-design", name: "System Design", tagline: "Architecture, scale, and trade-offs.", accentColor: "#0891b2", iconKey: "network" },
  { slug: "open-source", name: "Open Source", tagline: "Contributing, maintaining, and community.", accentColor: "#16a34a", iconKey: "git-fork" },
  { slug: "competitive-programming", name: "Competitive Programming", tagline: "Algorithms, contests, and problem-solving.", accentColor: "#f59e0b", iconKey: "trophy" },
  { slug: "game-development", name: "Game Development", tagline: "Engines, mechanics, and worlds.", accentColor: "#a855f7", iconKey: "joystick" },
  { slug: "gaming", name: "Gaming", tagline: "Play, culture, and communities.", accentColor: "#9333ea", iconKey: "gamepad-2" },
  { slug: "blockchain", name: "Blockchain", tagline: "Chains, contracts, and decentralization.", accentColor: "#f97316", iconKey: "blocks" },
  { slug: "iot", name: "IoT", tagline: "Connected devices and the physical web.", accentColor: "#22d3ee", iconKey: "radio-tower" },
  { slug: "robotics", name: "Robotics", tagline: "Where bits meet the physical world.", accentColor: "#14b8a6", iconKey: "bot" },
  // — design —
  { slug: "ui-ux-design", name: "UI/UX Design", tagline: "Interfaces, flows, and usability.", accentColor: "#ec4899", iconKey: "app-window" },
  { slug: "product-design", name: "Product Design", tagline: "From problem to polished product.", accentColor: "#db2777", iconKey: "pen-tool" },
  { slug: "design", name: "Graphic Design", tagline: "Type, brand, and visual craft.", accentColor: "#f472b6", iconKey: "palette" },
  { slug: "video-editing", name: "Video Editing", tagline: "Cuts, motion, and storytelling.", accentColor: "#c026d3", iconKey: "clapperboard" },
  { slug: "photography", name: "Photography", tagline: "Light, composition, and story.", accentColor: "#64748b", iconKey: "camera" },
  // — core engineering disciplines —
  { slug: "electronics", name: "Electronics", tagline: "Circuits, signals, and hardware.", accentColor: "#eab308", iconKey: "circuit-board" },
  { slug: "embedded-systems", name: "Embedded Systems", tagline: "Firmware and bare-metal.", accentColor: "#ca8a04", iconKey: "cpu" },
  { slug: "vlsi", name: "VLSI", tagline: "Chip design and semiconductors.", accentColor: "#a16207", iconKey: "component" },
  { slug: "electrical-engineering", name: "Electrical Engineering", tagline: "Power, systems, and signals.", accentColor: "#f59e0b", iconKey: "zap" },
  { slug: "mechanical-engineering", name: "Mechanical Engineering", tagline: "Machines, motion, and materials.", accentColor: "#78716c", iconKey: "cog" },
  { slug: "civil-engineering", name: "Civil Engineering", tagline: "Structures and the built world.", accentColor: "#d97706", iconKey: "hard-hat" },
  { slug: "chemical-engineering", name: "Chemical Engineering", tagline: "Processes, reactions, and materials.", accentColor: "#10b981", iconKey: "flask-conical" },
  { slug: "aerospace", name: "Aerospace", tagline: "Flight, propulsion, and space.", accentColor: "#3b82f6", iconKey: "plane" },
  { slug: "biomedical-engineering", name: "Biomedical Engineering", tagline: "Where biology meets engineering.", accentColor: "#f43f5e", iconKey: "dna" },
  // — science & research —
  { slug: "research", name: "Research", tagline: "Papers, labs, and discovery.", accentColor: "#0ea5e9", iconKey: "microscope" },
  { slug: "science", name: "Science", tagline: "Across every frontier.", accentColor: "#06b6d4", iconKey: "atom" },
  { slug: "health", name: "Health", tagline: "Bio, medicine, and human performance.", accentColor: "#e11d48", iconKey: "heart-pulse" },
  { slug: "education", name: "Education", tagline: "Learning, teaching, and edtech.", accentColor: "#2563eb", iconKey: "graduation-cap" },
  // — work, business & growth —
  { slug: "startups", name: "Startups", tagline: "Zero to one, in the open.", accentColor: "#fb923c", iconKey: "rocket" },
  { slug: "entrepreneurship", name: "Entrepreneurship", tagline: "Building companies from scratch.", accentColor: "#eab308", iconKey: "lightbulb" },
  { slug: "product-management", name: "Product Management", tagline: "Discovery, roadmaps, and shipping.", accentColor: "#6366f1", iconKey: "clipboard-list" },
  { slug: "finance", name: "Finance", tagline: "Markets, fintech, and quant.", accentColor: "#22c55e", iconKey: "trending-up" },
  { slug: "freelancing", name: "Freelancing", tagline: "Clients, craft, and independence.", accentColor: "#0d9488", iconKey: "laptop" },
  { slug: "career", name: "Career & Placements", tagline: "Jobs, growth, and getting hired.", accentColor: "#0284c7", iconKey: "briefcase" },
  { slug: "interview-prep", name: "Interview Preparation", tagline: "DSA, system design, and mock rounds.", accentColor: "#8b5cf6", iconKey: "clipboard-check" },
  // — community & meta —
  { slug: "hackathons", name: "Hackathons", tagline: "Build fast, ship, and win.", accentColor: "#ef4444", iconKey: "code" },
  { slug: "project-showcase", name: "Project Showcase", tagline: "Show what you've built.", accentColor: "#f97316", iconKey: "folder-git-2" },
  { slug: "tech-news", name: "Tech News", tagline: "What's happening across tech.", accentColor: "#64748b", iconKey: "newspaper" },
];

const TECHNOLOGIES = [
  "TypeScript", "Python", "Rust", "Go", "React", "Next.js", "Node.js", "PostgreSQL",
  "Redis", "Docker", "Kubernetes", "PyTorch", "TensorFlow", "AWS", "Tailwind CSS", "GraphQL",
];

const SKILLS = [
  "Machine Learning", "Frontend", "Backend", "DevOps", "Security", "Product Design",
  "Data Engineering", "Systems", "Research", "Mobile",
];

async function main() {
  console.log("Seeding Interests…");
  for (let i = 0; i < INTERESTS.length; i++) {
    const u = INTERESTS[i]!;
    await prisma.interest.upsert({
      where: { slug: u.slug },
      update: { name: u.name, tagline: u.tagline, accentColor: u.accentColor, iconKey: u.iconKey, sortOrder: i, isFeatured: i < FEATURED_COUNT },
      create: { ...u, sortOrder: i, isFeatured: i < FEATURED_COUNT },
    });
  }

  console.log("Seeding technologies & skills…");
  for (const name of TECHNOLOGIES) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await prisma.technology.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }
  for (const name of SKILLS) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await prisma.skill.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }

  const interests = await prisma.interest.findMany();
  const bySlug = (s: string) => interests.find((u) => u.slug === s)!;

  const password = await hashPassword("Password123!");

  const demoUsers = [
    { username: "ada", displayName: "Ada Okonkwo", email: "ada@tedis.dev", headline: "Building agentic tooling for scientists", unis: ["ai", "science", "cloud"] },
    { username: "grace", displayName: "Grace Miller", email: "grace@tedis.dev", headline: "Security engineer · breaking things ethically", unis: ["cybersecurity", "cloud"] },
    { username: "linus", displayName: "Linus Park", email: "linus@tedis.dev", headline: "Design systems & interaction craft", unis: ["design", "ai"] },
  ];

  console.log("Seeding users…");
  const userIds: Record<string, string> = {};
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { onboardedAt: new Date(), emailVerified: new Date() },
      create: {
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        emailVerified: new Date(),
        onboardedAt: new Date(),
        password: { create: { hash: password } },
        profile: { create: { headline: u.headline } },
      },
      select: { id: true },
    });
    userIds[u.username] = user.id;

    for (let i = 0; i < u.unis.length; i++) {
      const interestId = bySlug(u.unis[i]!).id;
      await prisma.userInterest.upsert({
        where: { userId_interestId: { userId: user.id, interestId } },
        update: {},
        create: { userId: user.id, interestId, isPrimary: i === 0, sortOrder: i },
      });
    }
  }
  // Recompute interest member counts.
  for (const uni of interests) {
    const c = await prisma.userInterest.count({ where: { interestId: uni.id } });
    await prisma.interest.update({ where: { id: uni.id }, data: { membersCount: c } });
  }

  console.log("Seeding follows…");
  const follows: [string, string][] = [["grace", "ada"], ["linus", "ada"], ["ada", "linus"]];
  for (const [a, b] of follows) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: userIds[a]!, followingId: userIds[b]! } },
      update: {},
      create: { followerId: userIds[a]!, followingId: userIds[b]! },
    });
  }
  for (const username of Object.keys(userIds)) {
    const followers = await prisma.follow.count({ where: { followingId: userIds[username]! } });
    const following = await prisma.follow.count({ where: { followerId: userIds[username]! } });
    await prisma.profile.update({ where: { userId: userIds[username]! }, data: { followersCount: followers, followingCount: following } });
  }

  console.log("Seeding projects…");
  const projectSeeds = [
    { owner: "ada", slug: "atlas-agents", name: "Atlas Agents", tagline: "An open framework for research agents", interest: "ai", status: "LIVE" as const, openToCollab: true },
    { owner: "grace", slug: "netguard", name: "NetGuard", tagline: "Real-time anomaly detection for k8s clusters", interest: "cybersecurity", status: "BUILDING" as const, openToCollab: true },
    { owner: "linus", slug: "prism-ui", name: "Prism UI", tagline: "A calm, accessible React component system", interest: "design", status: "LIVE" as const, openToCollab: false },
  ];
  for (const p of projectSeeds) {
    const interestId = bySlug(p.interest).id;
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: `${p.name} — ${p.tagline}. Built in the open on TedIS.`,
        status: p.status,
        openToCollab: p.openToCollab,
        ownerId: userIds[p.owner]!,
        interestId,
        contributors: { create: { userId: userIds[p.owner]!, role: "MAINTAINER" } },
      },
    });
    await prisma.interest.update({ where: { id: interestId }, data: { projectsCount: { increment: 0 } } });
  }
  for (const username of Object.keys(userIds)) {
    const count = await prisma.project.count({ where: { ownerId: userIds[username]! } });
    await prisma.profile.update({ where: { userId: userIds[username]! }, data: { projectsCount: count } });
  }
  for (const uni of interests) {
    const c = await prisma.project.count({ where: { interestId: uni.id } });
    await prisma.interest.update({ where: { id: uni.id }, data: { projectsCount: c } });
  }

  console.log("Seeding posts…");
  const posts = [
    { author: "ada", interest: "ai", type: "MILESTONE" as const, body: "Atlas Agents just hit v0.4 — agents can now run multi-step literature reviews and cite sources. Huge week. 🎉" },
    { author: "ada", interest: "science", type: "QUESTION" as const, body: "What's your go-to eval harness for long-horizon agent tasks? Struggling to make ours reproducible." },
    { author: "grace", interest: "cybersecurity", type: "UPDATE" as const, body: "Wrote up how NetGuard catches lateral movement inside a cluster without a sidecar. eBPF is magic." },
    { author: "grace", interest: "cloud", type: "RESOURCE" as const, body: "The best k8s security checklist I've found — bookmarking for the team.", link: "https://kubernetes.io/docs/concepts/security/" },
    { author: "linus", interest: "design", type: "UPDATE" as const, body: "Shipped Prism UI's new focus-visible system. Accessibility isn't a feature, it's the floor." },
    { author: "linus", interest: "ai", type: "DISCUSSION" as const, body: "Hot take: most AI product UIs fail because they surface the model, not the user's goal. Design the outcome." },
  ];
  // Only seed posts if none exist yet (avoid duplicating on re-run).
  const existingPosts = await prisma.post.count();
  if (existingPosts === 0) {
    for (const p of posts) {
      await prisma.post.create({
        data: {
          authorId: userIds[p.author]!,
          interestId: bySlug(p.interest).id,
          type: p.type,
          body: p.body,
          linkUrl: p.link ?? null,
        },
      });
    }
  }

  console.log("Seeding communities…");
  const communitySeeds = [
    { owner: "ada", slug: "llm-fine-tuning", name: "LLM Fine-tuning", interest: "ai", purpose: "Practical fine-tuning, LoRA, evals and datasets.", members: ["grace", "linus"] },
    { owner: "grace", slug: "cloud-security", name: "Cloud Security", interest: "cybersecurity", purpose: "Securing clusters, pipelines and cloud infra.", members: ["ada"] },
    { owner: "linus", slug: "design-systems", name: "Design Systems", interest: "design", purpose: "Tokens, components, accessibility and craft.", members: ["ada"] },
  ];
  for (const c of communitySeeds) {
    const community = await prisma.community.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        name: c.name,
        purpose: c.purpose,
        description: `${c.name} — ${c.purpose}`,
        interestId: bySlug(c.interest).id,
        members: {
          create: [
            { userId: userIds[c.owner]!, role: "OWNER" },
            ...c.members.map((m) => ({ userId: userIds[m]!, role: "MEMBER" as const })),
          ],
        },
      },
      select: { id: true },
    });
    const memberCount = await prisma.communityMembership.count({ where: { communityId: community.id } });
    const threadCount = await prisma.thread.count({ where: { communityId: community.id } });
    await prisma.community.update({ where: { id: community.id }, data: { membersCount: memberCount, threadsCount: threadCount } });

    if (threadCount === 0) {
      const thread = await prisma.thread.create({
        data: {
          communityId: community.id,
          authorId: userIds[c.owner]!,
          title: `Welcome to ${c.name} 👋`,
          body: `This is the home for ${c.purpose.toLowerCase()} Introduce yourself and share what you're working on.`,
          isPinned: true,
        },
        select: { id: true },
      });
      const replier = c.members[0];
      if (replier) {
        await prisma.threadReply.create({
          data: { threadId: thread.id, authorId: userIds[replier]!, body: "Excited to be here — count me in!" },
        });
        await prisma.thread.update({ where: { id: thread.id }, data: { repliesCount: 1, lastReplyAt: new Date() } });
      }
      await prisma.community.update({ where: { id: community.id }, data: { threadsCount: 1 } });
    }
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
