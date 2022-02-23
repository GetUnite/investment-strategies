import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { before } from "mocha";
import { ICvxBaseRewardPool, IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, UniversalCurveConvexStrategy, UniversalCurveConvexStrategy__factory } from "../typechain";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000"

describe("CurveConvexStrategy", function () {
  let strategy: UniversalCurveConvexStrategy;
  let multisig: PseudoMultisigWallet;
  let dai: IERC20, curveFraxLp: IERC20, curve3CrvLp: IERC20, crv: IERC20, cvx: IERC20, usdc: IERC20, usdt: IERC20, frax: IERC20;
  let rewardPool: ICvxBaseRewardPool

  let signers: SignerWithAddress[];
  let investor: SignerWithAddress;

  async function incrementNextBlockTimestamp(amount: number): Promise<void> {
    return ethers.provider.send("evm_increaseTime", [amount]);
  }

  async function showTokenSummary() {
    const daiBalance = formatUnits(await dai.balanceOf(strategy.address), 18);
    const usdcBalance = formatUnits(await usdc.balanceOf(strategy.address), 6);
    const usdtBalance = formatUnits(await usdt.balanceOf(strategy.address), 6);
    const curveFraxLpBalance = formatUnits(await curveFraxLp.balanceOf(strategy.address), 18);
    const curve3CrvLpBalance = formatUnits(await curve3CrvLp.balanceOf(strategy.address), 18);
    const crvBalance = formatUnits(await crv.balanceOf(strategy.address), 18);
    const cvxBalance = formatUnits(await cvx.balanceOf(strategy.address), 18);

    console.log("\nStrategy's tokens:");
    console.log("DAI:", daiBalance);
    console.log("USDC:", usdcBalance);
    console.log("USDT:", usdtBalance);
    console.log("curveFraxLp:", curveFraxLpBalance);
    console.log("curve3CrvLp:", curve3CrvLpBalance);
    console.log("CRV:", crvBalance);
    console.log("CVX:", cvxBalance, "\n");
  }

  before(async () => {
    signers = await ethers.getSigners();

    const investorAddress = process.env.IMPERSONATE_ADDRESS as string;

    await ethers.provider.send(
      'hardhat_impersonateAccount',
      [investorAddress]
    );
    investor = await ethers.getSigner(investorAddress);
    dai = await ethers.getContractAt("IERC20", "0x6b175474e89094c44da98b954eedeac495271d0f");
    usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    usdt = await ethers.getContractAt("IERC20", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
    curveFraxLp = await ethers.getContractAt("IERC20", "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B");
    curve3CrvLp = await ethers.getContractAt("IERC20", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
    crv = await ethers.getContractAt("IERC20", "0xD533a949740bb3306d119CC777fa900bA034cd52");
    cvx = await ethers.getContractAt("IERC20", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
    rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", "0xB900EF131301B307dB5eFcbed9DBb50A3e209B2e");
    frax = await ethers.getContractAt('IERC20', '0x853d955acef822db058eb8505911ed77f175b99e');

    expect(await dai.balanceOf(investor.address)).to.be.gt(0, "Investor has no DAI, or you are not forking Ethereum");

    await signers[0].sendTransaction({
      to: investor.address,
      value: parseEther("100.0")
    });
  })

  beforeEach(async () => {
    const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
    multisig = await Multisig.deploy();

    const Strategy = await ethers.getContractFactory("UniversalCurveConvexStrategy") as UniversalCurveConvexStrategy__factory;
    strategy = await Strategy.deploy(multisig.address);
  });

  it("Should execute whole process", async function () {
    const stringAmount = "3000000.0";
    const amount = parseUnits(stringAmount, 18);
    console.log("Will deposit", stringAmount, "DAI");
    console.log("Stealing DAI...");
    await dai.connect(investor).transfer(strategy.address, amount);
    await showTokenSummary();

    console.log("Putting DAI into Curve 3Crv pool...");
    await multisig.executeCall(
      strategy.address,
      strategy.interface.encodeFunctionData("deployToCurve", [
        [amount, 0, 0, 0],
        [dai.address, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR],
        3,
        "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7"
      ])
    )
    await showTokenSummary();

    const crvLpAmount = await curve3CrvLp.balanceOf(strategy.address);
    console.log("Putting 3Crv LPs into Curve frax pool...");
    await multisig.executeCall(
      strategy.address,
      strategy.interface.encodeFunctionData("deployToCurve", [
        [0, crvLpAmount, 0, 0],
        [ZERO_ADDR, curve3CrvLp.address, ZERO_ADDR, ZERO_ADDR],
        2,
        "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B"
      ])
    )
    await showTokenSummary();


    console.log("Putting LPs into Convex...");
    await multisig.executeCall(
      strategy.address,
      strategy.interface.encodeFunctionData("deployToConvex", [
        "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        32
      ])
    )
    await showTokenSummary();

    console.log("Time travelling 0.5 year ahead...")
    await incrementNextBlockTimestamp(31536000 / 2);

    console.log("Claiming rewards...");
    await multisig.executeCall(
      strategy.address,
      strategy.interface.encodeFunctionData("claimAll", [rewardPool.address])
    );
    await showTokenSummary();
    
    const withdrawAmount = await rewardPool.balanceOf(strategy.address);
    console.log("Convex says that strategy deposited", formatUnits(withdrawAmount, 18), "LP");
    console.log("Withdrawing LPs from convex...");
    await multisig.executeCall(
      strategy.address,
      strategy.interface.encodeFunctionData("withdraw", [rewardPool.address, withdrawAmount])
    );
    const afterWithdrawAmount = await rewardPool.balanceOf(strategy.address);
    console.log("After withdraw convex says that strategy deposited", formatUnits(afterWithdrawAmount, 18), "LP");

    await showTokenSummary();

    const fraxLpBurnAmount = await curveFraxLp.balanceOf(strategy.address);
    console.log("Getting back 3Crv LP tokens from frax pool...");
    await multisig.executeCall(
      strategy.address,
      strategy.interface.encodeFunctionData('exitOneCoin', [
        "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        1,
        fraxLpBurnAmount
      ])
    );
    await showTokenSummary();

    const crvLpBurnAmount = await curve3CrvLp.balanceOf(strategy.address);
    console.log("Getting back my crispy DAI...");
    await multisig.executeCall(
      strategy.address,
      strategy.interface.encodeFunctionData('exitOneCoin', [
        "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
        0,
        crvLpBurnAmount
      ])
    )
    await showTokenSummary();
  });
});
