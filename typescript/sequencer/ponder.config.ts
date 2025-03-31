import { createConfig } from "ponder";
import { http } from "viem";
import { BrewHouseAbi } from "./abis/BrewHouseAbi";
import { LattePoolAbi } from "./abis/LattePoolAbi";

export default createConfig({
  networks: {
    arbitrum: {
      chainId: 421614,
      transport: http("https://arbitrum-sepolia-rpc.publicnode.com"),
    },
    base: {
      chainId: 84532,
      transport: http("https://base-sepolia-rpc.publicnode.com"),
    },
  },
  contracts: {
    BrewHouse: {
      network: "arbitrum",
      abi: BrewHouseAbi,
      address: "0x0eb16726080f6924452055f00c2c196db79c6854",
      startBlock: 135225059,
    },
    LattePool: {
      network: "base",
      abi: LattePoolAbi,
      address: "0x0eb16726080f6924452055f00c2c196db79c6854",
      startBlock: 23502173,
    },
  },
});
