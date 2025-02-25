module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("RewardToken", {
    from: deployer,
    args: [deployer],
    log: true,
  });
};
module.exports.tags = ["all", "RewardToken"];
