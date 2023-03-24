import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish, constants } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BeefyStrategy, IERC20Metadata, IExchange, IPriceFeedRouterV2, IWrappedEther } from "../typechain";

describe("Beefy Strategy Tests on Optimism", async () => {
    let signers: SignerWithAddress[];
    let gnosis: SignerWithAddress;

    let strategy: BeefyStrategy;
    let exchange: IExchange;
    let priceRouter: IPriceFeedRouterV2;

    let weth: (IWrappedEther | IERC20Metadata);
    let wstEthCrv: IERC20Metadata;

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

    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.OPTIMISM_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 82951862,
                },
            },],
        });

        signers = await ethers.getSigners();
        gnosis = await ethers.getImpersonatedSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4");
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

        await forceSend(parseEther("100.0"), gnosis.address)
    })

    beforeEach(async () => {
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
    })

    it("Should invest into Beefy vault + boost", async () => {
        const entryToken = wstEthCrv;
        const beefyVault = await ethers.getContractAt("IBeefyVaultV6", "0x0892a178c363b4739e5Ac89E9155B9c30214C0c0");
        const beefyBoost = await ethers.getContractAt("IBeefyBoost", "0x358B7D1a3B7E5c508c40756242f55991a354cd41");
        const amount = parseUnits("10.0", await entryToken.decimals());

        await getToken(entryToken, gnosis.address, amount);

        await entryToken.connect(gnosis).transfer(strategy.address, amount);

        await strategy.connect(gnosis).invest(
            await strategy.encodeData(beefyVault.address, beefyBoost.address, 0),
            amount
        )
    })
})