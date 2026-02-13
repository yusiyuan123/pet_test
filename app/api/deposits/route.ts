import { LedgerEntryType } from "@prisma/client";
import { NextResponse } from "next/server";
import { jsonError, parsePositiveInteger } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const userId = body?.userId as string | undefined;
  const amount = parsePositiveInteger(body?.amount);

  if (!userId) {
    return jsonError("userId 必填", 400);
  }
  if (!amount) {
    return jsonError("充值金额必须为正整数", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!user) {
    return jsonError("用户不存在", 404);
  }

  const entry = await prisma.ledgerEntry.create({
    data: {
      userId,
      type: LedgerEntryType.DEPOSIT,
      amount
    }
  });

  return NextResponse.json({ entry }, { status: 201 });
}
