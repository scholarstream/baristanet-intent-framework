import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, eq, graphql } from "ponder";
import {
  Address,
  createWalletClient,
  encodePacked,
  http,
  keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const app = new Hono();

app.use("/sql/*", client({ db, schema }));

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// normalize bigint json
const normalizeJson = (obj: any) => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    }),
  );
};

// create signer
const pk = process.env.SEQUENCER_PRIVATE_KEY ?? "0x0";
const account = privateKeyToAccount(pk as Address);

app.post("/withdraw", async (c) => {
  const body = await c.req.json();

  const solver = body["solver"];
  const amount = body["amount"];
  const contractAddress = body["contractAddress"];

  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const rawMessage = keccak256(
    encodePacked(
      ["address", "uint256", "uint256", "address"],
      [solver, BigInt(amount), BigInt(deadline), contractAddress],
    ),
  );

  const signature = await account.signMessage({ message: { raw: rawMessage } });

  return c.json({
    signature,
    sequencer: account.address,
    data: { solver, amount, deadline },
  });
});

app.post("/borrow", async (c) => {
  const body = await c.req.json();

  const solver = body["solver"];
  const amount = body["amount"];
  const contractAddress = body["contractAddress"];

  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const solverData = await db.query.solver.findFirst({
    where: eq(schema.solver.id, solver as Address),
  });
  const maxDebt = solverData?.collateralBalance ?? 0;

  const rawMessage = keccak256(
    encodePacked(
      ["address", "uint256", "uint256", "uint256", "address"],
      [
        solver,
        BigInt(amount),
        BigInt(maxDebt),
        BigInt(deadline),
        contractAddress,
      ],
    ),
  );

  const signature = await account.signMessage({ message: { raw: rawMessage } });

  return c.json({
    signature,
    sequencer: account.address,
    data: {
      solver,
      amount,
      maxDebt,
      deadline,
    },
  });
});

app.post("/repay", async (c) => {
  const body = await c.req.json();

  const solver = body["solver"];
  const amount = body["amount"];
  const contractAddress = body["contractAddress"];

  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const solverData = await db.query.solver.findFirst({
    where: eq(schema.solver.id, solver as Address),
  });
  const currentDebt = solverData?.debtBalance ?? 0;

  const rawMessage = keccak256(
    encodePacked(
      ["address", "uint256", "uint256", "uint256", "address"],
      [
        solver,
        BigInt(amount),
        BigInt(currentDebt),
        BigInt(deadline),
        contractAddress,
      ],
    ),
  );

  const signature = await account.signMessage({ message: { raw: rawMessage } });

  return c.json({
    signature,
    sequencer: account.address,
    data: {
      solver,
      amount,
      currentDebt,
      deadline,
    },
  });
});

app.get("/solvers", async (c) => {
  // get all solvers with their collateral and debts total
  const solvers = await db.query.solver.findMany();
  const solversNormalized = normalizeJson(solvers);
  return c.json(solversNormalized);
});

app.get("/solvers/:id", async (c) => {
  const idInParams = c.req.param("id").toString();
  const solverData = await db.query.solver.findFirst({
    where: eq(schema.solver.id, idInParams as Address),
    with: {
      debts: true,
      transactions: {
        with: {
          deposit: true,
          withdraw: true,
          borrow: true,
          repay: true,
        },
      },
    },
  });
  const solverDataNormalized = normalizeJson(solverData);
  return c.json(solverDataNormalized);
});

export default app;
