module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("QuoteToken", {
    from: deployer,
    args: [deployer],
    log: true,
  });
};
module.exports.tags = ["all", "quotetoken"];
