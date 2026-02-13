import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ betId: string }>;
};

export async function POST(request: Request, context: Context) {
  const { betId } = await context.params;
  const body = await request.json().catch(() => null);
  const result = body?.result as "WIN" | "LOSE" | undefined;

  if (result !== "WIN" && result !== "LOSE") {
    return jsonError("result 必须为 WIN 或 LOSE", 400);
  }

  try {
    const settledBet = await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({
        where: { id: betId },
        select: {
          id: true,
          userId: true,
          amount: true,
          status: true
        }
      });

      if (!bet) {
        throw new Error("BET_NOT_FOUND");
      }

      if (bet.status !== "PLACED") {
        throw new Error("BET_ALREADY_SETTLED");
      }

      const payoutAmount = result === "WIN" ? bet.amount * 2 : 0;

      const updateResult = await tx.bet.updateMany({
        where: {
          id: bet.id,
          status: "PLACED"
        },
        data: {
          status: "SETTLED",
          result,
          payoutAmount
        }
      });

      if (updateResult.count !== 1) {
        throw new Error("BET_ALREADY_SETTLED");
      }

      if (result === "WIN") {
        await tx.ledgerEntry.create({
          data: {
            userId: bet.userId,
            type: "BET_CREDIT",
            amount: payoutAmount
          }
        });
      }

      return tx.bet.findUnique({
        where: { id: bet.id },
        select: {
          id: true,
          userId: true,
          amount: true,
          status: true,
          result: true,
          payoutAmount: true,
          createdAt: true
        }
      });
    });

    return NextResponse.json({ bet: settledBet });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "BET_NOT_FOUND") {
        return jsonError("投注不存在", 404);
      }
      if (error.message === "BET_ALREADY_SETTLED") {
        return jsonError("投注已结算，不可重复结算", 409);
      }
    }
    return jsonError("结算失败", 500);
  }
}
