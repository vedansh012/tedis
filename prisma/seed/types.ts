/**
 * Shared shapes for the seed pipeline.
 *
 * Generation is split into two phases: build plain objects in memory (pure,
 * fast, testable), then write them in batches. These types are the contract
 * between the two — nothing under `corpus/` or the generators touches Prisma.
 */

import type { COMPANIES } from "./corpus/identity";

export type CompanyKind = keyof typeof COMPANIES;

/** A fully-resolved person, before it becomes User + Profile + UserInterest rows. */
export interface Persona {
  /** Stable across runs — derived from the seed key, used as the RNG namespace. */
  key: string;
  archetype: string;
  displayName: string;
  username: string;
  email: string;
  headline: string;
  bio: string;
  location: string;
  company: string;
  experienceLevel: string;
  pronouns: string | null;
  githubUrl: string;
  linkedinUrl: string;
  avatarSeed: string;
  skills: string[];
  interestSlugs: string[];
  /** Topic keys this persona posts about. */
  topics: string[];
  reputation: number;
  joinedAt: Date;
  /** Relative popularity, 0..1 — drives follower counts and engagement reach. */
  influence: number;
}

/** The thirteen shapes a post can take. Drives length, tone, media and title. */
export type PostFormat =
  | "SHORT_UPDATE"
  | "ARTICLE"
  | "TUTORIAL"
  | "FACT"
  | "SHOWCASE"
  | "MEME"
  | "CAREER_ADVICE"
  | "RESEARCH_SUMMARY"
  | "THREAD"
  | "LAUNCH"
  | "DAILY_TIP"
  | "QUESTION"
  | "DISCUSSION";

/** A generated post, before it becomes a Post + PostMedia + PostTag rows. */
export interface GeneratedPost {
  key: string;
  authorKey: string;
  format: PostFormat;
  /** Maps to the existing Prisma PostType enum. */
  type: "UPDATE" | "QUESTION" | "RESOURCE" | "DISCUSSION" | "MILESTONE";
  title: string | null;
  body: string;
  tags: string[];
  interestSlug: string;
  topicKey: string;
  linkUrl: string | null;
  gitRepoUrl: string | null;
  createdAt: Date;
  media: GeneratedMedia[];
  /** Engagement targets. Actual rows are generated to match these exactly. */
  reactions: number;
  comments: number;
  bookmarks: number;
  shares: number;
}

export interface GeneratedMedia {
  kind: "IMAGE" | "VIDEO";
  /** Deterministic art seed — the same seed always renders the same image. */
  seed: string;
  /** Visual theme, keyed into the cover-art palettes. */
  theme: string;
  altText: string;
  width: number;
  height: number;
  durationSec?: number;
  /** Overlay text for video posters and diagram-style covers. */
  caption?: string;
}

export interface GeneratedComment {
  key: string;
  postKey: string;
  authorKey: string;
  body: string;
  /** Index into the post's comment list; null for a top-level comment. */
  parentIndex: number | null;
  createdAt: Date;
  reactions: number;
}
