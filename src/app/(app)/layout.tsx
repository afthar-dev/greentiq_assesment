import { requireSession } from "@/lib/auth-guard";
import { AppShell } from "@/components/custom/Appshell";

/**
 * Layout for every authenticated route.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();

  return (
    <AppShell user={{ name: user.name, email: user.email, image: user.image }}>
      {children}
    </AppShell>
  );
}
