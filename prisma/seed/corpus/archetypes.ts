/**
 * Persona archetypes — the twelve kinds of person in the community.
 *
 * Each archetype owns its own vocabulary: the skills it claims, the interests it
 * follows, the way it writes a headline, and how senior it tends to be. Personas
 * are then assembled by drawing from one archetype rather than from a global
 * pool, which is what stops 400 profiles from reading as the same person with
 * different names.
 *
 * `weight` is the archetype's share of the community. It is deliberately not
 * uniform: a real developer platform is mostly working engineers and students,
 * with a thin layer of founders and recruiters. Equal weights would make the
 * community feel like a conference panel rather than a workplace.
 */

import type { CompanyKind } from "../types";

export interface Archetype {
  key: string;
  label: string;
  weight: number;
  /** Where this kind of person works, weighted. */
  companies: readonly (readonly [CompanyKind, number])[];
  /** Seniority distribution — students skew junior, founders skew senior. */
  levels: readonly (readonly [string, number])[];
  /** Interest slugs they follow. First few are the most likely primary. */
  interests: readonly string[];
  /** Skills claimed on the profile. */
  skills: readonly string[];
  /** `{role}` is filled from `roles`; `{focus}` from FOCUS_CLAUSES. */
  headlines: readonly string[];
  roles: readonly string[];
  /** Topics they post about — keys into the topic corpus. */
  topics: readonly string[];
  /** Reputation multiplier. Maintainers and seniors have earned more. */
  reputationScale: number;
}

export const EXPERIENCE_LEVELS = [
  "Student",
  "Intern",
  "Junior",
  "Mid-level",
  "Senior",
  "Staff",
  "Principal",
  "Founder",
] as const;

