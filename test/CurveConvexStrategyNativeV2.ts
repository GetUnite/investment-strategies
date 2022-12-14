import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { sign } from "crypto";
import { BigNumber } from "ethers";
import { AbiCoder, defaultAbiCoder, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { CurveConvexStrategyNativeV2, ICvxBooster, IERC20Metadata, IExchange, IWrappedEther, IConvexStaking, ILocking } from "../typechain";
import { IWrappedEtherInterface } from "../typechain/IWrappedEther";

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


describe("CurveConvexStrategyNativeV2", function () {
    let strategy: CurveConvexStrategyNativeV2;
    let signers: SignerWithAddress[];
    let signer: SignerWithAddress;

    let usdc: IERC20Metadata, usdt: IERC20Metadata, crv: IERC20Metadata, cvx: IERC20Metadata, FXS: IERC20Metadata, weth: IWrappedEther, poolRewards: IERC20Metadata;
    let cvxBooster: ICvxBooster;
    let exchange: IExchange;
    let frax: IERC20Metadata;
    let FraxPool: ILocking;
    let stakingToken: IConvexStaking;

    const ZERO_ADDR = ethers.constants.AddressZero;
    const EIGHT_DAYS_IN_SECONDS = 60 * 60 * 24 * 8;

    const addressToImpersonate = "0x2e91728aF3a54aCDCeD7938fE9016aE2cc5948C9";

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

        signers = await ethers.getSigners();
        signer = signers[0]

        usdc = await ethers.getContractAt("IERC20Metadata", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
        usdt = await ethers.getContractAt("IERC20Metadata", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        frax = await ethers.getContractAt('IERC20Metadata', '0x853d955acef822db058eb8505911ed77f175b99e');
        FraxPool = await ethers.getContractAt('ILocking', '0x963f487796d54d2f27bA6F3Fbe91154cA103b199');
        crv = await ethers.getContractAt("IERC20Metadata", "0xD533a949740bb3306d119CC777fa900bA034cd52");
        cvx = await ethers.getContractAt("IERC20Metadata", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
        FXS = await ethers.getContractAt("IERC20Metadata", "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0");
        poolRewards = await ethers.getContractAt("IERC20Metadata", "0x7e880867363A7e321f5d260Cade2B0Bb2F717B02");
        cvxBooster = await ethers.getContractAt("contracts/interfaces/ICvxBooster.sol:ICvxBooster", "0xF403C135812408BFbE8713b5A23a04b3D48AAE31") as ICvxBooster;
        exchange = await ethers.getContractAt("contracts/interfaces/IExchange.sol:IExchange", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec") as IExchange
        stakingToken = await ethers.getContractAt("IConvexStaking", "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475");

        const value = parseEther("200.0");

        await exchange.exchange(
            ZERO_ADDR, frax.address, value, 0, { value: value }
        )
        await exchange.exchange(
            ZERO_ADDR, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", value, 0, { value: value }
        )
        let wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as IWrappedEther
        await wrappedEther.deposit({ value: ethers.utils.parseEther("5000") })

    }

    before(async () => {

        upgrades.silenceWarnings();
        await resetNetwork();

    });

    beforeEach(async () => {

        await resetNetwork();

        const Strategy = await ethers.getContractFactory("CurveConvexStrategyNativeV2");
        const routerAddress = "0x24733D6EBdF1DA157d2A491149e316830443FC00"
        strategy = await upgrades.deployProxy(Strategy,
            [signers[0].address, ZERO_ADDR, ZERO_ADDR, routerAddress], {
            initializer: 'initialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"]
        }
        ) as CurveConvexStrategyNativeV2

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
        const poolSize = 2;
        const tokenIndexInCurve = 4;
        const fraxPool = "0x0000000000000000000000000000000000000007";
        const duration = "100";

        const entry = defaultAbiCoder.encode(
            ["address", "address", "uint8", "uint8", "address", "uint256"],
            [curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration]
        )
        const exit = defaultAbiCoder.encode(
            ["address", "address", "uint8", "address"],
            [curvePool, poolToken, tokenIndexInCurve, fraxPool]
        );

        expect(await strategy.encodeEntryParams(
            curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration
        )).to.be.equal(entry);

        expect(await strategy.encodeExitParams(
            curvePool, poolToken, tokenIndexInCurve, fraxPool
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

    it("Should repeat investment and exit", async () => {
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = signer.address;

        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool)

        const balanceBefore = await wrappedEther.balanceOf(signer.address);
        await wrappedEther.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        await wrappedEther.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        await skipDays(10);
        await strategy.exitAll(exitData, 10000, outputCoin, receiver, true, false);
        const balanceAfter = await wrappedEther.balanceOf(signer.address);
        // console.log(balanceBefore, balanceAfter);
        await checkSpread(balanceBefore, balanceAfter, 5);

    });

    it("Should exit and send to the signer without swapping", async () => {

        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = signer.address;

        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool)

        await wrappedEther.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);
        await skipDays(10);

        const fxsBefore = await FXS.balanceOf(receiver);
        const crvBefore = await crv.balanceOf(receiver);
        const cvxBefore = await cvx.balanceOf(receiver);

        await strategy.exitAll(exitData, 10000, outputCoin, receiver, true, false);

        expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
        expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
        expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);

    });

    it("Should exit without swapping or sending rewards to the signer", async () => {
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = signer.address;

        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool)

        await wrappedEther.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);
        await skipDays(10);

        const fxsBefore = await FXS.balanceOf(strategy.address);
        const crvBefore = await crv.balanceOf(strategy.address);
        const cvxBefore = await cvx.balanceOf(strategy.address);

        await strategy.exitAll(exitData, 10000, outputCoin, receiver, false, false);

        expect(await FXS.balanceOf(receiver)).to.be.eq(0);
        expect(await crv.balanceOf(receiver)).to.be.eq(0);
        expect(await cvx.balanceOf(receiver)).to.be.eq(0);

        expect(await FXS.balanceOf(strategy.address)).to.be.gt(fxsBefore);
        expect(await crv.balanceOf(strategy.address)).to.be.gt(crvBefore);
        expect(await cvx.balanceOf(strategy.address)).to.be.gt(cvxBefore);

    });

    it("Should exit and send rewards to the signer after swapping", async () => {
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = usdc.address;
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = signer.address;

        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool)

        await wrappedEther.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);
        await skipDays(10);

        const balanceBefore = await usdc.balanceOf(receiver);
        await strategy.exitAll(exitData, 10000, outputCoin, receiver, true, true);
        const balanceAfter = await usdc.balanceOf(receiver);

        expect(balanceAfter).to.be.gt(balanceBefore);

    });

    it("Should only exit rewards without swaping", async () => {
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = signer.address;

        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool)

        const balanceBefore = await wrappedEther.balanceOf(signer.address);
        await wrappedEther.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);
        await skipDays(10);

        const fxsBefore = await FXS.balanceOf(receiver);
        const crvBefore = await crv.balanceOf(receiver);
        const cvxBefore = await cvx.balanceOf(receiver);

        await strategy.exitOnlyRewards(exitData, outputCoin, receiver, false);

        // const poolTokenAfter = await signer.getBalance();

        expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
        expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
        expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);
        // expect(poolTokenBefore).to.be.gt(poolTokenAfter);

    });

    it("Should try to exit without investing", async () => {
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const tokenIndexInCurve = 0;
        const receiver = signer.address;
        const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool)

        await strategy.exitAll(exitData, 10000, outputCoin, receiver, false, false);


    });

    it("Should return LP position in fiat", async () => {
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = signer.address;
        const lpToken = "0xf43211935c781d5ca1a41d2041f397b8a7366c7a";

        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);

        await wrappedEther.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);
        await skipDays(10);

        const request = await strategy.callStatic.getDeployedAmount(exitRewardData);
        expect(checkSpread(request, amount, 5));

    });

    it("Should return LP position in fiat and claim rewards", async () => {
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = strategy.address;
        const lpToken = "0xf43211935c781d5ca1a41d2041f397b8a7366c7a";

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
        expect(checkSpread(request, amount, 5));

        expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);
        expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
        expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);

    });

    it("Should withdraw rewards", async () => {
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const outputCoin = wrappedEther.address;
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = signer.address;
        const lpToken = "0xf43211935c781d5ca1a41d2041f397b8a7366c7a";

        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool)
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
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = signer.address;
        const lpToken = "0xf43211935c781d5ca1a41d2041f397b8a7366c7a";
        const newRewardToken = wrappedEther.address;

        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitRewardData = await strategy.encodeRewardsParams(lpToken, fraxPool, 0);
        const exitData = await strategy.encodeExitParams(curvePool, poolToken, tokenIndexInCurve, fraxPool)

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
        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const poolToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const outputCoin = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const amount = parseEther("1000");
        const duration = EIGHT_DAYS_IN_SECONDS;
        const receiver = signer.address;
        const lpToken = "0xf43211935c781d5ca1a41d2041f397b8a7366c7a";
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