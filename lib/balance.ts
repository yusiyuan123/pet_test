import {
  LedgerEntryType,
  Prisma,
  PrismaClient
} from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

function findAmount(
  rows: Array<{ type: LedgerEntryType; _sum: { amount: number | null } }>,
  type: LedgerEntryType
) {
  return rows.find((row) => row.type === type)?._sum.amount ?? 0;
}

export async function getUserBalance(db: DbClient, userId: string) {
  const rows = await db.ledgerEntry.groupBy({
    by: ["type"],
    where: { userId },
    _sum: { amount: true }
  });

  const deposit = findAmount(rows, "DEPOSIT");
  const credit = findAmount(rows, "BET_CREDIT");
  const debit = findAmount(rows, "BET_DEBIT");

  return deposit + credit - debit;
}

export async function getBalancesByUserIds(
  db: DbClient,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db.ledgerEntry.groupBy({
    by: ["userId", "type"],
    where: {
      userId: {
        in: userIds
      }
    },
    _sum: { amount: true }
  });

  const balances = new Map<string, number>();
  for (const userId of userIds) {
    balances.set(userId, 0);
  }

  for (const row of rows) {
    const current = balances.get(row.userId) ?? 0;
    const amount = row._sum.amount ?? 0;

    if (row.type === "DEPOSIT" || row.type === "BET_CREDIT") {
      balances.set(row.userId, current + amount);
      continue;
    }

    balances.set(row.userId, current - amount);
  }

  return balances;
}
