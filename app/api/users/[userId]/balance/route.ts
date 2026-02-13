import { NextResponse } from "next/server";
import { getUserBalance } from "@/lib/balance";
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

  const balance = await getUserBalance(prisma, userId);

  return NextResponse.json({ userId, balance });
}
