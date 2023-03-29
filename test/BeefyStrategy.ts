import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, constants } from "ethers";
import { defaultAbiCoder, formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BeefyStrategy, IBeefyBoost, IBeefyVaultV6, IERC20Metadata, IExchange, IPriceFeedRouterV2, IWrappedEther } from "../typechain";

describe("Beefy Strategy Tests on Optimism", async () => {
    let signers: SignerWithAddress[];
    let gnosis: SignerWithAddress;

    let strategy: BeefyStrategy;
    let exchange: IExchange;
    let priceRouter: IPriceFeedRouterV2;

    let weth: (IWrappedEther | IERC20Metadata);
    let wstEthCrv: IERC20Metadata;

    let beefyVault: IBeefyVaultV6, beefyBoost: IBeefyBoost, entryToken: IERC20Metadata, ldo: IERC20Metadata;

    let data: string;

    async function forceSend(amount: BigNumberish, to: string) {
        const ForceSender = await ethers.getContractFactory("ForceSender");
        const sender = await ForceSender.deploy({ value: amount });
        await sender.forceSend(to);
    }

    async function getToken(token: IERC20Metadata, receiver: string, amount: BigNumber) {
        if (token.address == wstEthCrv.address) {
            const wstEthCrvWhale = await ethers.getImpersonatedSigner("0xd53ccbfed6577d8dc82987e766e75e3cb73a8563");
            const txGas = await wstEthCrv.connect(wstEthCrvWhale).estimateGas.transfer(receiver, amount);
            const gasPrice = await ethers.provider.getGasPrice();
            const txCost = txGas.mul(gasPrice);

            await forceSend(txCost, wstEthCrvWhale.address);

            await wstEthCrv.connect(wstEthCrvWhale).transfer(receiver, amount, {
                gasPrice: gasPrice,
                gasLimit: txGas
            });
            return;
        }
    }

    async function checkNoTokensLeft() {
        const ibTokensBalance = await beefyVault.balanceOf(strategy.address);
        const entryTokensBalance = await entryToken.balanceOf(strategy.address);
        const rewardToken = await ldo.balanceOf(strategy.address)

        expect(ibTokensBalance).to.be.equal(0);
        expect(entryTokensBalance).to.be.equal(0);
        expect(rewardToken).to.be.equal(0);
    }

    async function checkNoTokensLeftNoBoost() {
        const entryTokensBalance = await entryToken.balanceOf(strategy.address);
        const rewardToken = await ldo.balanceOf(strategy.address)

        expect(entryTokensBalance).to.be.equal(0);
        expect(rewardToken).to.be.equal(0);
    }

    async function skipDays(d: number) {
        ethers.provider.send('evm_increaseTime', [d * 86400]);
        ethers.provider.send('evm_mine', []);
    }

    function expectInPctRange(expectVal: BigNumber, toBeVal: BigNumber, rangePct: number) {
        expect(rangePct).to.be.lt(100, "Percentage should be less than 100");
        const err = toBeVal.mul(parseEther(rangePct.toString()).div(100)).div(parseEther("1.0"));

        expect(expectVal).to.be.gte(toBeVal.sub(err), "Lower bound exceeded");
        expect(expectVal).to.be.lte(toBeVal.add(err), "Upper bound exceeded");
    }

    async function simulateBeefyFarm() {
        await getToken(entryToken, beefyVault.address, parseEther("100.0"));
    }

    async function logAllErc20Transfers(txHash: string) {
        const tx = await ethers.provider.getTransactionReceipt(txHash);
        const events = tx.logs;

        console.log("ERC-20 Tokens Transferred:");

        for (let i = 0; i < events.length; i++) {
            const log = events[i];
            const token = await ethers.getContractAt("IERC20Metadata", log.address);
            const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
            if (log.topics[0] == transferTopic) {
                const transferEvent = token.interface.decodeEventLog(log.topics[0], log.data, log.topics);
                console.log(`   From '${transferEvent.from}' To '${transferEvent.to}' For ${formatUnits(transferEvent.value, await token.decimals())} ${await token.symbol()}`);
            }
        }
    }

    before(async () => {
        signers = await ethers.getSigners();
        exchange = await ethers.getContractAt(
            "contracts/interfaces/IExchange.sol:IExchange",
            "0x66Ac11c106C3670988DEFDd24BC75dE786b91095"
        ) as IExchange;
        priceRouter = await ethers.getContractAt("IPriceFeedRouterV2", "0x7E6FD319A856A210b9957Cd6490306995830aD25")

        weth = await ethers.getContractAt(
            "contracts/interfaces/IWrappedEther.sol:IWrappedEther",
            "0x4200000000000000000000000000000000000006"
        ) as IWrappedEther;
        wstEthCrv = await ethers.getContractAt("IERC20Metadata", "0xEfDE221f306152971D8e9f181bFe998447975810");

        beefyVault = await ethers.getContractAt("IBeefyVaultV6", "0x0892a178c363b4739e5Ac89E9155B9c30214C0c0");
        beefyBoost = await ethers.getContractAt("IBeefyBoost", "0x358B7D1a3B7E5c508c40756242f55991a354cd41");

        ldo = await ethers.getContractAt("IERC20Metadata", "0xFdb794692724153d1488CcdBE0C56c252596735F");

        entryToken = wstEthCrv;
    })

    beforeEach(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.OPTIMISM_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 84256604,
                },
            },],
        });

        gnosis = await ethers.getImpersonatedSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4");
        await forceSend(parseEther("100.0"), gnosis.address);

        await gnosis.sendTransaction({
            to: exchange.address,
            data: "0xaf695a200000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000fdb794692724153d1488ccdbe0c56c252596735f0000000000000000000000004200000000000000000000000000000000000006"
        });

        await gnosis.sendTransaction({
            to: exchange.address,
            data: "0x170e2c8b000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000fdb794692724153d1488ccdbe0c56c252596735f0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564"
        });

        const strategyFactory = await ethers.getContractFactory("BeefyStrategy");
        strategy = await upgrades.deployProxy(
            strategyFactory,
            [
                gnosis.address,
                constants.AddressZero,
                constants.AddressZero,
                priceRouter.address,
                exchange.address,
                weth.address
            ],
            { kind: 'uups' }
        ) as BeefyStrategy;

        await strategy.connect(gnosis).changeExpectedRewardStatus(ldo.address, true);

        data = await strategy.encodeData(beefyVault.address, beefyBoost.address, 2);
    })

    it("Should check correct encoders/decoders",async () => {
        expect(await strategy.encodeData(beefyVault.address, beefyBoost.address, 2)).to.be.equal(data);

        const decoded = await strategy.decodeData(data);
        expect(decoded.beefyVaultAddress).to.be.equal(beefyVault.address);
        expect(decoded.beefyBoostAddress).to.be.equal(beefyBoost.address);
        expect(decoded.assetId).to.be.equal(2);
    })

    it("Should invest into Beefy vault", async () => {
        const amount = parseUnits("10.0", await entryToken.decimals());

        await getToken(entryToken, gnosis.address, amount);

        await entryToken.connect(gnosis).transfer(strategy.address, amount);

        const tx = await strategy.connect(gnosis).invest(
            await strategy.encodeData(beefyVault.address, constants.AddressZero, 0),
            amount
        )

        await checkNoTokensLeftNoBoost();

        const investedAmount = await beefyVault.balanceOf(strategy.address);
        const ibPrice = await beefyVault.getPricePerFullShare();

        expectInPctRange(investedAmount, amount.mul(parseEther("1.0")).div(ibPrice), 0.0001 /* % */);
    })

    it("Should invest into Beefy vault + boost", async () => {
        const amount = parseUnits("10.0", await entryToken.decimals());

        await getToken(entryToken, gnosis.address, amount);

        await entryToken.connect(gnosis).transfer(strategy.address, amount);

        await strategy.connect(gnosis).invest(
            await strategy.encodeData(beefyVault.address, beefyBoost.address, 0),
            amount
        )

        await checkNoTokensLeft();

        const investedAmount = await beefyBoost.balanceOf(strategy.address);
        const ibPrice = await beefyVault.getPricePerFullShare();

        expectInPctRange(investedAmount, amount.mul(parseEther("1.0")).div(ibPrice), 0.0001 /* % */);
    })

    it("If not invested, return amount view function should not revert", async () => {
        expect(await strategy.getDeployedAmount(data)).to.be.equal(0);

        const rewards = await strategy.getExpectedRewards();
        expect(rewards.length).to.be.equal(1);
        expect(rewards[0]).to.be.equal(ldo.address);
    })

    it("Should return amount invested", async () => {
        const amount = parseUnits("10.0", await entryToken.decimals());

        await getToken(entryToken, gnosis.address, amount);

        await entryToken.connect(gnosis).transfer(strategy.address, amount);

        await strategy.connect(gnosis).invest(
            data,
            amount
        );

        const deployedAmount = await strategy.callStatic.getDeployedAmount(data);
        const priceQuery = await priceRouter["getPriceOfAmount(address,uint256,string)"](entryToken.address, amount, "ETH");
        const price18Decimals = await priceRouter.decimalsConverter(priceQuery.value, priceQuery.decimals, 18);

        expectInPctRange(deployedAmount, price18Decimals, 0.0001 /* % */);

        await skipDays(14);
        await simulateBeefyFarm();

        // moo token price increases every time farming happens
        const deployedAmountNew = await strategy.callStatic.getDeployedAmount(data);
        expect(deployedAmountNew).to.be.gt(deployedAmount);

        await checkNoTokensLeft();
    });

    it("Should unwind investment without booster", async () => {
        const amount = parseUnits("10.0", await entryToken.decimals());
        const priceQuery = await priceRouter["getPriceOfAmount(address,uint256,string)"](entryToken.address, amount, "ETH");
        const price18Decimals = await priceRouter.decimalsConverter(priceQuery.value, priceQuery.decimals, 18);

        const noBoostData = await strategy.encodeData(beefyVault.address, constants.AddressZero, 0);

        await getToken(entryToken, gnosis.address, amount);

        await entryToken.connect(gnosis).transfer(strategy.address, amount);

        await strategy.connect(gnosis).invest(
            noBoostData,
            amount
        );

        await skipDays(14);
        await simulateBeefyFarm();

        const balanceBefore = await weth.balanceOf(signers[0].address);
        await strategy.connect(gnosis).exitAll(noBoostData, 10000, weth.address, signers[0].address, true, true);
        const balanceAfter = await weth.balanceOf(signers[0].address);
        
        await checkNoTokensLeft();
        const boostBalance = await beefyBoost.balanceOf(strategy.address);
        expect(boostBalance).to.be.equal(0);

        const wethReceived = balanceAfter.sub(balanceBefore);
        expect(wethReceived).to.be.gte(price18Decimals.add(price18Decimals.mul(15).div(1000))); // earned at least 1.5% of deposited amount
    })


    it("Should unwind investment (25%, don't get rewards)",async () => {
        const amount = parseUnits("10.0", await entryToken.decimals());
        const priceQuery = await priceRouter["getPriceOfAmount(address,uint256,string)"](entryToken.address, amount, "ETH");
        const price18Decimals = await priceRouter.decimalsConverter(priceQuery.value, priceQuery.decimals, 18);

        await getToken(entryToken, gnosis.address, amount);
        await entryToken.connect(gnosis).transfer(strategy.address, amount);
        await strategy.connect(gnosis).invest(
            data,
            amount
        );

        await skipDays(14);
        await simulateBeefyFarm();

        const boostBalanceBefore = await beefyBoost.balanceOf(strategy.address);
        const balanceWethBefore = await weth.balanceOf(signers[0].address);
        const balanceRewardTokenBefore = await ldo.balanceOf(signers[0].address);
        await strategy.connect(gnosis).exitAll(data, 2500, weth.address, signers[0].address, false, false);
        const balanceWethAfter = await weth.balanceOf(signers[0].address);
        const balanceRewardTokenAfter = await ldo.balanceOf(signers[0].address);
        
        await checkNoTokensLeft();
        const boostBalance = await beefyBoost.balanceOf(strategy.address);
        expect(boostBalance).to.be.equal(boostBalanceBefore.mul(3).div(4).add(1)); // +1 wei

        const wethReceived = balanceWethAfter.sub(balanceWethBefore);
        const ldoReceived = balanceRewardTokenAfter.sub(balanceRewardTokenBefore);

        expect(ldoReceived).to.be.equal(0); // signers[0] must NOT receive LDO
        expect(wethReceived.mul(4)).to.be.gte(price18Decimals.add(price18Decimals.mul(15).div(1000))); // earned at least 1.5% of deposited amount
    });

    it("Should unwind investment (50%, withdraw rewards but don't swap)",async () => {
        const amount = parseUnits("10.0", await entryToken.decimals());
        const priceQuery = await priceRouter["getPriceOfAmount(address,uint256,string)"](entryToken.address, amount, "ETH");
        const price18Decimals = await priceRouter.decimalsConverter(priceQuery.value, priceQuery.decimals, 18);

        await getToken(entryToken, gnosis.address, amount);
        await entryToken.connect(gnosis).transfer(strategy.address, amount);
        await strategy.connect(gnosis).invest(
            data,
            amount
        );

        await skipDays(14);
        await simulateBeefyFarm();

        const boostBalanceBefore = await beefyBoost.balanceOf(strategy.address);
        const balanceWethBefore = await weth.balanceOf(signers[0].address);
        const balanceRewardTokenBefore = await ldo.balanceOf(signers[0].address);
        await strategy.connect(gnosis).exitAll(data, 5000, weth.address, signers[0].address, true, false);
        const balanceWethAfter = await weth.balanceOf(signers[0].address);
        const balanceRewardTokenAfter = await ldo.balanceOf(signers[0].address);
        
        await checkNoTokensLeft();
        const boostBalance = await beefyBoost.balanceOf(strategy.address);
        expect(boostBalance).to.be.equal(boostBalanceBefore.div(2).add(1)); // +1 wei

        const wethReceived = balanceWethAfter.sub(balanceWethBefore);
        const ldoReceived = balanceRewardTokenAfter.sub(balanceRewardTokenBefore);

        expect(ldoReceived).to.be.gt(0); // signers[0] must receive LDO
        expect(wethReceived.mul(2)).to.be.gte(price18Decimals.add(price18Decimals.mul(15).div(1000))); // earned at least 1.5% of deposited amount
    })

    it("Should unwind investment (100%, withdraw and swap rewards)",async () => {
        const amount = parseUnits("10.0", await entryToken.decimals());
        const priceQuery = await priceRouter["getPriceOfAmount(address,uint256,string)"](entryToken.address, amount, "ETH");
        const price18Decimals = await priceRouter.decimalsConverter(priceQuery.value, priceQuery.decimals, 18);


        await getToken(entryToken, gnosis.address, amount);
        await entryToken.connect(gnosis).transfer(strategy.address, amount);
        await strategy.connect(gnosis).invest(
            data,
            amount
        );

        await skipDays(14);
        await simulateBeefyFarm();

        const balanceBefore = await weth.balanceOf(signers[0].address);
        await strategy.connect(gnosis).exitAll(data, 10000, weth.address, signers[0].address, true, true);
        const balanceAfter = await weth.balanceOf(signers[0].address);
        
        await checkNoTokensLeft();
        const boostBalance = await beefyBoost.balanceOf(strategy.address);
        expect(boostBalance).to.be.equal(0);

        const wethReceived = balanceAfter.sub(balanceBefore);
        expect(wethReceived).to.be.gte(price18Decimals.add(price18Decimals.mul(15).div(1000))); // earned at least 1.5% of deposited amount
    })

    it("Should only claim rewards",async () => {
        const amount = parseUnits("10.0", await entryToken.decimals());
        const priceQuery = await priceRouter["getPriceOfAmount(address,uint256,string)"](entryToken.address, amount, "ETH");
        const price18Decimals = await priceRouter.decimalsConverter(priceQuery.value, priceQuery.decimals, 18);


        await getToken(entryToken, gnosis.address, amount);
        await entryToken.connect(gnosis).transfer(strategy.address, amount);
        await strategy.connect(gnosis).invest(
            data,
            amount
        );

        await skipDays(14);
        await simulateBeefyFarm();

        const balanceWethBefore = await weth.balanceOf(signers[0].address);
        const boostBalanceBefore = await beefyBoost.balanceOf(strategy.address);

        await strategy.connect(gnosis).exitOnlyRewards(data, weth.address, signers[0].address, true);

        const balanceWethAfter = await weth.balanceOf(signers[0].address);
        const boostBalanceAfter = await beefyBoost.balanceOf(strategy.address);

        expect(balanceWethAfter).to.be.gt(balanceWethBefore); // check received some WETH
        expect(boostBalanceBefore).to.be.eq(boostBalanceAfter); // check investment is untouched
    })

    it("Should execute mulicall", async () => {
        await (weth as IWrappedEther).deposit({value: parseEther("1000.0")});
        const token = weth;
        const amount = parseUnits("200.0", await token.decimals());
        const calldata1 = token.interface.encodeFunctionData("transfer", [signers[0].address, parseUnits("150.0", await token.decimals())]);
        const calldata2 = token.interface.encodeFunctionData("transfer", [signers[0].address, parseUnits("50.0", await token.decimals())]);

        const balanceBefore = await token.balanceOf(strategy.address);
        await token.transfer(strategy.address, amount);
        await strategy.connect(gnosis).multicall([token.address, token.address], [calldata1, calldata2]);
        const balanceAfter = await token.balanceOf(strategy.address);

        expect(balanceAfter).to.be.equal(balanceBefore);
    });
})