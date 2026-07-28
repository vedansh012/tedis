import {
  Brain,
  Binary,
  Shield,
  Cloud,
  CodeXml,
  Smartphone,
  LineChart,
  Infinity as InfinityIcon,
  Network,
  GitFork,
  Terminal,
  Trophy,
  Joystick,
  AppWindow,
  PenTool,
  Bot,
  RadioTower,
  Blocks,
  CircuitBoard,
  Cpu,
  Component,
  Zap,
  Cog,
  HardHat,
  FlaskConical,
  Plane,
  Dna,
  Microscope,
  Rocket,
  Lightbulb,
  ClipboardList,
  ClipboardCheck,
  Palette,
  Clapperboard,
  Camera,
  Briefcase,
  Laptop,
  Code,
  FolderGit2,
  Newspaper,
  TrendingUp,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Atom,
  Users,
  Globe,
  Compass,
  Target,
  BookOpen,
  Flame,
  Star,
  Sparkles,
  Database,
  Server,
  Layers,
  Calendar,
  Presentation,
  BadgeDollarSign,
  Wrench,
  Hammer,
  Leaf,
  Film,
  Image as ImageIcon,
  Music,
  Heart,
  Circle,
  type LucideIcon,
} from "lucide-react";

/**
 * Registry mapping an interest `iconKey` → a lucide icon. This is the ONLY
 * frontend coupling for interests: an admin can publish a new interest with any
 * key below (or an emoji, see `InterestIcon`) with no code change. Keep keys
 * kebab-case and stable — they're persisted on `Interest.iconKey`.
 */
export const INTEREST_ICONS: Record<string, LucideIcon> = {
  brain: Brain,
  binary: Binary,
  shield: Shield,
  cloud: Cloud,
  "code-xml": CodeXml,
  smartphone: Smartphone,
  "line-chart": LineChart,
  infinity: InfinityIcon,
  network: Network,
  "git-fork": GitFork,
  terminal: Terminal,
  trophy: Trophy,
  joystick: Joystick,
  "app-window": AppWindow,
  "pen-tool": PenTool,
  bot: Bot,
  "radio-tower": RadioTower,
  blocks: Blocks,
  "circuit-board": CircuitBoard,
  cpu: Cpu,
  component: Component,
  zap: Zap,
  cog: Cog,
  "hard-hat": HardHat,
  "flask-conical": FlaskConical,
  plane: Plane,
  dna: Dna,
  microscope: Microscope,
  rocket: Rocket,
  lightbulb: Lightbulb,
  "clipboard-list": ClipboardList,
  "clipboard-check": ClipboardCheck,
  palette: Palette,
  clapperboard: Clapperboard,
  camera: Camera,
  briefcase: Briefcase,
  laptop: Laptop,
  code: Code,
  "folder-git-2": FolderGit2,
  newspaper: Newspaper,
  "trending-up": TrendingUp,
  "gamepad-2": Gamepad2,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  atom: Atom,
  // generic extras — available to the admin picker for future interests
  users: Users,
  globe: Globe,
  compass: Compass,
  target: Target,
  "book-open": BookOpen,
  flame: Flame,
  star: Star,
  sparkles: Sparkles,
  database: Database,
  server: Server,
  layers: Layers,
  calendar: Calendar,
  presentation: Presentation,
  "badge-dollar-sign": BadgeDollarSign,
  wrench: Wrench,
  hammer: Hammer,
  leaf: Leaf,
  film: Film,
  image: ImageIcon,
  music: Music,
  heart: Heart,
};

/** Stable, sorted list of available icon keys — for the admin icon picker. */
export const INTEREST_ICON_KEYS = Object.keys(INTEREST_ICONS);

// Any string carrying a pictographic glyph is treated as an emoji icon.
const EMOJI_RE = /\p{Extended_Pictographic}/u;

/** True when `iconKey` should render as an emoji rather than a lucide icon. */
export function isEmojiIcon(iconKey?: string | null): boolean {
  return !!iconKey && EMOJI_RE.test(iconKey);
}

/**
 * Renders an interest's icon. Accepts a registry key (lucide) OR an emoji —
 * so new interests are fully admin-managed with no frontend change. Falls back
 * to a neutral circle for unknown keys.
 */
export function InterestIcon({
  iconKey,
  className,
  size = 20,
}: {
  iconKey?: string | null;
  className?: string;
  size?: number;
}) {
  if (isEmojiIcon(iconKey)) {
    return (
      <span
        className={className}
        style={{ fontSize: size * 0.9, lineHeight: 1 }}
        aria-hidden
      >
        {iconKey}
      </span>
    );
  }
  const Icon = (iconKey && INTEREST_ICONS[iconKey]) || Circle;
  return <Icon className={className} size={size} aria-hidden />;
}
