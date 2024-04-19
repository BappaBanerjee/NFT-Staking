const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");

describe.only("new orderbook contract test", function () {
  let deployer;
  let anotherAccount;
  let orderbook;
  let baseContract;
  let quoteContract;
  let INITIALBAL = 2000 * 10 ** 18;
  beforeEach(async function () {
    [deployer, anotherAccount] = await ethers.getSigners();
    await deployments.fixture(["all"]);
    orderbook = await ethers.getContract("Orderbook", deployer);
    baseContract = await ethers.getContract("BaseToken", deployer);
    quoteContract = await ethers.getContract("QuoteToken", deployer);

    console.log(await baseContract.getAddress());
    console.log(await quoteContract.getAddress());
    baseContract.mint(deployer, BigInt(INITIALBAL));
    baseContract.mint(anotherAccount, BigInt(INITIALBAL));
    quoteContract.mint(deployer, BigInt(INITIALBAL));
    quoteContract.mint(anotherAccount, BigInt(INITIALBAL));
  });

  describe("check funds in the user account", async function () {
    it("should add funds to the user", async function () {
      expect(await baseContract.balanceOf(deployer.address)).to.equal(
        BigInt(INITIALBAL)
      );
    });
  });
});
