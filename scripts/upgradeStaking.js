const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  const Staking = await ethers.getContractFactory("UpgradingStakingV2");

  const staking = await upgrades.upgradeProxy(proxyAddress, Staking);
  await staking.waitForDeployment();
  console.log("Box deployed to:", await staking.getAddress());
}

main();

//npx hardhat run scripts/upgradeStaking.js
