import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <Nav />
        <div className="flex-1 flex flex-col max-w-5xl p-5">
          {children}
        </div>
        <Footer />
      </div>
    </main>
  );
}
