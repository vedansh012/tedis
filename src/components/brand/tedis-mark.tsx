"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The TedIS brand mark. The source PNG has a baked-in background, so we round
 * the corners to present it as an app-icon tile. `float` adds the slow vertical
 * bob (via the animate-float CSS keyframe); `interactive` layers a pointer-tracked
 * 3D tilt + specular highlight on top without disturbing the float.
 */
export function TedisMark({
  size = 40,
  float = false,
  interactive = false,
  className,
  priority = false,
}: {
  size?: number;
  float?: boolean;
  interactive?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const img = (
    <Image
      src="/tedis-logo.png"
      alt="TedIS"
      width={size}
      height={size}
      priority={priority}
      draggable={false}
      className="pointer-events-none select-none rounded-xl object-cover shadow-sm"
      style={{ width: size, height: size }}
    />
  );

  // Non-interactive: original render. When `float` is on, the Image itself carries
  // the CSS bob so we don't regress any existing usage.
  if (!interactive) {
    return (
      <div className={cn("inline-block", float && "animate-float will-change-transform", className)}>
        {img}
      </div>
    );
  }

  return <InteractiveMark size={size} float={float} className={className}>{img}</InteractiveMark>;
}

function InteractiveMark({
  size,
  float,
  className,
  children,
}: {
  size: number;
  float: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  function apply(nx: number, ny: number) {
    if (tiltRef.current) tiltRef.current.style.transform = `perspective(600px) rotateX(${-ny * 36}deg) rotateY(${nx * 44}deg)`;
    if (sheenRef.current) sheenRef.current.style.background = `radial-gradient(120% 120% at ${(nx + 0.5) * 100}% ${(ny + 0.5) * 100}%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)`;
    if (glowRef.current) glowRef.current.style.background = `radial-gradient(60% 60% at ${50 - nx * 40}% ${50 - ny * 40}%, hsl(var(--primary)/0.55), hsl(var(--primary)/0) 70%)`;
  }

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5; // [-0.5, 0.5]
    const ny = (e.clientY - r.top) / r.height - 0.5;
    apply(nx, ny);
  }
  function onLeave() { apply(0, 0); }

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onTouchMove={(e) => {
        const t = e.touches[0]; if (!t) return;
        const r = e.currentTarget.getBoundingClientRect();
        apply((t.clientX - r.left) / r.width - 0.5, (t.clientY - r.top) / r.height - 0.5);
      }}
      onTouchEnd={onLeave}
      style={{ width: size, height: size }}
      className={cn("group relative inline-block", className)}
    >
      {/* pointer-following underglow — barely-there at rest, blooms on hover */}
      <span
        ref={glowRef}
        aria-hidden
        style={{
          background: "radial-gradient(60% 60% at 50% 50%, hsl(var(--primary)/0.55), hsl(var(--primary)/0) 70%)",
          width: size * 1.5,
          height: size * 1.5,
          left: size * -0.25,
          top: size * -0.25,
        }}
        className="pointer-events-none absolute -z-10 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* tilt layer — the CSS float bob lives on a nested element so the JS-driven
          rotate never fights the keyframe transform on the same element. */}
      <div
        ref={tiltRef}
        style={{
          transform: "perspective(600px) rotateX(0deg) rotateY(0deg)",
          transformStyle: "preserve-3d",
          transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="relative h-full w-full"
      >
        <div className={cn("relative h-full w-full", float && "animate-float will-change-transform")}>
          {children}
          {/* specular sheen — invisible at rest, fades in on hover, tracks the pointer */}
          <span
            ref={sheenRef}
            aria-hidden
            style={{
              background: "radial-gradient(120% 120% at 50% 50%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)",
              mixBlendMode: "screen",
            }}
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-70"
          />
          {/* subtle inner rim for depth under the tilt */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-6px_14px_-8px_rgba(0,0,0,0.3)]"
          />
        </div>
      </div>
    </div>
  );
}
