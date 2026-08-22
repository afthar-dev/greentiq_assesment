"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Error codes Better Auth can hand back on the failed-redirect URL. */
const ERROR_MESSAGES: Record<string, string> = {
  email_not_allowed:
    "That account is not on the access list for this dashboard.",
  access_denied: "Sign-in was cancelled.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
      />
    </svg>
  );
}

export function LoginCard() {
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorCode = searchParams.get("error");
  const callbackURL = searchParams.get("callbackURL") ?? "/";
  const message =
    error ??
    (errorCode
      ? (ERROR_MESSAGES[errorCode] ?? "Sign-in failed. Please try again.")
      : null);

  async function handleSignIn() {
    setIsPending(true);
    setError(null);

    const { error: signInError } = await signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: "/login",
    });

    // On success the browser navigates to Google, so this only runs on failure.
    if (signInError) {
      setError(signInError.message ?? "Could not reach Google. Try again.");
      setIsPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">CRM Dashboard</CardTitle>
        <CardDescription>
          Sign in with your Google account to continue.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        {message ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

        <Button
          onClick={handleSignIn}
          disabled={isPending}
          size="lg"
          className="w-full"
        >
          {isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {isPending ? "Redirecting…" : "Continue with Google"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Access is limited to approved accounts.
        </p>
      </CardContent>
    </Card>
  );
}
