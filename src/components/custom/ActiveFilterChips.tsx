"use client";

import { XIcon } from "lucide-react";

import { STATUS_LABELS } from "@/lib/validations/customer";
import type { CustomerFilters } from "@/components/custom/CustomerFilterSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Makes the active filters visible outside the sheet.
 *
 * Without this a filter set in a panel that is now closed silently shrinks the
 * result count, and the only clue is a number on a button.
 */
export function ActiveFilterChips({
  filters,
  onChange,
  onClear,
}: {
  filters: CustomerFilters;
  onChange: (next: CustomerFilters) => void;
  onClear: () => void;
}) {
  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (filters.status.length > 0) {
    chips.push({
      key: "status",
      label:
        filters.status.length === 1
          ? STATUS_LABELS[filters.status[0]]
          : `${filters.status.length} statuses`,
      clear: () => onChange({ ...filters, status: [] }),
    });
  }

  if (filters.company.length > 0) {
    chips.push({
      key: "company",
      label:
        filters.company.length === 1
          ? filters.company[0]
          : `${filters.company.length} companies`,
      clear: () => onChange({ ...filters, company: [] }),
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      key: "date",
      label: `Contacted ${filters.dateFrom || "any"} → ${filters.dateTo || "any"}`,
      clear: () => onChange({ ...filters, dateFrom: "", dateTo: "" }),
    });
  }

  if (filters.phone) {
    chips.push({
      key: "phone",
      label: `Phone: ${filters.phone}`,
      clear: () => onChange({ ...filters, phone: "" }),
    });
  }

  if (filters.email) {
    chips.push({
      key: "email",
      label: `Email: ${filters.email}`,
      clear: () => onChange({ ...filters, email: "" }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 pl-2.5">
          <span className="max-w-52 truncate">{chip.label}</span>
          <button
            type="button"
            onClick={chip.clear}
            aria-label={`Remove filter: ${chip.label}`}
            className="rounded-full p-0.5 opacity-60 hover:bg-foreground/10 hover:opacity-100"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}

      {chips.length > 1 ? (
        <Button variant="ghost" size="xs" onClick={onClear}>
          Clear all
        </Button>
      ) : null}
    </div>
  );
}
