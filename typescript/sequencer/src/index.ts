import { ponder } from "ponder:registry";
import {
  solver,
  solverDeposit,
  solverWithdraw,
  solverRepay,
  solverBorrow,
  transaction,
  solverDebt,
} from "ponder:schema";
import { Address } from "viem";

ponder.on("BrewHouse:CollateralDeposited", async ({ event, context }) => {
  // insert solver
  const solverFound = await context.db.find(solver, { id: event.args.user });
  if (!solverFound) {
    await context.db.insert(solver).values({
      id: event.args.user,
      collateralBalance: BigInt(0),
      debtBalance: BigInt(0),
    });
  }

  // update solver balance
  const solverRow = await context.db.find(solver, { id: event.args.user });
  if (solverRow) {
    await context.db.update(solver, { id: event.args.user }).set({
      collateralBalance:
        (solverRow.collateralBalance ?? BigInt(0)) + event.args.amount,
    });
  }

  // insert transaction
  const txHash = `${event.transaction.hash}`;
  const txChainId = `${context.network.chainId}`;
  const txId = `${txChainId}-${txHash}`;
  const transactionFound = await context.db.find(transaction, {
    id: txId,
  });

  if (!transactionFound) {
    await context.db.insert(transaction).values({
      id: txId,
      chainId: txChainId,
      hash: txHash as Address,
      timestamp: BigInt(0),
      solver: event.args.user,
    });
  }

  // insert deposit
  const depositFound = await context.db.find(solverDeposit, { id: txId });
  if (!depositFound) {
    await context.db.insert(solverDeposit).values({
      id: txId,
      solver: event.args.user,
      amount: event.args.amount,
    });
  }
});

ponder.on("BrewHouse:CollateralWithdrawn", async ({ event, context }) => {
  // insert solver
  const solverFound = await context.db.find(solver, { id: event.args.user });
  if (!solverFound) {
    await context.db.insert(solver).values({
      id: event.args.user,
      collateralBalance: BigInt(0),
      debtBalance: BigInt(0),
    });
  }

  // update solver balance
  const solverRow = await context.db.find(solver, { id: event.args.user });
  if (solverRow) {
    await context.db.update(solver, { id: event.args.user }).set({
      collateralBalance:
        (solverRow.collateralBalance ?? BigInt(0)) - event.args.amount,
    });
  }

  // insert transaction
  const txHash = `${event.transaction.hash}`;
  const txChainId = `${context.network.chainId}`;
  const txId = `${txChainId}-${txHash}`;
  const transactionFound = await context.db.find(transaction, {
    id: txId,
  });

  if (!transactionFound) {
    await context.db.insert(transaction).values({
      id: txId,
      chainId: txChainId,
      hash: txHash as Address,
      timestamp: BigInt(0),
      solver: event.args.user,
    });
  }

  // insert withdraw
  const withdrawFound = await context.db.find(solverWithdraw, { id: txId });
  if (!withdrawFound) {
    await context.db.insert(solverWithdraw).values({
      id: txId,
      solver: event.args.user,
      amount: event.args.amount,
    });
  }
});

ponder.on("LattePool:Borrowed", async ({ event, context }) => {
  // insert solver
  const solverFound = await context.db.find(solver, { id: event.args.user });
  if (!solverFound) {
    await context.db.insert(solver).values({
      id: event.args.user,
      collateralBalance: BigInt(0),
      debtBalance: BigInt(0),
    });
  }

  // update solver balance
  const solverRow = await context.db.find(solver, { id: event.args.user });
  if (solverRow) {
    await context.db.update(solver, { id: event.args.user }).set({
      debtBalance: (solverRow.debtBalance ?? BigInt(0)) + event.args.amount,
    });
  }

  // insert transaction
  const txHash = `${event.transaction.hash}`;
  const txChainId = `${context.network.chainId}`;
  const txId = `${txChainId}-${txHash}`;
  const transactionFound = await context.db.find(transaction, {
    id: txId,
  });

  if (!transactionFound) {
    await context.db.insert(transaction).values({
      id: txId,
      chainId: txChainId,
      hash: txHash as Address,
      timestamp: BigInt(0),
      solver: event.args.user,
    });
  }

  // insert borrow
  const borrowFound = await context.db.find(solverBorrow, { id: txId });
  if (!borrowFound) {
    await context.db.insert(solverBorrow).values({
      id: txId,
      solver: event.args.user,
      amount: event.args.amount,
    });
  }

  // track debt
  const debtId = `${txChainId}-${event.args.user}`;
  const debtFound = await context.db.find(solverDebt, { id: debtId });
  if (!debtFound) {
    await context.db.insert(solverDebt).values({
      id: debtId,
      solver: event.args.user,
      chainId: txChainId,
      amount: BigInt(0),
    });
  }
  const debtRow = await context.db.find(solverDebt, { id: debtId });
  if (debtRow) {
    await context.db.update(solverDebt, { id: debtId }).set({
      amount: (debtRow.amount ?? BigInt(0)) + event.args.amount,
    });
  }
});

ponder.on("LattePool:Repaid", async ({ event, context }) => {
  // insert solver
  const solverFound = await context.db.find(solver, { id: event.args.user });
  if (!solverFound) {
    await context.db.insert(solver).values({
      id: event.args.user,
      collateralBalance: BigInt(0),
      debtBalance: BigInt(0),
    });
  }

  // update solver balance
  const solverRow = await context.db.find(solver, { id: event.args.user });
  if (solverRow) {
    await context.db.update(solver, { id: event.args.user }).set({
      debtBalance: (solverRow.debtBalance ?? BigInt(0)) - event.args.amount,
    });
  }

  // insert transaction
  const txHash = `${event.transaction.hash}`;
  const txChainId = `${context.network.chainId}`;
  const txId = `${txChainId}-${txHash}`;
  const transactionFound = await context.db.find(transaction, {
    id: txId,
  });

  if (!transactionFound) {
    await context.db.insert(transaction).values({
      id: txId,
      chainId: txChainId,
      hash: txHash as Address,
      timestamp: BigInt(0),
      solver: event.args.user,
    });
  }

  // insert repay
  const repayFound = await context.db.find(solverRepay, { id: txId });
  if (!repayFound) {
    await context.db.insert(solverRepay).values({
      id: txId,
      solver: event.args.user,
      amount: event.args.amount,
    });
  }

  // track debt
  const debtId = `${txChainId}-${event.args.user}`;
  const debtFound = await context.db.find(solverDebt, { id: debtId });
  if (!debtFound) {
    await context.db.insert(solverDebt).values({
      id: debtId,
      solver: event.args.user,
      chainId: txChainId,
      amount: BigInt(0),
    });
  }
  const debtRow = await context.db.find(solverDebt, { id: debtId });
  if (debtRow) {
    await context.db.update(solverDebt, { id: debtId }).set({
      amount: (debtRow.amount ?? BigInt(0)) - event.args.amount,
    });
  }
});
