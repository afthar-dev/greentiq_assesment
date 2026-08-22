"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"

import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleSignOut() {
    setIsPending(true)

    await signOut({
      fetchOptions: {
        onSuccess: () => {
          // refresh() clears the router cache so protected server components
          // are not served from it after the session is gone.
          router.push("/login")
          router.refresh()
        },
      },
    })

    setIsPending(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={isPending}
    >
      <LogOutIcon />
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  )
}