export const ARCHETYPES: readonly Archetype[] = [
  {
    key: "student",
    label: "Student",
    weight: 18,
    companies: [["university", 100]],
    levels: [["Student", 78], ["Intern", 22]],
    interests: ["interview-prep", "career", "programming", "competitive-programming", "hackathons", "web-development", "ai", "open-source"],
    skills: ["Frontend", "Backend", "Systems"],
    roles: ["CS undergrad", "Final-year student", "MS student", "Pre-final year", "Engineering student"],
    headlines: [
      "{role} · {focus}",
      "{role} at {company}",
      "{role} — currently interviewing",
      "{role}. {focus}",
      "{role} · first internship loading…",
    ],
    topics: ["dsa", "interview-prep", "internships", "career", "programming", "hackathons", "python", "react", "web-dev", "open-source"],
    reputationScale: 0.35,
  },
  {
    key: "swe",
    label: "Software Engineer",
    weight: 16,
    companies: [["bigTech", 34], ["scaleup", 30], ["services", 22], ["startup", 14]],
    levels: [["Junior", 18], ["Mid-level", 36], ["Senior", 32], ["Staff", 14]],
    interests: ["programming", "system-design", "web-development", "open-source", "career", "cloud"],
    skills: ["Backend", "Systems", "Frontend"],
    roles: ["Software Engineer", "Backend Engineer", "Full-stack Engineer", "Platform Engineer", "Staff Engineer"],
    headlines: [
      "{role} @ {company}",
      "{role} at {company} · {focus}",
      "{role}. {focus}",
      "{role} @ {company} — {focus}",
    ],
    topics: ["programming", "system-design", "rust", "python", "linux", "open-source", "career", "docker", "dsa"],
    reputationScale: 1.0,
  },
  {
    key: "ai",
    label: "AI Engineer",
    weight: 10,
    companies: [["scaleup", 40], ["bigTech", 30], ["startup", 26], ["university", 4]],
    levels: [["Mid-level", 32], ["Senior", 40], ["Staff", 20], ["Principal", 8]],
    interests: ["ai", "machine-learning", "research", "programming", "data-science"],
    skills: ["Machine Learning", "Backend", "Research"],
    roles: ["AI Engineer", "LLM Engineer", "Applied AI Engineer", "AI Infrastructure Engineer"],
    headlines: [
      "{role} @ {company}",
      "{role} · {focus}",
      "{role} @ {company} · retrieval & evals",
      "Building with LLMs at {company}",
    ],
    topics: ["ai", "llms", "research", "python", "system-design", "cloud", "programming"],
    reputationScale: 1.25,
  },
  {
    key: "ml",
    label: "ML Engineer",
    weight: 8,
    companies: [["bigTech", 34], ["scaleup", 32], ["startup", 22], ["university", 12]],
    levels: [["Mid-level", 34], ["Senior", 40], ["Staff", 18], ["Principal", 8]],
    interests: ["machine-learning", "ai", "data-science", "research", "cloud"],
    skills: ["Machine Learning", "Data Engineering", "Research"],
    roles: ["ML Engineer", "Machine Learning Engineer", "MLOps Engineer", "Research Engineer"],
    headlines: [
      "{role} @ {company}",
      "{role} · training infra & evals",
      "{role} @ {company} · {focus}",
      "{role}. Mostly data problems dressed as model problems.",
    ],
    topics: ["ai", "llms", "research", "python", "cloud", "devops", "robotics"],
    reputationScale: 1.2,
  },
  {
    key: "web",
    label: "Web Developer",
    weight: 11,
    companies: [["scaleup", 32], ["startup", 28], ["services", 24], ["bigTech", 16]],
    levels: [["Junior", 22], ["Mid-level", 40], ["Senior", 30], ["Staff", 8]],
    interests: ["web-development", "programming", "ui-ux-design", "open-source", "freelancing"],
    skills: ["Frontend", "Backend", "Product Design"],
    roles: ["Frontend Engineer", "Web Developer", "Full-stack Developer", "UI Engineer"],
    headlines: [
      "{role} @ {company}",
      "{role} · React, TypeScript, too much CSS",
      "{role} at {company} · {focus}",
      "{role}. Accessibility is not optional.",
    ],
    topics: ["react", "web-dev", "programming", "flutter", "open-source", "product-launches", "python"],
    reputationScale: 0.9,
  },
  {
    key: "devops",
    label: "DevOps Engineer",
    weight: 8,
    companies: [["bigTech", 28], ["scaleup", 34], ["services", 22], ["startup", 16]],
    levels: [["Mid-level", 32], ["Senior", 42], ["Staff", 20], ["Principal", 6]],
    interests: ["devops", "cloud", "system-design", "programming", "cybersecurity"],
    skills: ["DevOps", "Systems", "Security"],
    roles: ["DevOps Engineer", "SRE", "Platform Engineer", "Infrastructure Engineer", "Cloud Architect"],
    headlines: [
      "{role} @ {company}",
      "{role} · {focus}",
      "{role} @ {company} — on call, again",
      "{role}. YAML is my first language now.",
    ],
    topics: ["devops", "docker", "aws", "cloud", "linux", "system-design", "programming"],
    reputationScale: 1.1,
  },
  {
    key: "security",
    label: "Security Researcher",
    weight: 7,
    companies: [["bigTech", 24], ["scaleup", 26], ["startup", 24], ["services", 16], ["university", 10]],
    levels: [["Mid-level", 28], ["Senior", 42], ["Staff", 22], ["Principal", 8]],
    interests: ["cybersecurity", "cloud", "programming", "research", "open-source"],
    skills: ["Security", "Systems", "Research"],
    roles: ["Security Researcher", "Application Security Engineer", "Penetration Tester", "Security Engineer"],
    headlines: [
      "{role} @ {company}",
      "{role} · breaking things ethically",
      "{role} @ {company} · {focus}",
      "{role}. Threat modelling > tooling.",
    ],
    topics: ["cybersecurity", "linux", "cloud", "devops", "programming", "research", "open-source"],
    reputationScale: 1.15,
  },
  {
    key: "designer",
    label: "Designer",
    weight: 7,
    companies: [["scaleup", 34], ["startup", 30], ["bigTech", 24], ["services", 12]],
    levels: [["Junior", 16], ["Mid-level", 38], ["Senior", 34], ["Staff", 12]],
    interests: ["ui-ux-design", "product-design", "design", "web-development", "product-management"],
    skills: ["Product Design", "Frontend"],
    roles: ["Product Designer", "UX Engineer", "Design Systems Lead", "Interaction Designer"],
    headlines: [
      "{role} @ {company}",
      "{role} · systems, not screens",
      "{role} at {company} · {focus}",
      "{role}. I will fight about spacing.",
    ],
    topics: ["design", "product-launches", "web-dev", "react", "career", "startups"],
    reputationScale: 0.85,
  },
  {
    key: "founder",
    label: "Startup Founder",
    weight: 6,
    companies: [["startup", 92], ["scaleup", 8]],
    levels: [["Founder", 100]],
    interests: ["startups", "entrepreneurship", "product-management", "ai", "programming"],
    skills: ["Product Design", "Backend", "Systems"],
    roles: ["Founder", "Co-founder", "Founder & CTO", "Technical co-founder"],
    headlines: [
      "{role} @ {company}",
      "{role}, {company} · building in public",
      "{role} @ {company} · {focus}",
      "Building {company}. {focus}",
    ],
    topics: ["startups", "product-launches", "career", "ai", "system-design", "programming", "hackathons"],
    reputationScale: 1.3,
  },
  {
    key: "oss",
    label: "Open Source Contributor",
    weight: 5,
    companies: [["scaleup", 36], ["bigTech", 24], ["startup", 20], ["university", 20]],
    levels: [["Mid-level", 26], ["Senior", 38], ["Staff", 26], ["Principal", 10]],
    interests: ["open-source", "programming", "system-design", "devops", "web-development"],
    skills: ["Systems", "Backend", "DevOps"],
    roles: ["Maintainer", "Open Source Engineer", "Core Contributor", "DevRel Engineer"],
    headlines: [
      "{role} · {focus}",
      "{role} of a library you've probably installed",
      "{role} @ {company} · OSS maintainer",
      "{role}. Reviewing your PR shortly, I promise.",
    ],
    topics: ["open-source", "rust", "programming", "linux", "python", "docker", "web-dev"],
    reputationScale: 1.6,
  },
  {
    key: "pm",
    label: "Product Manager",
    weight: 5,
    companies: [["bigTech", 34], ["scaleup", 34], ["startup", 24], ["services", 8]],
    levels: [["Mid-level", 34], ["Senior", 42], ["Staff", 18], ["Principal", 6]],
    interests: ["product-management", "startups", "ui-ux-design", "ai", "career"],
    skills: ["Product Design", "Research"],
    roles: ["Product Manager", "Senior PM", "Technical PM", "Group Product Manager"],
    headlines: [
      "{role} @ {company}",
      "{role} · {focus}",
      "{role} at {company} — closest thing to a translator",
      "{role}. Roadmaps are hypotheses.",
    ],
    topics: ["product-launches", "startups", "career", "ai", "design", "system-design"],
    reputationScale: 0.8,
  },
  {
    key: "recruiter",
    label: "Recruiter",
    weight: 3,
    companies: [["agency", 56], ["bigTech", 22], ["scaleup", 22]],
    levels: [["Mid-level", 40], ["Senior", 46], ["Staff", 14]],
    interests: ["career", "interview-prep", "startups", "programming"],
    skills: ["Research"],
    roles: ["Technical Recruiter", "Talent Partner", "Head of Talent", "Engineering Recruiter"],
    headlines: [
      "{role} @ {company}",
      "{role} · hiring engineers, actually reading your CV",
      "{role} at {company} · {focus}",
      "{role}. No, I won't ghost you.",
    ],
    topics: ["career", "internships", "interview-prep", "startups"],
    reputationScale: 0.6,
  },
];

