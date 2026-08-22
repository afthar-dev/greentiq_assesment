import { requireSession } from "@/lib/auth-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATS = [
  "Total Customers",
  "Active Customers",
  "Contacted this week",
] as const;

export default async function DashboardPage() {
  const { user } = await requireSession();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Track every lead, deal, and customer without the chaos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((label) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">—</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Populated once the customer data lands.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
