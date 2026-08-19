import { SignUpSuccess } from "@/components/auth/sign-up-success";

export default function Page() {
  return (
    <div className="flex w-full items-center justify-center md:p-10">
      <div className="w-full max-w-sm">
        <SignUpSuccess />
      </div>
    </div>
  );
}
