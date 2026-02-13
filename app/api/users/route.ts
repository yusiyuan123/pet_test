import { NextResponse } from "next/server";
import { getBalancesByUserIds } from "@/lib/balance";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      displayName: true
    }
  });

  const balances = await getBalancesByUserIds(
    prisma,
    users.map((user) => user.id)
  );

  return NextResponse.json({
    users: users.map((user) => ({
      ...user,
      balance: balances.get(user.id) ?? 0
    }))
  });
}
