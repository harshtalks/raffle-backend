import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";

dotenv.config({ path: __dirname + "/.env.example" });

// Task to get all the account private keys
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const RINKEBY_URL =
  process.env.RINKEBY_URL !== undefined ? process.env.RINKEBY_URL : "";

const RINKEBY_ACCs =
  process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [""];

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: { default: 0 },
    player: { default: 1 },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: process.env.COINMARKET_API_KEY!,
    outputFile: "gas-report.txt",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 200000,
  },

  networks: {
    localhost: {
      chainId: 31337,
    },
    rinkeby: {
      url: RINKEBY_URL,
      accounts: RINKEBY_ACCs,
      chainId: 4,
    },
  },
};

export default config;
