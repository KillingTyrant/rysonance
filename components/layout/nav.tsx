import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";


export async function Nav() {
    return (
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
            <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                <div className="flex gap-5 items-center font-semibold w-full">
                    <Link
                        href={"/"}
                        className="rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <Logo className="h-5 w-auto shrink-0" />
                    </Link>
                </div>
                <div className="w-full flex justify-end items-center gap-5">
                    <ThemeSwitcher />
                </div>
            </div>
        </nav>
    );
}