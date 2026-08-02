"use client";

import Link from "next/link";
import { PenLine, FolderGit2, ArrowRight } from "lucide-react";

/**
 * Create chooser. The sidebar/bottom-nav "Create" button lands here; it offers
 * the two things a user can make and routes to the existing flows unchanged —
 * /new/post (the feed composer) and /new/project (the project form).
 */
const OPTIONS = [
  {
    href: "/new/post",
    icon: PenLine,
    title: "Post",
    blurb: "Share an update, a question, a link, photos or a video with your feed.",
  },
  {
    href: "/new/project",
    icon: FolderGit2,
    title: "Project",
    blurb: "Start a project others can follow as you build it in the open, update by update.",
  },
] as const;

export default function CreateChooserPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
        <p className="text-sm text-muted-foreground">What would you like to make?</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ href, icon: Icon, title, blurb }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-secondary/40"
          >
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon size={22} />
            </span>
            <span className="flex items-center gap-1.5 text-base font-semibold">
              {title}
              <ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="text-sm text-muted-foreground">{blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
