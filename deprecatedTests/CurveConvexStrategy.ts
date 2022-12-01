import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { AbiCoder, defaultAbiCoder, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { CurveConvexStrategy, CurveConvexStrategyETH, ICvxBooster, IERC20Metadata, IExchange, IWrappedEther } from "../typechain";

describe("CurveConvexStrategy", function () {
    let strategy: CurveConvexStrategyETH;
    let signers: SignerWithAddress[];

    let usdc: IERC20Metadata, usdt: IERC20Metadata, frax: IERC20Metadata, crv: IERC20Metadata, cvx: IERC20Metadata, weth: IERC20Metadata;
    let cvxBooster: ICvxBooster;
    let exchange: IExchange;

    const ZERO_ADDR = ethers.constants.AddressZero;

    async function investTimeTravel() {
        return ethers.provider.send("evm_increaseTime", []);
    }

    before(async () => {
        signers = await ethers.getSigners();

        usdc = await ethers.getContractAt("IERC20Metadata", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
        usdt = await ethers.getContractAt("IERC20Metadata", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        frax = await ethers.getContractAt('IERC20Metadata', '0x853d955acef822db058eb8505911ed77f175b99e');
        crv = await ethers.getContractAt("IERC20Metadata", "0xD533a949740bb3306d119CC777fa900bA034cd52");
        cvx = await ethers.getContractAt("IERC20Metadata", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
        weth = await ethers.getContractAt("IERC20Metadata", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
        cvxBooster = await ethers.getContractAt("ICvxBooster", "0xF403C135812408BFbE8713b5A23a04b3D48AAE31");
        exchange = await ethers.getContractAt("IExchange", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec")

        const value = parseEther("2000.0");

        await exchange.exchange(
            ZERO_ADDR, frax.address, value, 0, { value: value }
        )

    });

    beforeEach(async () => {
        const Strategy = await ethers.getContractFactory("CurveConvexStrategyETH");
        strategy = await Strategy.deploy(ZERO_ADDR, ZERO_ADDR, true);
        let wrappedEther = await ethers.getContractAt("IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as IWrappedEther
        await wrappedEther.deposit({value: ethers.utils.parseEther("100")})
    });

    it("Should check initial contract state", async () => {
        const cvxBooster = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
        const exchange = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
        const cvxRewards = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
        const crvRewards = "0xD533a949740bb3306d119CC777fa900bA034cd52";
        const unwindDecimals = 2;
        const adminRole = await strategy.DEFAULT_ADMIN_ROLE();

        expect(await strategy.cvxBooster()).to.be.equal(cvxBooster);
        expect(await strategy.exchange()).to.be.equal(exchange);
        expect(await strategy.cvxRewards()).to.be.equal(cvxRewards);
        expect(await strategy.crvRewards()).to.be.equal(crvRewards);
        expect(await strategy.unwindDecimals()).to.be.equal(unwindDecimals);

        expect(await strategy.hasRole(adminRole, signers[0].address)).to.be.true;
    });

    it("Should check initial contract state (testing == false)", async () => {
        const contract1 = usdc.address;
        const contract2 = usdt.address;
        const adminRole = ethers.constants.HashZero;

        expect(contract1).to.not.be.equal(contract2);

        const Strategy = await ethers.getContractFactory("CurveConvexStrategy");
        const newStrategy = await Strategy.deploy(contract1, contract2, false);

        expect(await newStrategy.hasRole(adminRole, contract1)).to.be.true;
        expect(await newStrategy.hasRole(adminRole, contract2)).to.be.true;
    });

    it("Should not deploy contract (gnosis/voteExecutor not contract)", async () => {
        const notContract = signers[1].address;
        const contract = usdc.address;

        const Strategy = await ethers.getContractFactory("CurveConvexStrategy");

        let newStrategy = Strategy.deploy(notContract, contract, false);
        await expect(newStrategy).to.be.revertedWith("CurveConvexStrategy: 1!contract");

        newStrategy = Strategy.deploy(contract, notContract, false);
        await expect(newStrategy).to.be.revertedWith("CurveConvexStrategy: 2!contract");
    })

    it("Should check roles", async () => {
        const contract = usdc.address;
        const roleError = `AccessControl: account ${signers[0].address.toLowerCase()} is missing role ${ethers.constants.HashZero}`;

        const Strategy = await ethers.getContractFactory("CurveConvexStrategy");
        const newStrategy = await Strategy.deploy(contract, contract, false);

        await expect(newStrategy.invest("0x", 0)).to.be.revertedWith(roleError);
        await expect(newStrategy.exitAll("0x", 0, contract, contract, true)).to.be.revertedWith(roleError);
        await expect(newStrategy.exitOnlyRewards("0x", contract, contract, true)).to.be.revertedWith(roleError);
        await expect(newStrategy.multicall([], [])).to.be.revertedWith(roleError);
    });

    it("Should check correct encoders/decoders", async () => {
        const curvePool = "0x0000000000000000000000000000000000000001";
        const poolToken = "0x0000000000000000000000000000000000000002";
        const poolSize = 3;
        const tokenIndexInCurve = 4;
        const convexPoolId = 5;
        const lpToken = "0x0000000000000000000000000000000000000006"

        const entry = defaultAbiCoder.encode(
            ["address", "address ", "address", "uint8", "uint8", "uint256"],
            [curvePool, lpToken, poolToken, poolSize, tokenIndexInCurve, convexPoolId]
        )
        const exit = defaultAbiCoder.encode(
            ["address", "address", "address", "uint8", "uint256"],
            [curvePool, poolToken, lpToken, tokenIndexInCurve, convexPoolId]
        );

        expect(await strategy.encodeEntryParams(
            curvePool, lpToken, poolToken, poolSize, tokenIndexInCurve, convexPoolId
        )).to.be.equal(entry);

        expect(await strategy.encodeExitParams(
            curvePool, poolToken, lpToken, tokenIndexInCurve, convexPoolId
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
        expect(exitStruct[3]).to.be.equal(tokenIndexInCurve);
        expect(exitStruct[4]).to.be.equal(convexPoolId);
    });

    it("Should revert decoders if data length is wrong", async () => {
        const data = "0x420690";

        const entry = strategy.decodeEntryParams(data);
        const exit = strategy.decodeExitParams(data);

        await expect(entry).to.be.revertedWith("CurveConvexStrategy: length en");
        await expect(exit).to.be.revertedWith("CurveConvexStrategy: length ex");
    });

    it("Should execute full investment", async () => {
        const curvePool = "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89";
        const poolToken: IERC20Metadata = frax;
        const poolSize = 3;
        const tokenIndexInCurve = 0;
        const convexPoolId = 58;
        const amount = parseUnits("1000.0", await poolToken.decimals());

        const poolInfo = await cvxBooster.poolInfo(convexPoolId);
        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
        const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)
        const exitData = await strategy.encodeExitParams(
            curvePool, poolToken.address, lpToken.address, tokenIndexInCurve, convexPoolId
        )
        const entryData = await strategy.encodeEntryParams(
            curvePool, lpToken.address, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );

        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);

        const investBefore = await rewardPool.balanceOf(strategy.address);
        await poolToken.transfer(strategy.address, amount);
        const returnData = await strategy.callStatic.invest(entryData, amount);
        await strategy.invest(entryData, amount);
        const investAfter = await rewardPool.balanceOf(strategy.address);

        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(investAfter).to.be.gt(investBefore);
        expect(returnData).to.be.equal(exitData);
    });

    it("Should execute investment only for Curve", async () => {
        const curvePool = "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89";
        const poolToken: IERC20Metadata = frax;
        const poolSize = 3;
        const tokenIndexInCurve = 0;
        const convexPoolId = ethers.constants.MaxUint256;
        const amount = parseUnits("1000.0", await poolToken.decimals());
        const lpToken = await ethers.getContractAt("IERC20Metadata", curvePool)
        const entryData = await strategy.encodeEntryParams(
            curvePool, curvePool, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );

        const lpBalanceBefore = await lpToken.balanceOf(strategy.address);
        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);
        const lpBalanceAfter = await lpToken.balanceOf(strategy.address);

        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(lpBalanceAfter).to.be.gt(lpBalanceBefore);
    });

    it("Should unwind investment", async () => {
        const curvePool = "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89";
        const poolToken: IERC20Metadata = frax;
        const exitToken: IERC20Metadata = usdc;
        const poolSize = 3;
        const tokenIndexInCurve = 0;
        const convexPoolId = 58;
        const amount = parseUnits("1000.0", await poolToken.decimals());
        const poolInfo = await cvxBooster.poolInfo(convexPoolId);
        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
        const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

        const entryData = await strategy.encodeEntryParams(
            curvePool, lpToken.address, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        const exitData = await strategy.encodeExitParams(
            curvePool, poolToken.address, lpToken.address, tokenIndexInCurve, convexPoolId
        );

        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        const balanceBefore = await exitToken.balanceOf(signers[0].address);
        await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, true);
        const balanceAfter = await exitToken.balanceOf(signers[0].address);

        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await rewardPool.balanceOf(strategy.address)).to.be.equal(0);

        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(await crv.balanceOf(signers[0].address)).to.be.equal(0);
        expect(await cvx.balanceOf(signers[0].address)).to.be.equal(0);
    })

    it("Should unwind investment without Convex", async () => {
        const curvePool = "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89";
        const poolToken: IERC20Metadata = frax;
        const exitToken: IERC20Metadata = usdc;
        const poolSize = 3;
        const tokenIndexInCurve = 0;
        const convexPoolId = ethers.constants.MaxUint256;
        const amount = parseUnits("1000.0", await poolToken.decimals());

        const entryData = await strategy.encodeEntryParams(
            curvePool, curvePool, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        const exitData = await strategy.encodeExitParams(
            curvePool, poolToken.address, curvePool, tokenIndexInCurve, convexPoolId
        );

        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        const balanceBefore = await exitToken.balanceOf(signers[0].address);
        await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, true);
        const balanceAfter = await exitToken.balanceOf(signers[0].address);

        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);

        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(await crv.balanceOf(signers[0].address)).to.be.equal(0);
        expect(await cvx.balanceOf(signers[0].address)).to.be.equal(0);
    })

    it("Should unwind investment (without rewards swap)", async () => {
        const curvePool = "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89";
        const poolToken: IERC20Metadata = frax;
        const exitToken: IERC20Metadata = usdc;
        const poolSize = 3;
        const tokenIndexInCurve = 0;
        const convexPoolId = 58;
        const amount = parseUnits("1000.0", await poolToken.decimals());
        const poolInfo = await cvxBooster.poolInfo(convexPoolId);
        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
        const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

        const entryData = await strategy.encodeEntryParams(
            curvePool, lpToken.address, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        const exitData = await strategy.encodeExitParams(
            curvePool, poolToken.address, lpToken.address, tokenIndexInCurve, convexPoolId
        );

        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        const cvxBalanceBefore = await cvx.balanceOf(signers[0].address);
        const crvBalanceBefore = await crv.balanceOf(signers[0].address);
        const balanceBefore = await exitToken.balanceOf(signers[0].address);
        await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, false);
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
        const curvePool = "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89";
        const poolToken: IERC20Metadata = frax;
        const exitToken: IERC20Metadata = usdc;
        const poolSize = 3;
        const tokenIndexInCurve = 0;
        const convexPoolId = 58;
        const amount = parseUnits("1000.0", await poolToken.decimals());
        const poolInfo = await cvxBooster.poolInfo(convexPoolId);
        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
        const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

        const entryData = await strategy.encodeEntryParams(
            curvePool, lpToken.address, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId
        );
        const exitData = await strategy.encodeExitParams(
            curvePool, poolToken.address, lpToken.address, tokenIndexInCurve, convexPoolId
        );

        await poolToken.transfer(strategy.address, amount);
        await strategy.invest(entryData, amount);

        const lpBalanceBefore = await rewardPool.balanceOf(strategy.address);
        const coinBalanceBefore = await exitToken.balanceOf(signers[0].address);
        await strategy.exitOnlyRewards(exitData, exitToken.address, signers[0].address, true);
        const lpBalanceAfter = await rewardPool.balanceOf(strategy.address);
        const coinBalanceAfter = await exitToken.balanceOf(signers[0].address);

        expect(lpBalanceBefore).to.not.be.equal(0);
        expect(lpBalanceBefore).to.be.equal(lpBalanceAfter);
        expect(coinBalanceAfter).to.be.gt(coinBalanceBefore);
    })

    describe("Testing with Native ETH", async () => {
        it("Should execute full investment", async () => {
            const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
            const poolToken: IERC20Metadata = weth;
            const poolSize = 2;
            const tokenIndexInCurve = 0;
            const convexPoolId = 25;
            const amount = parseUnits("100.0", await poolToken.decimals());

            const poolInfo = await cvxBooster.poolInfo(convexPoolId);
            const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
            const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)
            const exitData = await strategy.encodeExitParams(
                curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
            )
            const entryData = await strategy.encodeEntryParams(
                curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
            );
    
            expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
    
            const investBefore = await rewardPool.balanceOf(strategy.address);
            await poolToken.transfer(strategy.address, amount);

            const returnData = await strategy.callStatic.invest(entryData, amount);
            await strategy.invest(entryData, amount);
            const investAfter = await rewardPool.balanceOf(strategy.address);
    
            expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
            expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
            expect(investAfter).to.be.gt(investBefore);
            expect(returnData).to.be.equal(exitData);
        });
    
        it("Should execute investment only for Curve", async () => {

            const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
            const poolToken: IERC20Metadata = weth;
            const poolSize = 2;
            const tokenIndexInCurve = 0;
            const convexPoolId = ethers.constants.MaxUint256;
            const amount = parseUnits("100.0", await poolToken.decimals());
    
            
            const poolInfo = await cvxBooster.poolInfo(25);
            const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
            const entryData = await strategy.encodeEntryParams(
                curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
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
            const exitToken: IERC20Metadata = weth;
            const poolSize = 2;
            const tokenIndexInCurve = 0;
            const convexPoolId = 25;
            const amount = parseUnits("100.0", await poolToken.decimals());

            const poolInfo = await cvxBooster.poolInfo(convexPoolId);
            const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
            const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)
    
            const entryData = await strategy.encodeEntryParams(
                curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
            );
            const exitData = await strategy.encodeExitParams(
                curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
            );
    
            await poolToken.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
    
            const balanceBefore = await exitToken.balanceOf(signers[0].address);
            await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, true);
            const balanceAfter = await exitToken.balanceOf(signers[0].address);
    
            expect(balanceAfter).to.be.gt(balanceBefore);
            expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
            expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);
            expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
            expect(await rewardPool.balanceOf(strategy.address)).to.be.equal(0);
    
            expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
            expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
            expect(await crv.balanceOf(signers[0].address)).to.be.equal(0);
            expect(await cvx.balanceOf(signers[0].address)).to.be.equal(0);
        })
    
        it("Should unwind investment without Convex", async () => {

            const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
            const poolToken: IERC20Metadata = weth;
            const exitToken: IERC20Metadata = weth;
            const poolSize = 2;
            const tokenIndexInCurve = 0;
            const amount = parseUnits("100.0", await poolToken.decimals());
            const convexPoolId = ethers.constants.MaxUint256;
            const poolInfo = await cvxBooster.poolInfo(25);
            const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
            const entryData = await strategy.encodeEntryParams(
                curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
            );
            const exitData = await strategy.encodeExitParams(
                curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
            );
    
            await poolToken.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
    
            const balanceBefore = await exitToken.balanceOf(signers[0].address);
            await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, true);
            const balanceAfter = await exitToken.balanceOf(signers[0].address);
    
            expect(balanceAfter).to.be.gt(balanceBefore);
            expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
            expect(await exitToken.balanceOf(strategy.address)).to.be.equal(0);
    
            expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
            expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
            expect(await crv.balanceOf(signers[0].address)).to.be.equal(0);
            expect(await cvx.balanceOf(signers[0].address)).to.be.equal(0);
        })
    
        it("Should unwind investment (without rewards swap)", async () => {

            const curvePool = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
            const poolToken: IERC20Metadata = weth;
            const exitToken: IERC20Metadata = weth;
            const poolSize = 2;
            const tokenIndexInCurve = 0;
            const convexPoolId = 25;
            const amount = parseUnits("100.0", await poolToken.decimals());

        
            const poolInfo = await cvxBooster.poolInfo(convexPoolId);
            const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
            const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)
    
            const entryData = await strategy.encodeEntryParams(
                curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
            );
            const exitData = await strategy.encodeExitParams(
                curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
            );
    
            await poolToken.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
    
            const cvxBalanceBefore = await cvx.balanceOf(signers[0].address);
            const crvBalanceBefore = await crv.balanceOf(signers[0].address);
            const balanceBefore = await exitToken.balanceOf(signers[0].address);
            await strategy.exitAll(exitData, 10000, exitToken.address, signers[0].address, false);
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
            const exitToken: IERC20Metadata = weth;
            const poolSize = 2;
            const tokenIndexInCurve = 0;
            const convexPoolId = 25;
            const amount = parseUnits("100.0", await poolToken.decimals());


            const poolInfo = await cvxBooster.poolInfo(convexPoolId);
            const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)
            const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)
    
            const entryData = await strategy.encodeEntryParams(
                curvePool, lpToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", poolSize, tokenIndexInCurve, convexPoolId
            );
            const exitData = await strategy.encodeExitParams(
                curvePool, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", lpToken.address, tokenIndexInCurve, convexPoolId
            );
    
            await poolToken.transfer(strategy.address, amount);
            await strategy.invest(entryData, amount);
    
            const lpBalanceBefore = await rewardPool.balanceOf(strategy.address);
            const coinBalanceBefore = await exitToken.balanceOf(signers[0].address);
            await strategy.exitOnlyRewards(exitData, exitToken.address, signers[0].address, true);
            const lpBalanceAfter = await rewardPool.balanceOf(strategy.address);
            const coinBalanceAfter = await exitToken.balanceOf(signers[0].address);
    
            expect(lpBalanceBefore).to.not.be.equal(0);
            expect(lpBalanceBefore).to.be.equal(lpBalanceAfter);
            expect(coinBalanceAfter).to.be.gt(coinBalanceBefore);
        })
    })
    it("Should execute mulicall", async () => {
        const token = frax;
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