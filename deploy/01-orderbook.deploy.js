module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("Orderbook", {
    from: deployer,
    args: [],
    log: true,
  });
};
module.exports.tags = ["all", "orderbook"];
