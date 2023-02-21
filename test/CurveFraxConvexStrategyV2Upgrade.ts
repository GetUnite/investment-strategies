import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { defaultAbiCoder, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { CurveFraxConvexStrategyV2, CurveFraxConvexStrategyV1, IERC20Metadata, IExchange, IWrappedEther, IConvexStaking, IFraxFarmERC20, IPriceFeedRouterV2, ICurvePool } from "../typechain";

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
    let oldStrateImp: CurveFraxConvexStrategyV1;

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
                    blockNumber: 16481823,
                },
            },],
        });

        signers = await ethers.getSigners();
        signer = signers[0];

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

            const admin = await getImpersonatedSigner('0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3')
            const oldStrategy = await ethers.getContractAt("CurveFraxConvexStrategyV1", "0x723f499e8749ADD6dCdf02385Ad35B5B2FB9df98")
            await oldStrategy.connect(admin).grantRole(await oldStrategy.DEFAULT_ADMIN_ROLE(), signers[0].address)
            await oldStrategy.connect(admin).grantRole(await oldStrategy.UPGRADER_ROLE(), signers[0].address)
            await oldStrategy.connect(admin).changeUpgradeStatus(true);

            const newStrategy = await ethers.getContractFactory("CurveFraxConvexStrategyV2")
            const oldStrateImp = await ethers.getContractFactory("CurveFraxConvexStrategyV1")
            // const deployment = await upgrades.forceImport('0x723f499e8749ADD6dCdf02385Ad35B5B2FB9df98', oldStrateImp);
            strategy = await upgrades.upgradeProxy("0x723f499e8749ADD6dCdf02385Ad35B5B2FB9df98", newStrategy, { unsafeAllow: ["delegatecall"] }) as CurveFraxConvexStrategyV2;
            await strategy.deployed()


            priceFeed = await ethers.getContractAt("contracts/interfaces/IPriceFeedRouterV2.sol:IPriceFeedRouterV2", "0x24733D6EBdF1DA157d2A491149e316830443FC00") as IPriceFeedRouterV2;
            poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress); // usdc
            curvePoolContract = await ethers.getContractAt("ICurvePool", curvePool) as ICurvePool;
            crvPoolToken = await ethers.getContractAt("IERC20Metadata", await curvePoolContract.lp_token());
            stakingToken = await ethers.getContractAt("IConvexStaking", "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475");
            fraxPoolContract = await ethers.getContractAt("contracts/interfaces/IFraxFarmERC20.sol:IFraxFarmERC20", "0x963f487796d54d2f27bA6F3Fbe91154cA103b199") as IFraxFarmERC20;

        });

        it("Should loop investments 5 times", async () => {
            const poolToken = await ethers.getContractAt("IERC20Metadata", poolTokenAddress);
            const amount = parseUnits("1000", await poolToken.decimals());

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool, true, duration)
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(0);
            console.log('Length of stakes before any investment, should be one', await fraxPoolContract.lockedStakesOfLength(strategy.address))

            console.log('##----------Investing round 1-------------##\n')
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(1);
            await skipDays(0.5);

            console.log('##----------Investing round 2 (before the end of 1st)-------------##\n')
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(1);
            const balanceBefore = await poolToken.balanceOf(signer.address);
            const receiver = signer.address;
            await skipDays(10);
            expect(await stakingToken.balanceOf(strategy.address)).to.be.eq(0);

            console.log('##----------Exiting all after round 2-------------##\n')
            console.log('Length of stakes before exiting, should be one', await fraxPoolContract.lockedStakesOfLength(strategy.address))
            await strategy.exitAll(exitData, 10000, poolToken.address, receiver, false, false);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(1);
            expect(await poolToken.balanceOf(receiver)).to.be.gt(balanceBefore);

            console.log('##----------Investing round 3-------------##\n')
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(2);

            await skipDays(10);
            console.log('##----------Investing round 4 (after the end of 3rd, but lock additional)-------------##\n')
            await poolToken.connect(signer).transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(2);
            await skipDays(10)

            console.log('##----------Partial exit and lock remaining-------------##\n')
            await strategy.exitAll(exitData, 6000, poolToken.address, receiver, true, false);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(3);
            await skipDays(10)
            const balanceBeforeExit = await poolToken.balanceOf(signer.address);

            console.log('##----------Exiting all after round 4-------------##\n')
            await strategy.exitAll(exitData, 10000, poolToken.address, receiver, true, false);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(3);
            expect(await poolToken.balanceOf(receiver)).to.be.gt(balanceBeforeExit);

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
        const amount = parseEther("100");
        const lpToken = "0xf43211935c781d5ca1a41d2041f397b8a7366c7a";

        beforeEach(async () => {

            await resetNetwork();

            const admin = await getImpersonatedSigner('0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3')
            const oldStrategy = await ethers.getContractAt("CurveFraxConvexStrategyV1", "0x4d8dE98F908748b91801d74d3F784389107F51d7")
            await oldStrategy.connect(admin).grantRole(await oldStrategy.DEFAULT_ADMIN_ROLE(), signers[0].address)
            await oldStrategy.connect(admin).grantRole(await oldStrategy.UPGRADER_ROLE(), signers[0].address)
            await oldStrategy.connect(admin).changeUpgradeStatus(true);

            const newStrategy = await ethers.getContractFactory("CurveFraxConvexStrategyV2")
            const oldStrateImp = await ethers.getContractFactory("CurveFraxConvexStrategyV1")
            strategy = await upgrades.upgradeProxy("0x4d8dE98F908748b91801d74d3F784389107F51d7", newStrategy, { unsafeAllow: ["delegatecall"] }) as CurveFraxConvexStrategyV2;
            await strategy.deployed()

            fraxPoolContract = await ethers.getContractAt("contracts/interfaces/IFraxFarmERC20.sol:IFraxFarmERC20", fraxPool) as IFraxFarmERC20;
            priceFeed = await ethers.getContractAt("contracts/interfaces/IPriceFeedRouterV2.sol:IPriceFeedRouterV2", "0x24733D6EBdF1DA157d2A491149e316830443FC00") as IPriceFeedRouterV2;
            stakingToken = await ethers.getContractAt("IConvexStaking", "0x4659d5fF63A1E1EDD6D5DD9CC315e063c95947d0");

        });

        it("Should loop investments 5 times", async () => {

            const entryData = await strategy.encodeEntryParams(
                curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
            const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool, true, duration)

            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(2);
            console.log('Length of stakes before any investment, should be two', await fraxPoolContract.lockedStakesOfLength(strategy.address))
            console.log('Balance of staking token of the contract', await stakingToken.balanceOf(strategy.address))
            console.log('locked liquidity before investing', await fraxPoolContract.lockedLiquidityOf(strategy.address))

            console.log('\n##----------Investing round 1-------------##\n')
            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            console.log('locked liquidity after 1 investing', await fraxPoolContract.lockedLiquidityOf(strategy.address))
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(2);
            await skipDays(0.5);
            console.log(await fraxPoolContract.lockedStakesOf(strategy.address))

            console.log('##----------Investing round 2 (before the end of 1st)-------------##\n')
            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            console.log('locked liquidity after 2 investing', await fraxPoolContract.lockedLiquidityOf(strategy.address))
            console.log('new locked stakes after 2 invest', await fraxPoolContract.lockedStakesOf(strategy.address))
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(2);
            const receiver = strategy.address;
            const balanceBefore = await wrappedEther.balanceOf(receiver);

            await skipDays(10);
            expect(await stakingToken.balanceOf(strategy.address)).to.be.eq(0);

            console.log('##----------Exiting all after round 2-------------##\n')
            console.log('Length of stakes before exiting, should be one', await fraxPoolContract.lockedStakesOfLength(strategy.address))
            await strategy.exitAll(exitData, 10000, outputCoin, receiver, true, false);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(2);
            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.eq(0);
            expect(await wrappedEther.balanceOf(receiver)).to.be.gt(balanceBefore);

            console.log('##----------Investing round 3-------------##\n')
            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(3)
            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.gt(0);;
            await skipDays(10);

            console.log('##----------Investing round 4 (after the end of 3rd, but lock additional)-------------##\n')
            await wrappedEther.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(3);
            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.gt(0);
            await skipDays(10)

            console.log('##----------Partial exit and lock remaining-------------##\n')
            await strategy.exitAll(exitData, 6000, outputCoin, receiver, true, false);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(4);
            await skipDays(10)
            const balanceBeforeExit = await wrappedEther.balanceOf(receiver);
            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.gt(0);

            console.log('##----------Exiting all after round 4-------------##\n')
            await strategy.exitAll(exitData, 10000, outputCoin, receiver, true, false);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(4);
            expect(await wrappedEther.balanceOf(receiver)).to.be.gt(balanceBeforeExit);
            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.eq(0);
            console.log(await fraxPoolContract.lockedStakesOf(strategy.address))

        });

    });
});

