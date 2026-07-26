import {
  Sparkles,
  Shield,
  Cloud,
  Bot,
  Palette,
  TrendingUp,
  Gamepad2,
  Rocket,
  Camera,
  HeartPulse,
  GraduationCap,
  Atom,
  Megaphone,
  Circle,
  type LucideIcon,
} from "lucide-react";

/** Maps a seed `iconKey` to a lucide icon. Falls back to a neutral circle. */
const MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  shield: Shield,
  cloud: Cloud,
  bot: Bot,
  palette: Palette,
  "trending-up": TrendingUp,
  "gamepad-2": Gamepad2,
  rocket: Rocket,
  camera: Camera,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  atom: Atom,
  megaphone: Megaphone,
};

export function InterestIcon({
  iconKey,
  className,
  size = 20,
}: {
  iconKey?: string | null;
  className?: string;
  size?: number;
}) {
  const Icon = (iconKey && MAP[iconKey]) || Circle;
  return <Icon className={className} size={size} aria-hidden />;
}
