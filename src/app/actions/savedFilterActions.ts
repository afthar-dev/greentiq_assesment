"use server";

import type { SavedFilter } from "@/generated/prisma/client";

import { getAuthorizedSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  EMPTY_CRITERIA,
  filterCriteriaSchema,
  savedFilterIdSchema,
  savedFilterInputSchema,
  type FilterCriteria,
  type SavedFilterInput,
} from "@/lib/validations/saved-filter";
import type { ActionResult } from "@/app/actions/customerActions";

/** A saved filter with its JSON criteria already parsed and validated. */
export type SavedFilterView = {
  id: string;
  name: string;
  isTemplate: boolean;
  position: number;
  criteria: FilterCriteria;
  /** True when the stored JSON no longer matches the schema. */
  corrupt: boolean;
};

const NOT_FOUND = "P2025";

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

async function requireAuth(): Promise<ActionResult<true>> {
  const session = await getAuthorizedSession();

  if (!session) {
    return { ok: false, error: "You are not signed in." };
  }

  return { ok: true, data: true };
}

/**
 * Parses a stored row defensively.
 *
 * safeParse rather than parse: one row written by an older version of the app
 * should degrade to an empty filter, not take the whole panel down.
 */
function toView(row: SavedFilter): SavedFilterView {
  const parsed = filterCriteriaSchema.safeParse(row.criteria);

  return {
    id: row.id,
    name: row.name,
    isTemplate: row.isTemplate,
    position: row.position,
    criteria: parsed.success ? parsed.data : EMPTY_CRITERIA,
    corrupt: !parsed.success,
  };
}

export async function getSavedFilters(): Promise<
  ActionResult<SavedFilterView[]>
> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const rows = await prisma.savedFilter.findMany({
    // Templates first, then user filters, each in their stored drag order.
    orderBy: [{ isTemplate: "desc" }, { position: "asc" }, { name: "asc" }],
  });

  return { ok: true, data: rows.map(toView) };
}

export async function createSavedFilter(
  input: SavedFilterInput,
): Promise<ActionResult<SavedFilterView>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const parsed = savedFilterInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const criteria = parsed.data.criteria;
  const hasAnyCriteria =
    criteria.status.length > 0 ||
    criteria.company.length > 0 ||
    Boolean(criteria.dateFrom) ||
    Boolean(criteria.dateTo) ||
    Boolean(criteria.phone) ||
    Boolean(criteria.email);

  if (!hasAnyCriteria) {
    return {
      ok: false,
      error: "Set at least one filter before saving.",
    };
  }

  // New filters go to the end of the list.
  const last = await prisma.savedFilter.findFirst({
    where: { isTemplate: false },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const created = await prisma.savedFilter.create({
    data: {
      name: parsed.data.name,
      criteria,
      isTemplate: false,
      position: (last?.position ?? -1) + 1,
    },
  });

  return { ok: true, data: toView(created) };
}

export async function deleteSavedFilter(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const parsed = savedFilterIdSchema.safeParse(id);

  if (!parsed.success) {
    return { ok: false, error: "Invalid filter id." };
  }

  const existing = await prisma.savedFilter.findUnique({
    where: { id: parsed.data },
    select: { isTemplate: true },
  });

  // Enforced here, not only by hiding the button: an action is a POST endpoint
  // anyone can call, so the rule has to live on the server.
  if (existing?.isTemplate) {
    return { ok: false, error: "Built-in filters cannot be deleted." };
  }

  try {
    await prisma.savedFilter.delete({ where: { id: parsed.data } });
    return { ok: true, data: { id: parsed.data } };
  } catch (error) {
    // Already gone is the outcome the caller wanted.
    if (isPrismaError(error, NOT_FOUND)) {
      return { ok: true, data: { id: parsed.data } };
    }

    throw error;
  }
}
