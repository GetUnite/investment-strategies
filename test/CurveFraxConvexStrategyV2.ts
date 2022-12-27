import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { defaultAbiCoder, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { CurveFraxConvexStrategyV2, IERC20Metadata, IExchange, IWrappedEther, IConvexStaking, IFraxFarmERC20, IPriceFeedRouterV2, ICurvePool } from "../typechain";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );
    return await ethers.getSigner(address);
}


async function checkSpread(fact: BigNumber, expected: BigNumber, allowedSpread: number) {
    expect(fact).to.be.gte(expected.div(100).mul(100 - allowedSpread));
    expect(fact).to.be.lte(expected.div(100).mul(100 + allowedSpread));
};


describe("CurveFraxConvex Strategies", function () {
    let signers: SignerWithAddress[];
    let signer: SignerWithAddress;
    let usdc: IERC20Metadata, usdt: IERC20Metadata, crv: IERC20Metadata, cvx: IERC20Metadata, FXS: IERC20Metadata;
    let exchange: IExchange;
    let frax: IERC20Metadata;
    let wrappedEther: IWrappedEther;
    let strategy: CurveFraxConvexStrategyV2;
    let fraxPoolContract: IFraxFarmERC20;
    let priceFeed: IPriceFeedRouterV2;
    let curvePoolContract: ICurvePool;
    let crvPoolToken: IERC20Metadata;

    const ZERO_ADDR = ethers.constants.AddressZero;
    const EIGHT_DAYS_IN_SECONDS = 60 * 60 * 24 * 8;
    const duration = EIGHT_DAYS_IN_SECONDS;


    const cvxBooster = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
    const exchangeAddr = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
    const cvxRewards = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
    const crvRewards = "0xD533a949740bb3306d119CC777fa900bA034cd52";

    async function resetNetwork() {

        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 16169577,
                },
            },],
        });

        // ethers.Wallet.createRandom();
        signers = await ethers.getSigners();
        signer = signers[0];
        // console.log(signer.address);

        usdc = await ethers.getContractAt("IERC20Metadata", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
        usdt = await ethers.getContractAt("IERC20Metadata", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        frax = await ethers.getContractAt('IERC20Metadata', '0x853d955acef822db058eb8505911ed77f175b99e');
        crv = await ethers.getContractAt("IERC20Metadata", "0xD533a949740bb3306d119CC777fa900bA034cd52");
        cvx = await ethers.getContractAt("IERC20Metadata", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
        FXS = await ethers.getContractAt("IERC20Metadata", "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0");
        exchange = await ethers.getContractAt("contracts/interfaces/IExchange.sol:IExchange", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec") as IExchange
        wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as IWrappedEther;

        const value = parseEther("200.0");

        await exchange.exchange(
            ZERO_ADDR, frax.address, value, 0, { value: value }
        )
        await exchange.exchange(
            ZERO_ADDR, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", value, 0, { value: value }
        )
        await wrappedEther.deposit({ value: ethers.utils.parseEther("5000") })

    }

    before(async () => {

        upgrades.silenceWarnings();
        await resetNetwork();

    });

    describe("CurveFraxConvex Strategy V2", function () {
        let strategy: CurveFraxConvexStrategyV2;
        let stakingToken: IConvexStaking;
        let poolToken: IERC20Metadata;

        const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
        const fraxPool = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199";
        const poolSize = 2;
        const poolTokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        const lpToken = '0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC';
        const tokenIndexInCurve = 1;

        beforeEach(async () => {

            await resetNetwork();

            const Strategy = await ethers.getContractFactory("CurveFraxConvexStrategyV2");
            const routerAddress = "0x24733D6EBdF1DA157d2A491149e316830443FC00"
            strategy = await upgrades.deployProxy(Strategy,
                [signers[0].address, ZERO_ADDR, ZERO_ADDR, routerAddress], {
                initializer: 'initialize',
                kind: 'uups',
                unsafeAllow: ["delegatecall"]
            }
            ) as CurveFraxConvexStrategyV2

            priceFeed = await ethers.getContractAt("contracts/interfaces/IPriceFeedRouterV2.sol:IPriceFeedRouterV2", "0x24733D6EBdF1DA157d2A491149e316830443FC00") as IPriceFeedRouterV2;
            poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress); // usdc
            curvePoolContract = await ethers.getContractAt("ICurvePool", curvePool) as ICurvePool;
            crvPoolToken = await ethers.getContractAt("IERC20Metadata", await curvePoolContract.lp_token());
            stakingToken = await ethers.getContractAt("IConvexStaking", "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475");
            fraxPoolContract = await ethers.getContractAt("contracts/interfaces/IFraxFarmERC20.sol:IFraxFarmERC20", "0x963f487796d54d2f27bA6F3Fbe91154cA103b199") as IFraxFarmERC20;

        });

        it("Should check initial contract state", async () => {

            const adminRole = await strategy.DEFAULT_ADMIN_ROLE();

            expect(await strategy.CVX_BOOSTER()).to.be.equal(cvxBooster);
            expect(await strategy.EXCHANGE()).to.be.equal(exchangeAddr);
            expect(await strategy.CVX_REWARDS()).to.be.equal(cvxRewards);
            expect(await strategy.CRV_REWARDS()).to.be.equal(crvRewards);
            expect(await strategy.hasRole(adminRole, signers[0].address)).to.be.true;
        });

        it("Should check correct encoders/decoders", async () => {
            const curvePool = "0x0000000000000000000000000000000000000001";
            const poolToken = "0x0000000000000000000000000000000000000002";
            const poolSize = 2;
            const tokenIndexInCurve = 4;
            const fraxPool = "0x0000000000000000000000000000000000000007";
            const duration = "100";

            const entry = defaultAbiCoder.encode(
                ["address", "address", "uint8", "uint8", "address", "uint256"],
                [curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration]
            )
            const exit = defaultAbiCoder.encode(
                ["address", "address", "uint8", "address", "bool", "uint256"],
                [curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration]
            );

            expect(await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration
            )).to.be.equal(entry);

            expect(await strategy.encodeExitParams(
                curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration
            )).to.be.equal(exit);

            const entryStruct = await strategy.decodeEntryParams(entry);
            const exitStruct = await strategy.decodeExitParams(exit);

            expect(entryStruct[0]).to.be.equal(curvePool);
            expect(entryStruct[1]).to.be.equal(poolToken);
            expect(entryStruct[2]).to.be.equal(poolSize);
            expect(entryStruct[3]).to.be.equal(tokenIndexInCurve);
            expect(entryStruct[4]).to.be.equal(fraxPool);
            expect(entryStruct[5]).to.be.equal(duration);

            expect(exitStruct[0]).to.be.equal(curvePool);
            expect(exitStruct[1]).to.be.equal(poolToken);
            expect(exitStruct[2]).to.be.equal(tokenIndexInCurve);
            expect(exitStruct[3]).to.be.equal(fraxPool);
            expect(exitStruct[4]).to.be.true;
            expect(exitStruct[5]).to.be.equal(duration);

        });

        it("Should invest twice and exit", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("1000", await poolToken.decimals());

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool, true, duration)

            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            const balanceBefore = await poolToken.balanceOf(signer.address);

            const receiver = signer.address;
            await skipDays(10);
            await strategy.exitAll(exitData, 10000, poolToken.address, receiver, true, false);

            const totalInvestAmount = amount.mul(2);
            const expectedBalance = balanceBefore.add(totalInvestAmount);
            const balanceAfter = await poolToken.balanceOf(signer.address);

            await checkSpread(balanceAfter, expectedBalance, 5);
        });

        it("Should lock for longer", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("1000", await poolToken.decimals());

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool, true, duration)

            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            const balanceBefore = await poolToken.balanceOf(signer.address);

            const receiver = signer.address;
            await skipDays(10);

            const blockInfo = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
            const newEndingTs = blockInfo.timestamp + (60 * 60 * 24 * 8);
            await strategy.investLonger(fraxPool, newEndingTs);
            await skipDays(9);
            await strategy.exitAll(exitData, 10000, poolToken.address, receiver, true, false);

        });

        it("Should revert locking for longer before entering the strategy", async () => {
            const blockInfo = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
            const newEndingTs = blockInfo.timestamp + (60 * 60 * 24 * 8);
            const tx = strategy.investLonger(fraxPool, newEndingTs);
            expect(tx).to.be.revertedWith("CurveFraxConvexStrategyV2: !invested");
        });

        it("Should try to exit before the end of locking period", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("1000", await poolToken.decimals());

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool, true, duration)

            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            const tx = strategy.exitAll(exitData, 10000, poolToken.address, strategy.address, true, false);

            expect(tx).to.be.revertedWith("Stake is still locked!");

        });

        it("Should exit and send rewards to the signer without swapping", async () => {

            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("1000", await poolToken.decimals());
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool, true, duration);
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            await strategy.exitAll(exitData, 10000, poolToken.address, receiver, true, false);

            const lockedStakes = await fraxPoolContract.lockedStakesOf(strategy.address);
            console.log(lockedStakes);

            expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);

        });

        it("Should exit without swapping or sending rewards to the signer", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("10", await poolToken.decimals());
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool, true, duration)
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            await strategy.exitAll(exitData, 10000, poolToken.address, receiver, false, false);

            expect(await FXS.balanceOf(receiver)).to.be.eq(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.eq(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.eq(cvxBefore);

        });

        it("Should exit and send rewards to the signer after swapping", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("10", await poolToken.decimals());
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool, true, duration)
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            await strategy.exitAll(exitData, 10000, poolToken.address, receiver, false, true);
            const usdcBefore = await poolToken.balanceOf(receiver);
            await strategy.exitOnlyRewards(exitData, poolToken.address, receiver, true);

            expect(await FXS.balanceOf(receiver)).to.be.eq(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.eq(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.eq(cvxBefore);
            expect(await usdc.balanceOf(strategy.address)).to.be.eq(0);

            const usdcAfter = await poolToken.balanceOf(receiver);
            expect(usdcAfter).to.be.gt(usdcBefore);

        });

        it("Should only exit rewards without swaping", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("10", await poolToken.decimals());
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool, true, duration)
            const poolTokenBefore = await poolToken.balanceOf(receiver);
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            await strategy.exitOnlyRewards(exitData, poolToken.address, receiver, false);

            const poolTokenAfter = await poolToken.balanceOf(receiver);

            expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);
            expect(poolTokenBefore).to.be.gt(poolTokenAfter);

        });

        it("Should return LP position in fiat", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("10", await poolToken.decimals());

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const request = await strategy.callStatic.getDeployedAmount(exitRewardData);
            // console.log(`amount deposited is ${ethers.utils.formatUnits(amount, 6)}, deployed amount is shown is ${ethers.utils.formatEther(request)}`);

            const deltaDecimals = 18 - (await poolToken.decimals());
            expect(checkSpread(request, ethers.utils.parseUnits(amount.toString(), deltaDecimals), 5));

        });

        it("Should return LP position in fiat and claim rewards", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("10", await poolToken.decimals());
            const deltaDecimals = 18 - (await poolToken.decimals());

            const receiver = strategy.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(30);

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            const request = await strategy.callStatic.getDeployedAmountAndRewards(exitRewardData);
            await strategy.getDeployedAmountAndRewards(exitRewardData);
            expect(checkSpread(request, ethers.utils.parseUnits(amount.toString(), deltaDecimals), 5));

            expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);

        });

        it("Should add additional rewards token", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("10", await poolToken.decimals());

            const receiver = signer.address;
            const newRewardToken = wrappedEther.address;

            await wrappedEther.deposit({ value: ethers.utils.parseEther("50") })

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);

            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            await strategy.changeAdditionalRewardTokenStatus(newRewardToken, true);
            const balanceBefore = await wrappedEther.balanceOf(receiver);
            await wrappedEther.transfer(strategy.address, parseEther("50"));
            await strategy.getDeployedAmountAndRewards(exitRewardData);
            await strategy.withdrawRewards(newRewardToken);
            const balanceAfter = await wrappedEther.balanceOf(receiver);

            expect(balanceAfter).to.be.gt(balanceBefore);

        });

        it("Should remove additional reward token", async () => {

            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("10", await poolToken.decimals());

            const receiver = signer.address;
            const newRewardToken = wrappedEther.address;

            await wrappedEther.deposit({ value: ethers.utils.parseEther("50") })

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            await strategy.changeAdditionalRewardTokenStatus(newRewardToken, true);
            await wrappedEther.transfer(strategy.address, parseEther("50"));
            const balanceBefore = await wrappedEther.balanceOf(strategy.address);
            await strategy.changeAdditionalRewardTokenStatus(newRewardToken, false);
            await strategy.getDeployedAmountAndRewards(exitRewardData);
            await strategy.withdrawRewards(poolToken.address);
            const balanceAfter = await wrappedEther.balanceOf(strategy.address);

            expect(balanceAfter).to.be.eq(balanceBefore);

        });

        it("Should add additional reward token and send rewards without swapping", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("10", await poolToken.decimals());

            const receiver = signer.address;
            const newRewardToken = wrappedEther.address;

            await wrappedEther.deposit({ value: ethers.utils.parseEther("50") })

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool, true, duration)

            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            await strategy.changeAdditionalRewardTokenStatus(newRewardToken, true);
            const balanceBefore = await wrappedEther.balanceOf(receiver);
            await wrappedEther.transfer(strategy.address, parseEther("50"));

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            await strategy.exitOnlyRewards(exitData, poolToken.address, receiver, false);
            const balanceAfter = await wrappedEther.balanceOf(receiver);

            expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);
            expect(balanceAfter).to.be.eq(balanceBefore);

        });

        // TODO: if there are curve LP tokens on the contract, or wrapped lp tokens, we should only invest the amount specified in the params

        it("Should invest exactly the amount passed in the params, regardless of previous contract balance", async () => {

            const amount = parseUnits("1000", await poolToken.decimals());

            await poolToken.approve(curvePoolContract.address, amount);
            await curvePoolContract.add_liquidity([0, amount], 0);
            await crvPoolToken.transfer(strategy.address, amount.div(2)); // contract has some curve LP tokens
            await crvPoolToken.approve(stakingToken.address, amount.div(2));
            await stakingToken.deposit(amount.div(2), strategy.address); // contract has some wrapped LP tokens

            expect(await crvPoolToken.balanceOf(strategy.address)).to.be.eq(amount.div(2));
            expect(await stakingToken.balanceOf(strategy.address)).to.be.eq(amount.div(2));

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);

            await poolToken.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);

            expect(await crvPoolToken.balanceOf(strategy.address)).to.be.eq(amount.div(2));
            expect(await stakingToken.balanceOf(strategy.address)).to.be.eq(amount.div(2));


        });

        it("Should revert upgrading", async () => {

            const strategyV2 = await ethers.getContractFactory("CurveFraxConvexStrategyV2");
            const tx = upgrades.upgradeProxy(strategy.address, strategyV2, { unsafeAllow: ["delegatecall"] });
            await expect(tx).to.be.reverted;
        });

        it("Should upgrade", async () => {

            const strategyV2 = await ethers.getContractFactory("CurveFraxConvexStrategyV2");

            await strategy.changeUpgradeStatus(true);
            const tx1 = await strategy.upgradeStatus();
            expect(tx1).to.be.true;
            await upgrades.upgradeProxy(strategy.address, strategyV2, { unsafeAllow: ["delegatecall"] });
        });


    });


    describe("CurveFraxConvex Strategy Native ETH V2", function () {
        let stakingToken: IConvexStaking;
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const lpToken = "0xf43211935c781d5ca1a41d2041f397b8a7366c7a";

        beforeEach(async () => {

            await resetNetwork();

            const Strategy = await ethers.getContractFactory("CurveFraxConvexStrategyV2");
            const routerAddress = "0x24733D6EBdF1DA157d2A491149e316830443FC00"
            strategy = await upgrades.deployProxy(Strategy,
                [signers[0].address, ZERO_ADDR, ZERO_ADDR, routerAddress], {
                initializer: 'initialize',
                kind: 'uups',
                unsafeAllow: ["delegatecall"]
            }
            ) as CurveFraxConvexStrategyV2

            fraxPoolContract = await ethers.getContractAt("contracts/interfaces/IFraxFarmERC20.sol:IFraxFarmERC20", "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA") as IFraxFarmERC20;
            priceFeed = await ethers.getContractAt("contracts/interfaces/IPriceFeedRouterV2.sol:IPriceFeedRouterV2", "0x24733D6EBdF1DA157d2A491149e316830443FC00") as IPriceFeedRouterV2;
            stakingToken = await ethers.getContractAt("IConvexStaking", "0x4659d5fF63A1E1EDD6D5DD9CC315e063c95947d0");

        });

        it("Should check initial contract state", async () => {

            const adminRole = await strategy.DEFAULT_ADMIN_ROLE();

            expect(await strategy.CVX_BOOSTER()).to.be.equal(cvxBooster);
            expect(await strategy.EXCHANGE()).to.be.equal(exchangeAddr);
            expect(await strategy.CVX_REWARDS()).to.be.equal(cvxRewards);
            expect(await strategy.CRV_REWARDS()).to.be.equal(crvRewards);
            expect(await strategy.hasRole(adminRole, signers[0].address)).to.be.true;
        });

        it("Should check correct encoders/decoders", async () => {
            const curvePool = "0x0000000000000000000000000000000000000001";
            const poolToken = "0x0000000000000000000000000000000000000002";
            const poolSize = 2;
            const tokenIndexInCurve = 4;
            const fraxPool = "0x0000000000000000000000000000000000000007";
            const duration = "100";

            const entry = defaultAbiCoder.encode(
                ["address", "address", "uint8", "uint8", "address", "uint256"],
                [curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration]
            )
            const exit = defaultAbiCoder.encode(
                ["address", "address", "uint8", "address", "bool", "uint256"],
                [curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration]
            );

            expect(await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration
            )).to.be.equal(entry);

            expect(await strategy.encodeExitParams(
                curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration
            )).to.be.equal(exit);

            const entryStruct = await strategy.decodeEntryParams(entry);
            const exitStruct = await strategy.decodeExitParams(exit);

            expect(entryStruct[0]).to.be.equal(curvePool);
            expect(entryStruct[1]).to.be.equal(poolToken);
            expect(entryStruct[2]).to.be.equal(poolSize);
            expect(entryStruct[3]).to.be.equal(tokenIndexInCurve);
            expect(entryStruct[4]).to.be.equal(fraxPool);
            expect(entryStruct[5]).to.be.equal(duration);

            expect(exitStruct[0]).to.be.equal(curvePool);
            expect(exitStruct[1]).to.be.equal(poolToken);
            expect(exitStruct[2]).to.be.equal(tokenIndexInCurve);
            expect(exitStruct[3]).to.be.equal(fraxPool);

        });

        it("Should invest twice and exit", async () => {
            const receiver = signer.address;
            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration)

            const balanceBefore = await wrappedEther.balanceOf(signer.address);
            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);

            await skipDays(10);
            await strategy.exitAll(exitData, 10000, outputCoin, receiver, true, false);
            const balanceAfter = await wrappedEther.balanceOf(signer.address);
            await checkSpread(balanceBefore, balanceAfter, 5);

        });

        it("Should exit and send to the signer without swapping", async () => {
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration)

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            await strategy.exitAll(exitData, 10000, outputCoin, receiver, true, false);

            // expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);

        });

        it("Should exit without swapping or sending rewards to the signer", async () => {
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration)

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);


            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            await strategy.exitAll(exitData, 10000, outputCoin, receiver, false, false);

            expect(await FXS.balanceOf(receiver)).to.be.eq(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.eq(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.eq(cvxBefore);

        });

        it("Should exit and send rewards to the signer after swapping", async () => {
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration)

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const balanceBefore = await wrappedEther.balanceOf(receiver);
            await strategy.exitAll(exitData, 10000, outputCoin, receiver, true, true);
            const balanceAfter = await wrappedEther.balanceOf(receiver);
            expect(balanceAfter).to.be.gt(balanceBefore);

        });

        it("Should exit only 60% and lock remaining LP tokens for longer", async () => {
            const receiver = signer.address;
            const lpToken = "0xf43211935C781D5ca1a41d2041F397B8A7366C7A";

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration);
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount); // 1000 eth
            await skipDays(10);

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            await strategy.exitAll(exitData, 6000, outputCoin, receiver, true, false);
            const newPosition = await fraxPoolContract.lockedLiquidityOf(strategy.address);

            const lockedStakes = await fraxPoolContract.lockedStakesOf(strategy.address);
            console.log(lockedStakes);

            expect(newPosition).to.be.gt(0);
            expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);

            const remaining = ethers.utils.parseEther("400");
            const request = await strategy.callStatic.getDeployedAmount(exitRewardData);

            const [fiatPrice, fiatDecimals] = await priceFeed["getPriceOfAmount(address,uint256,uint256)"](wrappedEther.address, remaining, 0);
            const amountUSDC = await priceFeed.decimalsConverter(
                fiatPrice,
                fiatDecimals,
                18
            );

            expect(checkSpread(request, amountUSDC, 5));

        });

        it("Should exit only 60% without locking remaining LP tokens for longer", async () => {
            const receiver = signer.address;
            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, false, duration);

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount); // 1000 eth
            await skipDays(10);

            await strategy.exitAll(exitData, 6000, outputCoin, receiver, true, false);
            const newPosition = await fraxPoolContract.lockedLiquidityOf(strategy.address);

            expect(newPosition).to.be.eq(0);
            expect(await stakingToken.balanceOf(strategy.address)).to.be.gt(0);

        });

        it("Should lock any remaining wrapped LP tokens into Frax pool", async () => {
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, false, duration);

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount); // 1000 eth
            await skipDays(10);

            await strategy.exitAll(exitData, 6000, outputCoin, receiver, true, false);
            await strategy.lockInFraxPool(fraxPool, await stakingToken.balanceOf(strategy.address), duration);

            const newPosition = await fraxPoolContract.lockedLiquidityOf(strategy.address);
            expect(newPosition).to.be.gt(0);

        });

        it("Should only exit rewards without swaping", async () => {
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration)

            const balanceBefore = await wrappedEther.balanceOf(signer.address);
            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            await strategy.exitOnlyRewards(exitData, outputCoin, receiver, false);

            expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);

        });

        it("Should return LP position in fiat", async () => {

            const lpToken = "0xf43211935c781d5ca1a41d2041f397b8a7366c7a";
            const [fiatPrice, fiatDecimals] = await priceFeed["getPriceOfAmount(address,uint256,uint256)"](wrappedEther.address, amount, 0);
            const amountUSDC = await priceFeed.decimalsConverter(
                fiatPrice,
                fiatDecimals,
                18
            );

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const request = await strategy.callStatic.getDeployedAmount(exitRewardData);
            expect(checkSpread(request, amountUSDC, 5));

        });

        it("Should return LP position in fiat and claim rewards", async () => {
            const receiver = strategy.address;
            const [fiatPrice, fiatDecimals] = await priceFeed["getPriceOfAmount(address,uint256,uint256)"](wrappedEther.address, amount, 0);
            const amountUSDC = await priceFeed.decimalsConverter(
                fiatPrice,
                fiatDecimals,
                18
            );

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            const fxsBefore = await FXS.balanceOf(receiver);
            const crvBefore = await crv.balanceOf(receiver);
            const cvxBefore = await cvx.balanceOf(receiver);

            const request = await strategy.callStatic.getDeployedAmountAndRewards(exitRewardData);
            await strategy.getDeployedAmountAndRewards(exitRewardData);
            expect(checkSpread(request, amountUSDC, 5));

            expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
            expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
            expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);

        });

        it("Should withdraw rewards", async () => {
            const receiver = signer.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration)
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            await strategy.getDeployedAmountAndRewards(exitRewardData);
            await strategy.exitAll(exitData, 10000, outputCoin, receiver, false, false);

            expect(await FXS.balanceOf(strategy.address)).to.be.gt(0);
            expect(await crv.balanceOf(strategy.address)).to.be.gt(0);
            expect(await cvx.balanceOf(strategy.address)).to.be.gt(0);

            const balanceBefore = await wrappedEther.balanceOf(receiver);
            await strategy.withdrawRewards(outputCoin);
            expect(await wrappedEther.balanceOf(receiver)).to.be.gt(balanceBefore);


        });

        it("Should add an additional reward token", async () => {
            const receiver = signer.address;
            const newRewardToken = wrappedEther.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration)

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            await strategy.changeAdditionalRewardTokenStatus(newRewardToken, true);
            await wrappedEther.transfer(strategy.address, amount);
            const balanceBefore = await wrappedEther.balanceOf(receiver);
            await strategy.getDeployedAmountAndRewards(exitRewardData);
            await strategy.withdrawRewards(outputCoin);
            const balanceAfter = await wrappedEther.balanceOf(receiver);

            expect(checkSpread(balanceAfter, balanceBefore.add(amount), 5));

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);
            await strategy.exitAll(exitData, 10000, outputCoin, receiver, true, false);

            expect(checkSpread(await wrappedEther.balanceOf(receiver), balanceAfter, 5));

        });

        it("Should remove additional reward token", async () => {
            const duration = EIGHT_DAYS_IN_SECONDS;
            const receiver = signer.address;
            const newRewardToken = wrappedEther.address;

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);

            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            await skipDays(10);

            await strategy.changeAdditionalRewardTokenStatus(newRewardToken, true);
            await wrappedEther.transfer(strategy.address, amount);
            await strategy.changeAdditionalRewardTokenStatus(newRewardToken, false);

            const balanceBefore = await wrappedEther.balanceOf(receiver);
            await strategy.getDeployedAmountAndRewards(exitRewardData);
            await strategy.withdrawRewards(usdc.address);
            const balanceAfter = await wrappedEther.balanceOf(receiver);

            expect(balanceAfter).to.be.eq(balanceBefore);

        });
    });

});

