"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { importCustomers } from "@/app/actions/importActions";
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  STATUS_OPTIONS_TEXT,
  type ImportSummary,
} from "@/lib/customer-import";
import { customerKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

function SummaryStat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-destructive";

  return (
    <div className="rounded-md border p-2.5 text-center">
      <p className={`text-xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function BulkImportModal() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const upload = useMutation({
    mutationFn: async (selected: File) => {
      const formData = new FormData();
      formData.append("file", selected);

      const result = await importCustomers(formData);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (result) => {
      setSummary(result);

      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: customerKeys.all });
        toast.success(
          `Imported ${result.created} customer${result.created === 1 ? "" : "s"}`,
        );
      } else {
        toast.warning("Nothing was imported");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function reset() {
    setFile(null);
    setSummary(null);
    upload.reset();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadIcon />
          Bulk import
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk import customers</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet to add many customers at once.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1 — the reference sheet */}
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <FileSpreadsheetIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Start from the reference sheet
            </p>
            <p className="text-xs text-muted-foreground">
              Correct headers, an example row, and the accepted values.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            {/* A plain link, so the browser handles the download itself. */}
            <a href="/api/customers/template" download>
              <DownloadIcon />
              Download
            </a>
          </Button>
        </div>

        {/* Step 2 — upload */}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              setSummary(null);
              setFile(event.target.files?.[0] ?? null);
            }}
          />

          <Button
            variant="outline"
            className="h-auto justify-start gap-3 py-3"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
          >
            <UploadIcon className="text-muted-foreground" />
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-medium">
                {file ? file.name : "Choose an .xlsx file"}
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                {file
                  ? `${(file.size / 1024).toFixed(0)} KB`
                  : `Up to ${MAX_IMPORT_ROWS} rows, ${MAX_IMPORT_BYTES / 1024 / 1024} MB`}
              </span>
            </span>
          </Button>

          <p className="text-xs text-muted-foreground">
            Status accepts: {STATUS_OPTIONS_TEXT}.
          </p>
        </div>

        {/* Step 3 — what happened */}
        {summary ? (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <SummaryStat
                  value={summary.created}
                  label="Imported"
                  tone="good"
                />
                <SummaryStat
                  value={summary.skippedDuplicates}
                  label="Already existed"
                  tone="warn"
                />
                <SummaryStat
                  value={summary.failed}
                  label="Rejected"
                  tone="bad"
                />
              </div>

              {summary.errors.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <AlertTriangleIcon className="size-4 text-amber-600" />
                    Rows that could not be imported
                  </p>
                  <ul className="max-h-40 overflow-y-auto rounded-md border text-sm">
                    {summary.errors.map((error, index) => (
                      <li
                        key={`${error.row}-${error.field}-${index}`}
                        className="flex gap-2 border-b px-2.5 py-1.5 last:border-b-0"
                      >
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          Row {error.row}
                        </span>
                        <span className="min-w-0">
                          <span className="font-medium">{error.field}</span>
                          {" — "}
                          <span className="text-muted-foreground">
                            {error.message}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : summary.created > 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                  Every row was processed without errors.
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        <DialogFooter>
          {summary ? (
            <>
              <Button variant="outline" onClick={reset}>
                Import another
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={upload.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => file && upload.mutate(file)}
                disabled={!file || upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <UploadIcon />
                )}
                {upload.isPending ? "Importing…" : "Import"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
