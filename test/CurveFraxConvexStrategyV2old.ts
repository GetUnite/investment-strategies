import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";

import { expect } from "chai";
import { IConvexStaking, ILocking, IUSDC } from "../typechain";
import { CurveFraxConvexStrategyV2 } from "../typechain/CurveFraxConvexStrategyV2";

// import "../contracts/interfaces/ICurvePool.sol";

describe("CurveConvexStrategy", function () {

    let CurveFraxConvexStrategyV2;
    let strategy: CurveFraxConvexStrategyV2;

    let usdc: IUSDC;
    let locking: ILocking;
    let staking: IConvexStaking;

    // let exchange: IExchange;

    const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
    const LPTokenCurvePool = "0x3175df0976dfa876431c2e9ee6bc45b65d3473cc";
    const Staking = "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475";
    const Locking = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199";
    const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const EIGHT_DAYS_IN_SECODS = 60 * 60 * 24 * 8;

    const amountUSDC = ethers.utils.parseUnits("10", 6);

    async function investTimeTravel() {
        return ethers.provider.send("evm_increaseTime", []);
    }

    async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [address]
        );

        return await ethers.getSigner(address);
    }

    before(async () => {

        usdc = await ethers.getContractAt("IUSDC", usdcAddress);
        locking = await ethers.getContractAt("ILocking", Locking);
        staking = await ethers.getContractAt("IConvexStaking", Staking);

        const signer = await getImpersonatedSigner('0x2e91728aF3a54aCDCeD7938fE9016aE2cc5948C9');

        CurveFraxConvexStrategyV2 = await ethers.getContractFactory("CurveFraxConvexStrategyV2");
        strategy = await upgrades.deployProxy(CurveFraxConvexStrategyV2, [signer.address, signer.address, signer.address, signer.address], {
            unsafeAllow: ['delegatecall'], initializer: "initialize", kind: "uups",
        }) as CurveFraxConvexStrategyV2;

    });

    beforeEach(async () => {


    });

    it("Should invest", async () => {

        const signer = await getImpersonatedSigner('0x2e91728aF3a54aCDCeD7938fE9016aE2cc5948C9');

        const entryData = await strategy.encodeEntryParams(
            curvePool, LPTokenCurvePool, usdcAddress, 2, 1, Staking, Locking, EIGHT_DAYS_IN_SECODS
        )

        let signerUsdcBalanceBefore = await usdc.balanceOf(signer.address);
        let strategyUsdcBalanceBefore = await usdc.balanceOf(strategy.address);

        await usdc.connect(signer).transfer(strategy.address, amountUSDC);
        // const data = await strategy.callStatic.invest(entryData, amountUSDC);
        await strategy.invest(entryData, amountUSDC);

        let signerUsdcBalanceAfter = await usdc.balanceOf(signer.address);
        let strategyUsdcBalanceAfter = await usdc.balanceOf(strategy.address);

        expect(signerUsdcBalanceAfter).to.be.eq(signerUsdcBalanceBefore.sub(amountUSDC));
        expect(strategyUsdcBalanceAfter).to.be.eq(0);

    });

    it("Should exit", async () => {

        // after exiting should get: 
        // 1) USDC - pool token
        // 2) Staking token
        // 3) rewards token 

        const signer = await getImpersonatedSigner('0x2e91728aF3a54aCDCeD7938fE9016aE2cc5948C9');
        const entryData = await strategy.encodeEntryParams(
            curvePool, LPTokenCurvePool, usdcAddress, 2, 1, Staking, Locking, EIGHT_DAYS_IN_SECODS
        )

        let signerUsdcBalanceBefore = await usdc.balanceOf(signer.address);
        let strategyUsdcBalanceBefore = await usdc.balanceOf(strategy.address);
        // let strategyStakingTokenBalanceBefore = await locking.stakingToken()


        // check that before investing all rewards balances are zero
        let rewardTokens = await locking.getAllRewardTokens();
        for (let i = 0; i < rewardTokens.length; i++) {
            let rewardsToken = await ethers.getContractAt('IERC20', rewardTokens[i]);
            let balanceBefore = await rewardsToken.balanceOf(strategy.address);

            console.log('Balance of ', rewardsToken.address, ' before ivesting: ', balanceBefore);
        }

        await usdc.connect(signer).transfer(strategy.address, amountUSDC);
        // const data = await strategy.callStatic.invest(entryData, amountUSDC);
        await strategy.invest(entryData, amountUSDC);

        await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 9]);

        const balanceBeforeExit = await locking.lockedStakesOf(strategy.address);
        console.log(balanceBeforeExit);
        const exitData = await strategy.encodeExitParams(curvePool, usdcAddress, LPTokenCurvePool, 2, Locking);
        await strategy.exitAll(exitData, 10000, usdcAddress, signer.address, true, true);
        const balanceAfterExit = await locking.lockedStakesOf(strategy.address);
        console.log('balance after exit: ', balanceAfterExit);

        console.log('balance USCD of signer: ', await usdc.balanceOf(signer.address));
        expect(await usdc.balanceOf(signer.address)).to.be.eq(amountUSDC);

        // check that beafterfore investing all rewards balances are NOT zero
        for (let i = 0; i < rewardTokens.length; i++) {
            let rewardsToken = await ethers.getContractAt('IERC20', rewardTokens[i]);
            console.log('Balance of ', rewardsToken.address, ' after exiting: ', await rewardsToken.balanceOf(strategy.address));
        }

    });

    it("Should check initial contract state", async () => {
        const cvxBooster = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
        const exchange = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
        const cvxRewards = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
        const crvRewards = "0xD533a949740bb3306d119CC777fa900bA034cd52";
        const unwindDecimals = 2;
        // const adminRole = await strategy.DEFAULT_ADMIN_ROLE();

        // expect(await strategy.cvxBooster()).to.be.equal(cvxBooster);
        // expect(await strategy.exchange()).to.be.equal(exchange);
        // expect(await strategy.cvxRewards()).to.be.equal(cvxRewards);
        // expect(await strategy.crvRewards()).to.be.equal(crvRewards);
        // expect(await strategy.unwindDecimals()).to.be.equal(unwindDecimals);

        // expect(await strategy.hasRole(adminRole, signers[0].address)).to.be.true;
    });
});





