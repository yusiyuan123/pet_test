import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ userId: string }>;
};

export async function GET(_: Request, context: Context) {
  const { userId } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!user) {
    return jsonError("用户不存在", 404);
  }

  const bets = await prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      status: true,
      result: true,
      payoutAmount: true,
      createdAt: true
    }
  });

  return NextResponse.json({ bets });
}
