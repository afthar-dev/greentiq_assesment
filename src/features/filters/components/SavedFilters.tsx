"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BookmarkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  createSavedFilter,
  deleteSavedFilter,
  getSavedFilters,
  reorderSavedFilters,
  type SavedFilterView,
} from "@/features/filters/actions/saved-filter-actions";
import { customerKeys } from "@/lib/query-keys";
import type { CustomerFilters } from "@/features/filters/lib/filters";
import { SortableFilterRow } from "@/features/filters/components/SortableFilterRow";
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Each row is also a button that applies the filter. Without a small
      // movement threshold dnd-kit claims the click and applying stops working.
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const result = await reorderSavedFilters(orderedIds);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    // Optimistic: the row has to stay where it was dropped. Waiting for the
    // round trip makes it snap back first, which reads as a bug.
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({
        queryKey: customerKeys.savedFilters(),
      });

      const previous = queryClient.getQueryData<SavedFilterView[]>(
        customerKeys.savedFilters(),
      );

      if (previous) {
        const byId = new Map(previous.map((item) => [item.id, item]));
        queryClient.setQueryData(
          customerKeys.savedFilters(),
          orderedIds
            .map((id) => byId.get(id))
            .filter((item): item is SavedFilterView => Boolean(item)),
        );
      }

      return { previous };
    },
    onError: (error: Error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(customerKeys.savedFilters(), context.previous);
      }
      toast.error(error.message || "Could not save the new order");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.savedFilters() });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // Dropped outside the list, or back where it started.
    if (!over || active.id === over.id) return;

    const from = saved.findIndex((item) => item.id === active.id);
    const to = saved.findIndex((item) => item.id === over.id);

    if (from === -1 || to === -1) return;

    reorder.mutate(arrayMove(saved, from, to).map((item) => item.id));
  }

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={saved.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-1">
              {saved.map((item) => (
                <SortableFilterRow
                  key={item.id}
                  filter={item}
                  description={
                    item.corrupt
                      ? "Unreadable — will clear filters"
                      : describe(item.criteria)
                  }
                  onApply={() => onApply(item.criteria)}
                  onDelete={() => remove.mutate(item.id)}
                  deleteDisabled={remove.isPending}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
