const networkConfig = {
  31337: {
    name: "localhost",
  },
  // Price Feed Address, values can be obtained at https://docs.chain.link/docs/reference-contracts
  11155111: {
    name: "sepolia",
  },
};

const developmentChains = ["hardhat", "localhost"];

const DECIMAL = 10 ** 8;
const INITIAL_ANSWER = 200000000000;

module.exports = {
  networkConfig,
  developmentChains,
  DECIMAL,
  INITIAL_ANSWER,
};
