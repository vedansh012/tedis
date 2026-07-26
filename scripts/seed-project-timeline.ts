/**
 * Dev helper: give a project a stage/progress and a few chronological updates
 * so the build-in-public timeline + feed card can be verified end-to-end.
 * Run: pnpm tsx scripts/seed-project-timeline.ts
 */
import { prisma } from "@/server/db/prisma";
import { createPost } from "@/server/services/feed/feed.service";

async function main() {
  const project = await prisma.project.findFirst({
    where: { slug: "atlas-agents" },
    select: { id: true, ownerId: true, interestId: true },
  });
  if (!project) throw new Error("atlas-agents project not found");

  const updates = [
    "Kicked off Atlas Agents — an open framework for research agents. Goal: let scientists compose tool-using agents without gluing SDKs by hand.",
    "Research week: benchmarked planner loops (ReAct vs. plan-execute). Plan-execute wins on multi-step tool chains; writing up the eval harness next.",
    "First prototype running end-to-end: a retrieval + code-exec agent answering questions over a papers corpus. Rough, but the loop closes. 🎉",
    "Reworked the tool interface into a typed registry so agents can discover capabilities at runtime. Cut boilerplate by ~40%.",
  ];

  // Space them out so the timeline reads as a journey over time.
  let when = Date.now() - updates.length * 36 * 3600 * 1000;
  for (const body of updates) {
    const post = await createPost(project.ownerId, {
      body,
      projectId: project.id,
      interestId: project.interestId,
    });
    await prisma.post.update({ where: { id: post.id }, data: { createdAt: new Date(when) } });
    when += 36 * 3600 * 1000;
  }

  const count = await prisma.post.count({ where: { projectId: project.id, deletedAt: null } });
  console.log(`Seeded. atlas-agents now has ${count} posts in its timeline.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