/**
 * Badges are derived, never stored.
 *
 * A stored badge would go stale the moment the underlying number changed, and
 * would need backfilling for real users. Deriving them from reputation, tenure
 * and contribution counts means seeded and real accounts earn them by exactly the
 * same rule — which is the whole point of §16.
 */
export interface BadgeRule {
  key: string;
  label: string;
  /** lucide icon key, matching components/interest-icon.tsx's registry. */
  icon: string;
  tone: "gold" | "violet" | "blue" | "green" | "slate";
  description: string;
}

export const BADGES: Record<string, BadgeRule> = {
  founding: { key: "founding", label: "Founding member", icon: "sparkles", tone: "gold", description: "Joined in the platform's first months." },
  maintainer: { key: "maintainer", label: "Maintainer", icon: "git-fork", tone: "violet", description: "Maintains open source others depend on." },
  mentor: { key: "mentor", label: "Mentor", icon: "graduation-cap", tone: "blue", description: "Consistently answers other builders' questions." },
  shipper: { key: "shipper", label: "Ships often", icon: "rocket", tone: "green", description: "Posts build updates week after week." },
  topContributor: { key: "topContributor", label: "Top contributor", icon: "trophy", tone: "gold", description: "Among the highest-reputation builders." },
  researcher: { key: "researcher", label: "Researcher", icon: "microscope", tone: "violet", description: "Publishes research summaries and papers." },
  earlyAdopter: { key: "earlyAdopter", label: "Early adopter", icon: "flame", tone: "slate", description: "Here before it was busy." },
};
