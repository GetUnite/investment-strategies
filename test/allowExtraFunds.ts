import { formatUnits, parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike, constants, Wallet } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { CurveConvexStrategy, CurveConvexStrategyTest, CurveConvexStrategyV2, CurveConvexStrategyV2Native, IERC20, IERC20Metadata, IExchange, IWrappedEther, StrategyHandler, IVoteExecutorMaster } from "../typechain";
import { IExchangeInterface } from "../typechain/IExchange";
let signers: SignerWithAddress[]
let gnosis: SignerWithAddress


async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    await signers[0].sendTransaction({
        to: address,
        value: parseEther("1")

    });

    return await ethers.getSigner(address);
}


describe("Test L1 Contract", function () {
    let voteExecutorMaster: IVoteExecutorMaster;
    let strategyHandler: StrategyHandler;
    let weth: IERC20Metadata

    beforeEach(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                chainId: 1,
                forking: {
                    chainId: 1,
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 16569671
                },
            },],
        });


        weth = await ethers.getContractAt("IERC20Metadata", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");


        signers = await ethers.getSigners();

        gnosis = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3")
        voteExecutorMaster = await ethers.getContractAt("IVoteExecutorMaster", "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89");
        strategyHandler = await ethers.getContractAt("StrategyHandler", "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5");
    });
    describe("Full workflow", function () {
        it("Should work", async function () {
            let wethContract = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");

            // Upgrade strategy handler
            let newStrategyHandler = await (await ethers.getContractFactory("StrategyHandler")).deploy();
            await strategyHandler.connect(gnosis).changeUpgradeStatus(true);
            await strategyHandler.connect(gnosis).upgradeTo(newStrategyHandler.address)

            // Transfer funds 
            await wethContract.connect(gnosis).deposit({ value: ethers.utils.parseEther("3.1") })
            await wethContract.connect(gnosis).transfer(voteExecutorMaster.address, ethers.utils.parseEther("3.1"))

            // set minsigns to 0
            await voteExecutorMaster.connect(gnosis).setMinSigns(0)

            // Execute data and then execute deposits through gnosis
            await voteExecutorMaster.executeSpecificData(6)
            await voteExecutorMaster.connect(gnosis).executeDeposits();

            console.log(await weth.balanceOf(voteExecutorMaster.address))
            console.log(await strategyHandler.getAssetAmount(2))
            console.log(await strategyHandler.getCurrentDeployed())
        })
    })

})
