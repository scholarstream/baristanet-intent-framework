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
    rules: [ ],
  },
};

BaristanetMetadataSchema.parse(metadata);

export default metadata;
