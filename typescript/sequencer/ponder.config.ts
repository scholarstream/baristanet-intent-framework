import { createConfig } from "ponder";
import { http } from "viem";
import { BrewHouseAbi } from "./abis/BrewHouseAbi";
import { LattePoolAbi } from "./abis/LattePoolAbi";

export default createConfig({
  networks: {
    baristanet: {
      chainId: 77424778,
      transport: http("http://13.60.198.87:8547"),
    },
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
      network: "baristanet",
      abi: BrewHouseAbi,
      address: "0x0E376F9a367BD9148d97F4195b017E78999fB554",
      startBlock: 25,
    },
    LattePoolA: {
      network: "arbitrum",
      abi: LattePoolAbi,
      address: "0xfca3819dd85017a11aa23ed08f57cd31db8e96cd",
      startBlock: 138269370,
    },
    LattePoolB: {
      network: "base",
      abi: LattePoolAbi,
      address: "0x56545f21dff77950e9fbfc27725f82150a4d7512",
      startBlock: 23893007,
    },
  },
});
