# UpgradingStaking Smart Contract

## Overview

The `UpgradingStaking` contract allows users to stake their NFTs and earn ERC20 reward tokens per block. It is an upgradable contract using OpenZeppelin's upgradeable library.

### Key Features:

- **Staking:** Users can stake one or multiple NFTs.
- **Reward System:** Users earn a specified amount of reward tokens per block for each staked NFT.
- **Unstaking & Withdrawal:** Users can unstake their NFTs, with a defined unbonding period before they can withdraw.
- **Upgradeable Contract:** The contract can be upgraded without losing the state.

## Prerequisites

Before deploying and testing this contract, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v20.x or higher)
- [npm](https://www.npmjs.com/get-npm) or [yarn](https://yarnpkg.com/)
- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [Metamask](https://metamask.io/) for interacting with the contract.

## Installation

1. **Clone the repository:**

   ```bash
   git clone <repository_url>
   cd <repository_folder>
   ```

2. **Install the dependencies:**

   ```bash
   npm install
   ```

   or

   ```bash
   yarn install
   ```

## Deployment

1. **Configure the deployment:**

   Update the `hardhat.config.js` file with your preferred network settings.

2. **Deploy the contract:**

   ```bash
   npx hardhat deploy --network <network_name>
   ```

   will deploy all the contracts to the respctive network. We can also use tags to deploy specific contract.

   ```bash
   npx hardhat run scripts/upgradeStaking.js --network <network_name>
   ```

   Run this script to upgrade the implementation contract.
   Note : change the proxy address to your proxy address contract

   Replace `<network_name>` with the network you want to deploy to (e.g., `rinkeby`, `mainnet`, `localhost`).

## Testing

1. **Write tests:**

   Use the `test` directory to write your tests using [Chai](https://www.chaijs.com/) and [Mocha](https://mochajs.org/).

2. **Run tests:**

   ```bash
   npx hardhat test
   ```

   This will run all the tests defined in the `test` directory.

## Interacting with the Contract

1. **Connecting to the Contract:**

   Use the deployed contract address to connect to it via web3 or ethers.js.

   Example using ethers.js:

   ```javascript
   const { ethers } = require("ethers");
   const stakingAddress = "0xYourDeployedContractAddress"; // Replace with your deployed contract address

   const stakingAbi = [
     // ABI of the UpgradingStaking contract
   ];

   const provider = new ethers.providers.Web3Provider(window.ethereum);
   const signer = provider.getSigner();
   const stakingContract = new ethers.Contract(
     stakingAddress,
     stakingAbi,
     signer
   );
   ```

2. **Staking NFTs:**

   ```javascript
   const stakingId = 1;
   const nftContract = "0xYourNFTContractAddress";
   const tokenId = 123;

   await stakingContract.stake(stakingId, nftContract, tokenId);
   ```

3. **Claiming Rewards:**

   ```javascript
   await stakingContract.rewardClaim();
   ```

4. **Unstaking and Withdrawing NFTs:**

   ```javascript
   const stakedId = 1;

   await stakingContract.unstake(stakedId);
   await stakingContract.withdraw(stakedId);
   ```

## Upgrade the Contract

1. **Make changes to the contract:**

   Modify the contract as necessary.

2. **Deploy the new implementation:**

   ```bash
   npx hardhat run scripts/upgradeStaking.js --network <network_name>
   ```

   if you want to test in localhost ensure you are running your local node

   ```bash
        npx hardhat node
   ```

   and in different terminal run the script

   ```bash
   npx hardhat run scripts/upgradeStaking.js --network localhost
   ```
