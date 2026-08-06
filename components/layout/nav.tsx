import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";


export async function Nav() {
    return (
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
            <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                <div className="flex gap-5 items-center font-semibold w-full">
                    <Link href={"/"}>Rysonance RPG</Link>
                </div>
                <div className="w-full flex justify-end items-center gap-5">
                    <Suspense>
                        <AuthButton />
                    </Suspense>
                    <ThemeSwitcher />
                </div>
            </div>
        </nav>
    );
}