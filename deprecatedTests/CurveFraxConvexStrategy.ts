import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { AbiCoder, defaultAbiCoder, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { CurveFraxConvexStrategy, CurveFraxConvexStrategy__factory, ICvxBooster, IERC20, IERC20Metadata, IExchange, IWrappedEther } from "../typechain";

describe("CurveConvexStrategy", function () {
    let strategy: CurveFraxConvexStrategy;
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
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 15475317,
                },
            }, ],
        });
    });

    beforeEach(async () => {
        const Strategy = await ethers.getContractFactory("CurveFraxConvexStrategy") as CurveFraxConvexStrategy__factory;
        strategy = await Strategy.deploy(ZERO_ADDR, ZERO_ADDR, true);
        await exchange.exchange(
            ZERO_ADDR, frax.address, parseEther("100"), 0, { value:  parseEther("100")})
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

        const Strategy = await ethers.getContractFactory("CurveFraxConvexStrategy");
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

        const Strategy = await ethers.getContractFactory("CurveFraxConvexStrategy");
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
        const stakeToken = "0x0000000000000000000000000000000000000008";
        const fraxPool = "0x0000000000000000000000000000000000000009";
        const duration = 5
        const kek = ethers.utils.formatBytes32String("helloworld")
        const entry = defaultAbiCoder.encode(
            ["address", "address ", "address", "uint8", "uint8", "uint256", "address", "address", "uint256"],
            [curvePool, lpToken, poolToken, poolSize, tokenIndexInCurve, convexPoolId, stakeToken, fraxPool, duration]
        )
        const exit = defaultAbiCoder.encode(
            ["address", "address", "address", "uint8", "uint256", "address", "bytes32"],
            [curvePool, poolToken, lpToken, tokenIndexInCurve, convexPoolId, fraxPool, kek]
        );

        expect(await strategy.encodeEntryParams(
            curvePool, lpToken, poolToken, poolSize, tokenIndexInCurve, convexPoolId, stakeToken, fraxPool, duration
        )).to.be.equal(entry);

        expect(await strategy.encodeExitParams(
            curvePool, poolToken, lpToken, tokenIndexInCurve, convexPoolId, fraxPool, kek
        )).to.be.equal(exit);

        const entryStruct = await strategy.decodeEntryParams(entry);
        const exitStruct = await strategy.decodeExitParams(exit);

        expect(entryStruct[0]).to.be.equal(curvePool);
        expect(entryStruct[1]).to.be.equal(lpToken);
        expect(entryStruct[2]).to.be.equal(poolToken);
        expect(entryStruct[3]).to.be.equal(poolSize);
        expect(entryStruct[4]).to.be.equal(tokenIndexInCurve);
        expect(entryStruct[5]).to.be.equal(convexPoolId);
        expect(entryStruct[6]).to.be.equal(stakeToken);
        expect(entryStruct[7]).to.be.equal(fraxPool);
        expect(entryStruct[8]).to.be.equal(duration);


        expect(exitStruct[0]).to.be.equal(curvePool);
        expect(exitStruct[1]).to.be.equal(poolToken);
        expect(exitStruct[2]).to.be.equal(lpToken);
        expect(exitStruct[3]).to.be.equal(tokenIndexInCurve);
        expect(exitStruct[4]).to.be.equal(convexPoolId);
        expect(exitStruct[5]).to.be.equal(fraxPool);
        expect(exitStruct[6]).to.be.equal(kek);
    });

    it("Should revert decoders if data length is wrong", async () => {
        const data = "0x420690";

        const entry = strategy.decodeEntryParams(data);
        const exit = strategy.decodeExitParams(data);

        await expect(entry).to.be.revertedWith("CurveConvexStrategy: length en");
        await expect(exit).to.be.revertedWith("CurveConvexStrategy: length ex");
    });

    // it("Should execute full investment", async () => {
    //     const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
    //     const poolToken: IERC20Metadata = frax;
    //     const poolSize = 2;
    //     const tokenIndexInCurve = 0;
    //     const convexPoolId = 100;
    //     const amount = parseUnits("10.0", await poolToken.decimals());

    //     const poolInfo = await cvxBooster.poolInfo(convexPoolId);

    //     const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)

    //     const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

    //     const stakeToken = await ethers.getContractAt("IERC20", "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475")
    //     const fraxPool = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199"
    //     const duration = 694000
    //     const entryData = await strategy.encodeEntryParams(
    //         curvePool, lpToken.address, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId, stakeToken.address, fraxPool, duration
    //     )
    //     expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
    //     const investBefore = await stakeToken.balanceOf(strategy.address);

    //     await poolToken.transfer(strategy.address, amount);

    //     await strategy.invest(entryData, amount);

    //     const investAfter = await stakeToken.balanceOf(strategy.address);

    //     expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
    //     expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
    //     // We must have 0 stake token left because they must be locked up.
    //     expect(investAfter).to.be.equal(investBefore);
    // });

    it("Should exit only rewards and swap to Frax", async () => {


        const strategy2 = await ethers.getContractFactory("CurveFraxConvexStrategy") as CurveFraxConvexStrategy__factory;
        strategy = await strategy2.connect(signers[2]).deploy(ZERO_ADDR, ZERO_ADDR, true);
        await exchange.connect(signers[2]).exchange(
            ZERO_ADDR, frax.address, parseEther("100"), 0, { value:  parseEther("100")})


        const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
        const poolToken: IERC20Metadata = frax;
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const convexPoolId = 100;
        const amount = parseUnits("10.0", await poolToken.decimals());

        const poolInfo = await cvxBooster.poolInfo(convexPoolId);

        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)

        const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

        const stakeToken = "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475"
        const fraxPool = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199"
        const duration = 800000
        const entryData = await strategy.encodeEntryParams(
            curvePool, lpToken.address, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId, stakeToken, fraxPool, duration
        )

        await poolToken.connect(signers[2]).transfer(strategy.address, amount);

        const tx = await strategy.connect(signers[2]).invest(entryData, amount);
        const receipt = await tx.wait()

        let abi = [ "event Locked(bytes32 data)" ];
        let iface = new ethers.utils.Interface(abi);
        let log = iface.parseLog(receipt.logs[receipt.logs.length-1]); 

        const kek_id =log.args[0]

        const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, lpToken.address, tokenIndexInCurve, convexPoolId, fraxPool, kek_id)
        await ethers.provider.send("evm_increaseTime", [1000000])

        
        const balanceBefore = await frax.balanceOf(signers[0].address);
        await strategy.connect(signers[2]).exitOnlyRewards(exitData, frax.address, signers[0].address, true);
        const balanceAfter = await frax.balanceOf(signers[0].address);

        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await frax.balanceOf(strategy.address)).to.be.equal(0);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await rewardPool.balanceOf(strategy.address)).to.be.equal(0);

        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(await crv.balanceOf(signers[0].address)).to.be.equal(0);
        expect(await cvx.balanceOf(signers[0].address)).to.be.equal(0);
    });
    it("Should exit only rewards and don't swap", async () => {
        const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
        const poolToken: IERC20Metadata = frax;
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const convexPoolId = 100;
        const amount = parseUnits("10.0", await poolToken.decimals());

        const poolInfo = await cvxBooster.poolInfo(convexPoolId);

        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)

        const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

        const stakeToken = "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475"
        const fraxPool = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199"
        const duration = 694000
        const entryData = await strategy.encodeEntryParams(
            curvePool, lpToken.address, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId, stakeToken, fraxPool, duration
        )

        await poolToken.transfer(strategy.address, amount);

        const tx = await strategy.invest(entryData, amount);
        const receipt = await tx.wait()

        let abi = [ "event Locked(bytes32 data)" ];
        let iface = new ethers.utils.Interface(abi);
        let log = iface.parseLog(receipt.logs[receipt.logs.length-1]); 

        const kek_id =log.args[0]

        const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, lpToken.address, tokenIndexInCurve, convexPoolId, fraxPool, kek_id)
        await ethers.provider.send("evm_increaseTime", [900000])

        
        const balanceBefore = await frax.balanceOf(signers[0].address);
        await strategy.exitOnlyRewards(exitData, frax.address, signers[0].address, false);
        const balanceAfter = await frax.balanceOf(signers[0].address);

        expect(balanceAfter).to.be.equal(balanceBefore);
      
        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(await crv.balanceOf(signers[0].address)).to.be.gt(0);
        expect(await cvx.balanceOf(signers[0].address)).to.be.gt(0);
        const fraxShare = await ethers.getContractAt("IERC20", "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0")
        console.log(await fraxShare.balanceOf(signers[0].address))
        expect(await fraxShare.balanceOf(signers[0].address)).to.be.gt(0);
    });

    it("Should unwind investment", async () => {
        const curvePool = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2";
        const poolToken: IERC20Metadata = frax;
        const poolSize = 2;
        const tokenIndexInCurve = 0;
        const convexPoolId = 100;
        const amount = parseUnits("10000.0", await poolToken.decimals());

        const poolInfo = await cvxBooster.poolInfo(convexPoolId);

        const lpToken = await ethers.getContractAt("IERC20Metadata", poolInfo.lptoken)

        const rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards)

        const stakeToken = "0x8a53ee42FB458D4897e15cc7dEa3F75D0F1c3475"
        const fraxPool = "0x963f487796d54d2f27bA6F3Fbe91154cA103b199"
        const duration = 694000 *2
        const entryData = await strategy.encodeEntryParams(
            curvePool, lpToken.address, poolToken.address, poolSize, tokenIndexInCurve, convexPoolId, stakeToken, fraxPool, duration
        )

        await poolToken.transfer(strategy.address, amount);

        const tx = await strategy.invest(entryData, amount);
        const receipt = await tx.wait()

        let abi = [ "event Locked(bytes32 data)" ];
        let iface = new ethers.utils.Interface(abi);
        let log = iface.parseLog(receipt.logs[receipt.logs.length-1]); 

        const kek_id =log.args[0]

        const exitData = await strategy.encodeExitParams(curvePool, poolToken.address, lpToken.address, tokenIndexInCurve, convexPoolId, fraxPool, kek_id)
        await ethers.provider.send("evm_increaseTime", [900000*2])

        
        const balanceBefore = await frax.balanceOf(signers[0].address);
        await strategy.exitAll(exitData, 10000, frax.address, signers[0].address, true);
        const balanceAfter = await frax.balanceOf(signers[0].address);

        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await frax.balanceOf(strategy.address)).to.be.equal(0);
        expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
        expect(await rewardPool.balanceOf(strategy.address)).to.be.equal(0);

        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(await crv.balanceOf(signers[0].address)).to.be.equal(0);
        expect(await cvx.balanceOf(signers[0].address)).to.be.equal(0);
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
// Cvx rewards 12484281607000998
// Crv rewards 219022484333350995

// 7512367276821111,
// 24170848862983073,
// 1377738385190035
