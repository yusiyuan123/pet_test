"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UserSummary = {
  id: string;
  email: string;
  displayName: string;
  balance: number;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [depositInputs, setDepositInputs] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [submittingUserId, setSubmittingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usersById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/users");
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "加载用户失败");
        return;
      }

      setUsers(payload.users ?? []);
    } catch {
      setError("加载用户失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleDeposit(userId: string) {
    const amount = Number(depositInputs[userId] ?? "");

    if (!Number.isInteger(amount) || amount <= 0) {
      setError("充值金额必须为正整数");
      return;
    }

    setSubmittingUserId(userId);
    setError(null);

    try {
      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "充值失败");
        return;
      }

      setDepositInputs((prev) => ({ ...prev, [userId]: "" }));
      await loadUsers();
    } catch {
      setError("充值失败");
    } finally {
      setSubmittingUserId(null);
    }
  }

  return (
    <main className="container">
      <h1>用户列表</h1>
      <p className="text-muted">可查看余额、执行模拟充值，并进入用户游戏页。</p>
      {error ? <p className="error">{error}</p> : null}
      <section className="card">
        {loading ? (
          <p>加载中...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>Email</th>
                <th>余额</th>
                <th>充值</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const current = usersById.get(user.id);
                return (
                  <tr key={user.id}>
                    <td>{user.displayName}</td>
                    <td>{user.email}</td>
                    <td>{current?.balance ?? 0}</td>
                    <td>
                      <div className="toolbar">
                        <input
                          value={depositInputs[user.id] ?? ""}
                          onChange={(event) =>
                            setDepositInputs((prev) => ({
                              ...prev,
                              [user.id]: event.target.value
                            }))
                          }
                          inputMode="numeric"
                          placeholder="整数"
                        />
                        <button
                          disabled={submittingUserId === user.id}
                          onClick={() => handleDeposit(user.id)}
                        >
                          充值
                        </button>
                      </div>
                    </td>
                    <td>
                      <Link href={`/game/${user.id}`}>进入游戏</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
