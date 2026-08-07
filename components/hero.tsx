import { createClient } from "@/lib/supabase/server";
import { Button } from "./ui/button";
import Link from "next/link";

export async function Hero() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return (
    <div className="flex flex-col gap-16 items-center w-full">
      <h1 className="sr-only">Rysonance</h1>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
      <h1 className="text-4xl font-bold text-center">
        Rysonance RPG
      </h1>
      {user ? (
        <div className="flex items-center gap-4">
          <Button asChild variant="default">
            <Link href="/onboarding">Onboarding</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/lobby">Lobby</Link>
          </Button>
        </div>
      ) : null}
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  );
}
