import { Zero } from "@ethersproject/constants";
import { Wallet } from "@ethersproject/wallet";
import { chainMetadata } from "@hyperlane-xyz/registry";
import { MultiProvider } from "@hyperlane-xyz/sdk";
import { ensure0x, type Result } from "@hyperlane-xyz/utils";

import { type BigNumber } from "ethers";

import { MNEMONIC, PRIVATE_KEY } from "../../config.js";
import type { IntentCreatedEventObject } from "../../typechain/eco/contracts/IntentSource.js";
import { Erc20__factory } from "../../typechain/factories/contracts/Erc20__factory.js";
import { EcoAdapter__factory } from "../../typechain/factories/eco/contracts/EcoAdapter__factory.js";
import type { EcoMetadata, IntentData } from "./types.js";
import { getMetadata, log, withdrawRewards } from "./utils.js";

export const create = () => {
  const { adapters, intentSource, multiProvider } = setup();

  return async function eco(intent: IntentCreatedEventObject) {
    log.green("Received Intent:", intent._hash);

    const result = await prepareIntent(intent, adapters, multiProvider);

    if (!result.success) {
      log.error(
        "Failed to gather the information for the intent:",
        result.error,
      );
      return;
    }

    await fill(intent, result.data.adapter, intentSource, multiProvider);

    log.green(`Fulfilled intent:`, intent._hash);

    await withdrawRewards(intent, intentSource, multiProvider);

    log.green(`Withdrew rewards for intent:`, intent._hash);
  };
};

function setup() {
  if (!PRIVATE_KEY && !MNEMONIC) {
    throw new Error("Either a private key or mnemonic must be provided");
  }

  const metadata = getMetadata();

  if (!metadata.adapters.every(({ address }) => address)) {
    throw new Error("EcoAdapter address must be provided");
  }

  if (!metadata.intentSource.chainId) {
    throw new Error("IntentSource chain ID must be provided");
  }

  if (!metadata.intentSource.address) {
    throw new Error("IntentSource address must be provided");
  }

  const multiProvider = new MultiProvider(chainMetadata);
  const wallet = PRIVATE_KEY
    ? new Wallet(ensure0x(PRIVATE_KEY))
    : Wallet.fromMnemonic(MNEMONIC!);
  multiProvider.setSharedSigner(wallet);

  return {
    multiProvider,
    ...metadata,
  };
}

// We're assuming the filler will pay out of their own stock, but in reality they may have to
// produce the funds before executing each leg.
async function prepareIntent(
  intent: IntentCreatedEventObject,
  adapters: EcoMetadata["adapters"],
  multiProvider: MultiProvider,
): Promise<Result<IntentData>> {
  try {
    const destinationChainId = intent._destinationChain.toNumber();
    const adapter = adapters.find(
      ({ chainId }) => chainId === destinationChainId,
    );

    if (!adapter) {
      return {
        error: "No adapter found for destination chain",
        success: false,
      };
    }

    const signer = multiProvider.getSigner(destinationChainId);
    const erc20Interface = Erc20__factory.createInterface();

    const requiredAmountsByTarget = intent._targets.reduce<{
      [tokenAddress: string]: BigNumber;
    }>((acc, target, index) => {
      const [, amount] = erc20Interface.decodeFunctionData(
        "transfer",
        intent._data[index],
      ) as [string, BigNumber];

      acc[target] ||= Zero;
      acc[target] = acc[target].add(amount);

      return acc;
    }, {});

    const fillerAddress =
      await multiProvider.getSignerAddress(destinationChainId);

    const areTargetFundsAvailable = await Promise.all(
      Object.entries(requiredAmountsByTarget).map(
        async ([target, requiredAmount]) => {
          const erc20 = Erc20__factory.connect(target, signer);

          const balance = await erc20.balanceOf(fillerAddress);
          return balance.gte(requiredAmount);
        },
      ),
    );

    if (!areTargetFundsAvailable.every(Boolean)) {
      return { error: "Not enough tokens", success: false };
    }

    log.green("Approving tokens for:", adapter.address);
    await Promise.all(
      Object.entries(requiredAmountsByTarget).map(
        async ([target, requiredAmount]) => {
          const erc20 = Erc20__factory.connect(target, signer);

          const tx = await erc20.approve(adapter.address, requiredAmount);
          await tx.wait();
        },
      ),
    );

    return { data: { adapter }, success: true };
  } catch (error: any) {
    return {
      error: error.message ?? "Failed to prepare Eco Intent.",
      success: false,
    };
  }
}

async function fill(
  intent: IntentCreatedEventObject,
  adapter: EcoMetadata["adapters"][number],
  intentSource: EcoMetadata["intentSource"],
  multiProvider: MultiProvider,
): Promise<void> {
  log.green("About to fulfill intent", intent._hash);
  const _chainId = intent._destinationChain.toString();

  const filler = multiProvider.getSigner(_chainId);
  const ecoAdapter = EcoAdapter__factory.connect(adapter.address, filler);

  const claimantAddress = await multiProvider.getSignerAddress(
    intentSource.chainId,
  );

  const { _targets, _data, _expiryTime, nonce, _hash, _prover } = intent;
  const value = await ecoAdapter.fetchFee(
    intentSource.chainId,
    [_hash],
    [claimantAddress],
    _prover,
  );
  const tx = await ecoAdapter.fulfillHyperInstant(
    intentSource.chainId,
    _targets,
    _data,
    _expiryTime,
    nonce,
    claimantAddress,
    _hash,
    _prover,
    { value },
  );

  const receipt = await tx.wait();

  log.green(
    "Fulfill Tx:",
    "https://explorer.hyperlane.xyz/?search=" + receipt.transactionHash,
  );

  log.debug("Fulfilled intent on", _chainId, "with data", _data);
}
