const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");
const { DECIMAL } = require("../helper-hardhat.config");

describe("orderbook testing", function () {
  const BASE = "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8"; //deduct in sell order quantity
  const QUOTE = "0xd9145CCE52D386f254917e481eB44e9943F39138";

  const INITIALBAL = BigInt(20000000);

  let orderbook;

  beforeEach(async () => {
    [deployer, anotherAccount] = await ethers.getSigners();
    await deployments.fixture(["all"]);
    orderbook = await ethers.getContract("Orderbook", deployer);
  });

  it("constructor", async function () {
    //constructor set the balance of the BASE AND ETH as 2000
    expect(await orderbook._balanceOf(BASE)).to.equal(INITIALBAL);
    expect(await orderbook._balanceOf(QUOTE)).to.equal(INITIALBAL);
  });

  describe("place an order", async function () {
    it("place buy order", async function () {
      //balance before placing a transaction
      const quoteBal = await orderbook._balanceOf(QUOTE);
      expect(quoteBal).to.equal(INITIALBAL);
      let curBuyOrders = await orderbook.getBuyOrders();
      //checking that the buyorders book is empty
      expect(curBuyOrders.length).to.equals(0);

      //placing a buyorder
      await orderbook.placeBuyOrder(100000, 50000);

      //get the buyorder
      const order1 = await orderbook.buyOrders(0);

      expect(order1.orderId).to.equal(BigInt(0));
      expect(order1.trader).to.equal(deployer.address);
      expect(order1.orderType).to.equal(BigInt(0));
      expect(order1.price).to.equal(BigInt(100000));
      expect(order1.quantity).to.equal(BigInt(50000));
      expect(order1.baseToken).to.equal(BASE);
      expect(order1.quoteToken).to.equal(QUOTE);

      //balance must decrease after placing a buy order
      let balanceToDeduct = (100000 * 50000) / DECIMAL;
      expect(await orderbook._balanceOf(QUOTE)).to.equal(
        quoteBal - BigInt(balanceToDeduct)
      );
      expect(await orderbook._balanceOf(BASE)).to.equal(INITIALBAL);

      let buyOrders = await orderbook.getBuyOrders(); //return an array of buyorders
      expect(buyOrders.length).to.equals(1);

      let remainingQuoteBal = await orderbook._balanceOf(QUOTE);

      //placing a buyorder
      await orderbook.placeBuyOrder(80000, 50000);

      const order2 = await orderbook.buyOrders(0);

      expect(order2.orderId).to.equal(BigInt(1));
      expect(order2.trader).to.equal(deployer.address);
      expect(order2.orderType).to.equal(BigInt(0));
      expect(order2.price).to.equal(BigInt(80000));
      expect(order2.quantity).to.equal(BigInt(50000));
      expect(order2.baseToken).to.equal(BASE);
      expect(order2.quoteToken).to.equal(QUOTE);

      balanceToDeduct = (80000 * 50000) / DECIMAL;

      expect(await orderbook._balanceOf(QUOTE)).to.equal(
        remainingQuoteBal - BigInt(balanceToDeduct)
      );

      expect(await orderbook._balanceOf(BASE)).to.equal(INITIALBAL);

      buyOrders = await orderbook.getBuyOrders(); //return an array of buyorders
      expect(buyOrders.length).to.equals(2);
    });

    it("place sell order", async function () {
      //balance before placing a transaction
      const baseBal = await orderbook._balanceOf(BASE);
      expect(baseBal).to.equal(INITIALBAL);
      let curSellOrders = await orderbook.getSellOrders();
      //checking that the buyorders book is empty
      expect(curSellOrders.length).to.equals(0);

      //placing a buyorder
      await orderbook.placeSellOrder(100000, 50000);

      let order1 = await orderbook.sellOrders(0);

      expect(order1.orderId).to.equal(BigInt(0));
      expect(order1.trader).to.equal(deployer.address);
      expect(order1.orderType).to.equal(BigInt(1));
      expect(order1.price).to.equal(BigInt(100000));
      expect(order1.quantity).to.equal(BigInt(50000));
      expect(order1.baseToken).to.equal(BASE);
      expect(order1.quoteToken).to.equal(QUOTE);

      let balanceToDeduct = BigInt(50000);
      expect(await orderbook._balanceOf(BASE)).to.equal(
        baseBal - balanceToDeduct
      );
      expect(await orderbook._balanceOf(QUOTE)).to.equal(INITIALBAL);

      let sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(1);

      let remainingBaseBal = await orderbook._balanceOf(BASE);

      await orderbook.placeSellOrder(80000, 50000);

      let order2 = await orderbook.sellOrders(1);

      expect(order2.orderId).to.equal(BigInt(1));
      expect(order2.trader).to.equal(deployer.address);
      expect(order2.orderType).to.equal(BigInt(1));
      expect(order2.price).to.equal(BigInt(80000));
      expect(order2.quantity).to.equal(BigInt(50000));
      expect(order2.baseToken).to.equal(BASE);
      expect(order2.quoteToken).to.equal(QUOTE);

      balanceToDeduct = BigInt(50000);

      expect(await orderbook._balanceOf(BASE)).to.equal(
        remainingBaseBal - balanceToDeduct
      );
      expect(await orderbook._balanceOf(QUOTE)).to.equal(INITIALBAL);

      sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(2);
    });
  });

  describe("buy order making", async function () {
    beforeEach(async function () {
      await orderbook.placeSellOrder(100000, 50000);
    });

    it("should place a buy order and make it complete", async function () {
      let sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(1);
      await orderbook.placeBuyOrder(100000, 50000);

      sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(0);

      let buyOrders = await orderbook.getBuyOrders();
      expect(buyOrders.length).to.equal(0);

      expect(await orderbook._balanceOf(BASE)).to.equal(INITIALBAL);
      expect(await orderbook._balanceOf(QUOTE)).to.equal(INITIALBAL);
    });

    it("should make a partial buy order", async function () {
      await orderbook.placeBuyOrder(100000, 80000);

      let sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(0);

      let buyOrders = await orderbook.getBuyOrders();
      expect(buyOrders.length).to.equal(1);

      let buyorder = await orderbook.buyOrders(0);
      expect(buyorder.quantity).to.equal(BigInt(30000));
    });

    it("should make a partial sell order", async function () {
      await orderbook.placeBuyOrder(100000, 30000);

      let sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(1);

      let buyOrders = await orderbook.getBuyOrders();
      expect(buyOrders.length).to.equal(0);

      let sellorder = await orderbook.sellOrders(0);
      expect(sellorder.quantity).to.equal(BigInt(20000));
    });

    it("should not make any order", async function () {
      //if buy order is less than the minimum sell order it will not make

      await orderbook.placeBuyOrder(80000, 50000);

      let sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(1);

      let buyOrders = await orderbook.getBuyOrders();
      expect(buyOrders.length).to.equal(1);

      let sellorder = await orderbook.sellOrders(0);
      expect(sellorder.quantity).to.equal(BigInt(50000));
      expect(sellorder.price).to.equal(BigInt(100000));

      let buyorder = await orderbook.buyOrders(0);
      expect(buyorder.quantity).to.equal(BigInt(50000));
      expect(buyorder.price).to.equal(BigInt(80000));
    });
  });

  describe("sell order making", async function () {
    beforeEach(async function () {
      await orderbook.placeBuyOrder(100000, 50000);
    });
    it("should place a sell order and make it complete", async function () {
      let buyOrders = await orderbook.getBuyOrders();
      expect(buyOrders.length).to.equal(1);

      await orderbook.placeSellOrder(100000, 50000);

      buyOrders = await orderbook.getSellOrders();
      expect(buyOrders.length).to.equal(0);

      let sellOrders = await orderbook.getBuyOrders();
      expect(sellOrders.length).to.equal(0);

      expect(await orderbook._balanceOf(BASE)).to.equal(INITIALBAL);
      expect(await orderbook._balanceOf(QUOTE)).to.equal(INITIALBAL);
    });

    it("should make a partial sell order", async function () {
      let buyOrders = await orderbook.getBuyOrders();
      expect(buyOrders.length).to.equal(1);

      await orderbook.placeSellOrder(100000, 80000);

      buyOrders = await orderbook.getBuyOrders();
      expect(buyOrders.length).to.equal(0);

      let sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(1);

      let sellorder = await orderbook.sellOrders(0);
      expect(sellorder.quantity).to.equal(BigInt(30000));
    });

    it("should make a partial buy order", async function () {
      let buyOrders = await orderbook.getBuyOrders();
      expect(buyOrders.length).to.equal(1);

      await orderbook.placeSellOrder(100000, 30000);

      buyOrders = await orderbook.getBuyOrders();
      expect(buyOrders.length).to.equal(1);

      let buyorder = await orderbook.buyOrders(0);
      expect(buyorder.quantity).to.equal(BigInt(20000));

      let sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(0);
    });

    it("should not make any order", async function () {
      await orderbook.placeSellOrder(120000, 50000);

      let sellOrders = await orderbook.getSellOrders();
      expect(sellOrders.length).to.equal(1);

      let sellorder = await orderbook.sellOrders(0);
      expect(sellorder.quantity).to.equal(BigInt(50000));
      expect(sellorder.price).to.equal(BigInt(120000));

      let buyorder = await orderbook.buyOrders(0);
      expect(buyorder.quantity).to.equal(BigInt(50000));
      expect(buyorder.price).to.equal(BigInt(100000));
    });
  });

  describe("buying at marketprice", async function () {
    it("should revert the transactio with msg no sell orders present", async function () {
      await expect(orderbook.buyAtMarketPrice(10000)).to.be.revertedWith(
        "no sell orders present"
      );
    });

    describe("buying", async function () {
      beforeEach(async function () {
        await orderbook.placeSellOrder(100000, 50000);
        await orderbook.placeSellOrder(80000, 50000);
        await orderbook.placeSellOrder(60000, 50000);
      });

      it("should revert the buy transaxtion", async function () {});
    });
  });
});
