import { Hero } from "@/components/hero";
import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <Nav />
        <div className="flex-1 flex flex-col justify-center w-full p-5">
          <Suspense fallback={<div>Loading...</div>}>
            <Hero />
          </Suspense>
        </div>
        <Footer />
      </div>
    </main>
  );
}
