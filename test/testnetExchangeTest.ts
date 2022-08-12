import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { Exchange, ExchangeTestnet, Token } from "../typechain";

describe("Testnet Exchange", async function () {
    let signers: SignerWithAddress[];
    let exchange: ExchangeTestnet;

    let USDC: Token, USDT: Token, DAI: Token, WETH: Token,
        EURT: Token, EURS: Token, agEUR: Token, CRV: Token, CVX:
            Token, WBTC: Token;

    before(async function () {
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                accounts: {
                    mnemonic: process.env.MNEMONIC,
                },
                forking: {
                    enabled: true,
                    jsonRpcUrl: "https://rpc.sepolia.online"
                },
            },],
        });

        signers = await ethers.getSigners();

        USDC = await ethers.getContractAt("Token", "0x0b6bb9E47179390B7Cf708b57ceF65a44a8038a9");
        USDT = await ethers.getContractAt("Token", "0xa248F97F2B5448868aAdfcFBcfd430957Fc74bC9");
        DAI = await ethers.getContractAt("Token", "0x8dfc82C8E44E4e696CE601Fc83B6CFB29CE7161E");
        WETH = await ethers.getContractAt("Token", "0x66Ac11c106C3670988DEFDd24BC75dE786b91095");
        EURT = await ethers.getContractAt("Token", "0xB3c96B80F3EDEB12b22Ad3b7f68cd5209615F6f9");
        EURS = await ethers.getContractAt("Token", "0x125651Bd966EBEA63d4960887373a0D1902104BF");
        agEUR = await ethers.getContractAt("Token", "0xf1acb99AfF673a1E02fCAfb6638F50cf0C894EDa");
        CRV = await ethers.getContractAt("Token", "0x937F7125994a91d5E2Ce31846b97578131056Bb4");
        CVX = await ethers.getContractAt("Token", "0xf98977e8146386613448668050eFd9D4b880f73F");
        WBTC = await ethers.getContractAt("Token", "0xbe9461E39a0653D4Dd608807FA095226cF8c08c3");
    })

    beforeEach(async function () {
        const Exchange = await ethers.getContractFactory("ExchangeTestnet");
        exchange = await Exchange.deploy();
    })

    it("Should exchange DAI (18 decimals) to WBTC (8 decimals)", async function () {
        // DAI to BTC
        // 1 DAI == 0.00004159 BTC

        await exchange.setRatio(DAI.address, WBTC.address, "4159"); // how much WBTC (8 decimals) will give me 1 DAI?
        const daiIn = parseUnits("24042.081721151473", 18); // putting in amount of DAI for roughly 1 BTC
        const btcOut = parseUnits("0.99991017", 8); // calculated amount of BTC to output

        await DAI.transferOwnership(exchange.address);
        await WBTC.transferOwnership(exchange.address);

        const result = await exchange.callStatic.exchange(DAI.address, WBTC.address, daiIn, 0);
        expect(result).to.be.equal(btcOut);

        const balanceBefore = await WBTC.balanceOf(signers[0].address);
        await exchange.exchange(DAI.address, WBTC.address, daiIn, 0);

        expect((await WBTC.balanceOf(signers[0].address)).sub(balanceBefore)).to.be.equal(btcOut);

        await exchange.transferTokenOwnership(DAI.address, signers[0].address);
        await exchange.transferTokenOwnership(WBTC.address, signers[0].address);
    })

    it("Should exchange WBTC (8 decimals) to DAI (18 decimals)", async function () {
        // BTC to DAI
        // 1 BTC == 23997.952302725913000000 DAI

        await exchange.setRatio(WBTC.address, DAI.address, "23997952302725913000000"); // // how much DAI (18 decimals) will give me 1 WBTC?
        const btcIn = parseUnits("0.00004159", 8); // putting in amount of BTC for roughly 1 DAI
        const daiOut = parseUnits("0.998074836270370721", 18); // calculated amount of DAI to output

        await DAI.transferOwnership(exchange.address);
        await WBTC.transferOwnership(exchange.address);

        const result = await exchange.callStatic.exchange(WBTC.address, DAI.address, btcIn, 0);
        expect(result).to.be.equal(daiOut);

        const balanceBefore = await DAI.balanceOf(signers[0].address);
        await exchange.exchange(WBTC.address, DAI.address, btcIn, 0);

        expect((await DAI.balanceOf(signers[0].address)).sub(balanceBefore)).to.be.equal(daiOut);

        await exchange.transferTokenOwnership(DAI.address, signers[0].address);
        await exchange.transferTokenOwnership(WBTC.address, signers[0].address);
    });

    it("Should mint tokens", async function () {
        const amount = parseUnits("1.0", 18);
        const balanceBefore = await DAI.balanceOf(signers[0].address);
        await DAI.transferOwnership(exchange.address);

        await exchange.mintToken(DAI.address, signers[0].address, amount);

        expect((await DAI.balanceOf(signers[0].address)).sub(balanceBefore)).to.be.equal(amount);
    })
})