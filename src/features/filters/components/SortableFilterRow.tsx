"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, LockIcon, Trash2Icon } from "lucide-react";

import type { SavedFilterView } from "@/features/filters/actions/saved-filter-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SortableFilterRow({
  filter,
  description,
  onApply,
  onDelete,
  deleteDisabled,
}: {
  filter: SavedFilterView;
  description: string;
  onApply: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: filter.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-1 rounded-md border border-transparent bg-background",
        "hover:border-border hover:bg-muted/50",
        isDragging && "z-10 border-border opacity-80 shadow-sm",
      )}
    >
      {/*
        The drag listeners live on this handle alone, not the whole row.
        The row itself is a button that applies the filter, and making it
        draggable would make applying unreliable.
      */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Reorder ${filter.name}`}
        className="cursor-grab touch-none px-1.5 py-2 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>

      <button
        type="button"
        onClick={onApply}
        className="flex min-w-0 flex-1 flex-col items-start py-1.5 pr-1 text-left"
      >
        <span className="flex w-full items-center gap-1.5 truncate text-sm">
          {filter.name}
          {filter.isTemplate ? (
            <LockIcon className="size-3 shrink-0 text-muted-foreground" />
          ) : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {description}
        </span>
      </button>

      {filter.isTemplate ? null : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${filter.name}`}
          className="mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          disabled={deleteDisabled}
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
      )}
    </li>
  );
}
