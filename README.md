# Simple Betting System

一个基于 Next.js + Prisma + SQLite 的简单投注系统示例，支持：

- 用户列表与余额展示
- 管理员模拟充值
- 用户下注（校验余额）
- 投注结算（WIN/LOSE，防止重复结算）

## 技术栈

- 前端：Next.js (App Router + TypeScript)
- 后端：Next.js API Routes
- 数据库：SQLite + Prisma

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 配置环境变量
copy .env.example .env


`.env`:

```env
DATABASE_URL="file:./dev.db"
```

3. 初始化数据库并执行迁移

```bash
npx prisma migrate dev --name init
```

4. 执行 seed（创建 10 个预置用户）

```bash
npm run seed
```

5. 启动开发环境

```bash
npm run dev
```

打开 `http://localhost:3000`。

## 业务规则

- 余额 = `DEPOSIT + BET_CREDIT - BET_DEBIT`
- `ledger_entries` 只新增，不允许修改/删除
- 下单金额必须大于 0 且不能超过当前余额
- 结算只允许对 `PLACED` 状态投注执行一次
- `WIN` 赔付 `2x` 投注金额并新增 `BET_CREDIT`
- `LOSE` 不返还金额
