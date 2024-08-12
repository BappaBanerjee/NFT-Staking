module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("MyNFT", {
    from: deployer,
    args: [deployer],
    log: true,
  });
};
module.exports.tags = ["all", "MyNFT"];
