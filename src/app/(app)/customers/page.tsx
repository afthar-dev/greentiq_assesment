import type { Metadata } from "next";

import { CustomerTable } from "@/components/custom/CustomerTable";

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

      <CustomerTable />
    </div>
  );
}
