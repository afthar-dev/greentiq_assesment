import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Customers · CRM Dashboard",
};

export default function CustomersPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Everyone your team is tracking, in one place.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nothing here yet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The customer table, search and filter panel land in the next step.
        </CardContent>
      </Card>
    </div>
  );
}
