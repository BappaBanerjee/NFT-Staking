/** @type import('hardhat/config').HardhatUserConfig */

// require("@nomiclabs/hardhat-waffle");
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@openzeppelin/hardhat-upgrades");

const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
        details: {
          yulDetails: {
            optimizerSteps: "u",
          },
        },
      },
    },
  },
  networks: {
    localhost: {
      chainId: 31337,
    },
    mainnet: {
      url: "https://pulsechain-rpc.publicnode.com",
      chainId: 369,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY],
    },
    pulseTestnet: {
      url: "https://rpc.v4.testnet.pulsechain.com",
      chainId: 943,
      gasPrice: 20000000000,
      // accounts: [PRIVATE_KEY],
    },
    sepolia: {
      url: "https://rpc.sepolia.org",
      chainId: 11155111,
      gasPrice: 20000000000,
      // accounts: [PRIVATE_KEY],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};
