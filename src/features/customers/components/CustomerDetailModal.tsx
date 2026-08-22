"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircleIcon,
  BuildingIcon,
  CalendarCheckIcon,
  ClockIcon,
  Loader2Icon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import type { Customer } from "@/generated/prisma/client";
import {
  getCustomer,
  touchLastContact,
} from "@/features/customers/actions/customer-actions";
import { customerKeys } from "@/lib/query-keys";
import { STATUS_LABELS } from "@/features/customers/schemas/customer";
import { STATUS_STYLES } from "@/features/customers/lib/customer-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm">{children}</p>
      </div>
    </div>
  );
}

export function CustomerDetailModal({
  customer,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  /** The row that was clicked; null closes the modal. */
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}) {
  const queryClient = useQueryClient();
  const id = customer?.id;

  // Re-fetch the customer when the ID changes
  const { data, isError, error } = useQuery({
    queryKey: customerKeys.detail(id ?? ""),
    queryFn: async () => {
      const result = await getCustomer(id!);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
    initialData: customer ?? undefined,
  });

  const markContacted = useMutation({
    mutationFn: async (customerId: string) => {
      const result = await touchLastContact(customerId);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success("Marked as contacted today", { description: updated.name });
    },
    onError: (mutationError: Error) => {
      toast.error(mutationError.message || "Could not update last contact");
    },
  });

  const record = data ?? customer;

  return (
    <Dialog open={Boolean(customer)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {isError || !record ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircleIcon className="size-4 text-destructive" />
                Could not load customer
              </DialogTitle>
              <DialogDescription>
                {error instanceof Error
                  ? error.message
                  : "This customer may have been deleted."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium">
                  {initials(record.name)}
                </span>
                <div className="min-w-0">
                  <DialogTitle className="truncate">{record.name}</DialogTitle>
                  <DialogDescription className="truncate">
                    {record.company}
                  </DialogDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`${STATUS_STYLES[record.status]} ml-auto`}
                >
                  {STATUS_LABELS[record.status]}
                </Badge>
              </div>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field icon={MailIcon} label="Email">
                <a
                  href={`mailto:${record.email}`}
                  className="hover:underline"
                  title={record.email}
                >
                  {record.email}
                </a>
              </Field>
              <Field icon={PhoneIcon} label="Phone">
                <a href={`tel:${record.phone}`} className="hover:underline">
                  {record.phone}
                </a>
              </Field>
              <Field icon={BuildingIcon} label="Company">
                {record.company}
              </Field>
              <Field icon={CalendarCheckIcon} label="Last contact">
                {record.lastContactAt
                  ? format(record.lastContactAt, "d MMM yyyy")
                  : "Never contacted"}
              </Field>
              <Field icon={ClockIcon} label="Added">
                {format(record.createdAt, "d MMM yyyy")}
              </Field>
              <Field icon={ClockIcon} label="Last updated">
                {format(record.updatedAt, "d MMM yyyy")}
              </Field>
            </div>

            <Separator />

            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Notes</p>
              {record.notes ? (
                <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No notes yet.
                </p>
              )}
            </div>

            <DialogFooter className="sm:justify-between">
              <Button
                variant="outline"
                onClick={() => markContacted.mutate(record.id)}
                disabled={markContacted.isPending}
              >
                {markContacted.isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <CalendarCheckIcon />
                )}
                {markContacted.isPending ? "Saving…" : "Mark contacted today"}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onDelete(record);
                  }}
                >
                  <Trash2Icon />
                  Delete
                </Button>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(record);
                  }}
                >
                  <PencilIcon />
                  Edit
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
