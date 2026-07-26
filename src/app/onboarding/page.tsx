import { redirect } from "next/navigation";
import { getServerAuth } from "@/server/auth/current-user";
import { listInterests } from "@/server/services/interest/interest.service";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function OnboardingPage() {
  const auth = await getServerAuth();
  if (!auth) redirect("/login");
  if (auth.user.onboardedAt) redirect("/home");

  const interests = await listInterests();
  return <OnboardingFlow interests={interests} initialUsername={auth.user.username} />;
}
