"use server";

import { z } from "zod";

import type { SavedFilter } from "@/generated/prisma/client";

import { getAuthorizedSession } from "@/features/auth/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  EMPTY_CRITERIA,
  filterCriteriaSchema,
  savedFilterIdSchema,
  savedFilterInputSchema,
  type FilterCriteria,
  type SavedFilterInput,
} from "@/features/filters/schemas/saved-filter";
import type { ActionResult } from "@/features/customers/actions/customer-actions";

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
 * safeParse, not parse. The criteria column is JSON, so a row written by an
 * older version should degrade to an empty filter rather than throwing and
 * taking the whole panel with it.
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
    // Ordered purely by the stored drag order, so a template can be moved
    // below a user filter. `name` only breaks ties on equal positions.
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return { ok: true, data: rows.map(toView) };
}

/**
 * Saves the order produced by dragging.
 *
 * One transaction: a partial write leaves duplicate or gapped positions, and
 * the list comes back scrambled on the next read.
 */
export async function reorderSavedFilters(
  orderedIds: string[],
): Promise<ActionResult<{ count: number }>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const parsed = z.array(savedFilterIdSchema).min(1).safeParse(orderedIds);

  if (!parsed.success) {
    return { ok: false, error: "Invalid filter order." };
  }

  const ids = parsed.data;

  // The client must send the complete list. A partial one would renumber a
  // subset into positions that collide with the filters it left out.
  const known = await prisma.savedFilter.findMany({ select: { id: true } });
  const knownIds = new Set(known.map((row) => row.id));

  if (ids.length !== knownIds.size || ids.some((id) => !knownIds.has(id))) {
    return {
      ok: false,
      error: "That order is out of date. Refresh and try again.",
    };
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.savedFilter.update({ where: { id }, data: { position: index } }),
    ),
  );

  return { ok: true, data: { count: ids.length } };
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
