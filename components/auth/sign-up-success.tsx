import { cn } from "@/lib/utils";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import Link from "next/link";
import { Button } from "../ui/button";

export function SignUpSuccess({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="border-0">
                <CardHeader>
                    <CardTitle className="text-5xl">
                        Thank you for signing up!
                    </CardTitle>
                    <CardDescription className="text-xl">Check your email to confirm</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        You&apos;ve successfully signed up. Please check your email to
                        confirm your account before signing in.
                    </p>
                    <Button asChild variant="ticket" className="w-full">
                        <Link href="/auth/login">Accedi</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}