import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { CurveFraxConvexStrategyV2, IERC20Metadata, IExchange, IStrategyHandler, IVoteExecutorMaster, IWrappedEther, IFraxFarmERC20 } from "../typechain";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

async function checkSpread(fact: BigNumber, expected: BigNumber, allowedSpread: number) {
    expect(fact).to.be.gte(expected.div(100).mul(100 - allowedSpread));
    expect(fact).to.be.lte(expected.div(100).mul(100 + allowedSpread));
};

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );
    return await ethers.getSigner(address);
}


describe("Automated strategy execution for Upgraded Strategy", function () {
    let strategy: CurveFraxConvexStrategyV2;
    let signers: SignerWithAddress[];
    let signer: SignerWithAddress;
    let exchange: IExchange;
    let handler: IStrategyHandler;
    let executor: IVoteExecutorMaster;
    let poolToken: IERC20Metadata;
    let fraxPoolContract: IFraxFarmERC20;

    const duration = 60 * 60 * 24 * 8;  //EIGHT_DAYS_IN_SECONDS;
    const ZERO_ADDR = ethers.constants.AddressZero;

    async function resetNetwork() {

        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 16483319,
                },
            },],
        });

        signers = await ethers.getSigners();
        signer = signers[0]
        exchange = await ethers.getContractAt("contracts/interfaces/IExchange.sol:IExchange", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec") as IExchange
        const value = parseEther("200.0");
        fraxPoolContract = await ethers.getContractAt("contracts/interfaces/IFraxFarmERC20.sol:IFraxFarmERC20", "0x963f487796d54d2f27bA6F3Fbe91154cA103b199") as IFraxFarmERC20

        await exchange.exchange(
            ZERO_ADDR, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", value, 0, { value: value }
        )
        let wrappedEther = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as IWrappedEther
        await wrappedEther.deposit({ value: ethers.utils.parseEther("100") })

    }

    before(async () => {

        upgrades.silenceWarnings();
        await resetNetwork();

    });

    describe("Testing strategies with native ETH", function () {

        const curvePool = "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577";
        const fraxPool = "0xa537d64881b84faffb9Ae43c951EEbF368b71cdA";
        const wethToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const poolSize = 2;
        const lpToken = '0xf43211935C781D5ca1a41d2041F397B8A7366C7A';
        const tokenIndexInCurve = 0;
        const _codeName = "Curve/FraxConvex ETH+frxETH";
        const _entryToken = wethToken;
        const _assetId = 2;
        const _chainId = 1;

        beforeEach(async () => {

            await resetNetwork();

            fraxPoolContract = await ethers.getContractAt("contracts/interfaces/IFraxFarmERC20.sol:IFraxFarmERC20", fraxPool) as IFraxFarmERC20;

            const admin = await getImpersonatedSigner('0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3')
            const oldStrategy = await ethers.getContractAt("CurveFraxConvexStrategyV2", "0x4d8dE98F908748b91801d74d3F784389107F51d7")
            await oldStrategy.connect(admin).grantRole(await oldStrategy.DEFAULT_ADMIN_ROLE(), signers[0].address)
            await oldStrategy.connect(admin).grantRole(await oldStrategy.UPGRADER_ROLE(), signers[0].address)
            await oldStrategy.connect(admin).changeUpgradeStatus(true);

            const newStrategy = await ethers.getContractFactory("CurveFraxConvexStrategyV2")
            const oldStrategyImp = await ethers.getContractFactory("CurveFraxConvexStrategyV1")
            const deployment = await upgrades.forceImport('0x4d8dE98F908748b91801d74d3F784389107F51d7', oldStrategyImp);
            strategy = await upgrades.upgradeProxy("0x4d8dE98F908748b91801d74d3F784389107F51d7", newStrategy, { unsafeAllow: ["delegatecall"] }) as CurveFraxConvexStrategyV2;
            await strategy.deployed()

            await strategy.grantRole("0x0000000000000000000000000000000000000000000000000000000000000000", "0x82e568c482df2c833dab0d38deb9fb01777a9e89");
            handler = await ethers.getContractAt("IStrategyHandler", "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5");
            executor = await ethers.getContractAt("IVoteExecutorMaster", "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89");
            poolToken = await ethers.getContractAt("IERC20Metadata", wethToken);

        });

        it("Should invest into ETH/frxETH pool", async () => {

            const _exitData = await strategy.encodeExitParams(curvePool, _entryToken, tokenIndexInCurve, fraxPool, true, duration);

            const executorBalanceBefore = await poolToken.balanceOf(executor.address);
            const rq1 = await executor.callStatic.encodeLiquidityCommand(_codeName, 10000);
            const rq2 = await executor.callStatic.encodeLiquidityCommand("Curve/Convex stETH+ETH", 0);

            const encodedMmessages = await executor.callStatic.encodeAllMessages([rq1[0], rq2[0]], [rq1[1], rq2[1]]);
            const inputData = encodedMmessages[2];
            await executor.submitData(inputData);

            const admin = await getImpersonatedSigner('0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3');
            await executor.connect(admin).setMinSigns(0);

            await executor.executeSpecificData(6);
            const executorBalanceAter = await poolToken.balanceOf(executor.address);

            console.log('Balance of executor before investing',
                ethers.utils.formatEther(executorBalanceBefore), "balance after withdrawal: ",
                ethers.utils.formatEther(executorBalanceAter),
                '\n**********************************');
            await executor.connect(admin).executeDeposits();
            console.log('\nDeposit executed!\n');
            console.log("SHOULD BE ARRAY OF 2\n", await fraxPoolContract.lockedStakesOfLength(strategy.address))
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(2)
            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.gt(0);

            await skipDays(9)

            await strategy.exitAll(_exitData, 10000, poolToken.address, signer.address, true, true);

            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(2)
            console.log('\n----------STAKE BALANCE AFTER EXIT--------------\n')
            console.log(await fraxPoolContract.lockedStakesOf(strategy.address))
            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.eq(0)

        });

        it("Should invest into ETH/frxETH pool twice and exit", async () => {

            const fraxPoolContract = await ethers.getContractAt("contracts/interfaces/IFraxFarmERC20.sol:IFraxFarmERC20", fraxPool) as IFraxFarmERC20;
            const _exitData = await strategy.encodeExitParams(curvePool, _entryToken, tokenIndexInCurve, fraxPool, true, duration);

            const executorBalanceBefore = await poolToken.balanceOf(executor.address);
            const rq1 = await executor.callStatic.encodeLiquidityCommand(_codeName, 10000);
            const rq2 = await executor.callStatic.encodeLiquidityCommand("Curve/Convex stETH+ETH", 0);

            const encodedMmessages = await executor.callStatic.encodeAllMessages([rq1[0], rq2[0]], [rq1[1], rq2[1]]);
            const inputData = encodedMmessages[2];
            await executor.submitData(inputData);

            const admin = await getImpersonatedSigner('0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3');
            await executor.connect(admin).setMinSigns(0);

            await executor.executeSpecificData(6);
            const executorBalanceAter = await poolToken.balanceOf(executor.address);
            await executor.connect(admin).executeDeposits();
            console.log('\nDeposit 1 executed!\n');

            console.log('\n**********************************', '\nBalance of executor before investing\n',
                ethers.utils.formatEther(executorBalanceBefore), "\nbalance after withdrawal: ",
                ethers.utils.formatEther(executorBalanceAter),
                '\n**********************************');

            expect(executorBalanceBefore).to.be.lt(executorBalanceAter)
            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.gt(0);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(2)
            const lockedLiq1 = await fraxPoolContract.lockedLiquidityOf(strategy.address);
            console.log('Locked liquidity', lockedLiq1, '\n');
            await skipDays(9);

            console.log("----------------- Second cycle----------------------- \n");

            const executorBalanceBefore2 = await poolToken.balanceOf(executor.address);
            const rq4 = await executor.callStatic.encodeLiquidityCommand(_codeName, 4000);
            const rq5 = await executor.callStatic.encodeLiquidityCommand("Curve/Convex stETH+ETH", 6000);
            const encodedMmessages2 = await executor.callStatic.encodeAllMessages([rq4[0], rq5[0]], [rq4[1], rq5[1]]);
            const inputData2 = encodedMmessages2[2];
            await executor.submitData(inputData2);

            await executor.executeSpecificData(7);
            const executorBalanceAter2 = await poolToken.balanceOf(executor.address);
            await executor.connect(admin).executeDeposits();
            console.log('\nDeposit 2 executed!\n');
            console.log('\n**********************************', '\nBalance of executor before investing\n',
                ethers.utils.formatEther(executorBalanceBefore2), "\nbalance after withdrawal: ",
                ethers.utils.formatEther(executorBalanceAter2),
                '\n**********************************');

            expect(executorBalanceBefore2).to.be.lt(executorBalanceAter2)

            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.gt(0);
            expect(await fraxPoolContract.lockedStakesOfLength(strategy.address)).to.be.eq(3)
            const lockedLiq2 = await fraxPoolContract.lockedLiquidityOf(strategy.address);
            expect(lockedLiq2).to.be.lt(lockedLiq1);
            console.log('Checked: locked liquidity 2', lockedLiq2, 'is less than first locked', lockedLiq1, '\n');
            await skipDays(9)
            const signerBalanceBefore = await poolToken.balanceOf(signer.address);

            await strategy.exitAll(_exitData, 10000, poolToken.address, signer.address, true, true);
            expect(await fraxPoolContract.lockedLiquidityOf(strategy.address)).to.be.eq(0)
            console.log('\n----------STAKE BALANCE AFTER EXIT--------------\n')
            console.log(await fraxPoolContract.lockedStakesOf(strategy.address));
            expect(await poolToken.balanceOf(signer.address)).to.be.gt(signerBalanceBefore)
            console.log('Signer new baalnce', await poolToken.balanceOf(signer.address))

        });

    });


});