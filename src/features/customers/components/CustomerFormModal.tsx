"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import type { Customer } from "@/generated/prisma/client";
import {
  createCustomer,
  updateCustomer,
} from "@/features/customers/actions/customer-actions";
import { customerKeys } from "@/lib/query-keys";
import {
  CUSTOMER_STATUSES,
  STATUS_LABELS,
  customerInputSchema,
  type CustomerInput,
  type CustomerValues,
} from "@/features/customers/schemas/customer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Renders a Date back into the yyyy-MM-dd a date input expects. */
function toDateInput(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

const EMPTY: CustomerInput = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "LEAD",
  lastContactAt: "",
  notes: "",
};

export function CustomerFormModal({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing, absent when creating. */
  customer?: Customer | null;
}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(customer);

  // Three generics because the schema transforms: the form holds the raw
  // input shape, while the submit handler receives the parsed output.
  const form = useForm<CustomerInput, unknown, CustomerValues>({
    resolver: standardSchemaResolver(customerInputSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    form.reset(
      customer
        ? {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            company: customer.company,
            status: customer.status,
            lastContactAt: toDateInput(customer.lastContactAt),
            notes: customer.notes ?? "",
          }
        : EMPTY,
    );
  }, [open, customer, form]);

  const mutation = useMutation({
    mutationFn: async (values: CustomerValues) => {
      const result = customer
        ? await updateCustomer({ ...values, id: customer.id })
        : await createCustomer(values);

      if (!result.ok) throw result;

      return result.data;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success(isEditing ? "Customer updated" : "Customer added", {
        description: saved.name,
      });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const failure = error as {
        error?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (failure.fieldErrors) {
        for (const [field, messages] of Object.entries(failure.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof CustomerInput, {
              message: messages[0],
            });
          }
        }
      }

      toast.error(failure.error ?? "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit customer" : "Add customer"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this customer."
              : "Create a new customer record."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="customer-form"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="grid gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Eleanor Henderson" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="eleanor@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CUSTOMER_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastContactAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last contact</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={
                          typeof field.value === "string" ? field.value : ""
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Meeting notes, follow-ups…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="customer-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            {mutation.isPending
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Add customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
