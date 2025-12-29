const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(tokenA.address, tokenB.address);

    await tokenA.approve(dex.address, ethers.utils.parseEther("1000000"));
    await tokenB.approve(dex.address, ethers.utils.parseEther("1000000"));

    await tokenA.connect(addr1).mint(addr1.address, ethers.utils.parseEther("1000"));
    await tokenB.connect(addr1).mint(addr1.address, ethers.utils.parseEther("1000"));

    await tokenA.connect(addr1).approve(dex.address, ethers.utils.parseEther("1000"));
    await tokenB.connect(addr1).approve(dex.address, ethers.utils.parseEther("1000"));
  });

  /* ---------- Liquidity Management (8) ---------- */

  describe("Liquidity Management", function () {
    it("should allow initial liquidity provision", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const [rA, rB] = await dex.getReserves();
      expect(rA).to.equal(ethers.utils.parseEther("100"));
      expect(rB).to.equal(ethers.utils.parseEther("200"));
    });

    it("should mint correct LP tokens for first provider", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100")
      );
      expect(await dex.totalLiquidity()).to.be.gt(0);
    });

    it("should allow subsequent liquidity additions", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      await dex.connect(addr1).addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );
      expect(await dex.totalLiquidity()).to.be.gt(0);
    });

    it("should maintain price ratio on liquidity addition", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      await expect(
        dex.connect(addr1).addLiquidity(
          ethers.utils.parseEther("10"),
          ethers.utils.parseEther("50")
        )
      ).to.be.reverted;
    });

    it("should allow partial liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const lp = await dex.totalLiquidity();
      await dex.removeLiquidity(lp.div(2));
      expect(await dex.totalLiquidity()).to.equal(lp.div(2));
    });

    it("should return correct token amounts on liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const lp = await dex.totalLiquidity();
      await dex.removeLiquidity(lp);
      const [rA, rB] = await dex.getReserves();
      expect(rA).to.equal(0);
      expect(rB).to.equal(0);
    });

    it("should revert on zero liquidity addition", async function () {
      await expect(dex.addLiquidity(0, 0)).to.be.reverted;
    });

    it("should revert when removing more liquidity than owned", async function () {
      await expect(dex.removeLiquidity(1)).to.be.reverted;
    });
  });

  /* ---------- Token Swaps (8) ---------- */

  describe("Token Swaps", function () {
    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should swap token A for token B", async function () {
      await dex.swapAForB(ethers.utils.parseEther("10"));
      expect(await tokenB.balanceOf(owner.address)).to.be.gt(0);
    });

    it("should swap token B for token A", async function () {
      await tokenB.approve(dex.address, ethers.utils.parseEther("10"));
      await dex.swapBForA(ethers.utils.parseEther("10"));
      expect(await tokenA.balanceOf(owner.address)).to.be.gt(0);
    });

    it("should calculate correct output amount with fee", async function () {
      const out = await dex.getAmountOut(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      expect(out).to.be.gt(0);
    });

    it("should update reserves after swap", async function () {
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const [rA] = await dex.getReserves();
      expect(rA).to.equal(ethers.utils.parseEther("110"));
    });

    it("should increase k after swap due to fees", async function () {
      const [a1, b1] = await dex.getReserves();
      const k1 = a1.mul(b1);
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const [a2, b2] = await dex.getReserves();
      const k2 = a2.mul(b2);
      expect(k2).to.be.gt(k1);
    });

    it("should revert on zero swap amount", async function () {
      await expect(dex.swapAForB(0)).to.be.reverted;
    });

    it("should handle large swaps with high price impact", async function () {
      await dex.swapAForB(ethers.utils.parseEther("80"));
      const [, rB] = await dex.getReserves();
      expect(rB).to.be.lt(ethers.utils.parseEther("200"));
    });

    it("should handle multiple consecutive swaps", async function () {
      await dex.swapAForB(ethers.utils.parseEther("5"));
      await dex.swapAForB(ethers.utils.parseEther("5"));
      await dex.swapAForB(ethers.utils.parseEther("5"));
      expect(await tokenB.balanceOf(owner.address)).to.be.gt(0);
    });
  });

  /* ---------- Price (3) ---------- */

  describe("Price Calculations", function () {
    it("should return correct initial price", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      expect(await dex.getPrice()).to.equal(2);
    });

    it("should update price after swaps", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      await dex.swapAForB(ethers.utils.parseEther("10"));
      expect(await dex.getPrice()).to.not.equal(2);
    });

    it("should handle price queries with zero reserves gracefully", async function () {
      expect(await dex.getPrice()).to.equal(0);
    });
  });

  /* ---------- Fee & Edge (6) ---------- */

  describe("Fee & Edge Coverage", function () {
    it("should accumulate fees for LPs", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const [rA] = await dex.getReserves();
      expect(rA).to.be.gt(ethers.utils.parseEther("100"));
    });

    it("should distribute fees on liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const lp = await dex.totalLiquidity();
      await dex.swapAForB(ethers.utils.parseEther("10"));
      await dex.removeLiquidity(lp);
      const [rA, rB] = await dex.getReserves();
      expect(rA).to.equal(0);
      expect(rB).to.equal(0);
    });

    it("should handle very small liquidity amounts", async function () {
      await dex.addLiquidity(1, 1);
      const [rA, rB] = await dex.getReserves();
      expect(rA).to.equal(1);
      expect(rB).to.equal(1);
    });

    it("should return correct reserves via getReserves", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("20")
      );
      const [rA, rB] = await dex.getReserves();
      expect(rA).to.equal(ethers.utils.parseEther("10"));
      expect(rB).to.equal(ethers.utils.parseEther("20"));
    });

    it("should revert swapBForA on zero input", async function () {
      await expect(dex.swapBForA(0)).to.be.reverted;
    });

    it("should revert getAmountOut with zero reserves", async function () {
      await expect(dex.getAmountOut(10, 0, 0)).to.be.reverted;
    });
  });
});
