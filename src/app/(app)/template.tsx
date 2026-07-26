/**
 * Page-transition wrapper. A `template` (unlike `layout`) re-mounts on every
 * navigation, so this replays a subtle fade + settle on each route change —
 * fluid page transitions app-wide, pure CSS, no runtime cost. The global
 * prefers-reduced-motion guard (globals.css) neutralizes it for those users.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="duration-300 ease-out animate-in fade-in slide-in-from-bottom-1">{children}</div>;
}
