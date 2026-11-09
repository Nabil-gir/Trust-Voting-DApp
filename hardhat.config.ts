import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin, hardhatKeystore, hardhatVerify],
  // La clé Etherscan est fournie par l'environnement ou le keystore.
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.38",
      },
      production: {
        version: "0.8.38",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  // Démonstration locale et réseau de test public Sepolia.
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 31337,
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      chainId: 11155111,
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    localhost: {
      type: "http",
      chainType: "l1",
      chainId: 31337,
      url: "http://127.0.0.1:8545",
    },
  },
};

export default config;
