"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkIcon, Loader2Icon, LockIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  createSavedFilter,
  deleteSavedFilter,
  getSavedFilters,
  type SavedFilterView,
} from "@/app/actions/savedFilterActions";
import { customerKeys } from "@/lib/query-keys";
import type { CustomerFilters } from "@/components/custom/CustomerFilterSheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/** Short human summary of what a saved filter will do. */
function describe(criteria: SavedFilterView["criteria"]): string {
  const parts: string[] = [];

  if (criteria.status.length) parts.push(`${criteria.status.length} status`);
  if (criteria.company.length) parts.push(`${criteria.company.length} company`);
  if (criteria.dateFrom || criteria.dateTo) parts.push("date range");
  if (criteria.phone) parts.push("phone");
  if (criteria.email) parts.push("email");

  return parts.length ? parts.join(" · ") : "No filters";
}

function SaveDialog({
  filters,
  disabled,
}: {
  filters: CustomerFilters;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await createSavedFilter({ name, criteria: filters });
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.savedFilters() });
      toast.success("Filter saved", { description: saved.name });
      setOpen(false);
      setName("");
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setName("");
          setOpen(true);
        }}
      >
        <BookmarkIcon />
        Save current
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save this filter</DialogTitle>
            <DialogDescription>
              Saves the filters you have set now. Sorting is not included.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              mutation.mutate();
            }}
          >
            <Label htmlFor="filter-name">Name</Label>
            <Input
              id="filter-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="High-value prospects"
              autoFocus
              maxLength={60}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </form>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setError(null);
                mutation.mutate();
              }}
              disabled={mutation.isPending || name.trim().length === 0}
            >
              {mutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              {mutation.isPending ? "Saving…" : "Save filter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SavedFilters({
  filters,
  hasActiveFilters,
  onApply,
}: {
  filters: CustomerFilters;
  hasActiveFilters: boolean;
  onApply: (criteria: CustomerFilters) => void;
}) {
  const queryClient = useQueryClient();

  const { data: saved = [], isPending } = useQuery({
    queryKey: customerKeys.savedFilters(),
    queryFn: async () => {
      const result = await getSavedFilters();
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    staleTime: 60_000,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteSavedFilter(id);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.savedFilters() });
      toast.success("Filter deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase">
          Saved filters
        </Label>
        <SaveDialog filters={filters} disabled={!hasActiveFilters} />
      </div>

      {isPending ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : saved.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No saved filters yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {saved.map((item) => (
            <li key={item.id}>
              <div className="group flex items-center gap-1 rounded-md border border-transparent hover:border-border hover:bg-muted/50">
                <button
                  type="button"
                  // Applying replaces the current filters outright rather than
                  // merging: a saved filter describes a complete view, and
                  // merging would silently produce a set the user never saved.
                  onClick={() => onApply(item.criteria)}
                  className="flex min-w-0 flex-1 flex-col items-start px-2.5 py-1.5 text-left"
                >
                  <span className="flex w-full items-center gap-1.5 truncate text-sm">
                    {item.name}
                    {item.isTemplate ? (
                      <LockIcon className="size-3 shrink-0 text-muted-foreground" />
                    ) : null}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.corrupt
                      ? "Unreadable — will clear filters"
                      : describe(item.criteria)}
                  </span>
                </button>

                {item.isTemplate ? null : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${item.name}`}
                    className="mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(item.id)}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
