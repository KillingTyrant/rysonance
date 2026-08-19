import { LoginForm } from "@/components/auth/login-form";

export default function Page() {
  return (
    <div className="flex w-full items-center justify-center md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
