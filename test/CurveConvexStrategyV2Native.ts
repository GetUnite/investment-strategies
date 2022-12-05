import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { AbiCoder, defaultAbiCoder, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { CurveConvexStrategyV2, CurveConvexStrategyV2Native, ICvxBooster, IERC20Metadata, IExchange, IWrappedEther } from "../typechain";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("CurveConvexStrategyV2Native", function () {
    let strategy: CurveConvexStrategyV2Native;
    let signers: SignerWithAddress[];

    let usdc: IERC20Metadata, usdt: IERC20Metadata, frax: IERC20Metadata, crv: IERC20Metadata, cvx: IERC20Metadata, weth: IERC20Metadata;
    let cvxBooster: ICvxBooster;
    let exchange: IExchange;

    const ZERO_ADDR = ethers.constants.AddressZero;

    before(async () => {
        upgrades.silenceWarnings();
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 16095613,
                },
            },],
        });
        signers = await ethers.getSigners();

        usdc = await ethers.getContractAt("IERC20Metadata", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
        usdt = await ethers.getContractAt("IERC20Metadata", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        frax = await ethers.getContractAt('IERC20Metadata', '0x853d955acef822db058eb8505911ed77f175b99e');
        crv = await ethers.getContractAt("IERC20Metadata", "0xD533a949740bb3306d119CC777fa900bA034cd52");
        cvx = await ethers.getContractAt("IERC20Metadata", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
        weth = await ethers.getContractAt("IERC20Metadata", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
        cvxBooster = await ethers.getContractAt("contracts/interfaces/ICvxBooster.sol:ICvxBooster", "0xF403C135812408BFbE8713b5A23a04b3D48AAE31") as ICvxBooster;
        exchange = await ethers.getContractAt("contracts/interfaces/IExchange.sol:IExchange", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec") as IExchange

    });

    beforeEach(async () => {
        const Strategy = await ethers.getContractFactory("CurveConvexStrategyV2Native");
        const routerAddress = "0x24733D6EBdF1DA157d2A491149e316830443FC00"
        strategy = await upgrades.deployProxy(Strategy,
            [signers[0].address, ZERO_ADDR, ZERO_ADDR, routerAddress], {
            initializer: 'initialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"]
        }
        ) as CurveConvexStrategyV2Native
        let wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as IWrappedEther
        await wrappedEther.deposit({ value: ethers.utils.parseEther("100") })
    });

    it("Should check initial contract state", async () => {
        const cvxBooster = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
        const exchange = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
        const cvxRewards = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
        const crvRewards = "0xD533a949740bb3306d119CC777fa900bA034cd52";
        const adminRole = await strategy.DEFAULT_ADMIN_ROLE();

        expect(await strategy.CVX_BOOSTER()).to.be.equal(cvxBooster);
        expect(await strategy.EXCHANGE()).to.be.equal(exchange);
        expect(await strategy.CVX_REWARDS()).to.be.equal(cvxRewards);
        expect(await strategy.CRV_REWARDS()).to.be.equal(crvRewards);
        expect(await strategy.hasRole(adminRole, signers[0].address)).to.be.true;
    });



    it("Should check correct encoders/decoders", async () => {
        let uint256 = ethers.utils.toUtf8Bytes("uint256");
        let int128 = ethers.utils.toUtf8Bytes("int128");

        const curvePool = "0x0000000000000000000000000000000000000001";
        const poolToken = "0x0000000000000000000000000000000000000002";
        const poolSize = 2
        const tokenIndexInCurve = 4;
        const convexPoolId = 5;
        const lpToken = "0x0000000000000000000000000000000000000006"

        const entry = defaultAbiCoder.encode(
            ["address", "address ", "address", "uint8", "uint8", "uint256"],
            [curvePool, lpToken, poolToken, poolSize, tokenIndexInCurve, convexPoolId]
        )
        const exit = defaultAbiCoder.encode(
            ["address", "address", "address", "bytes", "uint8", "uint256"],
            [curvePool, poolToken, lpToken, int128, tokenIndexInCurve, convexPoolId]
        );

        expect(await strategy.encodeEntryParams(
            curvePool, lpToken, poolToken, poolSize, tokenIndexInCurve, convexPoolId
        )).to.be.equal(entry);

        expect(await strategy.encodeExitParams(
            curvePool, poolToken, lpToken, int128, tokenIndexInCurve, convexPoolId
        )).to.be.equal(exit);

        const entryStruct = await strategy.decodeEntryParams(entry);
        const exitStruct = await strategy.decodeExitParams(exit);

        expect(entryStruct[0]).to.be.equal(curvePool);
        expect(entryStruct[1]).to.be.equal(lpToken);
        expect(entryStruct[2]).to.be.equal(poolToken);
        expect(entryStruct[3]).to.be.equal(poolSize);
        expect(entryStruct[4]).to.be.equal(tokenIndexInCurve);
        expect(entryStruct[5]).to.be.equal(convexPoolId);

        expect(exitStruct[0]).to.be.equal(curvePool);
        expect(exitStruct[1]).to.be.equal(poolToken);
        expect(exitStruct[2]).to.be.equal(lpToken);
        expect(exitStruct[4]).to.be.equal(tokenIndexInCurve);
        expect(exitStruct[5]).to.be.equal(convexPoolId);

    });

    it("Should execute full investment", async () => {
        const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
        const poolToken: IERC20Metadata = weth;
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const convexPoolId = 25;
        const amount = parseUnits("100.0", 18);
        let int128 = ethers.utils.toUtf8Bytes("int128")

        const poolInfo = await cvxBooster.poolInfo(convexPoolId);
        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
        const rewardPool = await ethers.getContractAt("contracts/interfaces/ICvxBaseRewardPool.sol:ICvxBaseRewardPool", poolInfo.crvRewards)

        const entryData = await strategy.encodeEntryParams(
            curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);

        const investBefore = await rewardPool.balanceOf(strategy.address);
        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);
        const investAfter = await rewardPool.balanceOf(strategy.address);

        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(investAfter).to.be.gt(investBefore);
    });

    it("Should execute investment only for Curve", async () => {
        const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
        const poolToken: IERC20Metadata = weth;
        const poolSize = 2
        const tokenIndexInCurve = 0;
        const convexPoolId = ethers.constants.MaxUint256;
        const amount = parseUnits("100", 18);
        const lpToken = await ethers.getContractAt("IERC20Metadata", "0x06325440d014e39736583c165c2963ba99faf14e")
        const entryData = await strategy.encodeEntryParams(
            curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        const lpBalanceBefore = await lpToken.balanceOf(strategy.address);
        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);
        const lpBalanceAfter = await lpToken.balanceOf(strategy.address);

        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(lpBalanceAfter).to.be.gt(lpBalanceBefore);
    });

    it("Should unwind investment", async () => {
        const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
        const poolToken: IERC20Metadata = weth;
        const exitToken: IERC20Metadata = usdc;
        const poolSize = 2
        const tokenIndexInCurve = 0;
        const convexPoolId = 25;
        const amount = parseUnits("100", 18);
        const poolInfo = await cvxBooster.poolInfo(convexPoolId);
        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
        const rewardPool = await ethers.getContractAt("contracts/interfaces/ICvxBaseRewardPool.sol:ICvxBaseRewardPool", poolInfo.crvRewards)
        const int128 = ethers.utils.toUtf8Bytes("int128")

        const entryData = await strategy.encodeEntryParams(
            curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        const exitData = await strategy.encodeExitParams(
            curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, int128, tokenIndexInCurve, convexPoolId
        );

        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        const crvBefore = await crv.balanceOf(signers[0].address)
        const cvxBefore = await cvx.balanceOf(signers[0].address)

        const balanceBefore = await exitToken.balanceOf(signers[0].address);
        await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, false, false);
        const balanceAfter = await exitToken.balanceOf(signers[0].address);

        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await rewardPool.balanceOf(strategy.address)).to.be.equal(0);

        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(await crv.balanceOf(signers[0].address)).to.be.equal(crvBefore);
        expect(await cvx.balanceOf(signers[0].address)).to.be.equal(cvxBefore);
    })

    it("Should unwind investment without Convex", async () => {
        const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
        const poolToken: IERC20Metadata = weth;
        const exitToken: IERC20Metadata = usdc;
        const poolSize = 2
        const tokenIndexInCurve = 0;
        const convexPoolId = ethers.constants.MaxUint256;
        const amount = parseUnits("100", 18);
        const int128 = ethers.utils.toUtf8Bytes("int128")
        const lpToken = await ethers.getContractAt("IERC20Metadata", "0x06325440d014e39736583c165c2963ba99faf14e")

        const crvBefore = await crv.balanceOf(signers[0].address)
        const cvxBefore = await cvx.balanceOf(signers[0].address)

        const entryData = await strategy.encodeEntryParams(
            curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        const exitData = await strategy.encodeExitParams(
            curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, int128, tokenIndexInCurve, convexPoolId
        );

        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        const balanceBefore = await exitToken.balanceOf(signers[0].address);
        await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, false, false);
        const balanceAfter = await exitToken.balanceOf(signers[0].address);
        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);

        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(await crv.balanceOf(signers[0].address)).to.be.equal(crvBefore);
        expect(await cvx.balanceOf(signers[0].address)).to.be.equal(cvxBefore);
    })

    it("Should unwind investment (without rewards swap)", async () => {
        const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
        const poolToken: IERC20Metadata = weth;
        const exitToken: IERC20Metadata = usdc;
        const poolSize = 2
        const tokenIndexInCurve = 0;
        const convexPoolId = 25;
        const amount = parseUnits("100", 18);
        const poolInfo = await cvxBooster.poolInfo(convexPoolId);
        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
        const rewardPool = await ethers.getContractAt("contracts/interfaces/ICvxBaseRewardPool.sol:ICvxBaseRewardPool", poolInfo.crvRewards)
        const int128 = ethers.utils.toUtf8Bytes("int128")
        const entryData = await strategy.encodeEntryParams(
            curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        const exitData = await strategy.encodeExitParams(
            curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, int128, tokenIndexInCurve, convexPoolId
        );

        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        const cvxBalanceBefore = await cvx.balanceOf(signers[0].address);
        const crvBalanceBefore = await crv.balanceOf(signers[0].address);
        const balanceBefore = await exitToken.balanceOf(signers[0].address);
        await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, true, false);
        const balanceAfter = await exitToken.balanceOf(signers[0].address);
        const cvxBalanceAfter = await cvx.balanceOf(signers[0].address);
        const crvBalanceAfter = await crv.balanceOf(signers[0].address);

        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await rewardPool.balanceOf(strategy.address)).to.be.equal(0);

        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(crvBalanceAfter).to.be.gt(crvBalanceBefore);
        expect(cvxBalanceAfter).to.be.gt(cvxBalanceBefore);
    })

    it("Should only claim rewards", async () => {
        const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
        const poolToken: IERC20Metadata = weth;
        const exitToken: IERC20Metadata = usdc;
        const poolSize = 2
        const tokenIndexInCurve = 0;
        const convexPoolId = 25;
        const amount = parseUnits("100", 18);
        const poolInfo = await cvxBooster.poolInfo(convexPoolId);
        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
        const rewardPool = await ethers.getContractAt("contracts/interfaces/ICvxBaseRewardPool.sol:ICvxBaseRewardPool", poolInfo.crvRewards)
        const int128 = ethers.utils.toUtf8Bytes("int128")

        const entryData = await strategy.encodeEntryParams(
            curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        const exitData = await strategy.encodeRewardsParams(
            lpToken.address, convexPoolId, 0
        );

        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        const lpBalanceBefore = await rewardPool.balanceOf(strategy.address);
        const coinBalanceBefore = await exitToken.balanceOf(signers[0].address);
        await skipDays(5);
        await strategy.exitOnlyRewards(exitData, exitToken.address, signers[0].address, true);
        const lpBalanceAfter = await rewardPool.balanceOf(strategy.address);
        const coinBalanceAfter = await exitToken.balanceOf(signers[0].address);

        expect(lpBalanceBefore).to.not.be.equal(0);
        expect(lpBalanceBefore).to.be.equal(lpBalanceAfter);
        expect(coinBalanceAfter).to.be.gt(coinBalanceBefore);
    })


    it("Should execute mulicall", async () => {
        const token = weth;
        const amount = parseUnits("200.0", await token.decimals());
        const calldata1 = token.interface.encodeFunctionData("transfer", [signers[0].address, parseUnits("150.0", await token.decimals())]);
        const calldata2 = token.interface.encodeFunctionData("transfer", [signers[0].address, parseUnits("50.0", await token.decimals())]);

        const balanceBefore = await token.balanceOf(strategy.address);
        await token.transfer(strategy.address, amount);
        await strategy.multicall([token.address, token.address], [calldata1, calldata2]);
        const balanceAfter = await token.balanceOf(strategy.address);

        expect(balanceAfter).to.be.equal(balanceBefore);
    })
});