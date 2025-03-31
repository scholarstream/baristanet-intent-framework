import { AddressZero } from "@ethersproject/constants";

import {
  type BaristanetMetadata,
  BaristanetMetadataSchema,
} from "../types.js";

const metadata: BaristanetMetadata = {
  protocolName: "Hyperlane7683",
  intentSources: [
    // testnet
    {
      address: "0x576ba9ea0dc68f8b18ff8443a1d0aa1425459ef5",
      chainName: "arbitrumsepolia",
      initialBlock: 137499446,
      pollInterval: 1000,
      confirmationBlocks: 2,
    },
    {
      address: "0xabb2e3cc9ef0c41f3c076afd2701684f8418e7d8",
      chainName: "basesepolia",
      initialBlock: 23795308,
      pollInterval: 1000,
      confirmationBlocks: 2,
    },
  ],
  customRules: {
    rules: [
      // {
      //   name: "filterByTokenAndAmount",
      //   args: {
      //     "11155420": {
      //       "0x5f94BC7Fb4A2779fef010F96b496cD36A909E818": BigInt(50e18),
      //       [AddressZero]: BigInt(5e15),
      //     },
      //     "84532": {
      //       "0x5f94BC7Fb4A2779fef010F96b496cD36A909E818": BigInt(50e18),
      //       [AddressZero]: BigInt(5e15),
      //     },
      //     "421614": {
      //       "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": null,
      //       [AddressZero]: BigInt(5e15),
      //     },
      //     "11155111": {
      //       "0x5f94BC7Fb4A2779fef010F96b496cD36A909E818": BigInt(5e18),
      //       [AddressZero]: BigInt(5e10),
      //     },
      //   },
      // },
      {
        name: "intentNotFilled",
      },
    ],
  },
};

BaristanetMetadataSchema.parse(metadata);

export default metadata;
