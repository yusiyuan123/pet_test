import { BetStatus, LedgerEntryType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getUserBalance } from "@/lib/balance";
import { jsonError, parsePositiveInteger } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type DomainErrorCode =
  | "USER_NOT_FOUND"
  | "INSUFFICIENT_BALANCE"
  | "NEGATIVE_BALANCE_GUARD";

class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode) {
    super(code);
  }
}

function mapErrorToResponse(error: unknown) {
  if (!(error instanceof DomainError)) {
    return jsonError("Failed to place bet", 500);
  }

  if (error.code === "USER_NOT_FOUND") {
    return jsonError("User not found", 404);
  }

  if (error.code === "INSUFFICIENT_BALANCE") {
    return jsonError("Insufficient balance", 400);
  }

  return jsonError("Balance invariant violation detected", 409);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const userId = body?.userId as string | undefined;
  const amount = parsePositiveInteger(body?.amount);

  if (!userId) {
    return jsonError("userId is required", 400);
  }

  if (!amount) {
    return jsonError("Amount must be a positive integer", 400);
  }

  try {
    const bet = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!user) {
        throw new DomainError("USER_NOT_FOUND");
      }

      const balanceBeforeBet = await getUserBalance(tx, userId);
      if (amount > balanceBeforeBet) {
        throw new DomainError("INSUFFICIENT_BALANCE");
      }

      const createdBet = await tx.bet.create({
        data: {
          userId,
          amount,
          status: BetStatus.PLACED
        },
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

      await tx.ledgerEntry.create({
        data: {
          userId,
          type: LedgerEntryType.BET_DEBIT,
          amount
        }
      });

      // Defensive invariant: no transaction should commit with a negative balance.
      const balanceAfterBet = await getUserBalance(tx, userId);
      if (balanceAfterBet < 0) {
        throw new DomainError("NEGATIVE_BALANCE_GUARD");
      }

      return createdBet;
    });

    return NextResponse.json({ bet }, { status: 201 });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}