// async function test() {

//     const signer = await getImpersonatedSigner('0x2e91728aF3a54aCDCeD7938fE9016aE2cc5948C9')

//     const amountUSDC = ethers.utils.parseUnits("10", 6);
//     console.log(amountUSDC);

//     const usdc = await ethers.getContractAt("IUSDC", usdcAddress);
//     await usdc.connect(signer).approve(CurvePool, amountUSDC);

//     const Pool = await ethers.getContractAt("ICurvePool", CurvePool);
//     await Pool.connect(signer).add_liquidity([0, amountUSDC.toNumber()], 0);

//     const Lptoken = await ethers.getContractAt("LPToken1", LPTokenCurvePool);
//     const LPbalance = await Lptoken.balanceOf(signer.address);

//     console.log(LPbalance);

//     await Lptoken.connect(signer).approve(Staking, LPbalance);

//     const staking = await ethers.getContractAt("IConvexStaking", Staking);
//     await staking.connect(signer).deposit(LPbalance, signer.address);
//     const stakingBalance = await staking.balanceOf(signer.address);

//     console.log(await staking.balanceOf(signer.address));

//     const locking = await ethers.getContractAt("ILocking", Locking);
//     await staking.connect(signer).approve(Locking, stakingBalance);
//     const kek_id1 = await locking.connect(signer).callStatic.stakeLocked(stakingBalance.div(2), 60 * 60 * 24 * 8);
//     await locking.connect(signer).stakeLocked(stakingBalance.div(2), 60 * 60 * 24 * 8);
//     const kek_id2 = await locking.connect(signer).callStatic.stakeLocked(stakingBalance.div(2), 60 * 60 * 24 * 8);
//     await locking.connect(signer).stakeLocked(stakingBalance.div(2), 60 * 60 * 24 * 8);

//     console.log(kek_id1, kek_id2);
//     console.log('locked staked of signer ', await locking.lockedStakesOf(signer.address));

//     ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 9]);

//     const liquidity = await locking.connect(signer).callStatic.withdrawLocked(kek_id1, signer.address);
//     console.log(liquidity);

// }

// async function main() {



// }

// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error);
//         process.exit(1);
//     });