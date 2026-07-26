"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { InterestIcon } from "@/components/interest-icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { AvatarUpload } from "@/components/media/avatar-upload";
import { usernameSchema } from "@/features/auth/schema";

interface InterestCard {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  accentColor: string | null;
  iconKey: string | null;
  membersCount: number;
}

export function OnboardingFlow({
  interests,
  initialUsername,
}: {
  interests: InterestCard[];
  initialUsername: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [username] = useState(initialUsername);
  const [headline, setHeadline] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const avatarUpdate = trpc.profile.update.useMutation();
  const complete = trpc.profile.completeOnboarding.useMutation({
    onSuccess: () => {
      router.push("/home");
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    setError(null);
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid username");
      return;
    }
    complete.mutate({
      username: parsed.data,
      headline: headline.trim() || undefined,
      interestIds: [...selected],
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-10">
      {/* progress */}
      <div className="mb-8 flex items-center gap-2" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div
            key="interests"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-3xl font-semibold tracking-tight">What interests you?</h1>
            <p className="mt-2 text-muted-foreground">
              Select the topics you&rsquo;d like to see in your feed. You can change these anytime from your profile.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {interests.map((u) => {
                const active = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u.id)}
                    aria-pressed={active}
                    className={cn(
                      "group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-foreground/20",
                    )}
                  >
                    <span
                      className="flex size-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: (u.accentColor ?? "#FF6B00") + "1a", color: u.accentColor ?? "#FF6B00" }}
                    >
                      <InterestIcon iconKey={u.iconKey} size={18} />
                    </span>
                    <span>
                      <span className="block font-medium">{u.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {u.membersCount > 0 ? `${u.membersCount.toLocaleString()} members` : "New topic"}
                      </span>
                    </span>
                    {active && (
                      <span
                        className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      >
                        <Check size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-4 bg-background/80 py-4 backdrop-blur">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {selected.size === 0
                  ? "Pick at least one to continue"
                  : `${selected.size} selected · Your feed is taking shape`}
              </p>
              <Button disabled={selected.size === 0} onClick={() => setStep(1)}>
                Continue
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-3xl font-semibold tracking-tight">Make it yours</h1>
            <p className="mt-2 text-muted-foreground">
              Add a photo and a line about what you&rsquo;re working on. You can skip and do this later.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-4">
                <AvatarUpload
                  url={avatarUrl}
                  name={username}
                  size={72}
                  onChange={(url) => {
                    setAvatarUrl(url);
                    avatarUpdate.mutate({ avatarUrl: url });
                  }}
                />
                <div>
                  <p className="text-sm font-medium">@{username}</p>
                  <p className="text-xs text-muted-foreground">This is your handle on TedIS.</p>
                </div>
              </div>
              <Field
                label="What are you working on right now?"
                name="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Building a CV model for wildlife cameras"
                maxLength={120}
              />
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={submit} loading={complete.isPending}>
                Enter TedIS
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
