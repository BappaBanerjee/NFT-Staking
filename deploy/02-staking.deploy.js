const { ethers, upgrades } = require("hardhat");

module.exports = async ({ deployments, getNamedAccounts }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const Token = await ethers.getContract("RewardToken", deployer);
  const rewardToken = await Token.getAddress();

  const Staking = await ethers.getContractFactory("UpgradingStaking");
  const staking = await upgrades.deployProxy(Staking, [deployer, rewardToken]);
  await staking.waitForDeployment();
  console.log("UPPS staking contract deployed to:", await staking.getAddress());
};

module.exports.tags = ["UpgradingStaking"];
