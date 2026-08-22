"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircleIcon,
  ArrowUpDownIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";

import type { Customer } from "@/generated/prisma/client";
import { getCustomers } from "@/features/customers/actions/customer-actions";
import { useDebounce } from "@/hooks/use-debounce";
import { customerKeys } from "@/lib/query-keys";
import { STATUS_LABELS } from "@/features/customers/schemas/customer";
import {
  PAGE_SIZES,
  type CustomerQueryInput,
} from "@/features/customers/schemas/customer-query";
import { ActiveFilterChips } from "@/features/filters/components/ActiveFilterChips";
import { BulkImportModal } from "@/features/customers/components/BulkImportModal";
import { CustomerDetailModal } from "@/features/customers/components/CustomerDetailModal";
import { CustomerFilterSheet } from "@/features/filters/components/CustomerFilterSheet";
import {
  EMPTY_FILTERS,
  type CustomerFilters,
} from "@/features/filters/lib/filters";
import { CustomerFormModal } from "@/features/customers/components/CustomerFormModal";
import { STATUS_STYLES } from "@/features/customers/lib/customer-status";
import { DeleteCustomerDialog } from "@/features/customers/components/DeleteCustomerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLUMNS: { label: string; className?: string }[] = [
  { label: "Name" },
  { label: "Email" },
  { label: "Phone" },
  { label: "Company" },
  { label: "Status" },
  { label: "Last contact" },
  { label: "", className: "w-20" },
];

/**
 * Field and direction are paired into one option rather than split across two
 * controls: "newest first" is a single idea to the user, and pairing them
 * removes the meaningless combinations a separate direction toggle allows.
 */
