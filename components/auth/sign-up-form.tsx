"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Le password non coincidono");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="text-5xl font-bold">Di vuoto e draghi</CardTitle>
          <CardDescription className="text-xl">
            Registrati e crea un eroe di Rysonance per completare la quest di Prince Doji e ottenere la ricompensa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="hidden">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="hidden">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat-password" className="hidden">
                  Ripeti la password
                </Label>
                <Input
                  id="repeat-password"
                  type="password"
                  placeholder="Ripeti la password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading} variant={'ticket'}>
                {isLoading ? "Creazione in corso..." : "Registrati"}
              </Button>
              <div className="text-center text-sm">
                Hai già un account?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Accedi
                </Link>
              </div>
              <div className="relative text-center text-sm">
                <span className="absolute inset-0 top-1/2 border-t" />
                <span className="relative bg-card px-2 text-muted-foreground">
                  oppure
                </span>
              </div>
              <GoogleSignInButton />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
