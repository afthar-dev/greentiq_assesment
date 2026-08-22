"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckIcon, ChevronsUpDownIcon, FilterIcon } from "lucide-react";

import type { CustomerStatus } from "@/generated/prisma/client";
import {
  countActiveFilters,
  type CustomerFilters,
} from "@/features/filters/lib/filters";
import { getCompanies } from "@/features/customers/actions/customer-actions";
import { customerKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_STATUSES,
  STATUS_LABELS,
} from "@/features/customers/schemas/customer";
import { SavedFilters } from "@/features/filters/components/SavedFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function CompanyPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  // Options come from the data rather than a hardcoded list, so they always
  // match what is actually in the table.
  const { data: companies = [], isPending } = useQuery({
    queryKey: customerKeys.companies(),
    queryFn: async () => {
      const result = await getCompanies();
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    staleTime: 5 * 60_000,
  });

  function toggle(company: string) {
    onChange(
      selected.includes(company)
        ? selected.filter((item) => item !== company)
        : [...selected, company],
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected.length === 0
              ? "All companies"
              : selected.length === 1
                ? selected[0]
                : `${selected.length} companies`}
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search companies…" />
          <CommandList>
            <CommandEmpty>
              {isPending ? "Loading…" : "No companies found."}
            </CommandEmpty>
            <CommandGroup>
              {companies.map((company) => {
                const isSelected = selected.includes(company);

                return (
                  <CommandItem
                    key={company}
                    value={company}
                    onSelect={() => toggle(company)}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {isSelected ? <CheckIcon className="size-3" /> : null}
                    </div>
                    <span className="truncate">{company}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function CustomerFilterSheet({
  filters,
  onChange,
  onClear,
}: {
  filters: CustomerFilters;
  onChange: (next: CustomerFilters) => void;
  onClear: () => void;
}) {
  const activeCount = countActiveFilters(filters);

  // Filters apply as they are set rather than behind an Apply button: the
  // result count updates as you go, so a filter that returns nothing is
  // obvious immediately instead of after a submit.
  const set = <K extends keyof CustomerFilters>(
    key: K,
    value: CustomerFilters[K],
  ) => onChange({ ...filters, [key]: value });

  function toggleStatus(status: CustomerStatus) {
    set(
      "status",
      filters.status.includes(status)
        ? filters.status.filter((item) => item !== status)
        : [...filters.status, status],
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <FilterIcon />
          Filters
          {activeCount > 0 ? (
            <Badge className="ml-1 size-5 justify-center rounded-full px-1 tabular-nums">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow the list. Filters combine with the search box.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-2">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-xs font-medium text-muted-foreground uppercase">
              Status
            </legend>
            {CUSTOMER_STATUSES.map((status) => (
              <div key={status} className="flex items-center gap-2.5">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.status.includes(status)}
                  onCheckedChange={() => toggleStatus(status)}
                />
                <Label htmlFor={`status-${status}`} className="font-normal">
                  {STATUS_LABELS[status]}
                </Label>
              </div>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase">
              Company
            </Label>
            <CompanyPicker
              selected={filters.company}
              onChange={(next) => set("company", next)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase">
              Last contact between
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                aria-label="Contacted from"
                value={filters.dateFrom}
                // Bounding each input by the other stops an impossible range
                // being entered at all, rather than reporting it afterwards.
                max={filters.dateTo || undefined}
                onChange={(event) => set("dateFrom", event.target.value)}
              />
              <Input
                type="date"
                aria-label="Contacted until"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(event) => set("dateTo", event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="filter-phone"
              className="text-xs font-medium text-muted-foreground uppercase"
            >
              Phone contains
            </Label>
            <Input
              id="filter-phone"
              inputMode="tel"
              placeholder="555"
              value={filters.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="filter-email"
              className="text-xs font-medium text-muted-foreground uppercase"
            >
              Email contains
            </Label>
            <Input
              id="filter-email"
              placeholder="@example.com"
              value={filters.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </div>

          <SavedFilters
            filters={filters}
            hasActiveFilters={activeCount > 0}
            onApply={onChange}
          />
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={onClear}
            disabled={activeCount === 0}
          >
            Clear all filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
