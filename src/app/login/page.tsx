import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginCard } from "@/features/auth/components/LoginCard";

export const metadata: Metadata = {
  title: "Sign in · CRM Dashboard",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Suspense>
        <LoginCard />
      </Suspense>
    </main>
  );
}