const SORT_OPTIONS = [
  { value: "name:asc", label: "Name (A–Z)" },
  { value: "name:desc", label: "Name (Z–A)" },
  { value: "lastContactAt:desc", label: "Last contact (newest)" },
  { value: "lastContactAt:asc", label: "Last contact (oldest)" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function RowActions({
  customer,
  onEdit,
  onDelete,
  className,
}: {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${customer.name}`}
        onClick={(event) => {
          // The row/card opens the detail modal, so these have to stop the
          // click reaching it.
          event.stopPropagation();
          onEdit();
        }}
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${customer.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}

export function CustomerTable() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CustomerFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortValue>("name:asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);

  // Only the settled search term reaches the query key, so typing does not
  // fire a request per keystroke.
  const debouncedSearch = useDebounce(search, 300);
  // The two free-text filters are typed into, so they get the same debounce
  // as the search box. The rest are discrete choices and apply immediately.
  const debouncedPhone = useDebounce(filters.phone, 300);
  const debouncedEmail = useDebounce(filters.email, 300);
  const isTyping =
    search !== debouncedSearch ||
    filters.phone !== debouncedPhone ||
    filters.email !== debouncedEmail;

  const [sortBy, sortDir] = sort.split(":") as [
    "name" | "lastContactAt",
    "asc" | "desc",
  ];

  const query: CustomerQueryInput = {
    q: debouncedSearch,
    status: filters.status,
    company: filters.company,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    phone: debouncedPhone,
    email: debouncedEmail,
    sortBy,
    sortDir,
    page,
    pageSize,
  };

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: customerKeys.list(query),
    queryFn: async () => {
      const result = await getCustomers(query);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    // Keeps the previous page on screen while the next one loads, instead of
    // collapsing the table back to a skeleton on every page change.
    placeholderData: keepPreviousData,
  });

  function applyFilters(next: CustomerFilters) {
    setFilters(next);
    // A narrower result set can leave the current page past the last one.
    setPage(1);
  }

  const rows = data?.data ?? [];
  const showEmpty = !isPending && !isError && rows.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              // A narrower search can leave the current page past the last
              // one, which would show an empty table over a non-empty result.
              setPage(1);
            }}
            placeholder="Search name, email or company…"
            className="pl-8"
            type="search"
            aria-label="Search customers"
          />
          {isTyping || (isFetching && !isPending) ? (
            <Loader2Icon className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="flex-1" />

        <CustomerFilterSheet
          filters={filters}
          onChange={applyFilters}
          onClear={() => applyFilters(EMPTY_FILTERS)}
        />

        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value as SortValue);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]" aria-label="Sort customers">
            <ArrowUpDownIcon className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <BulkImportModal />

        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon />
          Add customer
        </Button>
      </div>

      <ActiveFilterChips
        filters={filters}
        onChange={applyFilters}
        onClear={() => applyFilters(EMPTY_FILTERS)}
      />

      <div className="overflow-hidden rounded-lg border">
        {/* Desktop: dense table. Below md it is replaced by the card list. */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead
                    key={column.label || "actions"}
                    className={column.className}
                    // Sorting is driven by the toolbar select, so the header
                    // announces the active column rather than offering its own
                    // control.
                    aria-sort={
                      (column.label === "Name" && sortBy === "name") ||
                      (column.label === "Last contact" &&
                        sortBy === "lastContactAt")
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isPending
                ? Array.from({ length: pageSize }).map((_, index) => (
                    <TableRow key={index}>
                      {COLUMNS.map((column) => (
                        <TableCell key={column.label || "actions"}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="group cursor-pointer"
                      tabIndex={0}
                      onClick={() => setViewing(customer)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setViewing(customer);
                      }}
                    >
                      <TableCell className="font-medium">
                        {customer.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.email}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {customer.phone}
                      </TableCell>
                      <TableCell>{customer.company}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_STYLES[customer.status]}
                        >
                          {STATUS_LABELS[customer.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {customer.lastContactAt
                          ? format(customer.lastContactAt, "d MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          customer={customer}
                          onEdit={() => {
                            setEditing(customer);
                            setFormOpen(true);
                          }}
                          onDelete={() => setDeleting(customer)}
                          className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

        {/*
          Mobile: one card per customer. A seven-column table on a phone means
          scrolling sideways to read a single record, so the same data is
          stacked instead. Actions stay visible rather than appearing on hover,
          which touch devices do not have.
        */}
        <div className="divide-y md:hidden">
          {isPending
            ? Array.from({ length: Math.min(pageSize, 5) }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            : rows.map((customer) => (
                <div
                  key={customer.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setViewing(customer)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setViewing(customer);
                  }}
                  className="flex w-full min-w-0 flex-col gap-2 p-3 text-left active:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{customer.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {customer.company}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${STATUS_STYLES[customer.status]} max-w-[45%] shrink-0 truncate`}
                    >
                      {STATUS_LABELS[customer.status]}
                    </Badge>
                  </div>

                  {/*
                    min-w-0 on every value cell: a flex child defaults to
                    min-width:auto, so it refuses to shrink below its content
                    and a long email pushes the card wider than the screen.
                    Values wrap rather than truncate — on a card there is room
                    for a second line, and a hidden email is useless.
                  */}
                  <dl className="grid gap-1 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-[4.5rem] shrink-0 text-muted-foreground">
                        Email
                      </dt>
                      <dd className="min-w-0 flex-1 break-all">
                        {customer.email}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-[4.5rem] shrink-0 text-muted-foreground">
                        Phone
                      </dt>
                      <dd className="min-w-0 flex-1 break-words tabular-nums">
                        {customer.phone}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-[4.5rem] shrink-0 text-muted-foreground">
                        Contacted
                      </dt>
                      <dd className="min-w-0 flex-1 tabular-nums">
                        {customer.lastContactAt
                          ? format(customer.lastContactAt, "d MMM yyyy")
                          : "Never"}
                      </dd>
                    </div>
                  </dl>

                  <RowActions
                    customer={customer}
                    onEdit={() => {
                      setEditing(customer);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(customer)}
                    className="flex justify-end gap-1"
                  />
                </div>
              ))}
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <AlertCircleIcon className="size-5 text-destructive" />
            <div>
              <p className="font-medium">Could not load customers</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Something broke."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : null}

        {showEmpty ? (
          <div className="p-10 text-center">
            <p className="font-medium">No customers found</p>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? `Nothing matches “${debouncedSearch}”.`
                : "Add your first customer to get started."}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2">
          <p className="text-sm text-muted-foreground tabular-nums">
            {data
              ? data.total === 0
                ? "No results"
                : `Showing ${(data.page - 1) * data.pageSize + 1}–${Math.min(
                    data.page * data.pageSize,
                    data.total,
                  )} of ${data.total}`
              : "Loading…"}
          </p>

          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-[76px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current - 1)}
              disabled={!data?.hasPreviousPage}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {data ? `${data.page} / ${data.totalPages}` : "—"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={!data?.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <CustomerDetailModal
        customer={viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        onEdit={(record) => {
          setEditing(record);
          setFormOpen(true);
        }}
        onDelete={(record) => setDeleting(record)}
      />
      <CustomerFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
      />
      <DeleteCustomerDialog
        customer={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  );
}
