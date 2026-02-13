"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  email: string;
  displayName: string;
};

type Bet = {
  id: string;
  amount: number;
  status: "PLACED" | "SETTLED";
  result: "WIN" | "LOSE" | null;
  payoutAmount: number;
  createdAt: string;
};

type UsersPayload = {
  users?: User[];
  error?: string;
};

type BalancePayload = {
  balance?: number;
  error?: string;
};

type BetsPayload = {
  bets?: Bet[];
  error?: string;
};

type MutationPayload = {
  error?: string;
};

function pickError(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
}

function getPlatformDisplayAmount(bet: Bet) {
  if (bet.status !== "SETTLED" || !bet.result) {
    return "-";
  }

  // Platform net per bet:
  // WIN => user net +amount, platform net -amount
  // LOSE => user net -amount, platform net +amount
  const platformNet =
    bet.result === "WIN" ? -(bet.payoutAmount - bet.amount) : bet.amount;

  return platformNet > 0 ? `+${platformNet}` : `${platformNet}`;
}

export default function GamePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [users, setUsers] = useState<User[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [balance, setBalance] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingBet, setSubmittingBet] = useState(false);
  const [settlingBetId, setSettlingBetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentUser = useMemo(
    () => users.find((user) => user.id === userId),
    [users, userId]
  );

  const loadData = useCallback(async () => {
    if (!userId) {
      setError("无效的用户ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [usersRes, balanceRes, betsRes] = await Promise.all([
        fetch("/api/users"),
        fetch(`/api/users/${userId}/balance`),
        fetch(`/api/users/${userId}/bets`)
      ]);

      const [usersPayload, balancePayload, betsPayload] = await Promise.all([
        usersRes.json().catch(() => ({} as UsersPayload)),
        balanceRes.json().catch(() => ({} as BalancePayload)),
        betsRes.json().catch(() => ({} as BetsPayload))
      ]);

      if (!usersRes.ok) {
        setError(pickError(usersPayload, "加载用户失败"));
        return;
      }

      if (!balanceRes.ok) {
        setError(pickError(balancePayload, "加载余额失败"));
        return;
      }

      if (!betsRes.ok) {
        setError(pickError(betsPayload, "加载投注失败"));
        return;
      }

      setUsers(usersPayload.users ?? []);
      setBalance(balancePayload.balance ?? 0);
      setBets(betsPayload.bets ?? []);
    } catch {
      setError("加载数据失败");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function placeBet() {
    const amount = Number(amountInput);

    if (!Number.isInteger(amount) || amount <= 0) {
      setError("投注金额必须为正整数");
      return;
    }

    setSubmittingBet(true);
    setError(null);

    try {
      const response = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount })
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as MutationPayload;

      if (!response.ok) {
        setError(pickError(payload, "下单失败"));
        return;
      }

      setAmountInput("");
      await loadData();
    } catch {
      setError("下单失败");
    } finally {
      setSubmittingBet(false);
    }
  }

  async function settleBet(betId: string, result: "WIN" | "LOSE") {
    setSettlingBetId(betId);
    setError(null);

    try {
      const response = await fetch(`/api/bets/${betId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result })
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as MutationPayload;

      if (!response.ok) {
        setError(pickError(payload, "结算失败"));
        return;
      }

      await loadData();
    } catch {
      setError("结算失败");
    } finally {
      setSettlingBetId(null);
    }
  }

  return (
    <main className="container">
      <p>
        <Link href="/" className="button-link">
          返回用户列表
        </Link>
      </p>
      <h1>游戏页面</h1>
      {currentUser ? (
        <p className="text-muted">
          当前用户: {currentUser.displayName} ({currentUser.email})
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p>加载中...</p>
      ) : (
        <>
          <section className="card" style={{ marginBottom: 16 }}>
            <h2>余额</h2>
            <p>{balance}</p>
            <div className="toolbar">
              <input
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                inputMode="numeric"
                placeholder="投注金额（整数）"
              />
              <button disabled={submittingBet} onClick={placeBet}>
                下单
              </button>
            </div>
          </section>

          <section className="card">
            <h2>投注历史</h2>
            {bets.length === 0 ? (
              <p className="text-muted">暂无投注记录</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>投注金额</th>
                    <th>状态</th>
                    <th>结果</th>
                    <th>平台盈亏</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.map((bet) => (
                    <tr key={bet.id}>
                      <td>{bet.amount}</td>
                      <td>{bet.status}</td>
                      <td>{bet.result ?? "-"}</td>
                      <td>{getPlatformDisplayAmount(bet)}</td>
                      <td>{new Date(bet.createdAt).toLocaleString()}</td>
                      <td>
                        {bet.status === "PLACED" ? (
                          <div className="toolbar">
                            <button
                              disabled={settlingBetId === bet.id}
                              onClick={() => settleBet(bet.id, "WIN")}
                            >
                              结算 WIN
                            </button>
                            <button
                              disabled={settlingBetId === bet.id}
                              onClick={() => settleBet(bet.id, "LOSE")}
                            >
                              结算 LOSE
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted">已结算</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}
