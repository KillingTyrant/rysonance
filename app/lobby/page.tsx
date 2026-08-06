import Link from "next/link";

export default function LobbyPage() {
  return (
    <div className="flex flex-col gap-16 items-center w-full">
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
      <h1 className="text-4xl font-bold text-center">
        Lobby Page
      </h1>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
      <Link href="/onboarding" className="mt-8 text-lg font-semibold text-primary underline text-center">
        Go to Onboarding Page
      </Link>
    </div>
  );
}
