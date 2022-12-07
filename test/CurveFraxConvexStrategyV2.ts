import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { AbiCoder, defaultAbiCoder, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { CurveFraxConvexStrategyV2, ICvxBooster, IERC20Metadata, IExchange, IWrappedEther, IConvexStaking, ILocking } from "../typechain";

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

describe("CurveFraxConvexStrategyV2", function () {
    let strategy: CurveFraxConvexStrategyV2;
    let signers: SignerWithAddress[];
    let signer: SignerWithAddress;

    let usdc: IERC20Metadata, usdt: IERC20Metadata, crv: IERC20Metadata, cvx: IERC20Metadata, FXS: IERC20Metadata, weth: IERC20Metadata;
    let cvxBooster: ICvxBooster;
    let exchange: IExchange;
    let frax: ILocking;
    let stakingToken: IConvexStaking;

    const ZERO_ADDR = ethers.constants.AddressZero;
    const EIGHT_DAYS_IN_SECONDS = 60 * 60 * 24 * 8;

    const addressToImpersonate = "0x2e91728aF3a54aCDCeD7938fE9016aE2cc5948C9";

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
        signer = await getImpersonatedSigner(addressToImpersonate);
        signers[0] = signer;


        usdc = await ethers.getContractAt("IERC20Metadata", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
        usdt = await ethers.getContractAt("IERC20Metadata", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        frax = await ethers.getContractAt('ILocking', '0x853d955acef822db058eb8505911ed77f175b99e');
        crv = await ethers.getContractAt("IERC20Metadata", "0xD533a949740bb3306d119CC777fa900bA034cd52");
        cvx = await ethers.getContractAt("IERC20Metadata", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
        FXS = await ethers.getContractAt("IERC20Metadata", "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0");
        weth = await ethers.getContractAt("IERC20Metadata", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
        cvxBooster = await ethers.getContractAt("contracts/interfaces/ICvxBooster.sol:ICvxBooster", "0xF403C135812408BFbE8713b5A23a04b3D48AAE31") as ICvxBooster;
        exchange = await ethers.getContractAt("contracts/interfaces/IExchange.sol:IExchange", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec") as IExchange
        stakingToken = await ethers.getContractAt("IConvexStaking", "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475");

        const value = parseEther("2000.0");

        await exchange.exchange(
            ZERO_ADDR, frax.address, value, 0, { value: value }
        )

    });

    beforeEach(async () => {
        const Strategy = await ethers.getContractFactory("CurveFraxConvexStrategyV2");
        const routerAddress = "0x24733D6EBdF1DA157d2A491149e316830443FC00"
        strategy = await upgrades.deployProxy(Strategy,
            [signers[0].address, ZERO_ADDR, ZERO_ADDR, routerAddress], {
            initializer: 'initialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"]
        }
        ) as CurveFraxConvexStrategyV2
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

    it("Should execute full investment", async () => {
        const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
        const fraxPool = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199";
        const poolToken = usdc;
        const poolSize = 2;
        const tokenIndexInCurve = 1;
        const amount = parseUnits("10", await poolToken.decimals());
        const duration = EIGHT_DAYS_IN_SECONDS;
        let int128 = ethers.utils.toUtf8Bytes("int128")

        const lpToken = await ethers.getContractAt("IERC20Metadata", "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475")
        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
        const balanceBefore = await poolToken.balanceOf(signer.address);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);

        await poolToken.connect(signer).transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        expect(await poolToken.balanceOf(signer.address)).to.be.eq(balanceBefore.sub(amount))
        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
    });

    it("Should repeat investment and exit", async () => {
        const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
        const fraxPool = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199";
        const poolToken = usdc;
        const poolSize = 2;
        const tokenIndexInCurve = 1;
        const amount = parseUnits("10", await poolToken.decimals());
        const duration = EIGHT_DAYS_IN_SECONDS;
        const lpToken = await ethers.getContractAt("IERC20Metadata", "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475")

        const entryData = await strategy.encodeEntryParams(
            curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool)

        await poolToken.connect(signer).transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);
        await poolToken.connect(signer).transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);

        const receiver = strategy.address;
        await skipDays(10);

        const fxsBefore = await FXS.balanceOf(receiver);
        const crvBefore = await crv.balanceOf(receiver);
        const cvxBefore = await cvx.balanceOf(receiver);

        await strategy.exitAll(exitData, 10000, poolToken.address, receiver, false, false);

        expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
        expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);
        expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);

        console.log('crv balance: ', await crv.balanceOf(receiver), 'cvx balance: ', await cvx.balanceOf(receiver),
            'fxs balance: ', await FXS.balanceOf(receiver));
    });

    it("Should exit all and send to signer", async () => {
        const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
        const fraxPool = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199";
        const poolToken = usdc;
        const poolSize = 2;
        const tokenIndexInCurve = 1;
        const amount = parseUnits("10", await poolToken.decimals());
        const duration = EIGHT_DAYS_IN_SECONDS;

        const entryData = await strategy.encodeEntryParams(curvePool, poolToken.address, poolSize, tokenIndexInCurve, fraxPool, duration);
        const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, tokenIndexInCurve, fraxPool)

        await poolToken.connect(signer).transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        const receiver = signer.address;
        await skipDays(9);

        const fxsBefore = await FXS.balanceOf(receiver);
        const crvBefore = await crv.balanceOf(receiver);
        const cvxBefore = await cvx.balanceOf(receiver);

        await strategy.exitAll(exitData, 10000, poolToken.address, receiver, true, false);

        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        console.log('pool token balance is zero');
        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        console.log('crv balance is zero');
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        console.log('cvx balance is zero');

        console.log('crv balance: ', await crv.balanceOf(receiver), 'cvx balance: ', await cvx.balanceOf(receiver),
            'fxs balance: ', await FXS.balanceOf(receiver));

        console.log('crv balance: ', await crv.balanceOf(strategy.address), 'cvx balance: ', await cvx.balanceOf(strategy.address),
            'fxs balance: ', await FXS.balanceOf(strategy.address));

        expect(await crv.balanceOf(receiver)).to.be.gt(crvBefore);
        console.log(await crv.balanceOf(receiver));
        expect(await cvx.balanceOf(receiver)).to.be.gt(cvxBefore);
        expect(await FXS.balanceOf(receiver)).to.be.gt(fxsBefore);

    })

    // it("Should unwind investment without Convex", async () => {
    //     const curvePool = "0xdcef968d416a41cdac0ed8702fac8128a64241a2";
    //     const poolToken: IERC20Metadata = frax;
    //     const exitToken: IERC20Metadata = usdc;
    //     const poolSize = 2
    //     const tokenIndexInCurve = 0;
    //     const convexPoolId = ethers.constants.MaxUint256;
    //     const amount = parseUnits("1000.0", await poolToken.decimals());
    //     const int128 = ethers.utils.toUtf8Bytes("int128")
    //     const lpToken = await ethers.getContractAt("IERC20Metadata", "0x3175df0976dfa876431c2e9ee6bc45b65d3473cc")

    //     const crvBefore = await crv.balanceOf(signers[0].address)
    //     const cvxBefore = await cvx.balanceOf(signers[0].address)

    //     const entryData = await strategy.encodeEntryParams(
    //         curvePool, poolToken.address, lpToken.address, poolSize, tokenIndexInCurve, convexPoolId
    //     );
    //     const exitData = await strategy.encodeExitParams(
    //         curvePool, poolToken.address, lpToken.address, int128, tokenIndexInCurve, convexPoolId
    //     );

    //     await poolToken.transfer(strategy.address, amount);
    //     await strategy.invest(entryData, amount);

    //     const balanceBefore = await exitToken.balanceOf(signers[0].address);
    //     await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, false, false);
    //     const balanceAfter = await exitToken.balanceOf(signers[0].address);

    //     expect(balanceAfter).to.be.gt(balanceBefore);
    //     expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
    //     expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);

    //     expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
    //     expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
    //     expect(await crv.balanceOf(signers[0].address)).to.be.equal(crvBefore);
    //     expect(await cvx.balanceOf(signers[0].address)).to.be.equal(cvxBefore);
    // })

    // it("Should unwind investment (without rewards swap)", async () => {
    //     const curvePool = "0xdcef968d416a41cdac0ed8702fac8128a64241a2";
    //     const poolToken: IERC20Metadata = frax;
    //     const exitToken: IERC20Metadata = usdc;
    //     const poolSize = 2
    //     const tokenIndexInCurve = 0;
    //     const convexPoolId = 100;
    //     const amount = parseUnits("1000.0", await poolToken.decimals());
    //     const poolInfo = await cvxBooster.poolInfo(convexPoolId);
    //     const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
    //     const rewardPool = await ethers.getContractAt("contracts/interfaces/ICvxBaseRewardPool.sol:ICvxBaseRewardPool", poolInfo.crvRewards)
    //     const int128 = ethers.utils.toUtf8Bytes("int128")
    //     const entryData = await strategy.encodeEntryParams(
    //         curvePool, poolToken.address, lpToken.address, poolSize, tokenIndexInCurve, convexPoolId
    //     );
    //     const exitData = await strategy.encodeExitParams(
    //         curvePool, poolToken.address, lpToken.address, int128, tokenIndexInCurve, convexPoolId
    //     );

    //     await poolToken.transfer(strategy.address, amount);
    //     await strategy.invest(entryData, amount);

    //     const cvxBalanceBefore = await cvx.balanceOf(signers[0].address);
    //     const crvBalanceBefore = await crv.balanceOf(signers[0].address);
    //     const balanceBefore = await exitToken.balanceOf(signers[0].address);
    //     await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, true, false);
    //     const balanceAfter = await exitToken.balanceOf(signers[0].address);
    //     const cvxBalanceAfter = await cvx.balanceOf(signers[0].address);
    //     const crvBalanceAfter = await crv.balanceOf(signers[0].address);

    //     expect(balanceAfter).to.be.gt(balanceBefore);
    //     expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
    //     expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);
    //     expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
    //     expect(await rewardPool.balanceOf(strategy.address)).to.be.equal(0);

    //     expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
    //     expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
    //     expect(crvBalanceAfter).to.be.gt(crvBalanceBefore);
    //     expect(cvxBalanceAfter).to.be.gt(cvxBalanceBefore);
    // })

    // it("Should only claim rewards", async () => {
    //     const curvePool = "0xdcef968d416a41cdac0ed8702fac8128a64241a2";
    //     const poolToken: IERC20Metadata = frax;
    //     const exitToken: IERC20Metadata = usdc;
    //     const poolSize = 2
    //     const tokenIndexInCurve = 0;
    //     const convexPoolId = 100;
    //     const amount = parseUnits("1000.0", await poolToken.decimals());
    //     const poolInfo = await cvxBooster.poolInfo(convexPoolId);
    //     const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
    //     const rewardPool = await ethers.getContractAt("contracts/interfaces/ICvxBaseRewardPool.sol:ICvxBaseRewardPool", poolInfo.crvRewards)
    //     const int128 = ethers.utils.toUtf8Bytes("int128")

    //     const entryData = await strategy.encodeEntryParams(
    //         curvePool, poolToken.address, lpToken.address, poolSize, tokenIndexInCurve, convexPoolId
    //     );
    //     const exitData = await strategy.encodeRewardsParams(
    //         lpToken.address, convexPoolId, 0
    //     );

    //     await poolToken.transfer(strategy.address, amount);
    //     await strategy.invest(entryData, amount);

    //     const lpBalanceBefore = await rewardPool.balanceOf(strategy.address);
    //     const coinBalanceBefore = await exitToken.balanceOf(signers[0].address);
    //     await skipDays(5);
    //     await strategy.exitOnlyRewards(exitData, exitToken.address, signers[0].address, true);
    //     const lpBalanceAfter = await rewardPool.balanceOf(strategy.address);
    //     const coinBalanceAfter = await exitToken.balanceOf(signers[0].address);

    //     expect(lpBalanceBefore).to.not.be.equal(0);
    //     expect(lpBalanceBefore).to.be.equal(lpBalanceAfter);
    //     expect(coinBalanceAfter).to.be.gt(coinBalanceBefore);
    // })

    // describe("Testing with Native ETH", async () => {
    //     it("Should execute full investment", async () => {
    //         const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
    //         const poolToken: IERC20Metadata = weth;
    //         const poolSize = 2;
    //         const tokenIndexInCurve = 0;
    //         const convexPoolId = 25;
    //         const amount = parseUnits("100.0", await poolToken.decimals());

    //         const poolInfo = await cvxBooster.poolInfo(convexPoolId);
    //         const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
    //         const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)
    //         const exitData = await strategy.encodeExitParams(
    //             curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
    //         )
    //         const entryData = await strategy.encodeEntryParams(
    //             curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
    //         );

    //         expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);

    //         const investBefore = await rewardPool.balanceOf(strategy.address);
    //         await poolToken.transfer(strategy.address, amount);

    //         const returnData = await strategy.callStatic.invest(entryData, amount);
    //         await strategy.invest(entryData, amount);
    //         const investAfter = await rewardPool.balanceOf(strategy.address);

    //         expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(investAfter).to.be.gt(investBefore);
    //         expect(returnData).to.be.equal(exitData);
    //     });

    //     it("Should execute investment only for Curve", async () => {

    //         const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
    //         const poolToken: IERC20Metadata = weth;
    //         const poolSize = 2;
    //         const tokenIndexInCurve = 0;
    //         const convexPoolId = ethers.constants.MaxUint256;
    //         const amount = parseUnits("100.0", await poolToken.decimals());


    //         const poolInfo = await cvxBooster.poolInfo(25);
    //         const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
    //         const entryData = await strategy.encodeEntryParams(
    //             curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
    //         );

    //         const lpBalanceBefore = await lpToken.balanceOf(strategy.address);
    //         await poolToken.transfer(strategy.address, amount);
    //         await strategy.invest(entryData, amount);
    //         const lpBalanceAfter = await lpToken.balanceOf(strategy.address);

    //         expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(lpBalanceAfter).to.be.gt(lpBalanceBefore);
    //     });

    //     it("Should unwind investment", async () => {

    //         const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
    //         const poolToken: IERC20Metadata = weth;
    //         const exitToken: IERC20Metadata = weth;
    //         const poolSize = 2;
    //         const tokenIndexInCurve = 0;
    //         const convexPoolId = 25;
    //         const amount = parseUnits("100.0", await poolToken.decimals());

    //         const poolInfo = await cvxBooster.poolInfo(convexPoolId);
    //         const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
    //         const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

    //         const entryData = await strategy.encodeEntryParams(
    //             curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
    //         );
    //         const exitData = await strategy.encodeExitParams(
    //             curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
    //         );

    //         await poolToken.transfer(strategy.address, amount);
    //         await strategy.invest(entryData, amount);

    //         const balanceBefore = await exitToken.balanceOf(signers[0].address);
    //         await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, true);
    //         const balanceAfter = await exitToken.balanceOf(signers[0].address);

    //         expect(balanceAfter).to.be.gt(balanceBefore);
    //         expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await rewardPool.balanceOf(strategy.address)).to.be.equal(0);

    //         expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await crv.balanceOf(signers[0].address)).to.be.equal(0);
    //         expect(await cvx.balanceOf(signers[0].address)).to.be.equal(0);
    //     })

    //     it("Should unwind investment without Convex", async () => {

    //         const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
    //         const poolToken: IERC20Metadata = weth;
    //         const exitToken: IERC20Metadata = weth;
    //         const poolSize = 2;
    //         const tokenIndexInCurve = 0;
    //         const amount = parseUnits("100.0", await poolToken.decimals());
    //         const convexPoolId = ethers.constants.MaxUint256;
    //         const poolInfo = await cvxBooster.poolInfo(25);
    //         const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
    //         const entryData = await strategy.encodeEntryParams(
    //             curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
    //         );
    //         const exitData = await strategy.encodeExitParams(
    //             curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
    //         );

    //         await poolToken.transfer(strategy.address, amount);
    //         await strategy.invest(entryData, amount);

    //         const balanceBefore = await exitToken.balanceOf(signers[0].address);
    //         await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, true);
    //         const balanceAfter = await exitToken.balanceOf(signers[0].address);

    //         expect(balanceAfter).to.be.gt(balanceBefore);
    //         expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);

    //         expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await crv.balanceOf(signers[0].address)).to.be.equal(0);
    //         expect(await cvx.balanceOf(signers[0].address)).to.be.equal(0);
    //     })

    //     it("Should unwind investment (without rewards swap)", async () => {

    //         const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
    //         const poolToken: IERC20Metadata = weth;
    //         const exitToken: IERC20Metadata = weth;
    //         const poolSize = 2;
    //         const tokenIndexInCurve = 0;
    //         const convexPoolId = 25;
    //         const amount = parseUnits("100.0", await poolToken.decimals());


    //         const poolInfo = await cvxBooster.poolInfo(convexPoolId);
    //         const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
    //         const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

    //         const entryData = await strategy.encodeEntryParams(
    //             curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
    //         );
    //         const exitData = await strategy.encodeExitParams(
    //             curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
    //         );

    //         await poolToken.transfer(strategy.address, amount);
    //         await strategy.invest(entryData, amount);

    //         const cvxBalanceBefore = await cvx.balanceOf(signers[0].address);
    //         const crvBalanceBefore = await crv.balanceOf(signers[0].address);
    //         const balanceBefore = await exitToken.balanceOf(signers[0].address);
    //         await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, false);
    //         const balanceAfter = await exitToken.balanceOf(signers[0].address);
    //         const cvxBalanceAfter = await cvx.balanceOf(signers[0].address);
    //         const crvBalanceAfter = await crv.balanceOf(signers[0].address);

    //         expect(balanceAfter).to.be.gt(balanceBefore);
    //         expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await rewardPool.balanceOf(strategy.address)).to.be.equal(0);

    //         expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
    //         expect(crvBalanceAfter).to.be.gt(crvBalanceBefore);
    //         expect(cvxBalanceAfter).to.be.gt(cvxBalanceBefore);
    //     })

    //     it("Should only claim rewards", async () => {
    //         const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
    //         const poolToken: IERC20Metadata = weth;
    //         const exitToken: IERC20Metadata = weth;
    //         const poolSize = 2;
    //         const tokenIndexInCurve = 0;
    //         const convexPoolId = 25;
    //         const amount = parseUnits("100.0", await poolToken.decimals());


    //         const poolInfo = await cvxBooster.poolInfo(convexPoolId);
    //         const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
    //         const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

    //         const entryData = await strategy.encodeEntryParams(
    //             curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
    //         );
    //         const exitData = await strategy.encodeExitParams(
    //             curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
    //         );

    //         await poolToken.transfer(strategy.address, amount);
    //         await strategy.invest(entryData, amount);

    //         const lpBalanceBefore = await rewardPool.balanceOf(strategy.address);
    //         const coinBalanceBefore = await exitToken.balanceOf(signers[0].address);
    //         await strategy.exitOnlyRewards(exitData, exitToken.address, signers[0].address, true);
    //         const lpBalanceAfter = await rewardPool.balanceOf(strategy.address);
    //         const coinBalanceAfter = await exitToken.balanceOf(signers[0].address);

    //         expect(lpBalanceBefore).to.not.be.equal(0);
    //         expect(lpBalanceBefore).to.be.equal(lpBalanceAfter);
    //         expect(coinBalanceAfter).to.be.gt(coinBalanceBefore);
    //     })
    // })
    // it("Should execute mulicall", async () => {
    //     const token = frax;
    //     const amount = parseUnits("200.0", await token.decimals());
    //     const calldata1 = token.interface.encodeFunctionData("transfer", [signers[0].address, parseUnits("150.0", await token.decimals())]);
    //     const calldata2 = token.interface.encodeFunctionData("transfer", [signers[0].address, parseUnits("50.0", await token.decimals())]);

    //     const balanceBefore = await token.balanceOf(strategy.address);
    //     await token.transfer(strategy.address, amount);
    //     await strategy.multicall([token.address, token.address], [calldata1, calldata2]);
    //     const balanceAfter = await token.balanceOf(strategy.address);

    //     expect(balanceAfter).to.be.equal(balanceBefore);
    // })
});