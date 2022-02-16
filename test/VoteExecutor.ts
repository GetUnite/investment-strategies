import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { before } from "mocha";
import { ICvxBaseRewardPool, IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, UniversalCurveConvexStrategy, UniversalCurveConvexStrategy__factory, VoteExecutor, VoteExecutor__factory } from "../typechain";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000"

describe("VoteExecutor", function () {
  let strategy: UniversalCurveConvexStrategy;
  let multisig: PseudoMultisigWallet;
  let executor: VoteExecutor;
  let dai: IERC20, curveFraxLp: IERC20, curve3CrvLp: IERC20, crv: IERC20, cvx: IERC20, usdc: IERC20, usdt: IERC20, frax: IERC20;
  let rewardPool: ICvxBaseRewardPool

  let signers: SignerWithAddress[];
  let investor: SignerWithAddress;
  let fraxHolder: SignerWithAddress;

  async function incrementNextBlockTimestamp(amount: number): Promise<void> {
    return ethers.provider.send("evm_increaseTime", [amount]);
  }

  async function showTokenSummary() {
    const fraxBalance = formatUnits(await frax.balanceOf(strategy.address), 18);
    const daiBalance = formatUnits(await dai.balanceOf(strategy.address), 18);
    const usdcBalance = formatUnits(await usdc.balanceOf(strategy.address), 6);
    const usdtBalance = formatUnits(await usdt.balanceOf(strategy.address), 6);
    const curveFraxLpBalance = formatUnits(await curveFraxLp.balanceOf(strategy.address), 18);
    const curve3CrvLpBalance = formatUnits(await curve3CrvLp.balanceOf(strategy.address), 18);
    const crvBalance = formatUnits(await crv.balanceOf(strategy.address), 18);
    const cvxBalance = formatUnits(await cvx.balanceOf(strategy.address), 18);

    const fraxBalanceExecutor = formatUnits(await frax.balanceOf(executor.address), 18);
    const daiBalanceExecutor = formatUnits(await dai.balanceOf(executor.address), 18);
    const usdcBalanceExecutor = formatUnits(await usdc.balanceOf(executor.address), 6);
    const usdtBalanceExecutor = formatUnits(await usdt.balanceOf(executor.address), 6);
    const curveFraxLpBalanceExecutor = formatUnits(await curveFraxLp.balanceOf(executor.address), 18);
    const curve3CrvLpBalanceExecutor = formatUnits(await curve3CrvLp.balanceOf(executor.address), 18);
    const crvBalanceExecutor = formatUnits(await crv.balanceOf(executor.address), 18);
    const cvxBalanceExecutor = formatUnits(await cvx.balanceOf(executor.address), 18);

    console.log("\nStrategy's tokens:");
    console.log("Frax:", fraxBalance);
    console.log("DAI:", daiBalance);
    console.log("USDC:", usdcBalance);
    console.log("USDT:", usdtBalance);
    console.log("curveFraxLp:", curveFraxLpBalance);
    console.log("curve3CrvLp:", curve3CrvLpBalance);
    console.log("CRV:", crvBalance);
    console.log("CVX:", cvxBalance, "\n");

    console.log("\nExecutor's tokens:");
    console.log("Frax:", fraxBalanceExecutor);
    console.log("DAI:", daiBalanceExecutor);
    console.log("USDC:", usdcBalanceExecutor);
    console.log("USDT:", usdtBalanceExecutor);
    console.log("curveFraxLp:", curveFraxLpBalanceExecutor);
    console.log("curve3CrvLp:", curve3CrvLpBalanceExecutor);
    console.log("CRV:", crvBalanceExecutor);
    console.log("CVX:", cvxBalanceExecutor, "\n");
  }

  async function sendApprove(_to: string) {
    let amount = parseEther("1000000")
    frax.connect(investor).approve(_to, amount)
    dai.connect(investor).approve(_to, amount)
    usdc.connect(investor).approve(_to, amount)
    usdt.connect(investor).approve(_to, amount)
    curveFraxLp.connect(investor).approve(_to, amount)
    curve3CrvLp.connect(investor).approve(_to, amount)
    crv.connect(investor).approve(_to, amount)
    cvx.connect(investor).approve(_to, amount)
    
    console.log("Approve done");

  }

  before(async () => {
    signers = await ethers.getSigners();

    //0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0
    const investorAddress = process.env.IMPERSONATE_ADDRESS as string;
    const fraxHolderAddress = "0x0d07E9D74c83945DCE735ABAAe7931d032A02392";

    await ethers.provider.send(
      'hardhat_impersonateAccount',
      [investorAddress]
    );
    await ethers.provider.send(
      'hardhat_impersonateAccount',
      [fraxHolderAddress]
    );
    investor = await ethers.getSigner(investorAddress);
    fraxHolder = await ethers.getSigner(fraxHolderAddress);
    dai = await ethers.getContractAt("IERC20", "0x6b175474e89094c44da98b954eedeac495271d0f");
    frax = await ethers.getContractAt('IERC20', '0x853d955acef822db058eb8505911ed77f175b99e');
    usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    usdt = await ethers.getContractAt("IERC20", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
    curveFraxLp = await ethers.getContractAt("IERC20", "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B");
    curve3CrvLp = await ethers.getContractAt("IERC20", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
    crv = await ethers.getContractAt("IERC20", "0xD533a949740bb3306d119CC777fa900bA034cd52");
    cvx = await ethers.getContractAt("IERC20", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
    rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", "0xB900EF131301B307dB5eFcbed9DBb50A3e209B2e");

    expect(await usdt.balanceOf(investor.address)).to.be.gt(0, "Investor has no DAI, or you are not forking Ethereum");
    expect(await frax.balanceOf(fraxHolder.address)).to.be.gt(0, "fraxHolder has no FRAX, or you are not forking Ethereum");

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

    const Executor = await ethers.getContractFactory("VoteExecutor") as VoteExecutor__factory;
    executor = await Executor.deploy(signers[0].address);

    await multisig.executeCall(
      strategy.address,
      strategy.interface.encodeFunctionData("grantRole", [
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        executor.address
      ])
    )
  });

  describe('Entries', function (){
    it("Simple entry", async function () {
      const stringAmount = "300000.0";
      const fraxAmmount = parseUnits(stringAmount, 18);
      const usdtAmount = parseUnits(stringAmount, 6);
      console.log("Will deposit", stringAmount, "FRAX");
      console.log("Stealing FRAX...");
      await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
      console.log("Will deposit", stringAmount, "USDT");
      console.log("Stealing USDT...");
      await usdt.connect(investor).transfer(executor.address, usdtAmount);
      await showTokenSummary();
  
      await executor.addStrategy(strategy.address)
      await executor.addExchange(investor.address)
      await sendApprove(executor.address)
      await executor.changeEntryTokenStatus(frax.address, true);
      await executor.changeEntryTokenStatus(usdt.address, true);
  
      //console.log(await executor.getTotalBalance())
      
      console.log("Starting execute votes.")
      let entries = [{ 
        weight: 50, 
        entryToken: frax.address, 
        curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        poolToken: frax.address,
        poolSize: 2,
        tokenIndexInCurve: 0,
        convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoold:32
    },
      { weight: 50, 
        entryToken: usdt.address, 
        curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
        poolToken: usdt.address,
        poolSize: 3,
        tokenIndexInCurve: 2,
        convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoold:1
    }]
      await executor.execute(entries)
      
      await showTokenSummary();
    });

    it("Entry with simple stable exchanges", async function () {
      const stringAmount = "500000.0";
      const fraxAmmount = parseUnits(stringAmount, 18);
      const usdtAmount = parseUnits(stringAmount, 6);
      console.log("Will deposit", stringAmount, "FRAX");
      console.log("Stealing FRAX...");
      await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
      await frax.connect(fraxHolder).transfer(investor.address, fraxAmmount);
      console.log("Will deposit", stringAmount, "USDT");
      console.log("Stealing USDT...");
      await usdt.connect(investor).transfer(executor.address, usdtAmount);
      await showTokenSummary();
  
      await executor.addStrategy(strategy.address)
      await executor.addExchange(investor.address)
      await sendApprove(executor.address)
      await executor.changeEntryTokenStatus(frax.address, true);
      await executor.changeEntryTokenStatus(usdt.address, true);
  
      //console.log(await executor.getTotalBalance())
      
      console.log("Starting execute votes.")
      let entries = [{ 
        weight: 70, 
        entryToken: frax.address, 
        curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        poolToken: frax.address,
        poolSize: 2,
        tokenIndexInCurve: 0,
        //convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoolAddress:ZERO_ADDR,
        convexPoold:32
    },
      { weight: 30, 
        entryToken: usdt.address, 
        curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
        poolToken: usdt.address,
        poolSize: 3,
        tokenIndexInCurve: 2,
        //convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoolAddress:ZERO_ADDR,
        convexPoold:1
    }]
      await executor.execute(entries)
      
      await showTokenSummary();
    });

    it("Entry with difficult stable exchanges", async function () {
      const stringAmount = "50000.0";
      const fraxAmmount = parseUnits(stringAmount, 18);
      const fraxExchangeAmmount = parseUnits("200000", 18);
      const usdtAmount = parseUnits(stringAmount, 6);
      const daiAmount = parseUnits(stringAmount, 18);
      console.log("Will deposit", stringAmount, "FRAX");
      console.log("Stealing FRAX...");
      await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
      await frax.connect(fraxHolder).transfer(investor.address, fraxExchangeAmmount);
      console.log("Will deposit", stringAmount, "USDT");
      console.log("Stealing USDT...");
      await usdt.connect(investor).transfer(executor.address, usdtAmount);
      console.log("Will deposit", stringAmount, "DAI");
      console.log("Stealing DAI...");
      await dai.connect(investor).transfer(executor.address, daiAmount);
      await showTokenSummary();
  
      await executor.addStrategy(strategy.address)
      await executor.addExchange(investor.address)
      await sendApprove(executor.address)
      await executor.changeEntryTokenStatus(frax.address, true);
      await executor.changeEntryTokenStatus(dai.address, true);
      await executor.changeEntryTokenStatus(usdt.address, true);
  
      //console.log(await executor.getTotalBalance())
      
      console.log("Starting execute votes.")
      let entries = [{ 
        weight: 80, 
        entryToken: frax.address, 
        curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        poolToken: frax.address,
        poolSize: 2,
        tokenIndexInCurve: 0,
        convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //convexPoolAddress:ZERO_ADDR,
        convexPoold:32
    },
      { weight: 20, 
        entryToken: dai.address, 
        curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
        poolToken: usdc.address,
        poolSize: 3,
        tokenIndexInCurve: 2,
        convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //convexPoolAddress:ZERO_ADDR,
        convexPoold:1
    }]
      await executor.execute(entries)
      
      await showTokenSummary();
    });
  });
 
});