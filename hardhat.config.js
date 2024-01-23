/** @type import('hardhat/config').HardhatUserConfig */

// require("@nomiclabs/hardhat-waffle");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-deploy-ethers");

module.exports = {
  solidity: "0.8.19",
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};
