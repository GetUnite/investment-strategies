import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { defaultAbiCoder, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { BalancerStrategy, IERC20Metadata, IExchange } from "../typechain"

describe("Balancer strategy", async () => {
    let strategy: BalancerStrategy;
    let usdc: IERC20Metadata, usdt: IERC20Metadata, dai: IERC20Metadata, frax: IERC20Metadata;
    let exchange: IExchange;

    let signers: SignerWithAddress[];

    const poolId = "0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063";

    before(async () => {
        signers = await ethers.getSigners();

        usdt = await ethers.getContractAt("IERC20Metadata", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        usdc = await ethers.getContractAt("IERC20Metadata", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        dai = await ethers.getContractAt("IERC20Metadata", "0x6B175474E89094C44Da98b954EedeAC495271d0F");
        frax = await ethers.getContractAt("IERC20Metadata", "0x853d955aCEf822Db058eb8505911ED77F175b99e");

        exchange = await ethers.getContractAt("IExchange", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec")

        const value = parseEther("10.0");

        await exchange.exchange(
            ethers.constants.AddressZero, usdt.address, value, 0, { value: value }
        )
        await exchange.exchange(
            ethers.constants.AddressZero, usdc.address, value, 0, { value: value }
        )
        await exchange.exchange(
            ethers.constants.AddressZero, dai.address, value, 0, { value: value }
        )
    })

    beforeEach(async () => {
        const Strategy = await ethers.getContractFactory("BalancerStrategy");
        strategy = await Strategy.deploy(ethers.constants.AddressZero, ethers.constants.AddressZero, true);
    })

    it("Should check initial values", async () => {
        const balancerAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
        const gaugeFactoryAddress = "0x4E7bBd911cf1EFa442BC1b2e9Ea01ffE785412EC";
        const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
        const unwindDecimals = 2;

        expect(await strategy.balancer()).to.be.equal(balancerAddress);
        expect(await strategy.gaugeFactory()).to.be.equal(gaugeFactoryAddress);
        expect(await strategy.exchange()).to.be.equal(exchangeAddress);
        expect(await strategy.unwindDecimals()).to.be.equal(unwindDecimals);
    })

    it("Should check initial contract state (testing == false)", async () => {
        const contract1 = usdc.address;
        const contract2 = usdt.address;
        const adminRole = ethers.constants.HashZero;

        expect(contract1).to.not.be.equal(contract2);

        const Strategy = await ethers.getContractFactory("BalancerStrategy");
        const newStrategy = await Strategy.deploy(contract1, contract2, false);

        expect(await newStrategy.hasRole(adminRole, contract1)).to.be.true;
        expect(await newStrategy.hasRole(adminRole, contract2)).to.be.true;
    });

    it("Should check exitOnlyRewards is callable", async () => {
        const tx = strategy.exitOnlyRewards(
            "0x00", ethers.constants.AddressZero, ethers.constants.AddressZero, false
        )
        await expect(tx).to.not.be.revertedWith("");
    });

    it("Should not deploy contract (gnosis/voteExecutor not contract)", async () => {
        const notContract = signers[1].address;
        const contract = usdc.address;

        const Strategy = await ethers.getContractFactory("BalancerStrategy");

        let newStrategy = Strategy.deploy(notContract, contract, false);
        await expect(newStrategy).to.be.revertedWith("BalancerStrategy: 1!contract");

        newStrategy = Strategy.deploy(contract, notContract, false);
        await expect(newStrategy).to.be.revertedWith("BalancerStrategy: 2!contract");
    })

    it("Should check correct encoders/decoders", async () => {
        const poolId = "0x0000000000000000000000000000000000000000000000000000000000000002";
        const tokenId = 3;
        const stake = true;

        const entry = defaultAbiCoder.encode(
            ["bytes32", "uint8", "bool"],
            [poolId, tokenId, stake]
        )
        const exit = defaultAbiCoder.encode(
            ["bytes32", "uint8", "bool"],
            [poolId, tokenId, stake]
        );

        expect(await strategy.encodeEntryParams(
            poolId, tokenId, stake
        )).to.be.equal(entry);

        expect(await strategy.encodeExitParams(
            poolId, tokenId, stake
        )).to.be.equal(exit);

        const entryStruct = await strategy.decodeEntryParams(entry);
        const exitStruct = await strategy.decodeExitParams(exit);

        expect(entryStruct[0]).to.be.equal(poolId);
        expect(entryStruct[1]).to.be.equal(tokenId);
        expect(entryStruct[2]).to.be.equal(stake);

        expect(exitStruct[0]).to.be.equal(poolId);
        expect(exitStruct[1]).to.be.equal(tokenId);
        expect(exitStruct[2]).to.be.equal(stake);
    });

    it("Should revert decoders if data length is wrong", async () => {
        const data = "0x420690";

        const entry = strategy.decodeEntryParams(data);
        const exit = strategy.decodeExitParams(data);

        await expect(entry).to.be.revertedWith("BalancerStrategy: length en");
        await expect(exit).to.be.revertedWith("BalancerStrategy: length ex");
    });

    it("Should check roles", async () => {
        const contract = usdc.address;
        const roleError = `AccessControl: account ${signers[0].address.toLowerCase()} is missing role ${ethers.constants.HashZero}`;

        const Strategy = await ethers.getContractFactory("BalancerStrategy");
        const newStrategy = await Strategy.deploy(contract, contract, false);

        await expect(newStrategy.invest("0x", 0)).to.be.revertedWith(roleError);
        await expect(newStrategy.exitAll("0x", 0, contract, contract, true)).to.be.revertedWith(roleError);
        await expect(newStrategy.exitOnlyRewards("0x", contract, contract, true)).to.be.revertedWith(roleError);
        await expect(newStrategy.multicall([], [])).to.be.revertedWith(roleError);
    });

    it("Should check strategy entry (w/ staking)", async () => {
        const tokens = [dai, usdc, usdt];
        const stake = true;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const data = await strategy.encodeEntryParams(poolId, i, stake);
            const amount = parseUnits("100.0", await token.decimals())

            await token.transfer(strategy.address, amount);
            await strategy.invest(data, amount);
        }
    })

    it("Should check strategy entry (no staking)", async () => {
        const tokens = [dai, usdc, usdt];
        const stake = false;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const data = await strategy.encodeEntryParams(poolId, i, stake);
            const amount = parseUnits("100.0", await token.decimals())

            await token.transfer(strategy.address, amount);
            await strategy.invest(data, amount);
        }
    })

    it("Should check strategy exit (w/ staking)", async () => {
        const tokens = [dai, usdc, usdt];
        const stake = true;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const data = await strategy.encodeEntryParams(poolId, i, stake);
            const amount = parseUnits("100.0", await token.decimals())

            await token.transfer(strategy.address, amount);
            await strategy.invest(data, amount);

            await strategy.exitAll(data, 10000, token.address, signers[0].address, false);
        }
    });

    it("Should check strategy exit (no staking)", async () => {
        const tokens = [dai, usdc, usdt];
        const stake = false;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const data = await strategy.encodeEntryParams(poolId, i, stake);
            const amount = parseUnits("100.0", await token.decimals())

            await token.transfer(strategy.address, amount);
            await strategy.invest(data, amount);

            await strategy.exitAll(data, 10000, token.address, signers[0].address, false);
        }
    });

    it("Should check strategy exit (w/ exchange)", async () => {
        const tokens = [dai, usdc, usdt];
        const stake = true;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const data = await strategy.encodeEntryParams(poolId, i, stake);
            const amount = parseUnits("100.0", await token.decimals())

            await token.transfer(strategy.address, amount);
            await strategy.invest(data, amount);

            await strategy.exitAll(data, 10000, frax.address, signers[0].address, false);
        }
    });

    it("Should check strategy exit (zero yield)", async () => {
        const tokens = [dai, usdc, usdt];
        const stake = true;

        for (let i = 0; i < tokens.length; i++) {
            const data = await strategy.encodeEntryParams(poolId, i, stake);

            await strategy.exitAll(data, 10000, frax.address, signers[0].address, false);
        }
    });

    it("Should execute mulicall", async () => {
        const token = usdc;
        const amount = parseUnits("200.0", await token.decimals());
        const calldata1 = token.interface.encodeFunctionData("transfer", [signers[0].address, parseUnits("150.0", await token.decimals())]);
        const calldata2 = token.interface.encodeFunctionData("transfer", [signers[0].address, parseUnits("50.0", await token.decimals())]);

        const balanceBefore = await token.balanceOf(strategy.address);
        await token.transfer(strategy.address, amount);
        await strategy.multicall([token.address, token.address], [calldata1, calldata2]);
        const balanceAfter = await token.balanceOf(strategy.address);

        expect(balanceAfter).to.be.equal(balanceBefore);
    })

    it("Should not execute mulicall (lengths not equal)", async () => {
        const token = usdc;
        const amount = parseUnits("200.0", await token.decimals());
        const calldata1 = token.interface.encodeFunctionData("transfer", [signers[0].address, parseUnits("150.0", await token.decimals())]);

        await token.transfer(strategy.address, amount);
        const tx = strategy.multicall([token.address, token.address], [calldata1]);

        expect(tx).to.be.revertedWith("BalancerStrategy: lengths");
    })
})