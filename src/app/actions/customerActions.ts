"use server";

import { revalidatePath } from "next/cache";
import { CustomerStatus, type Customer } from "@/generated/prisma/client";

import { getAuthorizedSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  buildCustomerOrderBy,
  buildCustomerPagination,
  buildCustomerWhere,
} from "@/lib/customer-query";
import {
  customerIdSchema,
  customerInputSchema,
  customerUpdateSchema,
  type CustomerInput,
  type CustomerUpdateInput,
} from "@/lib/validations/customer";
import {
  customerQuerySchema,
  type CustomerQueryInput,
  type PaginatedCustomers,
} from "@/lib/validations/customer-query";
import { startOfWeek } from "date-fns";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Prisma's unique-constraint violation. */
const UNIQUE_VIOLATION = "P2002";
/** Prisma's record-not-found. */
const NOT_FOUND = "P2025";

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

/**
Auth Guard
 */
async function requireAuth(): Promise<ActionResult<true>> {
  const session = await getAuthorizedSession();

  if (!session) {
    return { ok: false, error: "You are not signed in." };
  }

  return { ok: true, data: true };
}

/** Refreshes server-rendered pages that read customer data. */
function revalidateCustomers() {
  revalidatePath("/customers");
  revalidatePath("/");
}

export async function createCustomer(
  input: CustomerInput,
): Promise<ActionResult<Customer>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const parsed = customerInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const customer = await prisma.customer.create({ data: parsed.data });
    revalidateCustomers();

    return { ok: true, data: customer };
  } catch (error) {
    if (isPrismaError(error, UNIQUE_VIOLATION)) {
      return {
        ok: false,
        error: "That email is already on another customer.",
        fieldErrors: { email: ["This email is already in use"] },
      };
    }

    throw error;
  }
}

export async function updateCustomer(
  input: CustomerUpdateInput,
): Promise<ActionResult<Customer>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const parsed = customerUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, ...data } = parsed.data;

  try {
    const customer = await prisma.customer.update({ where: { id }, data });
    revalidateCustomers();

    return { ok: true, data: customer };
  } catch (error) {
    if (isPrismaError(error, UNIQUE_VIOLATION)) {
      return {
        ok: false,
        error: "That email is already on another customer.",
        fieldErrors: { email: ["This email is already in use"] },
      };
    }

    if (isPrismaError(error, NOT_FOUND)) {
      return { ok: false, error: "That customer no longer exists." };
    }

    throw error;
  }
}

export async function deleteCustomer(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const parsed = customerIdSchema.safeParse(id);

  if (!parsed.success) {
    return { ok: false, error: "Invalid customer id." };
  }

  try {
    await prisma.customer.delete({ where: { id: parsed.data } });
    revalidateCustomers();

    return { ok: true, data: { id: parsed.data } };
  } catch (error) {
    if (isPrismaError(error, NOT_FOUND)) {
      return { ok: true, data: { id: parsed.data } };
    }

    throw error;
  }
}

/**
 * Paginated, filtered, sorted customer list.
 */
export async function getCustomers(
  input: CustomerQueryInput = {},
): Promise<ActionResult<PaginatedCustomers<Customer>>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const parsed = customerQuerySchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid filter values.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const query = parsed.data;
  const where = buildCustomerWhere(query);

  const [rows, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: buildCustomerOrderBy(query),
      ...buildCustomerPagination(query),
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  return {
    ok: true,
    data: {
      data: rows,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages,
      hasPreviousPage: query.page > 1,
      hasNextPage: query.page < totalPages,
    },
  };
}

export type DashboardStats = {
  totalCustomers: number;
  activeCustomers: number;
  contactedThisWeek: number;
};

export async function getDashboardStats(): Promise<
  ActionResult<DashboardStats>
> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  // Monday of the current week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [totalCustomers, activeCustomers, contactedThisWeek] =
    await prisma.$transaction([
      prisma.customer.count(),
      prisma.customer.count({
        where: { status: CustomerStatus.ACTIVE_CUSTOMER },
      }),
      prisma.customer.count({
        where: { lastContactAt: { gte: weekStart } },
      }),
    ]);

  return {
    ok: true,
    data: { totalCustomers, activeCustomers, contactedThisWeek },
  };
}

/**
 * Distinct company names, for the multi-select filter.
 */
export async function getCompanies(): Promise<ActionResult<string[]>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const rows = await prisma.customer.findMany({
    distinct: ["company"],
    select: { company: true },
    orderBy: { company: "asc" },
  });

  return { ok: true, data: rows.map((row) => row.company) };
}

/** Single-record read for the detail drawer. */
export async function getCustomer(id: string): Promise<ActionResult<Customer>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const parsed = customerIdSchema.safeParse(id);

  if (!parsed.success) {
    return { ok: false, error: "Invalid customer id." };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.data },
  });

  if (!customer) {
    return { ok: false, error: "That customer no longer exists." };
  }

  return { ok: true, data: customer };
}

/**
 * Marks a customer as contacted today — the "update last contact date"
 * requirement, as a one-click action rather than an edit-form round trip.
 */
export async function touchLastContact(
  id: string,
): Promise<ActionResult<Customer>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const parsed = customerIdSchema.safeParse(id);

  if (!parsed.success) {
    return { ok: false, error: "Invalid customer id." };
  }

  try {
    const customer = await prisma.customer.update({
      where: { id: parsed.data },
      data: { lastContactAt: new Date() },
    });
    revalidateCustomers();

    return { ok: true, data: customer };
  } catch (error) {
    if (isPrismaError(error, NOT_FOUND)) {
      return { ok: false, error: "That customer no longer exists." };
    }

    throw error;
  }
}
