import { parseUnits } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";

async function main() {
    const USDC = await ethers.getContractAt("Token", "0x0b6bb9E47179390B7Cf708b57ceF65a44a8038a9");
    const USDT = await ethers.getContractAt("Token", "0xa248F97F2B5448868aAdfcFBcfd430957Fc74bC9");
    const DAI = await ethers.getContractAt("Token", "0x8dfc82C8E44E4e696CE601Fc83B6CFB29CE7161E");
    const WETH = await ethers.getContractAt("Token", "0x66Ac11c106C3670988DEFDd24BC75dE786b91095");
    const EURT = await ethers.getContractAt("Token", "0xB3c96B80F3EDEB12b22Ad3b7f68cd5209615F6f9");
    const EURS = await ethers.getContractAt("Token", "0x125651Bd966EBEA63d4960887373a0D1902104BF");
    const agEUR = await ethers.getContractAt("Token", "0xf1acb99AfF673a1E02fCAfb6638F50cf0C894EDa");
    const CRV = await ethers.getContractAt("Token", "0x937F7125994a91d5E2Ce31846b97578131056Bb4");
    const CVX = await ethers.getContractAt("Token", "0xf98977e8146386613448668050eFd9D4b880f73F");
    const WBTC = await ethers.getContractAt("Token", "0xbe9461E39a0653D4Dd608807FA095226cF8c08c3");

    const tokens = [
        USDC, USDT, DAI, WETH, EURT, EURS, agEUR, CRV, CVX, WBTC
    ]


    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        try {
            await hre.run("verify:verify", {
                address: token.address,
                constructorArguments: [
                    await token.name(),
                    await token.symbol(),
                    await token.decimals()
                ],
            });
        } catch (error) {
            console.log(error);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });