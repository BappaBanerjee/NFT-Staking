const { expect } = require("chai");
const { ethers, deployments, upgrades } = require("hardhat");
const { DECIMAL } = require("../helper-hardhat.config");

describe.only("Staking contract testing", function () {
  let UpgradingStaking, RewardToken;
  const UNBOUNDING_PERIOD = 100; //as per contract
  const REWARD_PER_BLOCK = ethers.parseUnits("10", 18); // Example reward per block

  beforeEach(async function () {
    [deployer, account1, account2] = await ethers.getSigners();

    await deployments.fixture("all");

    RewardToken = await ethers.getContract("RewardToken", deployer);
    rewardTokenAddr = await RewardToken.getAddress();

    nftContract = await ethers.getContract("MyNFT", deployer);
    nftContractAddr = await nftContract.getAddress();

    UpgradingStaking = await ethers.getContractFactory("UpgradingStaking");
  });

  async function mineBlocks(numberOfBlocks) {
    for (let i = 0; i < numberOfBlocks; i++) {
      await ethers.provider.send("evm_mine", []); // This will mine one block
    }
  }

  describe("deployment of the proxy contract", () => {
    it("should deploy the UUPS proxy and initialize correctly", async function () {
      // Deploy the UUPS proxy and initialize the contract
      proxy = await upgrades.deployProxy(
        UpgradingStaking,
        [deployer.address, rewardTokenAddr],
        {
          initializer: "initialize",
          kind: "uups",
        }
      );
      expect(await proxy.owner()).to.equal(deployer.address);
      expect(await proxy.REWARD_TOKEN()).to.equal(rewardTokenAddr);
    });

    it("should have the new implementation address", async function () {
      proxy = await upgrades.deployProxy(
        UpgradingStaking,
        [deployer.address, rewardTokenAddr],
        {
          initializer: "initialize",
          kind: "uups",
        }
      );

      const stakingContractAddr = await proxy.getAddress();
      const implementationAddress =
        await upgrades.erc1967.getImplementationAddress(stakingContractAddr);
      console.log(stakingContractAddr, implementationAddress);
      expect(implementationAddress).to.not.be.null;
    });

    it.only("should upgrade to the new implementation and preserve the states", async function () {
      stakingContract = await upgrades.deployProxy(
        UpgradingStaking,
        [deployer.address, rewardTokenAddr],
        {
          initializer: "initialize",
          kind: "uups",
        }
      );

      const stakingContractAddr = await stakingContract.getAddress();
      await nftContract.safeMint(account1, "testUrl");
      await nftContract.connect(account1).approve(stakingContractAddr, 0);
      await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);

      const stakeInfo = await stakingContract.stakedInfo(1001);
      const stakedIds = await stakingContract.connect(account1).getStakedIds();

      //upgrading the contract to version 2
      const UpgradingStakingV2 = await ethers.getContractFactory(
        "UpgradingStakingV2"
      );

      const upgradedV2 = await upgrades.upgradeProxy(
        stakingContractAddr,
        UpgradingStakingV2
      );

      console.log(await upgradedV2.REWARD_PER_BLOCK());

      const stakeInfoAfterUpgrade = await stakingContract.stakedInfo(1001);

      const stakedIdsAfterUpgrade = await stakingContract
        .connect(account1)
        .getStakedIds();

      expect(stakeInfo).to.deep.equal(stakeInfoAfterUpgrade);
      expect(stakedIds).to.deep.equal(stakedIdsAfterUpgrade);
    });
  });

  describe("functions testing", () => {
    let stakingContract;
    let stakingContractAddr;
    beforeEach(async function () {
      stakingContract = await upgrades.deployProxy(
        UpgradingStaking,
        [deployer.address, rewardTokenAddr],
        {
          initializer: "initialize",
          kind: "uups",
        }
      );
      stakingContractAddr = await stakingContract.getAddress();
    });

    describe("staking function", () => {
      it("should revert if the nft allowance is not allowed", async () => {
        await expect(
          stakingContract.stake(100, nftContractAddr, 0)
        ).to.revertedWithCustomError(nftContract, "ERC721NonexistentToken");
      });

      it("should revert if the nft is minted but not allowed", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await expect(
          stakingContract.stake(100, nftContractAddr, 0)
        ).to.revertedWithCustomError(stakingContract, "InvalidAllowance");
      });

      it("should successfully staked an nft", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);

        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);

        const stakeInfo = await stakingContract.stakedInfo(1001);
        expect(stakeInfo.staker).to.equal(account1.address);
        expect(stakeInfo.nftContract).to.equal(nftContractAddr);
        expect(stakeInfo.tokenId).to.equal(0);

        const stakedIds = await stakingContract
          .connect(account1)
          .getStakedIds();
        expect(stakedIds.length).to.equal(1);
        expect(stakedIds[0]).to.equal(1001);

        expect(await nftContract.ownerOf(0)).to.equal(stakingContractAddr);
      });

      it("should revert if the staking ID is already in used", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);

        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);

        // await stakingContract.connect(account1).stake(1001, nftContractAddr, 1);
        await expect(
          stakingContract.connect(account1).stake(1001, nftContractAddr, 1)
        ).to.be.revertedWithCustomError(stakingContract, "InvalidStakingId");
      });

      it("should emit the staked event", async function () {
        await nftContract.safeMint(account1, "testUrl");

        await nftContract.connect(account1).approve(stakingContractAddr, 0);
        await expect(
          stakingContract.connect(account1).stake(1001, nftContractAddr, 0)
        )
          .to.emit(stakingContract, "staked")
          .withArgs(
            account1.address,
            nftContractAddr,
            0,
            // Assuming block timestamp is within this range
            (await ethers.provider
              .getBlock("latest")
              .then((b) => b.timestamp)) + 1
          );
      });
    });

    describe("unstake functionality", () => {
      it("should unstake successfully", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);

        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);
        const minedBlocked = 10;
        await mineBlocks(minedBlocked);

        await stakingContract.connect(account1).unstake(1001);
        const stakedInfo = await stakingContract.stakedInfo(1001);
        const currentBlock = await ethers.provider.getBlockNumber();

        expect(stakedInfo.unboundingPeriod).to.be.equal(
          currentBlock + UNBOUNDING_PERIOD
        );
      });

      it("should revert if unstaked by unauthorised user", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);

        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);

        await expect(
          stakingContract.unstake(1001)
        ).to.be.revertedWithCustomError(stakingContract, "NotAllowed");
      });

      it("should revert if the staking Id is invalid", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);

        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);

        await expect(
          stakingContract.connect(account1).unstake(1002)
        ).to.be.revertedWithCustomError(stakingContract, "NotAllowed");
      });
    });

    describe("withdraw functionality test", () => {
      it("should successfully withdraw the nft", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);

        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);

        expect(await nftContract.ownerOf(0)).to.equal(stakingContractAddr);

        await stakingContract.connect(account1).unstake(1001);

        await mineBlocks(UNBOUNDING_PERIOD + 1);

        await stakingContract.connect(account1).withdraw(1001);
        expect(await nftContract.ownerOf(0)).to.equal(account1.address);
      });

      it("should revert if tries to withdraw twice the same stakingId", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);

        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);

        expect(await nftContract.ownerOf(0)).to.equal(stakingContractAddr);

        await stakingContract.connect(account1).unstake(1001);

        await mineBlocks(UNBOUNDING_PERIOD + 1);

        await stakingContract.connect(account1).withdraw(1001);
        expect(await nftContract.ownerOf(0)).to.equal(account1.address);

        //tries to widthdraw again
        await expect(
          stakingContract.connect(account1).withdraw(1001)
        ).to.be.revertedWithCustomError(
          nftContract,
          "ERC721InsufficientApproval"
        );
      });

      it("should not allowed unauthorised user", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);
        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);
        await stakingContract.connect(account1).unstake(1001);
        await mineBlocks(UNBOUNDING_PERIOD + 1);
        await expect(
          stakingContract.connect(account2).withdraw(1001)
        ).to.be.revertedWithCustomError(stakingContract, "NotAllowed");
      });

      it("should not allowed withdraw before unstaked", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);
        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);
        await mineBlocks(UNBOUNDING_PERIOD + 1);
        await expect(
          stakingContract.connect(account1).withdraw(1001)
        ).to.be.revertedWithCustomError(stakingContract, "NotAllowed");
      });

      it("shoud revert if the withdraw before unbounding period", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);
        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);
        await stakingContract.connect(account1).unstake(1001);
        await expect(
          stakingContract.connect(account1).withdraw(1001)
        ).to.be.revertedWithCustomError(stakingContract, "NotAllowed");
      });
    });

    describe("reward claiming", () => {
      beforeEach(async () => {
        await RewardToken.mint(stakingContractAddr, ethers.parseEther("1000"));
      });
      it("should return the reward to the user", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);
        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);
        const noOfBlockMined = 15;

        const info = await stakingContract.stakedInfo(1001);

        await mineBlocks(noOfBlockMined);
        await stakingContract.connect(account1).rewardClaim();
        const newBalance = await RewardToken.balanceOf(account1);
        expect(newBalance).to.be.equal(
          REWARD_PER_BLOCK *
            (BigInt(await ethers.provider.getBlockNumber()) - info.blockNumber)
        );

        const newInfo = await stakingContract.stakedInfo(1001);
        expect(newInfo.blockNumber).to.be.equal(
          // info.blockNumber + BigInt(noOfBlockMined + 1)
          await ethers.provider.getBlockNumber()
        );
      });

      it("should handle reward claim for multiple nfts staked", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.safeMint(account1, "testUrl2");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);
        await nftContract.connect(account1).approve(stakingContractAddr, 1);
        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);
        await stakingContract.connect(account1).stake(1002, nftContractAddr, 1);

        const info1 = await stakingContract.stakedInfo(1001);
        const info2 = await stakingContract.stakedInfo(1002);

        const noOfBlockMined = 15;
        await mineBlocks(noOfBlockMined);

        await stakingContract.connect(account1).rewardClaim();
        const totalBlocks =
          BigInt(await ethers.provider.getBlockNumber()) -
          info1.blockNumber +
          (BigInt(await ethers.provider.getBlockNumber()) - info2.blockNumber);
        const newBalance = await RewardToken.balanceOf(account1);

        expect(newBalance).to.be.equal(REWARD_PER_BLOCK * totalBlocks);
      });

      it("should stop rewarding after unbounding period", async () => {
        await nftContract.safeMint(account1, "testUrl");
        await nftContract.connect(account1).approve(stakingContractAddr, 0);
        await stakingContract.connect(account1).stake(1001, nftContractAddr, 0);

        await stakingContract.connect(account1).unstake(1001);
        const info1 = await stakingContract.stakedInfo(1001);

        const noOfBlockMined = UNBOUNDING_PERIOD + 10;
        await mineBlocks(noOfBlockMined);

        await stakingContract.connect(account1).rewardClaim();
        const totalBlocks =
          BigInt(await ethers.provider.getBlockNumber()) -
          info1.unboundingPeriod;
        const newBalance = await RewardToken.balanceOf(account1);

        expect(newBalance).to.be.equal(REWARD_PER_BLOCK * totalBlocks);
      });
    });
  });
});
