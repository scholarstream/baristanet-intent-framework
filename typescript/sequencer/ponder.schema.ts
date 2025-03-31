import { onchainTable, relations } from "ponder";

// ------------------------ entity ------------------------ //

export const solver = onchainTable("solver", (t) => ({
  id: t.hex().primaryKey(),
  collateralBalance: t.bigint(),
  debtBalance: t.bigint(),
}));

export const transaction = onchainTable("transaction", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.varchar(),
  hash: t.hex(),
  timestamp: t.bigint(),
  solver: t.hex(),
}));

export const solverDeposit = onchainTable("solverDeposit", (t) => ({
  id: t.text().primaryKey(),
  solver: t.hex(),
  amount: t.bigint(),
}));

export const solverWithdraw = onchainTable("solverWithdraw", (t) => ({
  id: t.text().primaryKey(),
  solver: t.hex(),
  amount: t.bigint(),
}));

export const solverBorrow = onchainTable("solverBorrow", (t) => ({
  id: t.text().primaryKey(),
  solver: t.hex(),
  amount: t.bigint(),
}));

export const solverRepay = onchainTable("solverRepay", (t) => ({
  id: t.text().primaryKey(),
  solver: t.hex(),
  amount: t.bigint(),
}));

export const solverSlash = onchainTable("solverSlash", (t) => ({
  id: t.text().primaryKey(),
  solver: t.hex(),
  amount: t.bigint(),
}));

export const solverDebt = onchainTable("solverDebt", (t) => ({
  id: t.text().primaryKey(),
  solver: t.hex(),
  chainId: t.varchar(),
  amount: t.bigint(),
}));

// ------------------------ relations ------------------------ //

export const solverRelations = relations(solver, ({ many }) => ({
  transactions: many(transaction),
  debts: many(solverDebt),
}));

export const transactionRelations = relations(transaction, ({ one }) => ({
  solver: one(solver, {
    fields: [transaction.solver],
    references: [solver.id],
  }),
  deposit: one(solverDeposit, {
    fields: [transaction.id],
    references: [solverDeposit.id],
  }),
  withdraw: one(solverWithdraw, {
    fields: [transaction.id],
    references: [solverWithdraw.id],
  }),
  borrow: one(solverBorrow, {
    fields: [transaction.id],
    references: [solverBorrow.id],
  }),
  repay: one(solverRepay, {
    fields: [transaction.id],
    references: [solverRepay.id],
  }),
}));

export const debtRelations = relations(solverDebt, ({ one }) => ({
  solver: one(solver, {
    fields: [solverDebt.solver],
    references: [solver.id],
  }),
}));
