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
        value: parseEther("5")

    });

    return await ethers.getSigner(address);
}


describe("Test 3/6 Contracts", function () {
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
                    blockNumber: 16766899
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
            // Upgrade strategy handler
            let newStrategyHandler = await (await ethers.getContractFactory("StrategyHandler")).deploy();
            await strategyHandler.connect(gnosis).changeUpgradeStatus(true);
            await strategyHandler.connect(gnosis).upgradeTo(newStrategyHandler.address)

            // Set crosschain info on mainnet
            // let anyCall = await ethers.getContractAt("IAnycall", "0x8efd012977DD5C97E959b9e48c04eE5fcd604374")
            // console.log("AnyCallExecutor address", await anyCall.executor())
            // await voteExecutorMaster.connect(gnosis).setCrossChainInfo("0x8efd012977DD5C97E959b9e48c04eE5fcd604374", "0x2Fc1aF4b7B031bD39af7009E0a62694A795F7B00", "0x1D147031b6B4998bE7D446DecF7028678aeb732A", "0x0000000000000000000000000000000000000000", "1", "137", 0)

            // Config to address emergency proposal effects
            await voteExecutorMaster.connect(gnosis).setMinSigns(0)
            await strategyHandler.connect(gnosis).removeFromActiveDirections(1)
            await strategyHandler.connect(gnosis).setAssetAmount(0, "91111161668997815542150")

            await strategyHandler.connect(gnosis).setLiquidityDirection("Curve/Convex multiBTC", 13, "0x99D86d86B6ecBFC517278db335bCf172eF572854", "0x051d7e5609917bd9b73f04bac0ded8dd46a74301", 3, 1, "0x0000000000000000000000002863a328a0b7fc6040f11614fa0728587db8e353000000000000000000000000051d7e5609917bd9b73f04bac0ded8dd46a743010000000000000000000000002863a328a0b7fc6040f11614fa0728587db8e353000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000089", "0x0000000000000000000000002863a328a0b7fc6040f11614fa0728587db8e353000000000000000000000000051d7e5609917bd9b73f04bac0ded8dd46a743010000000000000000000000002863a328a0b7fc6040f11614fa0728587db8e35300000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000890000000000000000000000000000000000000000000000000000000000000006696e743132380000000000000000000000000000000000000000000000000000", "0x0000000000000000000000002863a328a0b7fc6040f11614fa0728587db8e35300000000000000000000000000000000000000000000000000000000000000890000000000000000000000000000000000000000000000000000000000000003")
            // Execute data and then execute deposits through gnosis
            await voteExecutorMaster.connect(gnosis).executeSpecificData(8)
            await voteExecutorMaster.connect(gnosis).executeDeposits();
        })
    })

})
