import { createClient } from "@/lib/supabase/server";
import { Button } from "./ui/button";
import Link from "next/link";
import { Logo } from "./layout/logo";
import { Suspense } from "react";
import { AuthButton } from "./auth/auth-button";

export async function Hero() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return (
    <div className="flex flex-col gap-16 items-center max-w-4xl w-full text-center">
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
      {/*
        Il vincolo è sulla larghezza, non sull'altezza: il viewBox è 5,23:1,
        quindi `h-52` avrebbe voluto 1088px di larghezza e sarebbe uscito dallo
        schermo su tutto ciò che sta sotto i 1128px. Con `w-full max-w-2xl`
        l'altezza la ricava l'SVG dal rapporto — 61px su un telefono, 128px una
        volta raggiunto il tetto — e traboccare diventa impossibile.
      */}
      <h1 className="w-full max-w-2xl">
        <Logo className="h-auto w-full" />
      </h1>
      {user ? (
        <div className="flex items-center gap-4">
          <Button asChild variant="ticket" className="w-52">
            <Link href="/lobby">Lobby</Link>
          </Button>
        </div>
      ) : (
        <Button asChild variant="ticket" className="w-full">
          <Link href="/auth/login">Accedi</Link>
        </Button>
      )}
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  );
}
