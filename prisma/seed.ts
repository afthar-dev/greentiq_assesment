import "dotenv/config";
import { faker } from "@faker-js/faker";

import { CustomerStatus } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

/**
 * Seeds a dataset big enough to exercise the table properly: more rows than
 * fit on one page, a limited set of companies so the company filter has
 * repeated values to group by, and contact dates spread across two years so
 * date-range filtering has something to narrow.
 */

const COMPANIES = [
  "Acme Corp",
  "Globex",
  "Initech",
  "Innovate Solutions",
  "Stark Industries",
  "Umbrella Co",
  "Vandelay Industries",
  "Wayne Enterprises",
];

const STATUSES = Object.values(CustomerStatus);
const CUSTOMER_COUNT = 50;

async function main() {
  // Fixed seed so re-running produces the same data, which makes a bug
  // reproducible instead of vanishing on the next run.
  faker.seed(20260822);

  const deleted = await prisma.customer.deleteMany({});
  console.log(`Cleared ${deleted.count} existing customers.`);

  const usedEmails = new Set<string>();

  const customers = Array.from({ length: CUSTOMER_COUNT }, (_, index) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const company = faker.helpers.arrayElement(COMPANIES);

    // The email column is unique, so a collision would fail the whole insert.
    let email = faker.internet
      .email({ firstName, lastName, provider: "example.com" })
      .toLowerCase();

    while (usedEmails.has(email)) {
      email = `${index}.${email}`;
    }
    usedEmails.add(email);

    // A tenth have never been contacted — the null case the date filter and
    // the table's empty-cell rendering both have to handle.
    const neverContacted = index % 10 === 0;

    return {
      name: `${firstName} ${lastName}`,
      email,
      phone: faker.phone.number({ style: "international" }),
      company,
      status: faker.helpers.arrayElement(STATUSES),
      lastContactAt: neverContacted
        ? null
        : faker.date.between({
            from: new Date("2024-09-01"),
            to: new Date("2026-08-22"),
          }),
      notes: faker.helpers.maybe(() => faker.lorem.sentences(2), {
        probability: 0.6,
      }),
      position: index,
    };
  });

  const created = await prisma.customer.createMany({ data: customers });
  console.log(`Seeded ${created.count} customers.`);

  const byStatus = await prisma.customer.groupBy({
    by: ["status"],
    _count: true,
  });

  for (const row of byStatus) {
    console.log(`  ${row.status.padEnd(20)} ${row._count}`);
  }

  const never = await prisma.customer.count({
    where: { lastContactAt: null },
  });
  console.log(`  never contacted      ${never}`);

  await seedFilterTemplates();
}

/**
 * The three pre-built filters named in the brief.
 *
 * Upserted by name so re-running the seed refreshes them rather than creating
 * duplicates, and so a user's own saved filters are left untouched.
 *
 * Note: "Recent Contacts" stores an absolute date computed now, so it slowly
 * drifts from meaning "the last 30 days". Resolving a relative marker at apply
 * time would fix that; re-running the seed also does.
 */
async function seedFilterTemplates() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const templates = [
    {
      name: "Active Customers",
      position: 0,
      criteria: {
        status: [CustomerStatus.ACTIVE_CUSTOMER],
        company: [],
        dateFrom: "",
        dateTo: "",
        phone: "",
        email: "",
      },
    },
    {
      name: "Recent Contacts",
      position: 1,
      criteria: {
        status: [],
        company: [],
        dateFrom: thirtyDaysAgo.toISOString().slice(0, 10),
        dateTo: "",
        phone: "",
        email: "",
      },
    },
    {
      name: "Inactive Leads",
      position: 2,
      criteria: {
        status: [CustomerStatus.INACTIVE_CUSTOMER, CustomerStatus.LEAD],
        company: [],
        dateFrom: "",
        dateTo: "",
        phone: "",
        email: "",
      },
    },
  ];

  for (const template of templates) {
    const existing = await prisma.savedFilter.findFirst({
      where: { name: template.name, isTemplate: true },
      select: { id: true },
    });

    if (existing) {
      await prisma.savedFilter.update({
        where: { id: existing.id },
        data: { criteria: template.criteria, position: template.position },
      });
    } else {
      await prisma.savedFilter.create({
        data: { ...template, isTemplate: true },
      });
    }
  }

  console.log(`Seeded ${templates.length} filter templates.`);
}

main()
  .catch((error) => {
    console.error("Seed failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
