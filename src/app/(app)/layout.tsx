import { requireSession } from "@/lib/auth-guard";
import { AppShell } from "@/components/custom/Appshell";

/**
 * Layout for every authenticated route.
 *
 * Session verification lives here rather than in each page, so a new route
 * added under (app) is protected by default instead of by remembering to.
 * /login sits outside this group and renders without the shell.
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
