import { Suspense } from "react";
import { AlertCircleIcon } from "lucide-react";

import { getDashboardStats } from "@/app/actions/customerActions";
import { requireSession } from "@/lib/auth-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TILES = [
  {
    key: "totalCustomers",
    label: "Total customers",
    hint: "Total registered accounts across all statuses",
  },
  {
    key: "activeCustomers",
    label: "Active customers",
    hint: "Active Customers ",
  },
  {
    key: "contactedThisWeek",
    label: "Contacted this week",
    hint: "Customers logged with an outreach event this week",
  },
] as const;

function StatCard({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{children}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {hint}
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {TILES.map(({ key, label, hint }) => (
        <StatCard key={key} label={label} hint={hint}>
          <Skeleton className="h-8 w-16" />
        </StatCard>
      ))}
    </div>
  );
}

async function Stats() {
  const result = await getDashboardStats();

  if (!result.ok) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertCircleIcon className="size-4" />
            Could not load statistics
          </CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {TILES.map(({ key, label, hint }) => (
        <StatCard key={key} label={label} hint={hint}>
          {result.data[key].toLocaleString()}
        </StatCard>
      ))}
    </div>
  );
}

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

      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>
    </div>
  );
}
