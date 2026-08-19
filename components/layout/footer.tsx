import { ThemeSwitcher } from "../theme-switcher";

export async function Footer() {
    return (
        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
            <p>
                Powered by Rysonance all rights reserved. 2026
            </p>
            <ThemeSwitcher />
        </footer>
    )
}